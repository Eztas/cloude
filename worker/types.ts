export type Bindings = {
  cloude_kv: KVNamespace
  cloude_AI: Ai
  WORKERS_AI_MODEL_NAME: string
  ZENN_FEED_URL: string
}

export type BoardItem = {
  word: string
  type: 'correct' | 'spy'
}

export type HintInfo = {
  hint: string
  count: number
  reasoning?: string
}

export interface GameState {
  sessionId: string
  board: (BoardItem & { revealed: boolean })[]
  gameStatus: 'playing' | 'won' | 'game_over'
  history: { hint: string; guess: string; result: 'correct' | 'spy' }[]
  currentHint?: HintInfo | null
  remainingGuesses: number
}
