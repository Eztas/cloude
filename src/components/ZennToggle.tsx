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
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-sky-500' : 'bg-slate-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
