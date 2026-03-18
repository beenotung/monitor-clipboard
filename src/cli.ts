import { existsSync, mkdirSync, writeFileSync } from 'fs'
import {
  addToIgnore,
  no_trim,
  restoreFromLastFile,
  toFilePath,
  trim,
  watchClipboard,
} from './core'

function showHelp() {
  console.log(
    `
Usage: monitor-clipboard [options]

Examples:
  monitor-clipboard --dir ~/logs/topic-1-chats/

Options (all optional):
  --help, -h          Show this help message (and then exit)
  --ignore-file       File to store ignore patterns          default: ./.gitignore
                      e.g. ../.gitignore or 'skip'
  --dir               Directory to store the files           default: ./chats
                      e.g. ~/logs/chats/
  --prefix            Prefix of the file name                default: (empty)
                      e.g. message_
  --suffix            Suffix of the file name                default: (empty)
                      e.g. _clipboard
  --ext               Extension of the file name             default: txt
                      e.g. txt, md, csv, tsv, json, etc
  --interval          Interval to check clipboard, ms        default: 100
                      e.g. 300, 500, 800
  --auto-trim         Automatically trim the content         default: yes
  --no-trim           Do not trim the content
`.trim(),
  )
  process.exit(0)
}

function getArgs() {
  let ignore_file = '.gitignore'
  let dir = 'chats'
  let prefix = ''
  let suffix = ''
  let ext = 'txt'
  let interval = 100
  let auto_trim = true

  let args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    let arg = args[i]
    if (arg === '--help' || arg === '-h') {
      showHelp()
      process.exit(0)
    }
    if (arg === '--ignore-file') {
      ignore_file = args[i + 1]
      i++
      continue
    }
    if (arg === '--dir') {
      dir = args[i + 1]
      i++
      continue
    }
    if (arg === '--prefix') {
      prefix = args[i + 1]
      i++
      continue
    }
    if (arg === '--suffix') {
      suffix = args[i + 1]
      i++
      continue
    }
    if (arg === '--ext') {
      ext = args[i + 1]
      i++
      continue
    }
    if (arg === '--interval') {
      interval = +args[i + 1]
      i++
      continue
    }
    if (arg === '--auto-trim') {
      auto_trim = true
      continue
    }
    if (arg === '--no-trim') {
      auto_trim = false
      continue
    }
    console.error(`unknown argument: ${JSON.stringify(arg)}`)
    let selfExec = getSelfExec()
    console.error(`Run \`${selfExec} --help\` for help.`)
    process.exit(1)
  }
  return { ignore_file, dir, prefix, suffix, ext, interval, auto_trim }
}

function isWithNpx() {
  return (
    process.env.npm_config_argv?.includes('npx') ||
    process.env.npm_lifecycle_event?.includes('npx') ||
    false
  )
}

function getSelfExec() {
  if (isWithNpx()) {
    return 'npx monitor-clipboard'
  }
  return 'monitor-clipboard'
}

async function main() {
  let args = getArgs()
  let { ignore_file, dir, prefix, suffix, ext, interval, auto_trim } = args

  let normalize = auto_trim ? trim : no_trim

  if (ignore_file !== 'skip') {
    addToIgnore({ file: ignore_file, pattern: dir })
  }

  mkdirSync(dir, { recursive: true })

  let lastFile = restoreFromLastFile({ dir, normalize, prefix, suffix, ext })
  let seq = lastFile.seq + 1
  let last_content = normalize(lastFile.content)

  if (lastFile.file) {
    log(`last save: ${lastFile.file}: ${previewContent(last_content)}`)
  }

  let stream = watchClipboard({
    last_content,
    interval,
    normalize,
  })
  for await (let content of stream) {
    for (;;) {
      let file = toFilePath({ dir, seq, prefix, suffix, ext, content })
      if (existsSync(file)) {
        seq++
        continue
      }
      writeFileSync(file, content)
      log(`new save: ${file}: ${previewContent(content)}`)
      break
    }
  }
}

function previewContent(content: string) {
  let head = content.slice(0, 20)
  let tail = content.slice(-20)
  return `\n${head}\n...\n${tail}\n`
}

function log(message: string) {
  let timestamp = getTimestamp()
  console.log(`[${timestamp}] ${message}`)
}

function getTimestamp() {
  let date = new Date()
  let h = date.getHours().toString().padStart(2, '0')
  let m = date.getMinutes().toString().padStart(2, '0')
  let s = date.getSeconds().toString().padStart(2, '0')
  let ms = date.getMilliseconds().toString().padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
