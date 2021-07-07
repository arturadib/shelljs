import fs from 'fs';

import test from 'ava';

import shell from '..';
import common from '../src/common';
import utils from './utils/utils';

const CWD = process.cwd();

test.beforeEach(t => {
  t.context.tmp = utils.getTempDir();
  shell.config.resetForTesting();
  shell.mkdir(t.context.tmp);
});

test.afterEach.always(t => {
  process.chdir(CWD);
  shell.rm('-rf', t.context.tmp);
});


//
// Invalids
//

test('no such file or dir', t => {
  t.falsy(fs.existsSync('/asdfasdf'));
  const result = shell.ls('/asdfasdf'); // no such file or dir
  t.truthy(shell.error());
  t.is(result.code, 2);
  t.is(result.length, 0);
});

//
// Valids
//

test('it\'s ok to use no arguments', t => {
  const result = shell.ls();
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(shell.errorCode(), 0);
});

test('root directory', t => {
  const result = shell.ls('/');
  t.falsy(shell.error());
  t.is(result.code, 0);
});

test('no args provides the correct result', t => {
  shell.cd('test/resources/ls');
  const result = shell.ls();
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('file1') > -1);
  t.truthy(result.indexOf('file2') > -1);
  t.truthy(result.indexOf('file1.js') > -1);
  t.truthy(result.indexOf('file2.js') > -1);
  t.truthy(result.indexOf('filename(with)[chars$]^that.must+be-escaped') > -1);
  t.truthy(result.indexOf('a_dir') > -1);
  t.is(result.length, 6);
});

test('simple arg', t => {
  const result = shell.ls('test/resources/ls');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('file1') > -1);
  t.truthy(result.indexOf('file2') > -1);
  t.truthy(result.indexOf('file1.js') > -1);
  t.truthy(result.indexOf('file2.js') > -1);
  t.truthy(result.indexOf('filename(with)[chars$]^that.must+be-escaped') > -1);
  t.truthy(result.indexOf('a_dir') > -1);
  t.is(result.length, 6);
});

test('simple arg, with a trailing slash', t => {
  const result = shell.ls('test/resources/ls/');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('file1') > -1);
  t.truthy(result.indexOf('file2') > -1);
  t.truthy(result.indexOf('file1.js') > -1);
  t.truthy(result.indexOf('file2.js') > -1);
  t.truthy(result.indexOf('filename(with)[chars$]^that.must+be-escaped') > -1);
  t.truthy(result.indexOf('a_dir') > -1);
  t.is(result.length, 6);
});

test('simple arg, a file', t => {
  const result = shell.ls('test/resources/ls/file1');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('test/resources/ls/file1') > -1);
  t.is(result.length, 1);
});

test('no args, -A option', t => {
  shell.cd('test/resources/ls');
  const result = shell.ls('-A');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('file1') > -1);
  t.truthy(result.indexOf('file2') > -1);
  t.truthy(result.indexOf('file1.js') > -1);
  t.truthy(result.indexOf('file2.js') > -1);
  t.truthy(result.indexOf('filename(with)[chars$]^that.must+be-escaped') > -1);
  t.truthy(result.indexOf('a_dir') > -1);
  t.truthy(result.indexOf('.hidden_file') > -1);
  t.truthy(result.indexOf('.hidden_dir') > -1);
  t.is(result.length, 8);
});

test('no args, deprecated -a option', t => {
  shell.cd('test/resources/ls');
  const result = shell.ls('-a'); // (deprecated) backwards compatibility test
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('file1') > -1);
  t.truthy(result.indexOf('file2') > -1);
  t.truthy(result.indexOf('file1.js') > -1);
  t.truthy(result.indexOf('file2.js') > -1);
  t.truthy(result.indexOf('filename(with)[chars$]^that.must+be-escaped') > -1);
  t.truthy(result.indexOf('a_dir') > -1);
  t.truthy(result.indexOf('.hidden_file') > -1);
  t.truthy(result.indexOf('.hidden_dir') > -1);
  t.is(result.length, 8);
});

