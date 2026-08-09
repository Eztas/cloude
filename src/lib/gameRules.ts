import type { GameState } from '../types/game'

// ユーザーの単語選択に基づき、即座に新しいゲーム状態を算出する純粋関数
export function applyGuess(state: GameState, targetWord: string): GameState {
  if (state.gameStatus !== 'playing') {
    return state
  }

  const targetItem = state.board.find(item => item.word === targetWord)
  if (!targetItem || targetItem.revealed) {
    return state
  }

  const newBoard = state.board.map(item =>
    item.word === targetWord ? { ...item, revealed: true } : item
  )

  const currentHintText = state.currentHint
    ? `${state.currentHint.hint}: ${state.currentHint.count}枚`
    : 'ヒントなし'

  const newHistory = [
    ...state.history,
    {
      hint: currentHintText,
      guess: targetWord,
      result: targetItem.type,
    },
  ]

  // スパイ（NG）を選択した場合
  if (targetItem.type === 'spy') {
    return {
      ...state,
      board: newBoard,
      gameStatus: 'game_over',
      history: newHistory,
      remainingGuesses: 0,
    }
  }

  // 正解を選択した場合
  const isWon = newBoard.every(item => item.type === 'spy' || item.revealed)
  if (isWon) {
    return {
      ...state,
      board: newBoard,
      gameStatus: 'won',
      history: newHistory,
      remainingGuesses: 0,
    }
  }

  // ゲーム継続中の正解選択
  const newRemainingGuesses = Math.max(0, state.remainingGuesses - 1)

  return {
    ...state,
    board: newBoard,
    gameStatus: 'playing',
    history: newHistory,
    remainingGuesses: newRemainingGuesses,
  }
}
