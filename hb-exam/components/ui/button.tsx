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
            secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 shadow-sm active:translate-y-[1px]',
            outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 active:translate-y-[1px]',
            ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900',
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
