import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HintDisplay } from './HintDisplay'
import { HintInputForm } from './HintInputForm'
import { GameBoard } from './GameBoard'
import { GameStatusOverlay } from './GameStatusOverlay'
import type { GameState, GameMode } from '@/types/game'

interface GameScreenProps {
  gameState: GameState
  mode: GameMode
  guessingWord: string | null
  isFetchingHint: boolean
  isLoading: boolean
  remainingCorrect: number
  handleStartGame: () => void
  handleGuess: (word: string) => void
  handleReloadHint: () => void
  handleAiGuess: (hint: string, count: number) => void
}

export function GameScreen({
  gameState,
  mode,
  guessingWord,
  isFetchingHint,
  isLoading,
  remainingCorrect,
  handleStartGame,
  handleGuess,
  handleReloadHint,
  handleAiGuess
}: GameScreenProps) {
  const currentHintDisplay = gameState.currentHint
    ? `${gameState.currentHint.hint}: ${gameState.currentHint.count}枚`
    : gameState.history.length
      ? gameState.history[gameState.history.length - 1].hint
      : null

  return (
    <main className="w-full max-w-2xl flex flex-col gap-6">
      {/* ステータスバー */}
      <div className="flex flex-col gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
              残り正解数
            </span>
            <span className="text-2xl font-bold text-sky-400">{remainingCorrect} / 7</span>
          </div>

          <Button
            onClick={handleStartGame}
            disabled={isLoading || isFetchingHint}
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            リセット
          </Button>
        </div>

        {/* モードに応じたヒント表示・入力 */}
        {mode === 'ai_hint' ? (
          <HintDisplay
            hint={currentHintDisplay}
            isFetchingHint={isFetchingHint}
            remainingGuesses={gameState.gameStatus === 'playing' ? gameState.remainingGuesses : null}
            onReloadHint={handleReloadHint}
            disabled={isFetchingHint || isLoading}
          />
        ) : (
          <HintInputForm 
            onSendHint={handleAiGuess} 
            disabled={isFetchingHint || isLoading} 
          />
        )}
      </div>

      {/* 勝敗オーバーレイ表示 */}
      <GameStatusOverlay
        status={gameState.gameStatus}
        reasoning={gameState.currentHint?.reasoning}
      />

      {/* 3x3 カードグリッド */}
      <GameBoard
        board={gameState.board}
        gameStatus={gameState.gameStatus}
        guessingWord={guessingWord || (isFetchingHint ? 'AI思考中' : null)}
        isMaster={mode === 'user_hint'}
        onGuess={handleGuess}
      />
    </main>
  )
}
