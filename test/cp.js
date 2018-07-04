import fs from 'fs';

import test from 'ava';

import shell from '..';
import common from '../src/common';
import utils from './utils/utils';

const oldMaxDepth = shell.config.maxdepth;
const CWD = process.cwd();

test.beforeEach(t => {
  t.context.tmp = utils.getTempDir();
  shell.config.resetForTesting();
  shell.mkdir(t.context.tmp);
});

test.afterEach.always(t => {
  process.chdir(CWD);
  shell.rm('-rf', t.context.tmp);
  shell.config.maxdepth = oldMaxDepth;
});

//
// Invalids
//

test('no args', t => {
  const result = shell.cp();
  t.truthy(shell.error());
  t.is(result.code, 1);
  t.is(result.stderr, 'cp: missing <source> and/or <dest>');
});

test('no destination', t => {
  const result = shell.cp('file1');
  t.truthy(shell.error());
  t.is(result.code, 1);
  t.is(result.stderr, 'cp: missing <source> and/or <dest>');
});

test('only an option', t => {
  const result = shell.cp('-f');
  t.truthy(shell.error());
  t.is(result.code, 1);
  t.is(result.stderr, 'cp: missing <source> and/or <dest>');
});

test('invalid option', t => {
  const result = shell.cp('-@', 'test/resources/file1', `${t.context.tmp}/file1`);
  t.truthy(shell.error());
  t.is(result.code, 1);
  t.falsy(fs.existsSync(`${t.context.tmp}/file1`));
  t.is(result.stderr, 'cp: option not recognized: @');
});

test('invalid option', t => {
  const result = shell.cp('-Z', 'asdfasdf', `${t.context.tmp}/file2`);
  t.truthy(shell.error());
  t.is(result.code, 1);
  t.falsy(fs.existsSync(`${t.context.tmp}/file2`));
  t.is(result.stderr, 'cp: option not recognized: Z');
});

test('source does not exist', t => {
  const result = shell.cp('asdfasdf', t.context.tmp);
  t.truthy(shell.error());
  t.is(result.code, 1);
  t.is(utils.numLines(result.stderr), 1);
  t.falsy(fs.existsSync(`${t.context.tmp}/asdfasdf`));
  t.is(result.stderr, 'cp: no such file or directory: asdfasdf');
});

test('multiple sources do not exist', t => {
  const result = shell.cp('asdfasdf1', 'asdfasdf2', t.context.tmp);
  t.truthy(shell.error());
  t.is(result.code, 1);
  t.is(utils.numLines(result.stderr), 2);
  t.falsy(fs.existsSync(`${t.context.tmp}/asdfasdf1`));
  t.falsy(fs.existsSync(`${t.context.tmp}/asdfasdf2`));
  t.is(
    result.stderr,
    'cp: no such file or directory: asdfasdf1\ncp: no such file or directory: asdfasdf2'
  );
});

test('too many sources', t => {
  const result = shell.cp('asdfasdf1', 'asdfasdf2', 'test/resources/file1');
  t.truthy(shell.error());
  t.is(result.code, 1);
  t.is(result.stderr, 'cp: dest is not a directory (too many sources)');
});

test('too many sources #2', t => {
  const result = shell.cp('test/resources/file1', 'test/resources/file2', `${t.context.tmp}/a_file`);
  t.truthy(shell.error());
  t.is(result.code, 1);
  t.falsy(fs.existsSync(`${t.context.tmp}/a_file`));
  t.is(result.stderr, 'cp: dest is not a directory (too many sources)');
});

test('empty string source', t => {
  const result = shell.cp('', 'dest');
  t.truthy(shell.error());
  t.is(result.code, 1);
  t.is(result.stderr, "cp: no such file or directory: ''");
});

//
// Valids
//

test('dest already exists', t => {
  const oldContents = shell.cat('test/resources/file2').toString();
  const result = shell.cp('-n', 'test/resources/file1', 'test/resources/file2');
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.is(result.stderr, '');
  t.is(shell.cat('test/resources/file2').toString(), oldContents);
});

test('-nR does not overwrite an existing file at the destination', t => {
  // Create tmp/new/cp/a
  const dest = `${t.context.tmp}/new/cp`;
  shell.mkdir('-p', dest);
  const oldContents = 'original content';
  shell.ShellString(oldContents).to(`${dest}/a`);

  // Attempt to overwrite /tmp/new/cp/ with test/resources/cp/
  const result = shell.cp('-nR', 'test/resources/cp/', `${t.context.tmp}/new/`);
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.falsy(result.stderr);
  t.is(shell.cat(`${dest}/a`).toString(), oldContents);
});

