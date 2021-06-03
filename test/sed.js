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

test('no arguments', t => {
  const result = shell.sed();
  t.truthy(shell.error());
  t.is(result.code, 1);
  t.truthy(result.stderr);
});

test('only one argument', t => {
  const result = shell.sed(/asdf/g);
  t.truthy(shell.error());
  t.is(result.code, 1);
});

test('only two arguments', t => {
  const result = shell.sed(/asdf/g, 'nada');
  t.truthy(shell.error());
  t.is(result.code, 1);
});

test('no such file', t => {
  t.falsy(fs.existsSync('asdfasdf')); // sanity check
  const result = shell.sed(/asdf/g, 'nada', 'asdfasdf');
  t.truthy(shell.error());
  t.is(result.code, 2);
  t.is(result.stderr, 'sed: no such file or directory: asdfasdf');
});

// TODO(nate): flaky test
test('if at least one file is missing, this should be an error', t => {
  t.falsy(fs.existsSync('asdfasdf')); // sanity check
  t.truthy(fs.existsSync(`${t.context.tmp}/file1`)); // sanity check
  const result = shell.sed(/asdf/g, 'nada', `${t.context.tmp}/file1`, 'asdfasdf');
  t.truthy(shell.error());
  t.is(result.code, 2);
  t.is(result.stderr, 'sed: no such file or directory: asdfasdf');
});

//
// Valids
//

test('search with a string', t => {
  const result = shell.sed('test1', 'hello', `${t.context.tmp}/file1`);
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.toString(), 'hello');
});

test('search with a regex', t => {
  const result = shell.sed(/test1/, 'hello', `${t.context.tmp}/file1`);
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.toString(), 'hello');
});

test('replace with a number instead of a string', t => {
  const result = shell.sed(/test1/, 1234, `${t.context.tmp}/file1`);
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.toString(), '1234');
});

test('replace using a function', t => {
  const replaceFun = match => match.toUpperCase() + match;
  const result = shell.sed(/test1/, replaceFun, `${t.context.tmp}/file1`);
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.toString(), 'TEST1test1');
});

test('-i option', t => {
  const result = shell.sed('-i', /test1/, 'hello', `${t.context.tmp}/file1`);
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.toString(), '');
  t.is(shell.cat(`${t.context.tmp}/file1`).toString(), 'hello');
});

test('make sure * in regex is not globbed', t => {
  const result = shell.sed(/alpha*beta/, 'hello', 'test/resources/grep/file');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(
    result.toString(),
    'hello\nhowareyou\nhello\nthis line ends in.js\nlllllllllllllllll.js\n'
  );
});

test('make sure * in string-regex is not globbed', t => {
  const result = shell.sed('alpha*beta', 'hello', 'test/resources/grep/file');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(
    result.toString(),
    'hello\nhowareyou\nhello\nthis line ends in.js\nlllllllllllllllll.js\n'
  );
});

test('make sure * in regex is not globbed (matches something)', t => {
  const result = shell.sed(/l*\.js/, '', 'test/resources/grep/file');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(
    result.toString(),
    'alphaaaaaaabeta\nhowareyou\nalphbeta\nthis line ends in\n\n'
  );
});

test('make sure * in string-regex is not globbed (matches something)', t => {
  const result = shell.sed('l*\\.js', '', 'test/resources/grep/file');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(
    result.toString(),
    'alphaaaaaaabeta\nhowareyou\nalphbeta\nthis line ends in\n\n'
  );
});

test('multiple file names', t => {
  const result = shell.sed('test', 'hello', `${t.context.tmp}/file1`,
    `${t.context.tmp}/file2`);
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.toString(), 'hello1\nhello2');
});

test('array of file names (and try it out with a simple regex)', t => {
  const result = shell.sed(/t.*st/, 'hello', [`${t.context.tmp}/file1`,
    `${t.context.tmp}/file2`]);
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.toString(), 'hello1\nhello2');
});

test('multiple file names, with in-place-replacement', t => {
  const result = shell.sed('-i', 'test', 'hello', [`${t.context.tmp}/file1`,
    `${t.context.tmp}/file2`]);
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.toString(), '');
  t.is(shell.cat(`${t.context.tmp}/file1`).toString(), 'hello1');
  t.is(shell.cat(`${t.context.tmp}/file2`).toString(), 'hello2');
});

test('glob file names, with in-place-replacement', t => {
  t.is(shell.cat(`${t.context.tmp}/file1.txt`).toString(), 'test1\n');
  t.is(shell.cat(`${t.context.tmp}/file2.txt`).toString(), 'test2\n');
  const result = shell.sed('-i', 'test', 'hello', `${t.context.tmp}/file*.txt`);
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.toString(), '');
  t.is(shell.cat(`${t.context.tmp}/file1.txt`).toString(), 'hello1\n');
  t.is(shell.cat(`${t.context.tmp}/file2.txt`).toString(), 'hello2\n');
});

test('empty file', t => {
  const result = shell.sed('widget', 'wizzle', 'test/resources/sed/empty.txt');
  t.is(result.code, 0);
  t.is(result.toString(), '');
});
