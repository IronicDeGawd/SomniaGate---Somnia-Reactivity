import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-12 w-full rounded-[14px] border border-[#191A23] bg-white px-4 py-3 text-base text-[#191A23] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#191A23]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9FF66] focus-visible:border-[#B9FF66] disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
