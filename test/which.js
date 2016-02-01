var shell = require('..');
var assert = require('assert');
var fs = require('fs');

var result;

shell.config.silent = true;

shell.rm('-rf', 'tmp');
shell.mkdir('tmp');

//
// Invalids
//
shell.which();
assert.ok(shell.error());

result = shell.which('asdfasdfasdfasdfasdf'); // what are the odds...
assert.ok(!shell.error());
assert.ok(!result);

var node = shell.which('node');
assert.ok(!shell.error());
assert.ok(fs.existsSync(node));

if (process.platform === 'win32') {
    // This should be equivalent on Windows
  var nodeExe = shell.which('node.exe');
  assert.ok(!shell.error());
    // If the paths are equal, then this file *should* exist, since that's
    // already been checked.
  assert.equal(node, nodeExe);
}

shell.exit(123);
