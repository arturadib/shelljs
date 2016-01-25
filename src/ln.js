var fs = require('fs');
var path = require('path');
var common = require('./common');
var os = require('os');

//@
//@ ### ln([options,] source, dest)
//@ Available options:
//@
//@ + `-s`: symlink
//@ + `-f`: force
//@
//@ Examples:
//@
//@ ```javascript
//@ ln('file', 'newlink');
//@ ln('-sf', 'file', 'existing');
//@ ```
//@
//@ Links source to dest. Use -f to force the link, should dest already exist.
function _ln(options, source, dest) {
  options = common.parseOptions(options, {
    's': 'symlink',
    'f': 'force'
  });

  if (!source || !dest) {
    common.error('Missing <source> and/or <dest>');
  }

  source = String(source);
  dest = path.resolve(process.cwd(), String(dest));

  if (!fs.existsSync(path.resolve(process.cwd(), String(source)))) {
    common.error('Source file does not exist', true);
  }

  if (fs.existsSync(dest)) {
    if (!options.force) {
      common.error('Destination file exists', true);
    }

    fs.unlinkSync(dest);
  }

  if (options.symlink) {
    fs.symlinkSync(source, dest, os.platform() === "win32" ? "junction" : null);
  } else {
    fs.linkSync(source, dest, os.platform() === "win32" ? "junction" : null);
  }
}
module.exports = _ln;
