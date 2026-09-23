import { RefreshCw, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HintDisplayProps {
  hint: string | null
  isFetchingHint: boolean
  remainingGuesses: number | null
  onReloadHint: () => void
  disabled: boolean
}

export function HintDisplay({ 
  hint, 
  isFetchingHint, 
  remainingGuesses, 
  onReloadHint,
  disabled 
}: HintDisplayProps) {
  return (
    <div className="p-4 rounded-xl bg-indigo-950/50 border border-indigo-900/60 flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            現在のヒント
          </span>
          <Button
            onClick={onReloadHint}
            disabled={disabled}
            variant="ghost"
            size="icon"
            className="w-6 h-6 p-0 text-indigo-400 hover:text-indigo-200 hover:bg-indigo-900/50 rounded-full"
            title="ヒントを再生成"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingHint ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {isFetchingHint ? (
          <span className="text-base text-indigo-300 font-medium flex items-center gap-2 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            AIが次のヒントを思考中...
          </span>
        ) : (
          <span className="text-xl font-extrabold text-indigo-100 tracking-wide">
            {hint || 'ヒントなし'}
          </span>
        )}
      </div>

      {!isFetchingHint && remainingGuesses !== null && (
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-400 font-medium">このターンの残り推測</span>
          <span className="text-xl font-black text-amber-400">
            {remainingGuesses} 回
          </span>
        </div>
      )}
    </div>
  )
}
