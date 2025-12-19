import { readFileSync, writeFileSync } from 'node:fs'

const input = readFileSync('src/words.txt', 'utf8')
const MIN_LEN = 3

const filtered = Array.from(
  new Set(
    input
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((word) => word.length >= MIN_LEN)
      .filter((word) => /^[a-z]+$/.test(word))
  )
).sort()

writeFileSync('src/words.filtered.txt', filtered.join('\n') + '\n', 'utf8')
