export type Bindings = {
  cloude_kv: KVNamespace
  cloude_AI: Ai
}

export type BoardItem = {
  word: string
  type: 'correct' | 'spy'
}

export interface GameState {
  sessionId: string
  board: (BoardItem & { revealed: boolean })[]
  gameStatus: 'playing' | 'won' | 'game_over'
  history: { hint: string; guess: string; result: 'correct' | 'spy' }[]
}