test('-n does not overwrite an existing file if the destination is a directory', t => {
  const oldContents = 'original content';
  shell.cp('test/resources/file1', `${t.context.tmp}`);
  new shell.ShellString(oldContents).to(`${t.context.tmp}/file1`);
  const result = shell.cp('-n', 'test/resources/file1', `${t.context.tmp}`);
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.falsy(result.stderr);
  t.is(shell.cat(`${t.context.tmp}/file1`).toString(), oldContents);
});

test('-f by default', t => {
  shell.cp('test/resources/file2', 'test/resources/copyfile2');
  const result = shell.cp('test/resources/file1', 'test/resources/file2'); // dest already exists
  t.falsy(shell.error());
  t.is(result.code, 0);
  t.falsy(result.stderr);
  t.is(shell.cat('test/resources/file1').toString(), shell.cat('test/resources/file2').toString()); // after cp
  shell.mv('test/resources/copyfile2', 'test/resources/file2'); // restore
  t.falsy(shell.error());
});

test('-f (explicitly)', t => {
  shell.cp('test/resources/file2', 'test/resources/copyfile2');
  const result = shell.cp('-f', 'test/resources/file1', 'test/resources/file2'); // dest already exists
  t.falsy(shell.error());
  t.falsy(result.stderr);
  t.is(result.code, 0);
  t.is(shell.cat('test/resources/file1').toString(), shell.cat('test/resources/file2').toString()); // after cp
  shell.mv('test/resources/copyfile2', 'test/resources/file2'); // restore
  t.falsy(shell.error());
  t.is(result.code, 0);
});

test('simple - to dir', t => {
  const result = shell.cp('test/resources/file1', t.context.tmp);
  t.falsy(shell.error());
  t.falsy(result.stderr);
  t.is(result.code, 0);
  t.truthy(fs.existsSync(`${t.context.tmp}/file1`));
});

test('simple - to file', t => {
  const result = shell.cp('test/resources/file2', `${t.context.tmp}/file2`);
  t.falsy(shell.error());
  t.falsy(result.stderr);
  t.is(result.code, 0);
  t.truthy(fs.existsSync(`${t.context.tmp}/file2`));
});

test('simple - file list', t => {
  const result = shell.cp('test/resources/file1', 'test/resources/file2', t.context.tmp);
  t.falsy(shell.error());
  t.falsy(result.stderr);
  t.is(result.code, 0);
  t.truthy(fs.existsSync(`${t.context.tmp}/file1`));
  t.truthy(fs.existsSync(`${t.context.tmp}/file2`));
});

test('simple - file list, array syntax', t => {
  const result = shell.cp(['test/resources/file1', 'test/resources/file2'], t.context.tmp);
  t.falsy(shell.error());
  t.falsy(result.stderr);
  t.is(result.code, 0);
  t.truthy(fs.existsSync(`${t.context.tmp}/file1`));
  t.truthy(fs.existsSync(`${t.context.tmp}/file2`));
});

test('-f option', t => {
  shell.cp('test/resources/file2', `${t.context.tmp}/file3`);
  t.truthy(fs.existsSync(`${t.context.tmp}/file3`));
  const result = shell.cp('-f', 'test/resources/file2', `${t.context.tmp}/file3`); // file exists, but -f specified
  t.falsy(shell.error());
  t.falsy(result.stderr);
  t.is(result.code, 0);
  t.truthy(fs.existsSync(`${t.context.tmp}/file3`));
});

test('glob', t => {
  const result = shell.cp('test/resources/file?', t.context.tmp);
  t.falsy(shell.error());
  t.falsy(result.stderr);
  t.is(result.code, 0);
  t.truthy(fs.existsSync(`${t.context.tmp}/file1`));
  t.truthy(fs.existsSync(`${t.context.tmp}/file2`));
  t.falsy(fs.existsSync(`${t.context.tmp}/file1.js`));
  t.falsy(fs.existsSync(`${t.context.tmp}/file2.js`));
  t.falsy(fs.existsSync(`${t.context.tmp}/file1.txt`));
  t.falsy(fs.existsSync(`${t.context.tmp}/file2.txt`));
});

test('wildcard', t => {
  shell.rm(`${t.context.tmp}/file1`, `${t.context.tmp}/file2`);
  const result = shell.cp('test/resources/file*', t.context.tmp);
  t.falsy(shell.error());
  t.falsy(result.stderr);
  t.is(result.code, 0);
  t.truthy(fs.existsSync(`${t.context.tmp}/file1`));
  t.truthy(fs.existsSync(`${t.context.tmp}/file2`));
  t.truthy(fs.existsSync(`${t.context.tmp}/file1.js`));
  t.truthy(fs.existsSync(`${t.context.tmp}/file2.js`));
  t.truthy(fs.existsSync(`${t.context.tmp}/file1.txt`));
  t.truthy(fs.existsSync(`${t.context.tmp}/file2.txt`));
});

