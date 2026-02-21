import { ComponentProps } from 'react'

export function Logo(props: ComponentProps<'div'>) {
    return (
        <div className="flex items-center gap-2" {...props}>
            <img src="https://www.hackboats.com/images/logo.png" alt="HackBoats Logo" className="h-10 w-auto" />
            <span className="text-xl font-bold tracking-tight text-gray-900">
                HackBoats <span className="text-sky-500">Exam</span>
            </span>
        </div>
    )
}
