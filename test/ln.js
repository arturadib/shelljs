import fs from 'fs';
import path from 'path';

import test from 'ava';

import shell from '..';
import utils from './utils/utils';

const CWD = process.cwd();

test.beforeEach(t => {
  t.context.tmp = utils.getTempDir();
  shell.config.resetForTesting();
  shell.cp('-r', 'test/resources', t.context.tmp);
  process.chdir(CWD);
});

test.afterEach.always(t => {
  process.chdir(CWD);
  shell.rm('-rf', t.context.tmp);
});


//
// Invalids
//

test('no args', t => {
  const result = shell.ln();
  t.truthy(shell.error());
  t.is(result.code, 1);
});

test('too few args', t => {
  const result = shell.ln('file');
  t.truthy(shell.error());
  t.is(result.code, 1);
});

test('only an option', t => {
  const result = shell.ln('-f');
  t.truthy(shell.error());
  t.is(result.code, 1);
});

test('destination already exists', t => {
  const result = shell.ln(`${t.context.tmp}/file1`, `${t.context.tmp}/file2`);
  t.truthy(shell.error());
  t.is(result.code, 1);
});

test('destination already exists inside directory', t => {
  shell.cd(t.context.tmp);
  const result = shell.ln('-s', 'file1', './');
  t.truthy(shell.error());
  t.is(result.code, 1);
});

test('non-existent source', t => {
  const result = shell.ln(`${t.context.tmp}/noexist`, `${t.context.tmp}/linkfile1`);
  t.truthy(shell.error());
  t.is(result.code, 1);
});

test('non-existent source (-sf)', t => {
  const result = shell.ln('-sf', 'no/exist', `${t.context.tmp}/badlink`);
  t.truthy(shell.error());
  t.is(result.code, 1);
});

test('non-existent source (-f)', t => {
  const result = shell.ln('-f', 'noexist', `${t.context.tmp}/badlink`);
  t.truthy(shell.error());
  t.is(result.code, 1);
});

//
// Valids
//

test('basic usage', t => {
  const result = shell.ln(`${t.context.tmp}/file1`, `${t.context.tmp}/linkfile1`);
  t.truthy(fs.existsSync(`${t.context.tmp}/linkfile1`));
  t.is(
    fs.readFileSync(`${t.context.tmp}/file1`).toString(),
    fs.readFileSync(`${t.context.tmp}/linkfile1`).toString()
  );
  fs.writeFileSync(`${t.context.tmp}/file1`, 'new content 1');
  t.is(fs.readFileSync(`${t.context.tmp}/linkfile1`).toString(), 'new content 1');
  t.is(result.code, 0);
});

test('With glob', t => {
  shell.rm(`${t.context.tmp}/linkfile1`);
  const result = shell.ln(`${t.context.tmp}/fi*1`, `${t.context.tmp}/linkfile1`);
  t.truthy(fs.existsSync(`${t.context.tmp}/linkfile1`));
  t.is(
    fs.readFileSync(`${t.context.tmp}/file1`).toString(),
    fs.readFileSync(`${t.context.tmp}/linkfile1`).toString()
  );
  fs.writeFileSync(`${t.context.tmp}/file1`, 'new content 1');
  t.is(fs.readFileSync(`${t.context.tmp}/linkfile1`).toString(), 'new content 1');
  t.is(result.code, 0);
});

test('-s option', t => {
  utils.skipOnWinForEPERM(shell.ln.bind(shell, '-s', 'file2', `${t.context.tmp}/linkfile2`), () => {
    t.truthy(fs.existsSync(`${t.context.tmp}/linkfile2`));
    t.is(
      fs.readFileSync(`${t.context.tmp}/file2`).toString(),
      fs.readFileSync(`${t.context.tmp}/linkfile2`).toString()
    );
    fs.writeFileSync(`${t.context.tmp}/file2`, 'new content 2');
    t.is(fs.readFileSync(`${t.context.tmp}/linkfile2`).toString(), 'new content 2');
  });
});

test('Symbolic link directory test', t => {
  shell.mkdir(`${t.context.tmp}/ln`);
  shell.touch(`${t.context.tmp}/ln/hello`);
  const result = shell.ln('-s', 'ln', `${t.context.tmp}/dir1`);
  t.truthy(fs.existsSync(`${t.context.tmp}/ln/hello`));
  t.truthy(fs.existsSync(`${t.context.tmp}/dir1/hello`));
  t.is(result.code, 0);
});

