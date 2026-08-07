import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, RefreshCw, Trophy, Skull, History, AlertCircle } from 'lucide-react'
import './App.css'

export type BoardItem = {
  word: string;
  type: 'correct' | 'spy';
  revealed: boolean;
};

export interface GameState {
  sessionId: string;
  board: BoardItem[];
  gameStatus: 'playing' | 'won' | 'game_over';
  history: { hint: string; guess: string; result: 'correct' | 'spy' }[];
}

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guessingWord, setGuessingWord] = useState<string | null>(null);

  // 新しいゲームセッションの開始
  const handleStartGame = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/start', { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'ゲームの開始に失敗しました' }));
        throw new Error(errData.error || 'ゲームの開始に失敗しました');
      }
      const data: GameState = await res.json();
      setGameState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 単語カードの選択（回答）
  const handleGuess = async (word: string) => {
    if (!gameState || gameState.gameStatus !== 'playing' || guessingWord) return;

    setGuessingWord(word);
    setError(null);
    try {
      const res = await fetch('/api/game/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: gameState.sessionId, word }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: '回答の送信に失敗しました' }));
        throw new Error(errData.error || '回答の送信に失敗しました');
      }
      const updatedState: GameState = await res.json();
      setGameState(updatedState);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setGuessingWord(null);
    }
  };

  const remainingCorrect = gameState
    ? gameState.board.filter(item => item.type === 'correct' && !item.revealed).length
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      {/* ヘッダー */}
      <header className="text-center mb-8 max-w-xl">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent mb-2">
          Cloude Spy Game
        </h1>
        <p className="text-slate-400 text-sm">
          9つの単語の中に2枚の「スパイ」が潜んでいます。スパイを避けてすべての正解単語を当ててください！
        </p>
      </header>

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
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">残り正解数</span>
                <span className="text-2xl font-bold text-sky-400">{remainingCorrect} / 7</span>
              </div>

              <Button
                onClick={handleStartGame}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                リセット
              </Button>
            </div>
            
            {/* ponytail: 最新のヒントを表示 */}
            {gameState.history.length > 0 && (
              <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-900/50">
                <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider block mb-1">現在のヒント</span>
                <span className="text-lg font-bold text-indigo-100">
                  {gameState.history[gameState.history.length - 1].hint}
                </span>
              </div>
            )}
          </div>

          {/* 勝敗オーバーレイ表示 */}
          {gameState.gameStatus === 'won' && (
            <div className="p-6 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-center shadow-lg animate-bounce-short">
              <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-emerald-300">VICTORY!</h2>
              <p className="text-sm text-emerald-200/80 mt-1">スパイを回避して全ての正解を見つけ出しました！</p>
            </div>
          )}

          {gameState.gameStatus === 'game_over' && (
            <div className="p-6 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-center shadow-lg animate-shake">
              <Skull className="w-12 h-12 text-rose-400 mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-rose-300">GAME OVER</h2>
              <p className="text-sm text-rose-200/80 mt-1">スパイをめくってしまいました！</p>
            </div>
          )}

          {/* 3x3 カードグリッド */}
          <div className="grid grid-cols-3 gap-3">
            {gameState.board.map((item, idx) => {
              const isPlaying = gameState.gameStatus === 'playing';
              const isSelected = guessingWord === item.word;

              let cardStyle = 'bg-slate-800/80 border-slate-700 hover:border-sky-500 hover:bg-slate-800 hover:shadow-sky-500/10 cursor-pointer';
              if (item.revealed) {
                if (item.type === 'spy') {
                  cardStyle = 'bg-rose-950/90 border-rose-600 text-rose-200 shadow-rose-900/50';
                } else {
                  cardStyle = 'bg-emerald-950/90 border-emerald-600 text-emerald-200 shadow-emerald-900/50';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleGuess(item.word)}
                  disabled={!isPlaying || item.revealed || !!guessingWord}
                  className={`relative aspect-square p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-300 transform font-medium select-none shadow-md ${cardStyle} ${
                    isSelected ? 'scale-95 opacity-80' : 'hover:-translate-y-1'
                  }`}
                >
                  <span className="text-base sm:text-lg font-bold tracking-wide break-words max-w-full">
                    {item.word}
                  </span>

                  {item.revealed && (
                    <span className="mt-2 text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-black/40">
                      {item.type === 'spy' ? '🕵️ スパイ' : '⭕ 正解'}
                    </span>
                  )}

                  {isSelected && (
                    <div className="absolute inset-0 bg-slate-950/60 rounded-xl flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 履歴エリア */}
          {gameState.history.length > 0 && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 mb-3">
                <History className="w-4 h-4" /> 回答履歴
              </h3>
              <ul className="flex flex-col gap-2">
                {gameState.history.slice().reverse().map((h, i) => (
                  <li
                    key={i}
                    className="text-xs p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex justify-between items-center"
                  >
                    <span className="font-medium text-slate-200">「{h.guess}」を選択</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded ${
                        h.result === 'spy' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {h.result === 'spy' ? 'スパイ' : '正解'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
