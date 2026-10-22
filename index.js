#!/usr/bin/env node

'use strict';

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { resolve } = require('path');

// ── Colors (no external deps) ──────────────────────────────
const C = {
  red: s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  gray: s => `\x1b[90m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
};

const USAGE = `
${C.bold('jsonfmt')} — JSON formatter, validator & transformer

${C.bold('USAGE')}
  jsonfmt [options] [file ...]

${C.bold('OPTIONS')}
  -i, --indent <n>      Indentation size in spaces (default: 2)
  -m, --minify          Minify output (compact, no whitespace)
  -s, --sort            Sort object keys alphabetically
  -v, --validate        Validate only; don't print formatted output
  -w, --write           Write formatted result back to the source file(s)
  -o, --output <file>   Write result to a file instead of stdout
  -r, --raw             Read raw JSON from stdin (pipe mode)
  -c, --color            Force colorized output
  --no-color            Disable colorized output
  -h, --help             Show this help message
  -V, --version          Show version number

${C.bold('EXAMPLES')}
  ${C.gray('# Format a file with 4-space indent')}
  jsonfmt -i 4 data.json

  ${C.gray('# Minify a file')}
  jsonfmt -m data.json

  ${C.gray('# Validate JSON without printing formatted output')}
  jsonfmt -v data.json

  ${C.gray('# Pipe stdin and format')}
  echo '{"b":2,"a":1}' | jsonfmt -r

  ${C.gray('# Sort keys and write back to file')}
  jsonfmt -s -w config.json

  ${C.gray('# Format multiple files')}
  jsonfmt -i 2 a.json b.json c.json
`;

// ── Arg parsing ────────────────────────────────────────────
function parseArgs(argv) {
  const opts = {
    indent: 2,
    minify: false,
    sort: false,
    validate: false,
    write: false,
    output: null,
    raw: false,
    color: process.stdout.isTTY,
    help: false,
    version: false,
    files: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '-i':
      case '--indent':
        opts.indent = parseInt(argv[++i], 10);
        if (isNaN(opts.indent) || opts.indent < 0) {
          opts.indent = 2;
        }
        break;
      case '-m':
      case '--minify':
        opts.minify = true;
        break;
      case '-s':
      case '--sort':
        opts.sort = true;
        break;
      case '-v':
      case '--validate':
        opts.validate = true;
        break;
      case '-w':
      case '--write':
        opts.write = true;
        break;
      case '-o':
      case '--output':
        opts.output = argv[++i];
        break;
      case '-r':
      case '--raw':
        opts.raw = true;
        break;
      case '-c':
      case '--color':
        opts.color = true;
        break;
      case '--no-color':
        opts.color = false;
        break;
      case '-h':
      case '--help':
        opts.help = true;
        break;
      case '-V':
      case '--version':
        opts.version = true;
        break;
      default:
        if (arg.startsWith('-')) {
          // unknown flag, skip
        } else {
          opts.files.push(arg);
        }
    }
  }
  return opts;
}

// ── Core logic ─────────────────────────────────────────────

function sortKeysDeep(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sortKeysDeep);
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted = {};
    Object.keys(obj)
      .sort()
      .forEach(k => {
        sorted[k] = sortKeysDeep(obj[k]);
      });
    return sorted;
  }
  return obj;
}

function formatJSON(input, opts) {
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    return { error: e.message };
  }

  if (opts.sort) {
    parsed = sortKeysDeep(parsed);
  }

  let output;
  if (opts.minify) {
    output = JSON.stringify(parsed);
  } else {
    output = JSON.stringify(parsed, null, opts.indent);
  }

  return { output };
}

// ── Colorized JSON output ──────────────────────────────────

function colorizeJSON(jsonStr, colors) {
  return jsonStr.replace(
    /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(\b-?\d+\.?\d*([eE][+-]?\d+)?\b)|(\btrue\b|\bfalse\b)|(\bnull\b)/g,
    (match, key, str, num, _e, bool, nul) => {
      if (key) return colors.cyan(key);
      if (str) return colors.green(str);
      if (num) return colors.yellow(num);
      if (bool) return colors.bold(colors.red(bool));
      if (nul) return colors.gray(nul);
      return match;
    }
  );
}

// ── File processing ───────────────────────────────────────

function processFile(filePath, opts) {
  const absPath = resolve(filePath);

  if (!existsSync(absPath)) {
    console.error(`${C.red('✗')} File not found: ${absPath}`);
    return false;
  }

  let input;
  try {
    input = readFileSync(absPath, 'utf8');
  } catch (e) {
    console.error(`${C.red('✗')} Failed to read ${absPath}: ${e.message}`);
    return false;
  }

  const result = formatJSON(input, opts);

  if (result.error) {
    console.error(`${C.red('✗')} Invalid JSON in ${absPath}`);
    console.error(`  ${C.gray(result.error)}`);
    return false;
  }

  if (opts.validate) {
    console.log(`${C.green('✓')} ${absPath} — valid JSON`);
    return true;
  }

  let output = result.output;

  if (opts.color) {
    output = colorizeJSON(output, C);
  }

  if (opts.write) {
    try {
      writeFileSync(absPath, output.includes('\x1b') ? result.output : output, 'utf8');
      console.log(`${C.green('✓')} Formatted & saved: ${absPath}`);
    } catch (e) {
      console.error(`${C.red('✗')} Failed to write ${absPath}: ${e.message}`);
      return false;
    }
    return true;
  }

  if (opts.output) {
    const outPath = resolve(opts.output);
    try {
      writeFileSync(outPath, result.output, 'utf8');
      console.log(`${C.green('✓')} Written to: ${outPath}`);
    } catch (e) {
      console.error(`${C.red('✗')} Failed to write ${outPath}: ${e.message}`);
      return false;
    }
    return true;
  }

  // stdout
  console.log(output);
  return true;
}

// ── Stdin processing ───────────────────────────────────────

function processStdin(opts) {
  return new Promise(resolvePromise => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      const result = formatJSON(data, opts);

      if (result.error) {
        console.error(`${C.red('✗')} Invalid JSON from stdin`);
        console.error(`  ${C.gray(result.error)}`);
        resolvePromise(false);
        return;
      }

      let output = result.output;

      if (opts.color) {
        output = colorizeJSON(output, C);
      }

      if (opts.output) {
        const outPath = resolve(opts.output);
        try {
          writeFileSync(outPath, result.output, 'utf8');
          console.log(`${C.green('✓')} Written to: ${outPath}`);
        } catch (e) {
          console.error(`${C.red('✗')} Failed to write ${outPath}: ${e.message}`);
          resolvePromise(false);
          return;
        }
      } else {
        console.log(output);
      }
      resolvePromise(true);
    });
    process.stdin.on('error', () => {
      console.error(`${C.red('✗')} Failed to read from stdin`);
      resolvePromise(false);
    });
  });
}

// ── Main ──────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    console.log(USAGE);
    process.exit(0);
  }

  if (opts.version) {
    const pkg = require('./package.json');
    console.log(`jsonfmt v${pkg.version}`);
    process.exit(0);
  }

  // No files and not in raw mode → check if stdin is piped
  if (opts.files.length === 0) {
    if (opts.raw || !process.stdin.isTTY) {
      const ok = await processStdin(opts);
      process.exit(ok ? 0 : 1);
    }
    console.log(USAGE);
    process.exit(0);
  }

  let allOk = true;
  for (const file of opts.files) {
    const ok = processFile(file, opts);
    if (!ok) allOk = false;
  }
  process.exit(allOk ? 0 : 1);
}

main();
