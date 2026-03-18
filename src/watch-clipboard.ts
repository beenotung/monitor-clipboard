import { execSync } from 'child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs'
import { connect } from 'http2'
import { join } from 'path'

async function main() {
  let dir = 'chats'
  let seq = 1
  let last_content = ''
  mkdirSync(dir, { recursive: true })
  let last_file = getLastFile(dir)
  if (last_file) {
    last_content = readFileSync(last_file.file).toString().trim()
    seq = last_file.seq + 1
    log(`last save: ${last_file.file}: ${previewContent(last_content)}`)
  }
  for (;;) {
    let file = join(dir, `${seq}.md`)
    if (existsSync(file)) {
      seq++
      continue
    }
    let content = readClipboard()
    if (content === last_content) {
      await sleep(100)
      continue
    }
    writeFileSync(file, content)
    console.log('-'.repeat(process.stdout.columns - 1))
    log(`new save: ${file}: ${previewContent(content)}`)
    last_content = content
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

function getLastFile(dir: string) {
  return (
    readdirSync(dir)
      .map(filename => {
        let seq = +filename.split('.')[0]
        let file = join(dir, filename)
        return { seq, file }
      })
      .sort((a, b) => b.seq - a.seq)[0] || null
  )
}

function getTimestamp() {
  let date = new Date()
  let h = date.getHours().toString().padStart(2, '0')
  let m = date.getMinutes().toString().padStart(2, '0')
  let s = date.getSeconds().toString().padStart(2, '0')
  let ms = date.getMilliseconds().toString().padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

function readClipboard() {
  return execSync('xclip -sel clipboard -o').toString().trim()
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
