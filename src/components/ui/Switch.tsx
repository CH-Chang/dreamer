interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Switch({ checked, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-xs tracking-wider text-gray-400"
    >
      <span
        className={[
          'relative inline-block w-8 h-4 rounded-full transition-colors duration-200',
          checked ? 'bg-gray-300' : 'border border-gray-300',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </span>
      {checked ? '公開' : '私有'}
    </button>
  )
}
