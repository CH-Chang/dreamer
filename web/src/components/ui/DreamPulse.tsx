import { motion, type Variants } from 'framer-motion'

interface DreamPulseProps {
  color?: string
  className?: string
  text?: string
}

export function DreamPulse({ color = 'bg-gray-400', className = '', text }: DreamPulseProps) {
  const dotVariants: Variants = {
    initial: { y: 0, opacity: 0.35, scale: 0.8 },
    animate: {
      y: [-2, 2, -2],
      opacity: [0.35, 1, 0.35],
      scale: [0.8, 1.1, 0.8],
      transition: {
        duration: 1.2,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="inline-flex items-center gap-1">
        {[0, 0.2, 0.4].map((delay, index) => (
          <motion.span
            key={index}
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{ delay }}
            className={`w-1.5 h-1.5 rounded-full ${color}`}
          />
        ))}
      </div>
      {text && <span className="text-xs text-gray-500 tracking-wider font-light">{text}</span>}
    </div>
  )
}