test('recursive, with regular files', t => {
  const result = shell.cp('-R', 'test/resources/file1', 'test/resources/file2', t.context.tmp);
  t.falsy(shell.error());
  t.falsy(result.stderr);
  t.is(result.code, 0);
  t.truthy(fs.existsSync(`${t.context.tmp}/file1`));
  t.truthy(fs.existsSync(`${t.context.tmp}/file2`));
});

test('omit directory if missing recursive flag', t => {
  const result = shell.cp('test/resources/cp', t.context.tmp);
  t.is(shell.error(), "cp: omitting directory 'test/resources/cp'");
  t.is(result.stderr, "cp: omitting directory 'test/resources/cp'");
  t.is(result.code, 1);
  t.falsy(fs.existsSync(`${t.context.tmp}/file1`));
  t.falsy(fs.existsSync(`${t.context.tmp}/file2`));
});

test('recursive, nothing exists', t => {
  const result = shell.cp('-R', 'test/resources/cp', t.context.tmp);
  t.falsy(shell.error());
  t.falsy(result.stderr);
  t.is(result.code, 0);
  t.is(shell.ls('-R', 'test/resources/cp').toString(), shell.ls('-R', `${t.context.tmp}/cp`).toString());
});

test(
  'recursive, nothing exists, source ends in \'/\' (see Github issue #15)',
  t => {
    const result = shell.cp('-R', 'test/resources/cp/', `${t.context.tmp}/`);
    t.falsy(shell.error());
    t.falsy(result.stderr);
    t.is(result.code, 0);
    t.is(shell.ls('-R', 'test/resources/cp').toString(), shell.ls('-R', `${t.context.tmp}/cp`).toString());
  }
);

test(
  'recursive, globbing regular files with extension (see Github issue #376)',
  t => {
    const result = shell.cp('-R', 'test/resources/file*.txt', t.context.tmp);
    t.falsy(shell.error());
    t.falsy(result.stderr);
    t.is(result.code, 0);
    t.truthy(fs.existsSync(`${t.context.tmp}/file1.txt`));
    t.truthy(fs.existsSync(`${t.context.tmp}/file2.txt`));
  }
);

test(
  'recursive, copying one regular file (also related to Github issue #376)',
  t => {
    const result = shell.cp('-R', 'test/resources/file1.txt', t.context.tmp);
    t.falsy(shell.error());
    t.falsy(result.stderr);
    t.is(result.code, 0);
    t.truthy(fs.existsSync(`${t.context.tmp}/file1.txt`));
    t.falsy(common.statFollowLinks(`${t.context.tmp}/file1.txt`).isDirectory()); // don't let it be a dir
  }
);

test('recursive, everything exists, no force flag', t => {
  const result = shell.cp('-R', 'test/resources/cp', t.context.tmp);
  t.falsy(shell.error()); // crash test only
  t.falsy(result.stderr);
  t.is(result.code, 0);
});

test('-R implies to not follow links', t => {
  utils.skipOnWin(t, () => {
    shell.cp('-R', 'test/resources/cp/*', t.context.tmp);
    t.truthy(common.statNoFollowLinks(`${t.context.tmp}/links/sym.lnk`).isSymbolicLink()); // this one is a link
    t.falsy((common.statNoFollowLinks(`${t.context.tmp}/fakeLinks/sym.lnk`).isSymbolicLink())); // this one isn't
    t.not(
      shell.cat(`${t.context.tmp}/links/sym.lnk`).toString(),
      shell.cat(`${t.context.tmp}/fakeLinks/sym.lnk`).toString()
    );
    const result = shell.cp('-R', `${t.context.tmp}/links/*`, `${t.context.tmp}/fakeLinks`);
    t.falsy(shell.error());
    t.falsy(result.stderr);
    t.is(result.code, 0);
    t.truthy(common.statNoFollowLinks(`${t.context.tmp}/links/sym.lnk`).isSymbolicLink()); // this one is a link
    t.truthy(common.statNoFollowLinks(`${t.context.tmp}/fakeLinks/sym.lnk`).isSymbolicLink()); // this one is now a link
    t.is(
      shell.cat(`${t.context.tmp}/links/sym.lnk`).toString(),
      shell.cat(`${t.context.tmp}/fakeLinks/sym.lnk`).toString()
    );
  });
});

