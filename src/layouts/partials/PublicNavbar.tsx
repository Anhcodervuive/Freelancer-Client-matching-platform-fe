import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '~/redux/user/userSlice'
import { routes } from '~/config/routes'

export default function PublicNavbar() {
        const user = useSelector(selectCurrentUser)

        return (
                <header className='sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_8px_28px_rgba(15,23,42,0.08)]'>
                        <div className='mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6'>
                                <Link to='/' className='group flex items-center gap-2.5 text-slate-900'>
                                        <span className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary via-secondary to-primary text-white shadow-lg shadow-primary/25 ring-1 ring-white/70 transition-transform duration-200 group-hover:scale-105'>
                                                <span className='text-base font-semibold leading-none'>W</span>
                                        </span>
                                        <span className='hidden text-lg font-semibold leading-tight tracking-tight sm:inline-block'>Workreap-ish</span>
                                </Link>

                                {user ? (
                                        <Link
                                                to={routes.freelancer.jobs.list}
                                                className='inline-flex items-center rounded-full border border-primary/30 bg-white/80 px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:border-primary/50 hover:bg-primary/10'
                                        >
                                                Back to app
                                        </Link>
                                ) : (
                                        <Link
                                                to={routes.auth.signup}
                                                className='inline-flex items-center rounded-full bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:shadow-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-white'
                                        >
                                                Get started
                                        </Link>
                                )}
                        </div>
                </header>
        )
}
