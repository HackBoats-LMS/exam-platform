import { ComponentProps, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

export const Input = forwardRef<HTMLInputElement, ComponentProps<'input'>>(
    ({ className, ...props }, ref) => {
        return (
            <input
                ref={ref}
                className={twMerge(
                    'flex h-10 w-full rounded-lg border border-white/10 bg-[#0d0d12] px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all disabled:cursor-not-allowed disabled:opacity-50',
                    className
                )}
                {...props}
            />
        )
    }
)
Input.displayName = 'Input'
