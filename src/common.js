var os = require('os');
var fs = require('fs');
var _ls = require('./ls');

// Module globals
var config = {
  silent: false,
  fatal: false
};
exports.config = config;

var state = {
  error: null,
  errorCode: 0,
  currentCmd: 'shell.js',
  previousDir: null,
  tempDir: null
};
exports.state = state;

var platform = os.type().match(/^Win/) ? 'win' : 'unix';
exports.platform = platform;

function log() {
  if (!config.silent)
    console.error.apply(console, arguments);
}
exports.log = log;

var DEFAULT_ERROR_CODE = 1;

// Shows error message. Throws unless _continue or config.fatal are true
function error(msg, _code, _continue) {
  // Adjust values if `_continue` is passed in but `_code` isn't
  if (typeof _code === 'boolean') {
    _continue = _code;
    _code = DEFAULT_ERROR_CODE;
  }

  if (typeof _code !== 'number')
    _code = DEFAULT_ERROR_CODE;

  if (state.error === null)
    state.error = '';
  var log_entry = state.currentCmd + ': ' + msg;
  if (state.error === '')
    state.error = log_entry;
  else
    state.error += '\n' + log_entry;

  // Override previous return code, but prefer a previous non-default code if it exists
  if (state.errorCode === 0 || _code !== DEFAULT_ERROR_CODE)
    state.errorCode = _code;

  if (msg.length > 0)
    log(log_entry);

  if (config.fatal)
    process.exit(state.errorCode);

  if (!_continue)
    throw '';
}
exports.error = error;

// In the future, when Proxies are default, we can add methods like `.to()` to primitive strings.
// For now, this is a dummy function to bookmark places we need such strings
function ShellString(str) {
  return str;
}
exports.ShellString = ShellString;

// Return the home directory in a platform-agnostic way, with consideration for
// older versions of node
function getUserHome() {
  var result;
  if (os.homedir)
    result = os.homedir(); // node 3+
  else
    result = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
  return result;
}
exports.getUserHome = getUserHome;

// Returns {'alice': true, 'bob': false} when passed a dictionary, e.g.:
//   parseOptions('-a', {'a':'alice', 'b':'bob'});
function parseOptions(str, map) {
  if (!map)
    error('parseOptions() internal error: no map given');

  // All options are false by default
  var options = {};
  for (var letter in map)
    options[map[letter]] = false;

  if (!str)
    return options; // defaults

  if (typeof str !== 'string')
    error('parseOptions() internal error: wrong str');

  // e.g. match[1] = 'Rf' for str = '-Rf'
  var match = str.match(/^\-(.+)/);
  if (!match)
    return options;

  // e.g. chars = ['R', 'f']
  var chars = match[1].split('');

  chars.forEach(function(c) {
    if (c in map)
      options[map[c]] = true;
    else
      error('option not recognized: '+c);
  });

  return options;
}
exports.parseOptions = parseOptions;

// Expands wildcards with matching (ie. existing) file names.
// For example:
//   expand(['file*.js']) = ['file1.js', 'file2.js', ...]
//   (if the files 'file1.js', 'file2.js', etc, exist in the current dir)
function expand(list) {
  var expanded = [];
  list.forEach(function(listEl) {
    // Wildcard present on directory names ?
    if(listEl.search(/\*[^\/]*\//) > -1 || listEl.search(/\*\*[^\/]*\//) > -1) {
      var match = listEl.match(/^([^*]+\/|)(.*)/);
      var root = match[1];
      var rest = match[2];
      var restRegex = rest.replace(/\*\*/g, ".*").replace(/\*/g, "[^\\/]*");
      restRegex = new RegExp(restRegex);

      _ls('-R', root).filter(function (e) {
        return restRegex.test(e);
      }).forEach(function(file) {
        expanded.push(file);
      });
    }
    // Wildcard present on file names ?
    else if (listEl.search(/\*/) > -1) {
      _ls('', listEl).forEach(function(file) {
        expanded.push(file);
      });
    } else {
      expanded.push(listEl);
    }
  });
  return expanded;
}
exports.expand = expand;

// Normalizes _unlinkSync() across platforms to match Unix behavior, i.e.
// file can be unlinked even if it's read-only, see https://github.com/joyent/node/issues/3006
function unlinkSync(file) {
  try {
    fs.unlinkSync(file);
  } catch(e) {
    // Try to override file permission
    if (e.code === 'EPERM') {
      fs.chmodSync(file, '0666');
      fs.unlinkSync(file);
    } else {
      throw e;
    }
  }
}
exports.unlinkSync = unlinkSync;

// e.g. 'shelljs_a5f185d0443ca...'
function randomFileName() {
  function randomHash(count) {
    if (count === 1)
      return parseInt(16*Math.random(), 10).toString(16);
    else {
      var hash = '';
      for (var i=0; i<count; i++)
        hash += randomHash(1);
      return hash;
    }
  }

  return 'shelljs_'+randomHash(20);
}
exports.randomFileName = randomFileName;

// extend(target_obj, source_obj1 [, source_obj2 ...])
// Shallow extend, e.g.:
//    extend({A:1}, {b:2}, {c:3}) returns {A:1, b:2, c:3}
function extend(target) {
  var sources = [].slice.call(arguments, 1);
  sources.forEach(function(source) {
    for (var key in source)
      target[key] = source[key];
  });

  return target;
}
exports.extend = extend;

// Common wrapper for all Unix-like commands
function wrap(cmd, fn, options) {
  return function() {
    var retValue = null;

    state.currentCmd = cmd;
    state.error = null;
    state.errorCode = 0;

    try {
      var args = [].slice.call(arguments, 0);

      if (options && options.notUnix) {
        retValue = fn.apply(this, args);
      } else {
        if (args.length === 0 || typeof args[0] !== 'string' || args[0].length <= 1 || args[0][0] !== '-')
          args.unshift(''); // only add dummy option if '-option' not already present
        // Expand the '~' if appropriate
        var homeDir = getUserHome();
        args = args.map(function(arg) {
          if (typeof arg === 'string' && arg.slice(0, 2) === '~/' || arg === '~')
            return arg.replace(/^~/, homeDir);
          else
            return arg;
        });
        retValue = fn.apply(this, args);
      }
    } catch (e) {
      if (!state.error) {
        // If state.error hasn't been set it's an error thrown by Node, not us - probably a bug...
        console.log('shell.js: internal error');
        console.log(e.stack || e);
        process.exit(1);
      }
      if (config.fatal)
        throw e;
    }

    state.currentCmd = 'shell.js';
    return retValue;
  };
} // wrap
exports.wrap = wrap;
