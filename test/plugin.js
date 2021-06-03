import test from 'ava';

// This is the supported order for importing these files
import plugin from '../plugin';
import shell from '..';

let data = 0;
let fname;

function fooImplementation(options, arg) {
  // Some sort of side effect, so we know when this is called
  if (arg) {
    fname = arg;
  } else {
    fname = plugin.readFromPipe();
  }

  if (arg === 'exitWithCode5') {
    plugin.error('Exited with code 5', 5);
  } else if (arg === 'changePrefix') {
    plugin.error('prefix was changed', {
      prefix: 'prefix: ',
    });
  } else if (arg === 'continue') {
    plugin.error('Error, but continuing', {
      continue: true,
    });
  }

  if (options.flag) {
    data = 12;
  } else {
    data++;
  }
  return 'hello world';
}

test.beforeEach(() => {
  shell.config.resetForTesting();
});

//
// Invalids
//

test('Unable to register a plugin with unknown options', t => {
  t.throws(() => {
    plugin.register('foo', fooImplementation, {
      foobar: true,
    });
  }, Error);
});

test('Unable to register a plugin with wrong option types', t => {
  t.throws(() => {
    plugin.register('foo', fooImplementation, {
      wrapOutput: 'true', // should be a boolean
    });
  }, TypeError);
});

//
// Valids
//

test('All plugin utils exist', t => {
  t.is(typeof plugin.error, 'function');
  t.is(typeof plugin.parseOptions, 'function');
  t.is(typeof plugin.readFromPipe, 'function');
  t.is(typeof plugin.register, 'function');
});

test('The plugin does not exist before it\'s registered', t => {
  t.falsy(shell.foo);
});

test('Register the plugin', t => {
  plugin.register('foo', fooImplementation, {
    cmdOptions: {
      f: 'flag',
    },
    wrapOutput: true,
    canReceivePipe: true,
  });
  t.pass();
});

test('The plugin exists after registering', t => {
  t.is(typeof shell.foo, 'function');
});

test('The command fails for invalid options', t => {
  const result = shell.foo('-n', 'filename');
  t.is(result.code, 1);
  t.is(result.stdout, '');
  t.is(result.stderr, 'foo: option not recognized: n');
  t.is(shell.error(), 'foo: option not recognized: n');
});

test('The command succeeds for normal calls', t => {
  t.is(data, 0);
  shell.foo('filename');
  t.is(data, 1);
  t.is(fname, 'filename');
  shell.foo('filename2');
  t.is(data, 2);
  t.is(fname, 'filename2');
});

test('The command parses options', t => {
  shell.foo('-f', 'filename');
  t.is(data, 12);
  t.is(fname, 'filename');
});

test('The command supports globbing by default', t => {
  shell.foo('-f', 'test/re*u?ces');
  t.is(data, 12);
  t.is(fname, 'test/resources');
});

test('Plugins are also compatible with shelljs/global', t => {
  require('../global');
  t.is(typeof global.foo, 'function');
  t.is(global.foo, shell.foo);
});

test('Plugins can be added as methods to ShellStrings', t => {
  const result = shell.ShellString('hello world\n');
  t.is(result.toString(), 'hello world\n');
  t.is(typeof result.grep, 'function'); // existing methods persist
  t.is(typeof result.foo, 'function');
  result.foo();
  t.is(fname, 'hello world\n'); // readFromPipe() works
});

test('Plugins can signal errors', t => {
  const result = shell.foo('exitWithCode5');
  t.is(result.code, 5);
  t.is(result.stdout, '');
  t.is(result.stderr, 'foo: Exited with code 5');
  t.is(shell.error(), 'foo: Exited with code 5');
});

test('Plugins can change the prefix', t => {
  const result = shell.foo('changePrefix');
  t.is(result.code, 1);
  t.is(result.stdout, '');
  t.is(result.stderr, 'prefix: prefix was changed');
  t.is(shell.error(), 'prefix: prefix was changed');
});

test('Plugins can continue from errors', t => {
  const result = shell.foo('continue');
  t.is(result.code, 1);
  t.is(result.stdout, 'hello world');
  t.is(result.stderr, 'foo: Error, but continuing');
  t.is(shell.error(), 'foo: Error, but continuing');
});

test('Cannot overwrite an existing command', t => {
  const oldCat = shell.cat;
  t.throws(() => {
    plugin.register('cat', fooImplementation);
  }, 'Command `cat` already exists');
  t.is(shell.cat, oldCat);
});

test('Deprecated command', t => {
  process.throwDeprecation = true;
  const oldThrowDep = process.throwDeprecation;
  try {
    plugin.register('dep', function dep(opt, arg) { return arg; }, {
      cmdOptions: null,
      deprecated: 'Use the foo method instead',
    });

    t.throws(() => {
      shell.dep('bar');
    }, /Use the foo method instead/);
  } finally {
    process.throwDeprecation = oldThrowDep;
  }
});

test('Deprecated command in pipe', t => {
  process.throwDeprecation = true;
  plugin.register('depPipe', function depPipe(opt, arg) { return arg; }, {
    cmdOptions: null,
    deprecated: 'Use the foo pipe instead',
    canReceivePipe: true,
  });
  const oldThrowDep = process.throwDeprecation;
  try {
    t.throws(() => {
      shell.cat('./package.json').depPipe('bar');
    }, /Use the foo pipe instead/);
  } finally {
    process.throwDeprecation = oldThrowDep;
  }
});
