import { useState, useCallback } from 'react'
import type { GameState, GameMode, CardCount } from '@/types/game'
import { applyGuess } from '@/lib/gameRules'
import { client } from '@/lib/api'

export function useGame() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingHint, setIsFetchingHint] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guessingWord, setGuessingWord] = useState<string | null>(null)

  // ゲーム開始ハンドラー
  const handleStartGame = useCallback(async (mode: GameMode, useZenn: boolean, cardCount: CardCount = 9) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await client.api.game.start[mode === 'ai_hint' ? 'ai-hint' : 'user-hint'].$post({
        json: { useZenn, cardCount },
      })
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({ error: 'ゲームの開始に失敗しました' }))) as {
          error?: string
        }
        throw new Error(errData.error || 'ゲームの開始に失敗しました')
      }
      const data = await res.json()
      setGameState(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 次のAIヒントを取得する関数（諜報員モード専用）
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
      const res = await client.api.game.hint.$post({
        json: {
          sessionId: currentState.sessionId,
          correctWords: remainingCorrect,
          spyWords,
        },
      })

      if (!res.ok) {
        throw new Error('ヒントの取得に失敗しました')
      }

      const data = await res.json()
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

  // カード選択（回答）ハンドラー（諜報員モード・フロントエンド即時判定）
  const handleGuess = async (word: string) => {
    if (!gameState || gameState.gameStatus !== 'playing' || guessingWord || isFetchingHint) {
      return
    }

    setGuessingWord(word)
    setError(null)

    // 即座にフロントエンド側で正誤判定・カード開示・デクリメント
    const nextState = applyGuess(gameState, word)
    setGameState(nextState)
    setGuessingWord(null)

    // ゲーム継続中で残り推測回数が 0 に達した場合はAIヒントを取得
    if (nextState.gameStatus === 'playing' && nextState.remainingGuesses === 0) {
      await fetchNextHint(nextState)
    }
  }

  // スパイマスターモード: プレイヤーのヒントを送信してAIに推測させるハンドラー
  const handleAiGuess = async (hint: string, count: number) => {
    if (!gameState || gameState.gameStatus !== 'playing' || isFetchingHint) return

    setIsFetchingHint(true)
    setError(null)
    try {
      const res = await client.api.game['ai-guess'].$post({
        json: { sessionId: gameState.sessionId, hint, count },
      })

      if (!res.ok) {
        throw new Error('AIの推測に失敗しました')
      }

      const data = await res.json()
      setGameState(data.gameState)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI推測中にエラーが発生しました')
    } finally {
      setIsFetchingHint(false)
    }
  }

  // 手動でAIヒントを再生成・リロードするハンドラー（諜報員モード専用）
  const handleReloadHint = async () => {
    if (!gameState || gameState.gameStatus !== 'playing' || isFetchingHint || isLoading) {
      return
    }
    await fetchNextHint(gameState)
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
    handleAiGuess,
    handleReloadHint,
    remainingCorrect,
  }
}