test('wildcard, very simple', t => {
  const result = shell.ls('test/resources/cat/*');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('test/resources/cat/file1') > -1);
  t.truthy(result.indexOf('test/resources/cat/file2') > -1);
  t.truthy(result.indexOf('test/resources/cat/file3') > -1);
  t.truthy(result.indexOf('test/resources/cat/file4') > -1);
  t.truthy(result.indexOf('test/resources/cat/file5') > -1);
  t.is(result.length, 5);
});

test('wildcard, simple', t => {
  const result = shell.ls('test/resources/ls/*');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('test/resources/ls/file1') > -1);
  t.truthy(result.indexOf('test/resources/ls/file2') > -1);
  t.truthy(result.indexOf('test/resources/ls/file1.js') > -1);
  t.truthy(result.indexOf('test/resources/ls/file2.js') > -1);
  t.truthy(
    result.indexOf('test/resources/ls/filename(with)[chars$]^that.must+be-escaped') > -1
  );
  t.is(result.indexOf('test/resources/ls/a_dir'), -1); // this shouldn't be there
  t.truthy(result.indexOf('nada') > -1);
  t.truthy(result.indexOf('b_dir') > -1);
  t.is(result.length, 7);
});

test('wildcard, simple, with -d', t => {
  const result = shell.ls('-d', 'test/resources/ls/*');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('test/resources/ls/file1') > -1);
  t.truthy(result.indexOf('test/resources/ls/file2') > -1);
  t.truthy(result.indexOf('test/resources/ls/file1.js') > -1);
  t.truthy(result.indexOf('test/resources/ls/file2.js') > -1);
  t.truthy(
    result.indexOf('test/resources/ls/filename(with)[chars$]^that.must+be-escaped') > -1
  );
  t.truthy(result.indexOf('test/resources/ls/a_dir') > -1);
  t.is(result.length, 6);
});

test('wildcard, hidden only', t => {
  const result = shell.ls('-d', 'test/resources/ls/.*');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('test/resources/ls/.hidden_file') > -1);
  t.truthy(result.indexOf('test/resources/ls/.hidden_dir') > -1);
  t.is(result.length, 2);
});

test('wildcard, mid-file', t => {
  const result = shell.ls('test/resources/ls/f*le*');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.length, 5);
  t.truthy(result.indexOf('test/resources/ls/file1') > -1);
  t.truthy(result.indexOf('test/resources/ls/file2') > -1);
  t.truthy(result.indexOf('test/resources/ls/file1.js') > -1);
  t.truthy(result.indexOf('test/resources/ls/file2.js') > -1);
  t.truthy(
    result.indexOf('test/resources/ls/filename(with)[chars$]^that.must+be-escaped') > -1
  );
});

test('wildcard, mid-file with dot (should escape dot for regex)', t => {
  const result = shell.ls('test/resources/ls/f*le*.js');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.length, 2);
  t.truthy(result.indexOf('test/resources/ls/file1.js') > -1);
  t.truthy(result.indexOf('test/resources/ls/file2.js') > -1);
});

test('one file that exists, one that doesn\'t', t => {
  const result = shell.ls('test/resources/ls/file1.js', 'test/resources/ls/thisdoesntexist');
  t.truthy(shell.error());
  t.is(result.code, 2);
  t.is(result.length, 1);
  t.truthy(result.indexOf('test/resources/ls/file1.js') > -1);
});

test('one file that exists, one that doesn\'t (other order)', t => {
  const result = shell.ls('test/resources/ls/thisdoesntexist', 'test/resources/ls/file1.js');
  t.truthy(shell.error());
  t.is(result.code, 2);
  t.is(result.length, 1);
  t.truthy(result.indexOf('test/resources/ls/file1.js') > -1);
});

