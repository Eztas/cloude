import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ZennToggle } from '@/components/ZennToggle'
import type { GameMode, CardCount } from '@/types/game'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

const CARD_COUNT_OPTIONS: { count: CardCount; label: string; spyText: string }[] = [
  { count: 9, label: '9枚', spyText: 'スパイ2人' },
  { count: 16, label: '16枚', spyText: 'スパイ3人' },
  { count: 25, label: '25枚', spyText: 'スパイ4人' },
]

function IndexComponent() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<GameMode>('user_hint')
  const [cardCount, setCardCount] = useState<CardCount>(9)
  const [useZenn, setUseZenn] = useState<boolean>(true)

  const handleGoToGame = () => {
    navigate({
      to: '/game',
      search: { mode, useZenn, cardCount },
    })
  }

  return (
    <div className="flex flex-col items-center gap-6 p-8 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md max-w-md w-full text-center shadow-xl">
      <h1 className="text-2xl font-bold">スパイを見つけ出せ</h1>
      <div className="flex flex-col gap-4 w-full text-left">
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <span className="text-sm font-medium">モード: {mode === 'ai_hint' ? 'AIヒント' : '人間ヒント'}</span>
          <Switch
            checked={mode === 'user_hint'}
            onCheckedChange={(checked) => setMode(checked ? 'user_hint' : 'ai_hint')}
          />
        </div>

        <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <span className="text-sm font-medium text-slate-300">カード枚数</span>
          <div className="grid grid-cols-3 gap-2">
            {CARD_COUNT_OPTIONS.map((opt) => {
              const isSelected = cardCount === opt.count
              return (
                <button
                  key={opt.count}
                  type="button"
                  onClick={() => setCardCount(opt.count)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-md shadow-sky-500/10'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  <span className="text-sm font-bold">{opt.label}</span>
                  <span className="text-[10px] text-slate-400">{opt.spyText}</span>
                </button>
              )
            })}
          </div>
        </div>

        <ZennToggle checked={useZenn} onCheckedChange={setUseZenn} />
      </div>

      <Button
        onClick={handleGoToGame}
        className="w-full py-6 text-base font-semibold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl shadow-lg transition-all transform hover:scale-[1.02]"
      >
        ゲームを開始する
      </Button>
    </div>
  )
}
