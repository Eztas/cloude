import { Switch } from '@/components/ui/switch'

interface ZennToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function ZennToggle({ checked, onCheckedChange }: ZennToggleProps) {
  return (
    <div className="flex items-center justify-between w-full p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
      <div className="flex flex-col text-left">
        <span className="text-sm font-semibold text-slate-200">ITモード</span>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label="ITモードの切り替え"
      />
    </div>
  )
}
