import { ComponentProps, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

export const Card = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={twMerge(
                    'rounded-xl border border-white/10 bg-[#0d0d12] shadow-xl shadow-black/60 p-6',
                    className
                )}
                {...props}
            />
        )
    }
)
Card.displayName = 'Card'