test('wildcard, should not do partial matches', t => {
  const result = shell.ls('test/resources/ls/*.j'); // shouldn't get .js
  t.truthy(shell.error());
  t.is(result.code, 2);
  t.is(result.length, 0);
});

test('wildcard, all files with extension', t => {
  const result = shell.ls('test/resources/ls/*.*');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.length, 3);
  t.truthy(result.indexOf('test/resources/ls/file1.js') > -1);
  t.truthy(result.indexOf('test/resources/ls/file2.js') > -1);
  t.truthy(
    result.indexOf('test/resources/ls/filename(with)[chars$]^that.must+be-escaped') > -1
  );
});

test('wildcard, with additional path', t => {
  const result = shell.ls('test/resources/ls/f*le*.js', 'test/resources/ls/a_dir');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.length, 4);
  t.truthy(result.indexOf('test/resources/ls/file1.js') > -1);
  t.truthy(result.indexOf('test/resources/ls/file2.js') > -1);
  t.truthy(result.indexOf('b_dir') > -1); // no wildcard == no path prefix
  t.truthy(result.indexOf('nada') > -1); // no wildcard == no path prefix
});

test('wildcard for both paths', t => {
  const result = shell.ls('test/resources/ls/f*le*.js', 'test/resources/ls/a_dir/*');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.length, 4);
  t.truthy(result.indexOf('test/resources/ls/file1.js') > -1);
  t.truthy(result.indexOf('test/resources/ls/file2.js') > -1);
  t.truthy(result.indexOf('z') > -1);
  t.truthy(result.indexOf('test/resources/ls/a_dir/nada') > -1);
});

test('wildcard for both paths, array', t => {
  const result = shell.ls(['test/resources/ls/f*le*.js', 'test/resources/ls/a_dir/*']);
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.length, 4);
  t.truthy(result.indexOf('test/resources/ls/file1.js') > -1);
  t.truthy(result.indexOf('test/resources/ls/file2.js') > -1);
  t.truthy(result.indexOf('z') > -1);
  t.truthy(result.indexOf('test/resources/ls/a_dir/nada') > -1);
});

test('recursive, no path', t => {
  shell.cd('test/resources/ls');
  const result = shell.ls('-R');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('a_dir') > -1);
  t.truthy(result.indexOf('a_dir/b_dir') > -1);
  t.truthy(result.indexOf('a_dir/b_dir/z') > -1);
  t.is(result.length, 9);
});

test('recursive, path given', t => {
  const result = shell.ls('-R', 'test/resources/ls');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('a_dir') > -1);
  t.truthy(result.indexOf('a_dir/b_dir') > -1);
  t.truthy(result.indexOf('a_dir/b_dir/z') > -1);
  t.is(result.length, 9);
});

test('-RA flag, path given', t => {
  const result = shell.ls('-RA', 'test/resources/ls');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('a_dir') > -1);
  t.truthy(result.indexOf('a_dir/b_dir') > -1);
  t.truthy(result.indexOf('a_dir/b_dir/z') > -1);
  t.truthy(result.indexOf('a_dir/.hidden_dir/nada') > -1);
  t.is(result.length, 14);
});

test('-RA flag, symlinks are not followed', t => {
  const result = shell.ls('-RA', 'test/resources/rm');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('a_dir') > -1);
  t.truthy(result.indexOf('a_dir/a_file') > -1);
  t.truthy(result.indexOf('link_to_a_dir') > -1);
  t.is(result.indexOf('link_to_a_dir/a_file'), -1);
  t.truthy(result.indexOf('fake.lnk') > -1);
  t.is(result.length, 4);
});

test('-RAL flag, follows symlinks', t => {
  utils.skipOnWin(t, () => {
    const result = shell.ls('-RAL', 'test/resources/rm');
    t.falsy(shell.error());
    t.is(result.code, 0);
    t.truthy(result.indexOf('a_dir') > -1);
    t.truthy(result.indexOf('a_dir/a_file') > -1);
    t.truthy(result.indexOf('link_to_a_dir') > -1);
    t.truthy(result.indexOf('link_to_a_dir/a_file') > -1);
    t.truthy(result.indexOf('fake.lnk') > -1);
    t.is(result.length, 5);
  });
});