test('Missing -R implies -L', t => {
  utils.skipOnWin(t, () => {
    // Recursive, everything exists, overwrite a real file *by following a link*
    // Because missing the -R implies -L.
    shell.cp('-R', 'test/resources/cp/*', t.context.tmp);
    t.truthy(common.statNoFollowLinks(`${t.context.tmp}/links/sym.lnk`).isSymbolicLink()); // this one is a link
    t.falsy((common.statNoFollowLinks(`${t.context.tmp}/fakeLinks/sym.lnk`).isSymbolicLink())); // this one isn't
    t.not(
      shell.cat(`${t.context.tmp}/links/sym.lnk`).toString(),
      shell.cat(`${t.context.tmp}/fakeLinks/sym.lnk`).toString()
    );
    const result = shell.cp(`${t.context.tmp}/links/*`, `${t.context.tmp}/fakeLinks`); // don't use -R
    t.falsy(shell.error());
    t.falsy(result.stderr);
    t.is(result.code, 0);
    t.truthy(common.statNoFollowLinks(`${t.context.tmp}/links/sym.lnk`).isSymbolicLink()); // this one is a link
    t.falsy(common.statNoFollowLinks(`${t.context.tmp}/fakeLinks/sym.lnk`).isSymbolicLink()); // this one is still not a link
    // But it still follows the link
    t.is(
      shell.cat(`${t.context.tmp}/links/sym.lnk`).toString(),
      shell.cat(`${t.context.tmp}/fakeLinks/sym.lnk`).toString()
    );
  });
});

test('recursive, everything exists, with force flag', t => {
  let result = shell.cp('-R', 'test/resources/cp', t.context.tmp);
  shell.ShellString('changing things around').to(`${t.context.tmp}/cp/dir_a/z`);
  t.not(shell.cat('test/resources/cp/dir_a/z').toString(), shell.cat(`${t.context.tmp}/cp/dir_a/z`).toString()); // before cp
  result = shell.cp('-Rf', 'test/resources/cp', t.context.tmp);
  t.falsy(shell.error());
  t.falsy(result.stderr);
  t.is(result.code, 0);
  t.is(shell.cat('test/resources/cp/dir_a/z').toString(), shell.cat(`${t.context.tmp}/cp/dir_a/z`).toString()); // after cp
});

test(
  'recursive, creates dest dir since it\'s only one level deep (see Github issue #44)',
  t => {
    const result = shell.cp('-r', 'test/resources/issue44', `${t.context.tmp}/dir2`);
    t.falsy(shell.error());
    t.falsy(result.stderr);
    t.is(result.code, 0);
    t.is(shell.ls('-R', 'test/resources/issue44').toString(), shell.ls('-R', `${t.context.tmp}/dir2`).toString());
    t.is(
      shell.cat('test/resources/issue44/main.js').toString(),
      shell.cat(`${t.context.tmp}/dir2/main.js`).toString()
    );
  }
);

test(
  'recursive, does *not* create dest dir since it\'s too deep (see Github issue #44)',
  t => {
    const result = shell.cp('-r', 'test/resources/issue44', `${t.context.tmp}/dir2/dir3`);
    t.truthy(shell.error());
    t.is(
      result.stderr,
      `cp: cannot create directory '${t.context.tmp}/dir2/dir3': No such file or directory`
    );
    t.is(result.code, 1);
    t.falsy(fs.existsSync(`${t.context.tmp}/dir2`));
  }
);

test('recursive, copies entire directory', t => {
  const result = shell.cp('-r', 'test/resources/cp/dir_a', `${t.context.tmp}/dest`);
  t.falsy(shell.error());
  t.falsy(result.stderr);
  t.is(result.code, 0);
  t.truthy(fs.existsSync(`${t.context.tmp}/dest/z`));
});

test('recursive, with trailing slash, does the exact same', t => {
  const result = shell.cp('-r', 'test/resources/cp/dir_a/', `${t.context.tmp}/dest`);
  t.is(result.code, 0);
  t.falsy(shell.error());
  t.truthy(fs.existsSync(`${t.context.tmp}/dest/z`));
});

test(
  'On Windows, permission bits are quite different so skip those tests for now',
  t => {
    utils.skipOnWin(t, () => {
      // preserve mode bits
      const execBit = parseInt('001', 8);
      t.is(common.statFollowLinks('test/resources/cp-mode-bits/executable').mode & execBit, execBit);
      shell.cp('test/resources/cp-mode-bits/executable', `${t.context.tmp}/executable`);
      t.is(
        common.statFollowLinks('test/resources/cp-mode-bits/executable').mode,
        common.statFollowLinks(`${t.context.tmp}/executable`).mode
      );
    });
  }
);

