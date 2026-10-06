import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ZennToggle } from '@/components/ZennToggle'
import type { GameMode } from '@/types/game'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

function IndexComponent() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<GameMode>('user_hint')
  const [useZenn, setUseZenn] = useState<boolean>(true)

  const handleGoToGame = () => {
    navigate({
      to: '/game',
      search: { mode, useZenn },
    })
  }

  return (
    <div className="flex flex-col items-center gap-6 p-8 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md max-w-md w-full text-center shadow-xl">
      <h1 className="text-2xl font-bold">スパイを見つけ出せ</h1>
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
        onClick={handleGoToGame}
        className="w-full py-6 text-base font-semibold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl shadow-lg transition-all transform hover:scale-[1.02]"
      >
        ゲームを開始する
      </Button>
    </div>
  )
}
