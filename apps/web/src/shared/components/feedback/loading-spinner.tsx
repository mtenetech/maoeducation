import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }

export function LoadingSpinner({ className, size = 'md', text }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizes[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex h-full min-h-[300px] items-center justify-center">
      <LoadingSpinner size="lg" text="Cargando..." />
    </div>
  )
}