test('Make sure hidden files are copied recursively', t => {
  shell.rm('-rf', t.context.tmp);
  const result = shell.cp('-r', 'test/resources/ls/', t.context.tmp);
  t.falsy(shell.error());
  t.falsy(result.stderr);
  t.is(result.code, 0);
  t.truthy(fs.existsSync(`${t.context.tmp}/.hidden_file`));
});

test('no-recursive will copy regular files only', t => {
  const result = shell.cp('test/resources/file1.txt', 'test/resources/ls/', t.context.tmp);
  t.is(result.code, 1);
  t.truthy(shell.error());
  t.falsy(fs.existsSync(`${t.context.tmp}/.hidden_file`)); // doesn't copy dir contents
  t.falsy(fs.existsSync(`${t.context.tmp}/ls`)); // doesn't copy dir itself
  t.truthy(fs.existsSync(`${t.context.tmp}/file1.txt`));
});

test('no-recursive will copy regular files only', t => {
  const result = shell.cp('test/resources/file1.txt', 'test/resources/file2.txt', 'test/resources/cp',
    'test/resources/ls/', t.context.tmp);

  t.is(result.code, 1);
  t.truthy(shell.error());
  t.falsy(fs.existsSync(`${t.context.tmp}/.hidden_file`)); // doesn't copy dir contents
  t.falsy(fs.existsSync(`${t.context.tmp}/ls`)); // doesn't copy dir itself
  t.falsy(fs.existsSync(`${t.context.tmp}/a`)); // doesn't copy dir contents
  t.falsy(fs.existsSync(`${t.context.tmp}/cp`)); // doesn't copy dir itself
  t.truthy(fs.existsSync(`${t.context.tmp}/file1.txt`));
  t.truthy(fs.existsSync(`${t.context.tmp}/file2.txt`));
});

test('-R implies -P', t => {
  utils.skipOnWin(t, () => {
    shell.cp('-R', 'test/resources/cp/links/sym.lnk', t.context.tmp);
    t.truthy(common.statNoFollowLinks(`${t.context.tmp}/sym.lnk`).isSymbolicLink());
  });
});

test('using -P explicitly works', t => {
  utils.skipOnWin(t, () => {
    shell.cp('-P', 'test/resources/cp/links/sym.lnk', t.context.tmp);
    t.truthy(common.statNoFollowLinks(`${t.context.tmp}/sym.lnk`).isSymbolicLink());
  });
});

test('using -PR on a link to a folder does not follow the link', t => {
  utils.skipOnWin(t, () => {
    shell.cp('-PR', 'test/resources/cp/symFolder', t.context.tmp);
    t.truthy(common.statNoFollowLinks(`${t.context.tmp}/symFolder`).isSymbolicLink());
  });
});

test('-L overrides -P for copying directory', t => {
  utils.skipOnWin(t, () => {
    shell.cp('-LPR', 'test/resources/cp/symFolder', t.context.tmp);
    t.falsy(common.statNoFollowLinks(`${t.context.tmp}/symFolder`).isSymbolicLink());
    t.falsy(common.statNoFollowLinks(`${t.context.tmp}/symFolder/sym.lnk`).isSymbolicLink());
  });
});

test('Recursive, copies entire directory with no symlinks and -L option does not cause change in behavior', t => {
  utils.skipOnWin(t, () => {
    const result = shell.cp('-rL', 'test/resources/cp/dir_a', `${t.context.tmp}/dest`);
    t.falsy(shell.error());
    t.falsy(result.stderr);
    t.is(result.code, 0);
    t.truthy(fs.existsSync(`${t.context.tmp}/dest/z`));
  });
});

test('-u flag won\'t overwrite newer files', t => {
  shell.touch(`${t.context.tmp}/file1.js`);
  shell.cp('-u', 'test/resources/file1.js', t.context.tmp);
  t.falsy(shell.error());
  t.not(shell.cat('test/resources/file1.js').toString(), shell.cat(`${t.context.tmp}/file1.js`).toString());
});

test('-u flag does overwrite older files', t => {
  shell.touch({ '-d': new Date(10) }, `${t.context.tmp}/file1.js`); // really old file
  shell.cp('-u', 'test/resources/file1.js', t.context.tmp);
  t.falsy(shell.error());
  t.is(shell.cat('test/resources/file1.js').toString(), shell.cat(`${t.context.tmp}/file1.js`).toString());
});