test('-L flag, path is symlink', t => {
  utils.skipOnWin(t, () => {
    const result = shell.ls('-L', 'test/resources/rm/link_to_a_dir');
    t.falsy(shell.error());
    t.is(result.code, 0);
    t.truthy(result.indexOf('a_file') > -1);
    t.is(result.length, 1);
  });
});

test('follow links to directories by default', t => {
  utils.skipOnWin(t, () => {
    const result = shell.ls('test/resources/rm/link_to_a_dir');
    t.falsy(shell.error());
    t.is(result.code, 0);
    t.truthy(result.indexOf('a_file') > -1);
    t.is(result.length, 1);
  });
});

test('-Rd works like -d', t => {
  const result = shell.ls('-Rd', 'test/resources/ls');
  t.falsy(shell.error());
  t.is(result.length, 1);
});

test('directory option, single arg', t => {
  const result = shell.ls('-d', 'test/resources/ls');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.length, 1);
});

test('directory option, single arg with trailing \'/\'', t => {
  const result = shell.ls('-d', 'test/resources/ls/');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.length, 1);
});

test('directory option, multiple args', t => {
  const result = shell.ls('-d', 'test/resources/ls/a_dir', 'test/resources/ls/file1');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('test/resources/ls/a_dir') > -1);
  t.truthy(result.indexOf('test/resources/ls/file1') > -1);
  t.is(result.length, 2);
});

test('directory option, globbed arg', t => {
  const result = shell.ls('-d', 'test/resources/ls/*');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('test/resources/ls/a_dir') > -1);
  t.truthy(result.indexOf('test/resources/ls/file1') > -1);
  t.truthy(result.indexOf('test/resources/ls/file1.js') > -1);
  t.truthy(result.indexOf('test/resources/ls/file2') > -1);
  t.truthy(result.indexOf('test/resources/ls/file2.js') > -1);
  t.truthy(result.indexOf('test/resources/ls/file2') > -1);
  t.truthy(
    result.indexOf('test/resources/ls/filename(with)[chars$]^that.must+be-escaped') > -1
  );
  t.is(result.length, 6);
});

test('long option, single file', t => {
  let result = shell.ls('-l', 'test/resources/ls/file1');
  t.is(result.length, 1);
  result = result[0];
  t.falsy(shell.error());
  t.truthy(result.name, 'file1');
  t.is(result.nlink, 1);
  t.is(result.size, 5);
  t.truthy(result.mode); // check that these keys exist
  utils.skipOnWin(t, () => {
    t.truthy(result.uid);
    t.truthy(result.gid);
  });
  t.truthy(result.mtime); // check that these keys exist
  t.truthy(result.atime); // check that these keys exist
  t.truthy(result.ctime); // check that these keys exist
  t.truthy(result.toString().match(/^(\d+ +){5}.*$/));
});

test('long option, glob files', t => {
  let result = shell.ls('-l', 'test/resources/ls/f*le1');
  t.is(result.length, 1);
  result = result[0];
  t.falsy(shell.error());
  t.truthy(result.name, 'file1');
  t.is(result.nlink, 1);
  t.is(result.size, 5);
  t.truthy(result.mode); // check that these keys exist
  utils.skipOnWin(t, () => {
    t.truthy(result.uid);
    t.truthy(result.gid);
  });
  t.truthy(result.mtime); // check that these keys exist
  t.truthy(result.atime); // check that these keys exist
  t.truthy(result.ctime); // check that these keys exist
  t.truthy(result.toString().match(/^(\d+ +){5}.*$/));
});

