import { useState } from 'react'
import type { GameState } from '@/types/game'

export function useGame() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guessingWord, setGuessingWord] = useState<string | null>(null)

  // ゲーム開始ハンドラー
  const handleStartGame = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/game/start', { method: 'POST' })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'ゲームの開始に失敗しました' }))
        throw new Error(errData.error || 'ゲームの開始に失敗しました')
      }
      const data: GameState = await res.json()
      setGameState(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // カード選択（回答）ハンドラー
  const handleGuess = async (word: string) => {
    if (!gameState || gameState.gameStatus !== 'playing' || guessingWord) return

    setGuessingWord(word)
    setError(null)
    try {
      const res = await fetch('/api/game/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: gameState.sessionId, word }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: '回答の送信に失敗しました' }))
        throw new Error(errData.error || '回答の送信に失敗しました')
      }
      const updatedState: GameState = await res.json()
      setGameState(updatedState)
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました')
    } finally {
      setGuessingWord(null)
    }
  }

  const remainingCorrect = gameState
    ? gameState.board.filter(item => item.type === 'correct' && !item.revealed).length
    : 0

  return {
    gameState,
    isLoading,
    error,
    guessingWord,
    handleStartGame,
    handleGuess,
    remainingCorrect,
  }
}