test('-u flag works even if it\'s not overwriting a file', t => {
  t.falsy(fs.existsSync(`${t.context.tmp}/file1.js`));
  shell.cp('-u', 'test/resources/file1.js', t.context.tmp);
  t.falsy(shell.error());
  t.is(shell.cat('test/resources/file1.js').toString(), shell.cat(`${t.context.tmp}/file1.js`).toString());
});

test('-u flag works correctly recursively', t => {
  shell.mkdir(`${t.context.tmp}/foo`);
  [1, 2, 3].forEach(num => {
    new shell.ShellString('old\n').to(`${t.context.tmp}/foo/file${num}`);
    shell.touch({ '-d': new Date(10) }, `${t.context.tmp}/foo/file${num}`);
  });
  shell.mkdir(`${t.context.tmp}/bar`);
  [1, 2, 3].forEach(num => {
    new shell.ShellString('new\n').to(`${t.context.tmp}/bar/file${num}`);
    shell.touch({ '-d': new Date(1000) }, `${t.context.tmp}/bar/file${num}`);
  });
  // put one new one in the foo directory
  new shell.ShellString('newest\n').to(`${t.context.tmp}/foo/file3`);
  shell.touch({ '-d': new Date(10000) }, `${t.context.tmp}/foo/file3`);
  shell.cp('-u', `${t.context.tmp}/foo/*`, `${t.context.tmp}/bar`);
  t.falsy(shell.error());
  t.is(shell.cat(`${t.context.tmp}/bar/*`).toString(), 'new\nnew\nnewest\n');
});

test('using -R on a link to a folder *does* follow the link', t => {
  shell.cp('-R', 'test/resources/cp/symFolder', t.context.tmp);
  t.falsy(common.statNoFollowLinks(`${t.context.tmp}/symFolder`).isSymbolicLink());
});

test('Without -R, -L is implied', t => {
  shell.cp('test/resources/cp/links/sym.lnk', t.context.tmp);
  t.falsy(common.statNoFollowLinks(`${t.context.tmp}/sym.lnk`).isSymbolicLink());
});

test('-L explicitly works', t => {
  shell.cp('-L', 'test/resources/cp/links/sym.lnk', t.context.tmp);
  t.falsy(common.statNoFollowLinks(`${t.context.tmp}/sym.lnk`).isSymbolicLink());
});

test('using -LR does not imply -P', t => {
  shell.cp('-LR', 'test/resources/cp/links/sym.lnk', t.context.tmp);
  t.falsy(common.statNoFollowLinks(`${t.context.tmp}/sym.lnk`).isSymbolicLink());
});

test('using -LR also works recursively on directories containing links', t => {
  shell.cp('-LR', 'test/resources/cp/links', t.context.tmp);
  t.falsy(common.statNoFollowLinks(`${t.context.tmp}/links/sym.lnk`).isSymbolicLink());
});

test('-L always overrides a -P', t => {
  shell.cp('-LP', 'test/resources/cp/links/sym.lnk', t.context.tmp);
  t.falsy(common.statNoFollowLinks(`${t.context.tmp}/sym.lnk`).isSymbolicLink());
  shell.cp('-LPR', 'test/resources/cp/links/sym.lnk', t.context.tmp);
  t.falsy(common.statNoFollowLinks(`${t.context.tmp}/sym.lnk`).isSymbolicLink());
});

test('Make sure max depth does not limit shallow directory structures', t => {
  shell.config.maxdepth = 3;
  const TMP = t.context.tmp;
  shell.mkdir(`${TMP}/foo`);
  for (let k = 0; k < 5; k++) {
    shell.mkdir(`${TMP}/foo/dir${k}`);
  }
  shell.cp('-r', `${TMP}/foo`, `${TMP}/bar`);
  t.is(shell.ls(`${TMP}/foo`).stdout, shell.ls(`${TMP}/bar`).stdout);
});