test('To current directory', t => {
  shell.cd(t.context.tmp);
  let result = shell.ln('-s', './', 'dest');
  t.is(result.code, 0);
  shell.touch('testfile.txt');
  t.truthy(fs.existsSync('testfile.txt'));
  t.truthy(fs.existsSync('dest/testfile.txt'));
  shell.rm('-f', 'dest');
  shell.mkdir('dir1');
  shell.cd('dir1');
  result = shell.ln('-s', './', '../dest');
  t.is(result.code, 0);
  shell.touch('insideDir.txt');
  shell.cd('..');
  t.truthy(fs.existsSync('testfile.txt'));
  t.truthy(fs.existsSync('dest/testfile.txt'));
  t.truthy(fs.existsSync('dir1/insideDir.txt'));
  t.falsy(fs.existsSync('dest/insideDir.txt'));
});

test('Inside existing directory', t => {
  shell.cd(t.context.tmp);
  const result = shell.ln('-s', 'external/node_script.js', './');
  t.is(result.code, 0);
  t.falsy(result.stderr);
  t.falsy(shell.error());
  t.truthy(fs.existsSync('node_script.js'));
  t.is(
    fs.readFileSync('external/node_script.js').toString(),
    fs.readFileSync('node_script.js').toString()
  );
});

test('Link to dead source links', t => {
  shell.cd(t.context.tmp);
  const result = shell.ln('-s', 'badlink', 'link-to-dead-link');
  t.is(result.code, 0);
  t.falsy(result.stderr);
  t.falsy(shell.error());
  fs.lstatSync('link-to-dead-link');
});

test('-f option', t => {
  const result = shell.ln('-f', `${t.context.tmp}/file1.js`, `${t.context.tmp}/file2.js`);
  t.is(result.code, 0);
  t.truthy(fs.existsSync(`${t.context.tmp}/file2.js`));
  t.is(
    fs.readFileSync(`${t.context.tmp}/file1.js`).toString(),
    fs.readFileSync(`${t.context.tmp}/file2.js`).toString()
  );
  fs.writeFileSync(`${t.context.tmp}/file1.js`, 'new content js');
  t.is(fs.readFileSync(`${t.context.tmp}/file2.js`).toString(), 'new content js');
});

test('-sf option', t => {
  utils.skipOnWinForEPERM(shell.ln.bind(shell, '-sf', 'file1.txt', `${t.context.tmp}/file2.txt`), () => {
    t.truthy(fs.existsSync(`${t.context.tmp}/file2.txt`));
    t.is(
      fs.readFileSync(`${t.context.tmp}/file1.txt`).toString(),
      fs.readFileSync(`${t.context.tmp}/file2.txt`).toString()
    );
    fs.writeFileSync(`${t.context.tmp}/file1.txt`, 'new content txt');
    t.is(fs.readFileSync(`${t.context.tmp}/file2.txt`).toString(), 'new content txt');
  });
});

test('Override dead destination links with -sf', t => {
  shell.cd(t.context.tmp);
  const result = shell.ln('-sf', 'file1.txt', 'badlink');
  t.is(result.code, 0);
  t.falsy(result.stderr);
  t.falsy(shell.error());
  t.is(
    fs.readFileSync('file1.txt').toString(),
    fs.readFileSync('badlink').toString()
  );
});

test('Abspath regression', t => {
  utils.skipOnWinForEPERM(shell.ln.bind(shell, '-sf', 'file1', path.resolve(`${t.context.tmp}/abspath`)), () => {
    t.truthy(fs.existsSync(`${t.context.tmp}/abspath`));
    t.is(
      fs.readFileSync(`${t.context.tmp}/file1`).toString(),
      fs.readFileSync(`${t.context.tmp}/abspath`).toString()
    );
    fs.writeFileSync(`${t.context.tmp}/file1`, 'new content 3');
    t.is(fs.readFileSync(`${t.context.tmp}/abspath`).toString(), 'new content 3');
  });
});

test('Relative regression', t => {
  utils.skipOnWinForEPERM(shell.ln.bind(shell, '-sf', 'file1.txt', `${t.context.tmp}/file2.txt`), () => {
    shell.mkdir('-p', `${t.context.tmp}/new`);
    // Move the symlink first, as the reverse confuses `mv`.
    shell.mv(`${t.context.tmp}/file2.txt`, `${t.context.tmp}/new/file2.txt`);
    shell.mv(`${t.context.tmp}/file1.txt`, `${t.context.tmp}/new/file1.txt`);
    t.truthy(fs.existsSync(`${t.context.tmp}/new/file2.txt`));
    t.is(
      fs.readFileSync(`${t.context.tmp}/new/file1.txt`).toString(),
      fs.readFileSync(`${t.context.tmp}/new/file2.txt`).toString()
    );
    fs.writeFileSync(`${t.context.tmp}/new/file1.txt`, 'new content txt');
    t.is(fs.readFileSync(`${t.context.tmp}/new/file2.txt`).toString(), 'new content txt');
  });
});
