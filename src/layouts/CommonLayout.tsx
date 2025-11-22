import { Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { ReactElement } from 'react'
import PublicNavbar from './partials/PublicNavbar'
import ClientNavbar from './partials/ClientNavbar'
import FreelancerNavbar from './partials/FreelancerNavbar'
import PublicFooter from './partials/PublicFooter'
import AdminNavbar from './partials/AdminNavbar'
import { selectCurrentUser } from '~/redux/user/userSlice'
import { Role } from '~/types/user'
import { routes } from '~/config/routes'

type prop = {
	children?: ReactElement
}

export default function CommonLayout({ children }: prop) {
        const currentUser = useSelector(selectCurrentUser)
        const role = currentUser?.role
        const location = useLocation()

        const Navbar =
                role === Role.ADMIN
                        ? AdminNavbar
                        : role === Role.CLIENT
                        ? ClientNavbar
                        : role === Role.FREELANCER
                        ? FreelancerNavbar
                        : PublicNavbar

        const isClientSpendingPage = location.pathname.startsWith(routes.client.financial.spending)

        const containerClassName = isClientSpendingPage
                ? 'relative mx-auto flex w-full max-w-none flex-1 flex-col gap-10 px-4 py-8 sm:px-6 lg:px-12'
                : 'relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-6 py-10 md:px-10'

        return (
                <div className='flex min-h-dvh flex-col'>
                        <Navbar />
                        <main className='flex flex-1 flex-col'>
                                <div className={containerClassName}>
                                        {!isClientSpendingPage ? (
                                                <div
                                                        className='pointer-events-none absolute inset-0 -z-10 hidden rounded-[48px] border border-white/60 bg-white/40 shadow-[0_30px_120px_rgba(15,23,42,0.08)] blur-3xl md:block'
                                                        aria-hidden
                                                ></div>
                                        ) : null}
                                        <Outlet />
                                        {children}
                                </div>
                        </main>
                        <PublicFooter />
                </div>
        )
}
