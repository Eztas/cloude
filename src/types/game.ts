export type BoardItem = {
  word: string
  type: 'correct' | 'spy'
  revealed: boolean
}

export type HintInfo = {
  hint: string
  count: number
  reasoning?: string
}

export interface GameState {
  sessionId: string
  board: BoardItem[]
  gameStatus: 'playing' | 'won' | 'game_over'
  history: { hint: string; guess: string; result: 'correct' | 'spy' }[]
  currentHint?: HintInfo | null
  remainingGuesses: number
}
