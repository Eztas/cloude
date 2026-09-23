import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface HintInputFormProps {
  onSendHint: (hint: string, count: number) => void
  disabled?: boolean
}

export function HintInputForm({ onSendHint, disabled }: HintInputFormProps) {
  const [hint, setHint] = useState('')
  const [count, setCount] = useState(1)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (hint.trim()) {
      onSendHint(hint.trim(), count)
      setHint('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">ヒントを出す</h3>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="ヒント単語を入力..."
          className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          maxLength={10}
          disabled={disabled}
        />
        <input
          type="number"
          min={1}
          max={9}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-16 px-2 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
          disabled={disabled}
        />
      </div>

      <Button
        type="submit"
        disabled={disabled || !hint.trim()}
        className="w-full bg-sky-600 hover:bg-sky-500 text-white"
      >
        送信してAIに推測させる
      </Button>
    </form>
  )
}
