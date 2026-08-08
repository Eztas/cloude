import { useState } from 'react'
import type { GameState, HintInfo } from '@/types/game'
import { applyGuess } from '@/utils/gameRules'

export function useGame() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingHint, setIsFetchingHint] = useState(false)
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

  // 次のAIヒントを取得する関数
  const fetchNextHint = async (currentState: GameState) => {
    const remainingCorrect = currentState.board
      .filter(i => i.type === 'correct' && !i.revealed)
      .map(i => i.word)
    const spyWords = currentState.board
      .filter(i => i.type === 'spy')
      .map(i => i.word)

    if (remainingCorrect.length === 0) return

    setIsFetchingHint(true)
    try {
      const res = await fetch('/api/game/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentState.sessionId,
          correctWords: remainingCorrect,
          spyWords,
        }),
      })

      if (!res.ok) {
        throw new Error('ヒントの取得に失敗しました')
      }

      const data: { currentHint: HintInfo; remainingGuesses: number } = await res.json()
      setGameState(prev => {
        if (!prev) return null
        return {
          ...prev,
          currentHint: data.currentHint,
          remainingGuesses: data.remainingGuesses,
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ヒント取得中にエラーが発生しました')
    } finally {
      setIsFetchingHint(false)
    }
  }

  // カード選択（回答）ハンドラー（フロントエンド即時判定）
  const handleGuess = async (word: string) => {
    if (!gameState || gameState.gameStatus !== 'playing' || guessingWord || isFetchingHint) {
      return
    }

    setGuessingWord(word)
    setError(null)

    // 1. 即座にフロントエンド側で正誤判定・カード開示・デクリメント
    const nextState = applyGuess(gameState, word)
    setGameState(nextState)
    setGuessingWord(null)

    // 2. もしゲーム継続中で残り推測回数が 0 に達した場合はAIヒントを取得
    if (nextState.gameStatus === 'playing' && nextState.remainingGuesses === 0) {
      await fetchNextHint(nextState)
    }
  }

  const remainingCorrect = gameState
    ? gameState.board.filter(item => item.type === 'correct' && !item.revealed).length
    : 0

  return {
    gameState,
    isLoading,
    isFetchingHint,
    error,
    guessingWord,
    handleStartGame,
    handleGuess,
    remainingCorrect,
  }
}
