import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-gray-500/10 text-gray-400 border-gray-500/20': variant === 'default',
          'bg-green-500/10 text-green-400 border-green-500/20': variant === 'success',
          'bg-yellow-500/10 text-yellow-400 border-yellow-500/20': variant === 'warning',
          'bg-red-500/10 text-red-400 border-red-500/20': variant === 'danger',
          'bg-violet-500/10 text-violet-400 border-violet-500/20': variant === 'info',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
