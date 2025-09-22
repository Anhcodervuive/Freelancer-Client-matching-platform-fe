import { Outlet } from 'react-router-dom'
import PublicNavbar from './partials/PublicNavbar'
import PublicFooter from './partials/PublicFooter'
import type { ReactElement } from 'react'

type prop = {
	children?: ReactElement
}

export default function CommonLayout({ children }: prop) {
        return (
                <div className='flex min-h-dvh flex-col'>
                        <PublicNavbar />
                        <main className='flex-1'>
                                <div className='relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 md:px-6'>
                                        <div className='pointer-events-none absolute inset-0 -z-10 hidden rounded-[48px] border border-white/60 bg-white/40 shadow-[0_30px_120px_rgba(15,23,42,0.08)] blur-3xl md:block' aria-hidden></div>
                                        <Outlet />
                                        {children}
                                </div>
                        </main>
                        <PublicFooter />
                </div>
        )
}
