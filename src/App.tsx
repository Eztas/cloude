import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, HelpCircle } from 'lucide-react'
import { useGame } from '@/hooks/useGame'
import { Header } from '@/components/Header'
import { GameBoard } from '@/components/GameBoard'
import { GameStatusOverlay } from '@/components/GameStatusOverlay'
import './App.css'

function App() {
  const {
    gameState,
    isLoading,
    isFetchingHint,
    error,
    guessingWord,
    useZenn,
    setUseZenn,
    handleStartGame,
    handleGuess,
    remainingCorrect,
  } = useGame()

  const currentHintDisplay = gameState?.currentHint
    ? `${gameState.currentHint.hint}: ${gameState.currentHint.count}枚`
    : gameState?.history.length
      ? gameState.history[gameState.history.length - 1].hint
      : null

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
        <div className="flex flex-col items-center gap-6 p-8 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md max-w-md w-full text-center shadow-xl">
          {/* Zenn トレンド利用トグル */}
          <div className="flex items-center justify-between w-full p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-200">ITモード</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={useZenn}
              onClick={() => setUseZenn(prev => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useZenn ? 'bg-sky-500' : 'bg-slate-700'
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${useZenn ? 'translate-x-5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>

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
              'スパイ2人を見つけ出せ'
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

            {/* 最新のヒント表示 ＆ 残り推測可能数 */}
            <div className="p-4 rounded-xl bg-indigo-950/50 border border-indigo-900/60 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  現在のヒント
                </span>
                {isFetchingHint ? (
                  <span className="text-base text-indigo-300 font-medium flex items-center gap-2 animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    AIが次のヒントを思考中...
                  </span>
                ) : (
                  <span className="text-xl font-extrabold text-indigo-100 tracking-wide">
                    {currentHintDisplay || 'ヒントなし'}
                  </span>
                )}
              </div>

              {gameState.gameStatus === 'playing' && !isFetchingHint && (
                <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-400 font-medium">このターンの残り推測</span>
                  <span className="text-xl font-black text-amber-400">
                    {gameState.remainingGuesses} 回
                  </span>
                </div>
              )}
            </div>
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
            onGuess={handleGuess}
          />
        </main>
      )}
    </div>
  )
}

export default App
