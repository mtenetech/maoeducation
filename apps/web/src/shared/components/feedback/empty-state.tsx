import { InboxIcon, type LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = InboxIcon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center px-4',
        className,
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-5 max-w-xs">{description}</p>
      )}
      {action}
    </div>
  )
}
