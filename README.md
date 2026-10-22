# jsonfmt

> A fast, zero-dependency JSON formatter, validator, and transformer for the command line.

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D14-green)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow)
![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-blue)

## Features

- **Format / Beautify** — Pretty-print JSON with custom indentation
- **Minify** — Compact JSON output in a single line
- **Validate** — Check if JSON is valid without modifying it
- **Sort Keys** — Sort object keys alphabetically (recursive)
- **Colorized Output** — Syntax-highlighted JSON in terminal
- **Pipe Support** — Read from stdin, format, output to stdout
- **Write Back** — Overwrite source files with formatted result
- **Multi-file** — Process multiple files in one command
- **Zero Dependencies** — No `npm install` needed. Just Node.js.

## Installation

### Global install (optional)

```bash
npm install -g jsonfmt-cli
```

### Direct usage (no install)

```bash
node index.js [options] [file ...]
```

### Make it executable

```bash
chmod +x index.js
./index.js --help
```

## Usage

```
jsonfmt [options] [file ...]
```

### Options

| Flag | Description |
|---|---|
| `-i, --indent <n>` | Indentation size in spaces (default: 2) |
| `-m, --minify` | Minify output (compact, no whitespace) |
| `-s, --sort` | Sort object keys alphabetically |
| `-v, --validate` | Validate only; don't print formatted output |
| `-w, --write` | Write formatted result back to the source file(s) |
| `-o, --output <file>` | Write result to a file instead of stdout |
| `-r, --raw` | Read raw JSON from stdin (pipe mode) |
| `-c, --color` | Force colorized output |
| `--no-color` | Disable colorized output |
| `-h, --help` | Show help message |
| `-V, --version` | Show version number |

## Examples

### Format a file with 4-space indent

```bash
jsonfmt -i 4 data.json
```

**Input (`data.json`):**
```json
{"name":"jsonfmt","stars":42,"author":{"name":"dev","url":"https://example.com"}}
```

**Output:**
```json
{
    "name": "jsonfmt",
    "stars": 42,
    "author": {
        "name": "dev",
        "url": "https://example.com"
    }
}
```

### Minify a file

```bash
jsonfmt -m data.json
```

**Output:**
```
{"name":"jsonfmt","stars":42,"author":{"name":"dev","url":"https://example.com"}}
```

### Validate JSON without printing formatted output

```bash
jsonfmt -v data.json
```

**Output:**
```
✓ /path/to/data.json — valid JSON
```

### Pipe stdin and format

```bash
echo '{"b":2,"a":1}' | jsonfmt -r
```

**Output:**
```json
{
  "b": 2,
  "a": 1
}
```

### Sort keys and write back to file

```bash
jsonfmt -s -w config.json
```

**Output:**
```
✓ Formatted & saved: /path/to/config.json
```

### Format multiple files

```bash
jsonfmt -i 2 a.json b.json c.json
```

### Write result to a different file

```bash
jsonfmt -o formatted.json messy.json
```

## Colorized Output

When outputting to a terminal, jsonfmt automatically applies syntax highlighting:

- **Keys** — Cyan
- **Strings** — Green
- **Numbers** — Yellow
- **Booleans** — Bold Red
- **null** — Gray

Use `--no-color` to disable, or `-c` to force-enable (e.g. when piping).

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | All files processed successfully |
| `1` | One or more files had errors (invalid JSON, not found, etc.) |

## Testing

```bash
node test/run.js
```

## Project Structure

```
jsonfmt/
├── index.js          # CLI entry point (all logic)
├── test/
│   ├── run.js        # Test runner
│   └── fixtures/     # Test JSON files
├── package.json
├── LICENSE
└── README.md
```

## Why?

Because every other JSON formatter either:
1. Requires installing 50+ MB of `node_modules`
2. Only works as a library, not a CLI
3. Doesn't support sorting keys
4. Doesn't support multi-file batch processing

`jsonfmt` does all of the above with **zero dependencies** and a single file.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Ideas for contribution

- TOML / YAML support
- JSON Stream (NDJSON) parsing
- JSON Pointer / JSON Path query support
- TypeScript rewrite
- Plugin system for custom transformers

## License

MIT — see [LICENSE](LICENSE) file for details.