test('long option, directory', t => {
  let result = shell.ls('-l', 'test/resources/ls');
  t.falsy(shell.error());
  t.is(result.code, 0);
  const idx = result.map(r => r.name).indexOf('file1');
  t.truthy(idx >= 0);
  t.is(result.length, 6);
  result = result[idx];
  t.is(result.name, 'file1');
  t.is(result.nlink, 1);
  t.is(result.size, 5);
  t.truthy(result.mode); // check that these keys exist
  utils.skipOnWin(t, () => {
    t.truthy(result.uid);
    t.truthy(result.gid);
  });
  t.truthy(result.mtime); // check that these keys exist
  t.truthy(result.atime); // check that these keys exist
  t.truthy(result.ctime); // check that these keys exist
  t.truthy(result.toString().match(/^(\d+ +){5}.*$/));
});

test('long option, directory, recursive (and windows converts slashes)', t => {
  let result = shell.ls('-lR', 'test/resources/ls/');
  t.falsy(shell.error());
  t.is(result.code, 0);
  const idx = result.map(r => r.name).indexOf('a_dir/b_dir');
  t.is(result.length, 9);
  t.truthy(idx >= 0);
  result = result[idx];
  t.is(result.name, result.name);
  t.truthy(common.statFollowLinks('test/resources/ls/a_dir/b_dir').isDirectory());
  t.is(typeof result.nlink, 'number'); // This can vary between the local machine and travis
  t.is(typeof result.size, 'number'); // This can vary between different file systems
  t.truthy(result.mode); // check that these keys exist
  utils.skipOnWin(t, () => {
    t.truthy(result.uid);
    t.truthy(result.gid);
  });
  t.truthy(result.mtime); // check that these keys exist
  t.truthy(result.atime); // check that these keys exist
  t.truthy(result.ctime); // check that these keys exist
  t.truthy(result.toString().match(/^(\d+ +){5}.*$/));
});

test('still lists broken links', t => {
  const result = shell.ls('test/resources/badlink');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('test/resources/badlink') > -1);
  t.is(result.length, 1);
});

test('Test new ShellString-like attributes', t => {
  const result = shell.ls('test/resources/ls');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.stdout.indexOf('file1') > -1);
  t.truthy(result.stdout.indexOf('file2') > -1);
  t.truthy(result.stdout.indexOf('file1.js') > -1);
  t.truthy(result.stdout.indexOf('file2.js') > -1);
  t.truthy(
    result.stdout.indexOf('filename(with)[chars$]^that.must+be-escaped') > -1
  );
  t.truthy(result.stdout.indexOf('a_dir') > -1);
  t.is(typeof result.stdout, 'string');
  t.truthy(result.to);
  t.truthy(result.toEnd);
  result.to(`${t.context.tmp}/testingToOutput.txt`);
  t.is(shell.cat(`${t.context.tmp}/testingToOutput.txt`).toString(), result.stdout);
  shell.rm(`${t.context.tmp}/testingToOutput.txt`);
});

test('No trailing newline for ls() on empty directories', t => {
  shell.mkdir('foo');
  t.falsy(shell.error());
  const result = shell.ls('foo');
  t.falsy(shell.error());
  t.is(result.stdout, '');
  shell.rm('-r', 'foo');
  t.falsy(shell.error());
});

test('Check stderr field', t => {
  t.falsy(fs.existsSync('/asdfasdf')); // sanity check
  const result = shell.ls('test/resources/ls/file1', '/asdfasdf');
  t.truthy(shell.error());
  t.is('ls: no such file or directory: /asdfasdf', result.stderr);
});

test('non-normalized paths are still ok with -R', t => {
  const result = shell.ls('-R', 'test/resources/./ls/../ls');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.truthy(result.indexOf('a_dir') > -1);
  t.truthy(result.indexOf('a_dir/b_dir') > -1);
  t.truthy(result.indexOf('a_dir/b_dir/z') > -1);
  t.is(result.length, 9);
});
