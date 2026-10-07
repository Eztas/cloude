import { RefreshCw } from 'lucide-react'
import type { GameState } from '@/types/game'

interface GameBoardProps {
  board: GameState['board']
  gameStatus: 'playing' | 'won' | 'game_over'
  guessingWord: string | null
  isMaster?: boolean
  onGuess: (word: string) => void
}

const getGridColsClass = (count: number) => {
  if (count >= 25) return 'grid-cols-5'
  if (count >= 16) return 'grid-cols-4'
  return 'grid-cols-3'
}

export function GameBoard({ board, gameStatus, guessingWord, isMaster = false, onGuess }: GameBoardProps) {
  const isPlaying = gameStatus === 'playing'
  const gridColsClass = getGridColsClass(board.length)

  return (
    <div className={`grid ${gridColsClass} gap-2 sm:gap-3`}>
      {board.map((item, idx) => {
        const isSelected = guessingWord === item.word

        let cardStyle =
          'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-400'

        if (item.revealed) {
          if (item.type === 'spy') {
            cardStyle =
              'bg-rose-950/90 border-rose-600 text-rose-200 shadow-rose-900/50'
          } else {
            cardStyle =
              'bg-emerald-950/90 border-emerald-600 text-emerald-200 shadow-emerald-900/50'
          }
        } else if (isMaster && item.type === 'spy') {
          // スパイマスター視点: 未選択の不正解は赤
          cardStyle =
            'bg-rose-950/90 border-rose-600 text-rose-200 shadow-rose-900/50'
        }

        const showTag = item.revealed

        return (
          <button
            key={idx}
            onClick={() => onGuess(item.word)}
            disabled={!isPlaying || isMaster || item.revealed || !!guessingWord}
            className={`relative aspect-square p-2 sm:p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-300 transform font-medium select-none shadow-md ${cardStyle} ${
              isSelected ? 'scale-95 opacity-80' : isMaster ? 'cursor-default' : 'hover:-translate-y-1'
            }`}
          >
            <span className="text-sm sm:text-base md:text-lg font-bold tracking-wide break-words max-w-full">
              {item.word}
            </span>

            {showTag && (
              <span className="mt-1 text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-black/40">
                {item.type === 'spy' ? 'スパイ' : '正解'}
              </span>
            )}

            {isSelected && (
              <div className="absolute inset-0 bg-slate-950/60 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-sky-400" />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
