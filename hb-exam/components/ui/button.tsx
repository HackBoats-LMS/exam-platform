import { ComponentProps, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

export type ButtonProps = ComponentProps<'button'> & {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        const variants = {
            primary: 'bg-sky-500 text-white hover:bg-sky-600 shadow-sm active:translate-y-[1px]',
            secondary: 'bg-[#0d0d12] text-white border border-white/10 hover:bg-white/5 shadow-sm active:translate-y-[1px]',
            outline: 'bg-transparent border border-white/20 text-gray-200 hover:bg-white/5 active:translate-y-[1px]',
            ghost: 'bg-transparent text-gray-300 hover:bg-[#15151a] hover:text-white',
            danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm active:translate-y-[1px]',
        }

        const sizes = {
            sm: 'h-8 px-3 text-xs',
            md: 'h-10 px-4 py-2 text-sm',
            lg: 'h-12 px-6 text-base',
        }

        return (
            <button
                ref={ref}
                className={twMerge(
                    'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = 'Button'