test('Test max depth.', t => {
  shell.config.maxdepth = 32;
  let directory = '';
  for (let i = 1; i < 40; i++) {
    directory += '/' + i;
  }
  let directory32deep = '';
  for (let i = 1; i < 32; i++) {
    directory32deep += '/' + i;
  }
  shell.mkdir('-p', `${t.context.tmp}/0${directory}`);
  shell.cp('-r', `${t.context.tmp}/0`, `${t.context.tmp}/copytestdepth`);
  // Check full directory exists.
  t.truthy(shell.test('-d', `${t.context.tmp}/0/${directory}`));
  // Check full copy of directory does not exist.
  t.falsy(shell.test('-d', `${t.context.tmp}/copytestdepth${directory}`));
  // Check last directory to exist is below maxdepth.
  t.truthy(shell.test('-d', `${t.context.tmp}/copytestdepth${directory32deep}`));
  t.falsy(shell.test('-d', `${t.context.tmp}/copytestdepth${directory32deep}/32`));
  utils.skipOnWinForEPERM(shell.ln.bind(shell, '-s', `${t.context.tmp}/0`, `${t.context.tmp}/symlinktest`), () => {
    if (!shell.test('-L', `${t.context.tmp}/symlinktest`)) {
      t.fail();
    }

    // Create symlinks to check for cycle.
    shell.cd(`${t.context.tmp}/0/1/2/3/4`);
    t.falsy(shell.error());
    shell.ln('-s', '../../../2', 'link');
    t.falsy(shell.error());
    shell.ln('-s', './5/6/7', 'link1');
    t.falsy(shell.error());
    shell.cd('../../../../../..');
    t.falsy(shell.error());
    t.truthy(shell.test('-d', t.context.tmp));

    shell.cp('-r', `${t.context.tmp}/0/1`, `${t.context.tmp}/copytestdepth`);
    t.falsy(shell.error());
    t.truthy(shell.test('-d', `${t.context.tmp}/copytestdepth/1/2/3/4/link/3/4/link/3/4`));
  });
});

test('cp -L follows symlinks', t => {
  utils.skipOnWinForEPERM(shell.ln.bind(shell, '-s', `${t.context.tmp}/0`, `${t.context.tmp}/symlinktest`), () => {
    shell.mkdir('-p', `${t.context.tmp}/sub`);
    shell.mkdir('-p', `${t.context.tmp}/new`);
    shell.cp('-f', 'test/resources/file1.txt', `${t.context.tmp}/sub/file.txt`);
    shell.cd(`${t.context.tmp}/sub`);
    shell.ln('-s', 'file.txt', 'foo.lnk');
    shell.ln('-s', 'file.txt', 'sym.lnk');
    shell.cd('..');
    shell.cp('-L', 'sub/*', 'new/');
    shell.cd('new');

    shell.cp('-f', '../../test/resources/file2.txt', 'file.txt');
    t.is(shell.cat('file.txt').toString(), 'test2\n');
    // Ensure other files have not changed.
    t.is(shell.cat('foo.lnk').toString(), 'test1\n');
    t.is(shell.cat('sym.lnk').toString(), 'test1\n');
    t.falsy(shell.test('-L', 'foo.lnk'));
    t.falsy(shell.test('-L', 'sym.lnk'));
    shell.cd('../..');
  });
});

test('Test with recursive option and symlinks.', t => {
  utils.skipOnWinForEPERM(shell.ln.bind(shell, '-s', `${t.context.tmp}/0`, `${t.context.tmp}/symlinktest`), () => {
    shell.mkdir('-p', `${t.context.tmp}/sub/sub1`);
    shell.cp('-f', 'test/resources/file1.txt', `${t.context.tmp}/sub/file.txt`);
    shell.cp('-f', 'test/resources/file1.txt', `${t.context.tmp}/sub/sub1/file.txt`);
    shell.cd(`${t.context.tmp}/sub`);
    shell.ln('-s', 'file.txt', 'foo.lnk');
    shell.ln('-s', 'file.txt', 'sym.lnk');
    shell.cd('sub1');
    shell.ln('-s', '../file.txt', 'foo.lnk');
    shell.ln('-s', '../file.txt', 'sym.lnk');

    // Ensure file reads from proper source
    t.is(shell.cat('file.txt').toString(), 'test1\n');
    t.is(shell.cat('foo.lnk').toString(), 'test1\n');
    t.is(shell.cat('sym.lnk').toString(), 'test1\n');
    t.truthy(shell.test('-L', 'foo.lnk'));
    t.truthy(shell.test('-L', 'sym.lnk'));
    shell.cd('../..');
    shell.cp('-rL', 'sub/', 'new/');
    shell.cd('new');

    // Ensure copies of files are symlinks by updating file contents.
    shell.cp('-f', '../../test/resources/file2.txt', 'file.txt');
    t.is(shell.cat('file.txt').toString(), 'test2\n');
    // Ensure other files have not changed.
    t.is(shell.cat('foo.lnk').toString(), 'test1\n');
    t.is(shell.cat('sym.lnk').toString(), 'test1\n');

    // Ensure the links are converted to files.
    t.falsy(shell.test('-L', 'foo.lnk'));
    t.falsy(shell.test('-L', 'sym.lnk'));

    // Ensure other files have not changed.
    shell.cd('sub1');
    shell.cp('-f', '../../../test/resources/file2.txt', 'file.txt');
    t.is(shell.cat('file.txt').toString(), 'test2\n');
    t.is(shell.cat('foo.lnk').toString(), 'test1\n');
    t.is(shell.cat('sym.lnk').toString(), 'test1\n');

    // Ensure the links are converted to files
    t.falsy(shell.test('-L', 'foo.lnk'));
    t.falsy(shell.test('-L', 'sym.lnk'));
  });
});

