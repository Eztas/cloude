import { Trophy, Skull } from 'lucide-react'

interface GameStatusOverlayProps {
  status: 'playing' | 'won' | 'game_over'
}

export function GameStatusOverlay({ status }: GameStatusOverlayProps) {
  if (status === 'won') {
    return (
      <div className="p-6 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-center shadow-lg animate-bounce-short">
        <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
        <h2 className="text-2xl font-bold text-emerald-300">VICTORY!</h2>
        <p className="text-sm text-emerald-200/80 mt-1">スパイを回避してすべての正解を見つけ出しました！</p>
      </div>
    )
  }

  if (status === 'game_over') {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-center shadow-lg animate-shake">
        <Skull className="w-12 h-12 text-rose-400 mx-auto mb-2" />
        <h2 className="text-2xl font-bold text-rose-300">GAME OVER</h2>
        <p className="text-sm text-rose-200/80 mt-1">スパイをめくってしまいました！</p>
      </div>
    )
  }

  return null
}
