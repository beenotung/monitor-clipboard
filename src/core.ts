import { execSync } from 'child_process'
import {
  appendFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs'
import { join, normalize, sep } from 'path'

export function readClipboard() {
  return execSync('xclip -sel clipboard -o').toString()
}

export async function* watchClipboard(options: {
  last_content: string
  interval: number
  normalize: (content: string) => string
}) {
  let normalize = options.normalize
  let last_content = normalize(options.last_content)
  for (;;) {
    let content = normalize(readClipboard())
    if (content === last_content) {
      await sleep(options.interval)
      continue
    }
    yield content
    last_content = content
    await sleep(options.interval / 2)
  }
}

/** can be used as the normalize function for watchClipboard */
export function trim(content: string) {
  return content.trim()
}

/** can be used as the normalize function for watchClipboard */
export function no_trim(content: string) {
  return content
}

export function getLastFile(options: {
  dir: string
  prefix: string
  suffix: string
  ext: string
}): { seq: number; filename: string } | null {
  let { dir, prefix, suffix, ext } = options
  let filenames = readdirSync(dir)
  let files = parseFilenames({ prefix, suffix, ext, filenames })
  let last = files
    .filter(file => file.seq !== null)
    .sort((a, b) => b.seq - a.seq)[0]
  return last || null
}

export function parseFilenames(options: {
  prefix: string
  suffix: string
  ext: string
  filenames: string[]
}) {
  let { prefix, suffix, ext, filenames } = options

  if (ext.startsWith('.')) {
    ext = ext.slice(1)
  }
  let after = suffix + '.' + ext
  let before = prefix

  return filenames.map(filename => {
    if (filename.startsWith(before) && filename.endsWith(after)) {
      let seq = +filename.slice(before.length, -after.length)
      return { seq, filename }
    }
    return { seq: null, filename }
  })
}

export function restoreFromLastFile(options: {
  dir: string
  normalize: (content: string) => string
  prefix: string
  suffix: string
  ext: string
}) {
  let { dir, normalize, prefix, suffix, ext } = options
  let last_file = getLastFile({ dir, prefix, suffix, ext })
  if (!last_file) {
    return {
      seq: 0,
      file: '',
      content: '',
    }
  }
  let file = join(dir, last_file.filename)
  let content = normalize(readFileSync(file).toString())
  return {
    seq: last_file.seq,
    file,
    content,
  }
}

export function toFilePath(options: {
  dir: string
  seq: number
  prefix: string
  suffix: string
  content: string
  ext: string
}) {
  let ext = options.ext
  if (ext.startsWith('.')) {
    ext = ext.slice(1)
  }

  let filename = [
    options.prefix || '',
    options.seq,
    options.suffix || '',
    '.',
    ext,
  ].join('')
  let file = join(options.dir, filename)

  return file
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function concatClips(options: {
  dir: string
  prefix: string
  suffix: string
  ext: string
  delimiter: string
  normalize: (content: string) => string
}): string {
  let { dir, prefix, suffix, ext, delimiter, normalize } = options

  if (!existsSync(dir)) {
    throw new Error(`Directory ${JSON.stringify(dir)} does not exist`)
  }
  let filenames = readdirSync(dir)
  let parsed = parseFilenames({ prefix, suffix, ext, filenames })

  let badFiles = parsed.filter(file => !file.seq)
  if (badFiles.length > 0) {
    console.log('skip', badFiles.length, 'files (pattern not matched)')
    for (let file of badFiles) {
      console.log('-', file.filename)
    }
  }

  let content = parsed
    .filter(file => file.seq != null)
    .sort((a, b) => a.seq - b.seq)
    .map(file => normalize(readFileSync(join(dir, file.filename)).toString()))
    .join(delimiter)

  if (!content.endsWith('\n')) {
    content += '\n'
  }

  return content
}

export function addToIgnore(options: { file: string; pattern: string }) {
  let { file, pattern } = options

  if (pattern.endsWith('/')) {
    pattern = pattern.slice(0, -1)
  }

  let lines = existsSync(file)
    ? readFileSync(file).toString().trim().split('\n')
    : []
  if (lines.includes(pattern) || lines.includes(pattern + '/')) {
    return
  }
  lines.push(pattern + '/')
  let content = lines.join('\n') + '\n'
  writeFileSync(file, content)
}
