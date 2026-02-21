import * as React from "react"
import { Check } from "lucide-react"

import { twMerge } from "tailwind-merge"

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    onCheckedChange?: (checked: boolean) => void
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, onCheckedChange, onChange, ...props }, ref) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange?.(e)
            onCheckedChange?.(e.target.checked)
        }

        return (
            <div className="relative inline-flex items-center">
                <input
                    type="checkbox"
                    className={twMerge(
                        "peer h-4 w-4 shrink-0 rounded-sm border border-brand-200 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none checked:bg-sky-500 checked:border-sky-500 transition-colors",
                        className
                    )}
                    ref={ref}
                    onChange={handleChange}
                    {...props}
                />
                <Check className="h-3 w-3 absolute text-white pointer-events-none opacity-0 peer-checked:opacity-100 left-0.5 top-0.5" />
            </div>
        )
    }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
