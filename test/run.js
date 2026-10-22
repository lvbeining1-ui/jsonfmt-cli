'use strict';

const { execSync } = require('child_process');
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const ROOT = join(__dirname, '..');
const INDEX = join(ROOT, 'index.js');
const NODE = process.execPath;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    \x1b[90m${e.message}\x1b[0m`);
  }
}

function run(args, input) {
  const cmd = `"${NODE}" "${INDEX}" ${args}`;
  try {
    const stdout = execSync(cmd, {
      input: input || undefined,
      encoding: 'utf8',
      cwd: ROOT,
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', code: 0 };
  } catch (e) {
    return {
      stdout: e.stdout ? e.stdout.toString() : '',
      stderr: e.stderr ? e.stderr.toString() : '',
      code: e.status || 1,
    };
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ── Tests ─────────────────────────────────────────────────

console.log('\n\x1b[1mjsonfmt — test suite\x1b[0m\n');

test('formats JSON with default 2-space indent', () => {
  const { stdout, code } = run('-r --no-color', '{"b":2,"a":1}');
  assert(code === 0, `expected exit 0, got ${code}`);
  const lines = stdout.trim().split('\n');
  assert(lines[0] === '{', `expected '{', got '${lines[0]}'`);
  assert(stdout.includes('  "b": 2'), 'expected 2-space indent for b');
  assert(stdout.includes('  "a": 1'), 'expected 2-space indent for a');
});

test('formats JSON with custom 4-space indent', () => {
  const { stdout, code } = run('-i 4 -r --no-color', '{"x":1}');
  assert(code === 0, `expected exit 0, got ${code}`);
  assert(stdout.includes('    "x": 1'), 'expected 4-space indent');
});

test('minifies JSON output', () => {
  const { stdout, code } = run('-m -r --no-color', '{\n  "b": 2,\n  "a": 1\n}');
  assert(code === 0, `expected exit 0, got ${code}`);
  assert(stdout.trim() === '{"b":2,"a":1}', `expected compact output, got '${stdout.trim()}'`);
});

test('validates valid JSON file', () => {
  const { stdout, code } = run('-v test/fixtures/valid.json');
  assert(code === 0, `expected exit 0, got ${code}`);
  assert(stdout.includes('valid JSON'), `expected 'valid JSON' in output, got: ${stdout}`);
});

test('rejects invalid JSON file', () => {
  const result = run('-v test/fixtures/invalid.json');
  assert(result.code === 1, `expected exit 1, got ${result.code}`);
  const combined = (result.stdout + result.stderr).toLowerCase();
  assert(combined.includes('invalid json') || combined.includes('unexpected'), `expected invalid JSON message, got: ${result.stdout} | ${result.stderr}`);
});

test('sorts object keys alphabetically (recursive)', () => {
  const { stdout, code } = run('-s -r --no-color', '{"b":2,"a":1,"d":{"z":9,"a":1}}');
  assert(code === 0, `expected exit 0, got ${code}`);
  const lines = stdout.trim().split('\n');
  const aIdx = lines.findIndex(l => l.includes('"a"'));
  const bIdx = lines.findIndex(l => l.includes('"b"'));
  assert(aIdx < bIdx, `expected 'a' before 'b', got a at ${aIdx}, b at ${bIdx}`);
});

test('sorts nested object keys', () => {
  const { stdout, code } = run('-s -r --no-color', '{"outer":{"z":9,"a":1}}');
  assert(code === 0, `expected exit 0, got ${code}`);
  const aIdx = stdout.indexOf('"a"');
  const zIdx = stdout.indexOf('"z"');
  assert(aIdx < zIdx, 'expected nested "a" before nested "z"');
});

test('handles arrays correctly', () => {
  const { stdout, code } = run('-r --no-color', '[3,1,2]');
  assert(code === 0, `expected exit 0, got ${code}`);
  assert(stdout.includes('3'), 'expected 3 in output');
  assert(stdout.includes('1'), 'expected 1 in output');
  assert(stdout.includes('2'), 'expected 2 in output');
});

test('handles null values', () => {
  const { stdout, code } = run('-r --no-color', '{"x":null}');
  assert(code === 0, `expected exit 0, got ${code}`);
  assert(stdout.includes('null'), 'expected null in output');
});

test('handles boolean values', () => {
  const { stdout, code } = run('-r --no-color', '{"a":true,"b":false}');
  assert(code === 0, `expected exit 0, got ${code}`);
  assert(stdout.includes('true'), 'expected true in output');
  assert(stdout.includes('false'), 'expected false in output');
});

test('handles numeric values', () => {
  const { stdout, code } = run('-r --no-color', '{"int":42,"float":3.14,"neg":-7}');
  assert(code === 0, `expected exit 0, got ${code}`);
  assert(stdout.includes('42'), 'expected 42 in output');
  assert(stdout.includes('3.14'), 'expected 3.14 in output');
  assert(stdout.includes('-7'), 'expected -7 in output');
});

test('processes multiple files', () => {
  const { stdout, code } = run('--no-color test/fixtures/valid.json test/fixtures/compact.json');
  assert(code === 0, `expected exit 0, got ${code}`);
  assert(stdout.includes('"name"'), 'expected name in output');
});

test('reports error for non-existent file', () => {
  const result = run('nonexistent.json');
  assert(result.code === 1, `expected exit 1, got ${result.code}`);
  const combined = (result.stdout + result.stderr).toLowerCase();
  assert(combined.includes('not found'), `expected file not found message, got: ${result.stdout} | ${result.stderr}`);
});

test('--help shows usage', () => {
  const { stdout, code } = run('--help');
  assert(code === 0, `expected exit 0, got ${code}`);
  assert(stdout.includes('USAGE'), 'expected USAGE in help output');
  assert(stdout.includes('OPTIONS'), 'expected OPTIONS in help output');
  assert(stdout.includes('EXAMPLES'), 'expected EXAMPLES in help output');
});

test('--version shows version', () => {
  const { stdout, code } = run('--version');
  assert(code === 0, `expected exit 0, got ${code}`);
  assert(stdout.includes('jsonfmt v'), `expected 'jsonfmt v' in version output, got: ${stdout}`);
});

test('writes formatted result to output file', () => {
  const tmpFile = join(ROOT, 'test', 'fixtures', '_tmp_output.json');
  const { code } = run(`-o "${tmpFile}" -r --no-color`, '{"z":3,"a":1}');
  assert(code === 0, `expected exit 0, got ${code}`);
  assert(existsSync(tmpFile), 'expected output file to exist');
  const content = readFileSync(tmpFile, 'utf8');
  assert(content.includes('"z"'), 'expected z in output file');
  assert(content.includes('"a"'), 'expected a in output file');
  // cleanup
  const fs = require('fs');
  fs.unlinkSync(tmpFile);
});

test('handles empty object', () => {
  const { stdout, code } = run('-r --no-color', '{}');
  assert(code === 0, `expected exit 0, got ${code}`);
  assert(stdout.trim() === '{}', `expected '{}', got '${stdout.trim()}'`);
});

test('handles empty array', () => {
  const { stdout, code } = run('-r --no-color', '[]');
  assert(code === 0, `expected exit 0, got ${code}`);
  assert(stdout.trim() === '[]', `expected '[]', got '${stdout.trim()}'`);
});

test('handles deeply nested objects', () => {
  const input = '{"a":{"b":{"c":{"d":{"e":"deep"}}}}}';
  const { stdout, code } = run('-r --no-color', input);
  assert(code === 0, `expected exit 0, got ${code}`);
  assert(stdout.includes('"deep"'), 'expected "deep" in output');
});

test('handles unicode strings', () => {
  const input = '{"greeting":"你好世界","emoji":"🎉"}';
  const { stdout, code } = run('-r --no-color', input);
  assert(code === 0, `expected exit 0, got ${code}`);
  assert(stdout.includes('你好世界'), 'expected Chinese text in output');
  assert(stdout.includes('🎉'), 'expected emoji in output');
});

// ── Summary ───────────────────────────────────────────────

console.log(`\n\x1b[1m${passed} passed\x1b[0m, \x1b[1m${failed} failed\x1b[0m\n`);

if (failed > 0) {
  process.exit(1);
}
