interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark' | 'gray'
  className?: string
}

const sizeMap = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-6 w-6',
}

const variantMap = {
  light: 'text-white',
  dark: 'text-gray-800',
  gray: 'text-gray-400',
}

export function Spinner({ size = 'sm', variant = 'light', className = '' }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${sizeMap[size]} ${variantMap[variant]} ${className}`}
      viewBox="0 0 16 16"
      fill="none"
      role="status"
      aria-label="載入中"
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-25" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
