import fs from 'fs';

import test from 'ava';

import shell from '..';
import utils from './utils/utils';

test.beforeEach(t => {
  t.context.tmp = utils.getTempDir();
  shell.config.resetForTesting();
  shell.cp('-r', 'test/resources', t.context.tmp);
});

test.afterEach.always(t => {
  shell.rm('-rf', t.context.tmp);
});


//
// Invalids
//

test('no args', t => {
  const result = shell.grep();
  t.truthy(shell.error());
  t.is(result.code, 2);
  t.is(shell.errorCode(), 2);
});

test('too few args', t => {
  const result = shell.grep(/asdf/g); // too few args
  t.truthy(shell.error());
  t.is(result.code, 2);
});

test('no such file', t => {
  t.falsy(fs.existsSync('/asdfasdf')); // sanity check
  const result = shell.grep(/asdf/g, '/asdfasdf'); // no such file
  t.truthy(shell.error());
  t.is(result.stderr, 'grep: no such file or directory: /asdfasdf');
  t.is(result.code, 2);
});

test('if at least one file is missing, this should be an error', t => {
  t.falsy(fs.existsSync('asdfasdf')); // sanity check
  t.truthy(fs.existsSync(`${t.context.tmp}/file1`)); // sanity check
  const result = shell.grep(/asdf/g, `${t.context.tmp}/file1`, 'asdfasdf');
  t.truthy(shell.error());
  t.is(result.stderr, 'grep: no such file or directory: asdfasdf');
  t.is(result.code, 2);
});

test("multiple files, one doesn't exist, one doesn't match", t => {
  const result = shell.grep(/oogabooga/, 'test/resources/file1.txt',
    'test/resources/filedoesnotexist.txt');
  t.truthy(shell.error());
  t.is(result.code, 2);
});

//
// Valids
//

test('basic', t => {
  const result = shell.grep('line', 'test/resources/a.txt');
  t.falsy(shell.error());
  t.is(result.split('\n').length - 1, 4);
});

test('-v option', t => {
  const result = shell.grep('-v', 'line', 'test/resources/a.txt');
  t.falsy(shell.error());
  t.is(result.split('\n').length - 1, 8);
});

test('matches one line', t => {
  const result = shell.grep('line one', 'test/resources/a.txt');
  t.falsy(shell.error());
  t.is(result.toString(), 'This is line one\n');
});

test('multiple files', t => {
  const result = shell.grep(/test/, 'test/resources/file1.txt',
    'test/resources/file2.txt');
  t.falsy(shell.error());
  t.is(result.toString(), 'test1\ntest2\n');
});

test('multiple files, array syntax', t => {
  const result = shell.grep(/test/, ['test/resources/file1.txt',
    'test/resources/file2.txt']);
  t.falsy(shell.error());
  t.is(result.toString(), 'test1\ntest2\n');
});

test('multiple files, glob syntax, * for file name', t => {
  const result = shell.grep(/test/, 'test/resources/file*.txt');
  t.falsy(shell.error());
  t.truthy(result.toString(), 'test1\ntest2\n');
});

test('multiple files, glob syntax, * for directory name', t => {
  const result = shell.grep(/test/, 'test/r*/file*.txt');
  t.falsy(shell.error());
  t.is(result.toString(), 'test1\ntest2\n');
});

test('multiple files, double-star glob', t => {
  const result = shell.grep(/test/, 'test/resources/**/file*.js');
  t.falsy(shell.error());
  t.is(result.toString(), 'test\ntest\ntest\ntest\n');
});

test('one file, * in regex', t => {
  const result = shell.grep(/alpha*beta/, 'test/resources/grep/file');
  t.falsy(shell.error());
  t.is(result.toString(), 'alphaaaaaaabeta\nalphbeta\n');
});

test('one file, * in string-regex', t => {
  const result = shell.grep('alpha*beta', 'test/resources/grep/file');
  t.falsy(shell.error());
  t.is(result.toString(), 'alphaaaaaaabeta\nalphbeta\n');
});

test('one file, * in regex, make sure * is not globbed', t => {
  const result = shell.grep(/l*\.js/, 'test/resources/grep/file');
  t.falsy(shell.error());
  t.is(result.toString(), 'this line ends in.js\nlllllllllllllllll.js\n');
});

test('one file, * in string-regex, make sure * is not globbed', t => {
  const result = shell.grep('l*\\.js', 'test/resources/grep/file');
  t.falsy(shell.error());
  t.is(result.toString(), 'this line ends in.js\nlllllllllllllllll.js\n');
});

test("one file, pattern doesn't match", t => {
  const result = shell.grep('notfoundstring', 'test/resources/grep/file');
  t.truthy(shell.error());
  t.is(result.toString(), '');
  t.is(result.stdout, '');
  // TODO(#900): "grep: " isn't really the correct stderr output, but we need a
  // non-empty string so `shell.error()` is truthy.
  t.is(result.stderr, 'grep: ');
  t.is(result.code, 1);
});

test('-l option', t => {
  const result = shell.grep('-l', 'test1', 'test/resources/file1', 'test/resources/file2',
    'test/resources/file1.txt');
  t.falsy(shell.error());
  t.truthy(result.match(/file1(\n|$)/));
  t.truthy(result.match(/file1.txt/));
  t.falsy(result.match(/file2.txt/));
  t.is(result.split('\n').length - 1, 2);
});

test('-i option', t => {
  const result = shell.grep('-i', 'test', 'test/resources/grep/case1', 'test/resources/grep/case1.txt',
    'test/resources/grep/case1.js');
  t.falsy(shell.error());
  t.is(result.split('\n').length - 1, 3);
});

test('the pattern looks like an option', t => {
  const result = shell.grep('--', '-v', 'test/resources/grep/file2');
  t.falsy(shell.error());
  t.is(result.toString(), '-v\n-vv\n');
});
