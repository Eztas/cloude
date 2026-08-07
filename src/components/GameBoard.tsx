import { RefreshCw } from 'lucide-react'
import type { BoardItem } from '@/types/game'

interface GameBoardProps {
  board: BoardItem[]
  gameStatus: 'playing' | 'won' | 'game_over'
  guessingWord: string | null
  onGuess: (word: string) => void
}

export function GameBoard({ board, gameStatus, guessingWord, onGuess }: GameBoardProps) {
  const isPlaying = gameStatus === 'playing'

  return (
    <div className="grid grid-cols-3 gap-3">
      {board.map((item, idx) => {
        const isSelected = guessingWord === item.word

        let cardStyle =
          'bg-slate-800/80 border-slate-700 hover:border-sky-500 hover:bg-slate-800 hover:shadow-sky-500/10 cursor-pointer'
        if (item.revealed) {
          if (item.type === 'spy') {
            cardStyle = 'bg-rose-950/90 border-rose-600 text-rose-200 shadow-rose-900/50'
          } else {
            cardStyle = 'bg-emerald-950/90 border-emerald-600 text-emerald-200 shadow-emerald-900/50'
          }
        }

        return (
          <button
            key={idx}
            onClick={() => onGuess(item.word)}
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
                {item.type === 'spy' ? 'スパイ' : '正解'}
              </span>
            )}

            {isSelected && (
              <div className="absolute inset-0 bg-slate-950/60 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