test('recursive, with a non-normalized path', t => {
  const result = shell.cp('-R', 'test/resources/../resources/./cp', t.context.tmp);
  t.falsy(shell.error()); // crash test only
  t.falsy(result.stderr);
  t.is(result.code, 0);
});

test('copy file to same path', t => {
  const result = shell.cp('test/resources/file1', 'test/resources/file1');
  t.truthy(shell.error());
  t.is(result.code, 1);
  t.is(result.stderr, "cp: 'test/resources/file1' and 'test/resources/file1' are the same file");
});

test('copy file to same directory', t => {
  const result = shell.cp('test/resources/file1', 'test/resources');
  t.truthy(shell.error());
  t.is(result.code, 1);
  t.is(result.stderr, "cp: 'test/resources/file1' and 'test/resources/file1' are the same file");
});

test('copy mutliple files to same location', t => {
  const result = shell.cp('test/resources/file1', 'test/resources/file2', 'test/resources');
  t.truthy(shell.error());
  t.is(result.code, 1);
  t.is(
    result.stderr,
    "cp: 'test/resources/file1' and 'test/resources/file1' are the same file\n" +
    "cp: 'test/resources/file2' and 'test/resources/file2' are the same file"
  );
});

test('should not overwrite recently created files', t => {
  const result = shell.cp('test/resources/file1', 'test/resources/cp/file1', t.context.tmp);
  t.truthy(shell.error());
  t.is(result.code, 1);

  // Ensure First file is copied
  t.is(shell.cat(`${t.context.tmp}/file1`).toString(), 'test1');
  t.is(
    result.stderr,
    `cp: will not overwrite just-created '${t.context.tmp}/file1' with 'test/resources/cp/file1'`
  );
});


test('should not overwrite recently created files (in recursive Mode)', t => {
  const result = shell.cp('-R', 'test/resources/file1', 'test/resources/cp/file1', t.context.tmp);
  t.truthy(shell.error());
  t.is(result.code, 1);

  // Ensure First file is copied
  t.is(shell.cat(`${t.context.tmp}/file1`).toString(), 'test1');
  t.is(
    result.stderr,
    `cp: will not overwrite just-created '${t.context.tmp}/file1' with 'test/resources/cp/file1'`
  );
});

test('should not overwrite recently created files (not give error no-force mode)', t => {
  const result = shell.cp('-n', 'test/resources/file1', 'test/resources/cp/file1', t.context.tmp);
  t.falsy(shell.error());
  t.is(result.code, 0);

  // Ensure First file is copied
  t.is(shell.cat(`${t.context.tmp}/file1`).toString(), 'test1');
});

test('cp -p should preserve mode, ownership, and timestamp', t => {
  const result = shell.cp('-p', 'test/resources/cp/file1', `${t.context.tmp}/preservedFile1`);
  const stat = common.statFollowLinks('test/resources/cp/file1');
  const statOfResult = common.statFollowLinks(`${t.context.tmp}/preservedFile1`);

  t.is(result.code, 0);
  t.is(stat.mtime.getTime(), statOfResult.mtime.getTime());
  t.is(stat.atime.getTime(), statOfResult.atime.getTime());
  t.is(stat.mode, statOfResult.mode);
  t.is(stat.uid, statOfResult.uid);
  t.is(stat.gid, statOfResult.gid);
});

test('cp -p should preserve mode, ownership, and timestamp of symlink', t => {
  const result = shell.cp('-p', 'test/resources/link', `${t.context.tmp}/copiedLink`);
  utils.sleep(1000);
  const stat = common.statFollowLinks('test/resources/link');
  const statOfResult = common.statFollowLinks(`${t.context.tmp}/copiedLink`);

  t.is(result.code, 0);
  t.is(stat.mtime.getTime(), statOfResult.mtime.getTime());
  t.is(stat.atime.getTime(), statOfResult.atime.getTime());
  t.is(stat.mode, statOfResult.mode);
  t.is(stat.uid, statOfResult.uid);
  t.is(stat.rid, statOfResult.rid);
});
