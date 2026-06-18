import { ComponentProps } from 'react'

export function Logo(props: ComponentProps<'div'>) {
    return (
        <div className="flex items-center gap-2" {...props}>
            <img src="/internx-logo-white.png" alt="InternX Logo" className="h-10 w-auto invert" />
            <span className="text-xl font-bold tracking-tight text-white">
                InternX <span className="text-sky-500">Exam</span>
            </span>
        </div>
    )
}
