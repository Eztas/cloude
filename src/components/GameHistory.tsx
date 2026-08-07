import { History } from 'lucide-react'

interface GameHistoryProps {
  history: { hint: string; guess: string; result: 'correct' | 'spy' }[]
}

export function GameHistory({ history }: GameHistoryProps) {
  if (history.length === 0) return null

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 mb-3">
        <History className="w-4 h-4" /> 回答履歴
      </h3>
      <ul className="flex flex-col gap-2">
        {history
          .slice()
          .reverse()
          .map((h, i) => (
            <li
              key={i}
              className="text-xs p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex justify-between items-center"
            >
              <span className="font-medium text-slate-200">「{h.guess}」を選択</span>
              <span
                className={`font-bold px-2 py-0.5 rounded ${
                  h.result === 'spy'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {h.result === 'spy' ? 'スパイ' : '正解'}
              </span>
            </li>
          ))}
      </ul>
    </div>
  )
}
