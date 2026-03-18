# monitor-clipboard

A CLI that watches your clipboard and saves each new copy to a file. Useful for capturing chat snippets, code blocks, or any copied text over time.

[![npm Package Version](https://img.shields.io/npm/v/monitor-clipboard)](https://www.npmjs.com/package/monitor-clipboard)

## Features

- **CLI and library** — Use as a command-line tool or import into your own code (TypeScript supported)
- Saves each new clipboard copy to a sequential file (`1.txt`, `2.txt`, ...)
- Resumes from last saved file on restart
- Customizable output dir, prefix, suffix, and extension
- Configurable poll interval and optional content trimming
- Adds output directory to `.gitignore` by default (disable with `--ignore-file skip`)

## Requirements

- Node.js
- **xclip** (Linux clipboard access). Install with: `sudo apt install xclip` (Debian/Ubuntu) or `sudo pacman -S xclip` (Arch)

## Installation (recommended)

```bash
npm install -g monitor-clipboard
```

You can also use [pnpm](https://pnpm.io/) or [yarn](https://yarnpkg.com/)

## Usage as a CLI tool

(if you installed it globally)

```bash
monitor-clipboard [options]
```

(if you didn't install it globally)

```bash
npx -y monitor-clipboard [options]
```

**Examples**

```bash
## with default options
monitor-clipboard

## with customization
monitor-clipboard --dir ~/logs/topic-1-clips/
```

**Options** (all optional)

| Option          | Description                                                    | Default        |
| --------------- | -------------------------------------------------------------- | -------------- |
| `--help, -h`    | Show this help message (and then exit)                         | —              |
| `--ignore-file` | File to store ignore patterns (e.g. `../.gitignore` or `skip`) | `./.gitignore` |
| `--dir`         | Directory to store the files (e.g. `~/logs/clips/`)            | `./clips`      |
| `--prefix`      | Prefix of the file name (e.g. `message_`)                      | (empty)        |
| `--suffix`      | Suffix of the file name (e.g. `_clipboard`)                    | (empty)        |
| `--ext`         | Extension of the file name (e.g. txt, md, csv, json)           | `txt`          |
| `--interval`    | Interval to check clipboard, ms (e.g. 300, 500, 800)           | `100`          |
| `--auto-trim`   | Automatically trim the content                                 | yes            |
| `--no-trim`     | Do not trim the content                                        | —              |

Run `monitor-clipboard --help` for the full help output.

## Usage as a library package

Import the core functions and wire them into your own logic:

```typescript
import {
  readClipboard,
  watchClipboard,
  trim,
  toFilePath,
  restoreFromLastFile,
} from 'monitor-clipboard'
import { writeFileSync } from 'fs'

for await (let content of watchClipboard({
  last_content: '',
  interval: 100,
  normalize: trim,
})) {
  let prompt = `Summarize the following content: ${content}`
  let res = await fetch('https://api.example.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.API_KEY}`,
    },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
  })
  let json = await res.json()
  let summary = json.choices[0].message.content
  console.log(`Summary: ${summary}`)
}
```

### TypeScript Signatures

```typescript
export function readClipboard(): string

export function watchClipboard(options: {
  last_content: string
  interval: number
  normalize: (content: string) => string
}): AsyncGenerator<string>

/** can be used as the normalize function for watchClipboard */
export function trim(content: string): string

/** can be used as the normalize function for watchClipboard */
export function no_trim(content: string): string

export function toFilePath(options: {
  dir: string
  seq: number
  prefix: string
  suffix: string
  content: string
  ext: string
}): string

export function getLastFile(options: {
  dir: string
  prefix: string
  suffix: string
  ext: string
}): { seq: number; filename: string } | null

export function restoreFromLastFile(options: {
  dir: string
  normalize: (content: string) => string
  prefix: string
  suffix: string
  ext: string
}): { seq: number; file: string; content: string }

export function parseFilenames(options: {
  prefix: string
  suffix: string
  ext: string
  filenames: string[]
}): ({ seq: number; filename: string } | null)[]

export function addToIgnore(options: { file: string; pattern: string }): void
```

## License

This project is licensed with [BSD-2-Clause](./LICENSE)

This is free, libre, and open-source software. It comes down to four essential freedoms [[ref]](https://seirdy.one/2021/01/27/whatsapp-and-the-domestication-of-users.html#fnref:2):

- The freedom to run the program as you wish, for any purpose
- The freedom to study how the program works, and change it so it does your computing as you wish
- The freedom to redistribute copies so you can help others
- The freedom to distribute copies of your modified versions to others
