import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { useGame } from '@/hooks/useGame'
import { Header } from '@/components/Header'
import { ZennToggle } from '@/components/ZennToggle'
import { GameScreen } from '@/components/GameScreen'
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
    mode,
    setMode,
    handleStartGame,
    handleGuess,
    handleAiGuess,
    handleReloadHint,
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
        <div className="flex flex-col items-center gap-6 p-8 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md max-w-md w-full text-center shadow-xl">
          {/* モード選択 ＆ Zenn トレンド利用トグル */}
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <span className="text-sm font-medium">モード: {mode === 'ai_hint' ? 'AIヒント' : '人間ヒント'}</span>
              <Switch
                checked={mode === 'user_hint'}
                onCheckedChange={(checked) => setMode(checked ? 'user_hint' : 'ai_hint')}
              />
            </div>
            <ZennToggle checked={useZenn} onCheckedChange={setUseZenn} />
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
        <GameScreen
          gameState={gameState}
          mode={mode}
          guessingWord={guessingWord}
          isFetchingHint={isFetchingHint}
          isLoading={isLoading}
          remainingCorrect={remainingCorrect}
          handleStartGame={handleStartGame}
          handleGuess={handleGuess}
          handleReloadHint={handleReloadHint}
          handleAiGuess={handleAiGuess}
        />
      )}
    </div>
  )
}

export default App
