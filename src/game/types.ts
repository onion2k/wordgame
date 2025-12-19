export type Cell = { row: number; col: number }
export type GameAreaProps = { gridSize?: number; words?: string[]; dictionary?: string[] }
export type Tile = { id: string; letter: string }
export type TrieNode = { children: Map<string, TrieNode>; isWord: boolean }
export type InjectionResult = { grid: Array<Array<Tile | null>>; newIds: Set<string> }
