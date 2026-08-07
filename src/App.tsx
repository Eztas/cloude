import { Button } from '@/components/ui/button'
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import { useGame } from '@/hooks/useGame'
import { Header } from '@/components/Header'
import { GameBoard } from '@/components/GameBoard'
import { GameHistory } from '@/components/GameHistory'
import { GameStatusOverlay } from '@/components/GameStatusOverlay'
import './App.css'

function App() {
  const {
    gameState,
    isLoading,
    error,
    guessingWord,
    handleStartGame,
    handleGuess,
    remainingCorrect,
  } = useGame()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <Header />

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-sm flex items-center gap-2 max-w-md w-full animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* メインエリア */}
      {!gameState ? (
        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md max-w-md w-full text-center shadow-xl">
          <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-400 mb-2">
            <Sparkles className="w-10 h-10 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold">ゲームを開始</h2>
          <p className="text-xs text-slate-400 mb-2">
            Workers AI がランダムな名詞ボードをリアルタイム生成します。
          </p>
          <Button
            onClick={handleStartGame}
            disabled={isLoading}
            className="w-full py-6 text-base font-semibold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl shadow-lg transition-all transform hover:scale-[1.02]"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" /> AIが盤面を生成中...
              </span>
            ) : (
              '新規ゲームをスタート'
            )}
          </Button>
        </div>
      ) : (
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
                disabled={isLoading}
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

            {/* 最新のヒント表示 */}
            {gameState.history.length > 0 && (
              <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-900/50">
                <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider block mb-1">
                  現在のヒント
                </span>
                <span className="text-lg font-bold text-indigo-100">
                  {gameState.history[gameState.history.length - 1].hint}
                </span>
              </div>
            )}
          </div>

          {/* 勝敗オーバーレイ表示 */}
          <GameStatusOverlay status={gameState.gameStatus} />

          {/* 3x3 カードグリッド */}
          <GameBoard
            board={gameState.board}
            gameStatus={gameState.gameStatus}
            guessingWord={guessingWord}
            onGuess={handleGuess}
          />

          {/* 履歴エリア */}
          <GameHistory history={gameState.history} />
        </main>
      )}
    </div>
  )
}

export default App
