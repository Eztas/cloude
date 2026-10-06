import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useGame } from '@/hooks/useGame'
import { GameScreen } from '@/components/GameScreen'
import { RefreshCw, AlertCircle } from 'lucide-react'
import type { GameMode } from '@/types/game'

type GameSearch = {
  mode: GameMode
  useZenn: boolean
}

export const Route = createFileRoute('/game')({
  validateSearch: (search: Record<string, unknown>): GameSearch => ({
    mode: search.mode === 'ai_hint' ? 'ai_hint' : 'user_hint',
    useZenn: search.useZenn === true || search.useZenn === 'true',
  }),
  component: GameComponent,
})

function GameComponent() {
  const { mode, useZenn } = Route.useSearch()
  const {
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
  } = useGame()

  useEffect(() => {
    handleStartGame(mode, useZenn)
  }, [mode, useZenn, handleStartGame])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <RefreshCw className="w-10 h-10 animate-spin text-sky-500" />
        <p className="text-lg">AIが盤面を生成中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 flex flex-col items-center gap-4 max-w-md w-full">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p>{error}</p>
      </div>
    )
  }

  if (!gameState) return null

  return (
    <GameScreen
      gameState={gameState}
      mode={mode}
      guessingWord={guessingWord}
      isFetchingHint={isFetchingHint}
      isLoading={isLoading}
      remainingCorrect={remainingCorrect}
      handleStartGame={() => handleStartGame(mode, useZenn)}
      handleGuess={handleGuess}
      handleReloadHint={handleReloadHint}
      handleAiGuess={handleAiGuess}
    />
  )
}
