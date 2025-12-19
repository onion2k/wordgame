import type { TrieNode } from './types'

export const sanitizeWord = (word: string) => word.toUpperCase().replace(/[^A-Z]/g, '')

export const buildTrie = (words: string[]): TrieNode => {
  const root: TrieNode = { children: new Map(), isWord: false }
  words.forEach((word) => {
    let node = root
    for (const letter of word) {
      if (!node.children.has(letter)) {
        node.children.set(letter, { children: new Map(), isWord: false })
      }
      node = node.children.get(letter)!
    }
    node.isWord = true
  })
  return root
}
