import { Link, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '~/redux/user/userSlice'
import NotificationDropdown from './NotificationDropdown'
import UserMenu from './UserMenu'
import { routes } from '~/config/routes'

const navItems = [
        { label: 'Find Work', to: routes.comons.home },
        { label: 'My Profile', to: routes.me.freelancer.profile },
        { label: 'Readiness', to: routes.comons.onboarding }
]

export default function FreelancerNavbar() {
        const [open, setOpen] = useState(false)
        const user = useSelector(selectCurrentUser)

        const nameParts = [user?.firstName, user?.lastName].filter((part): part is string => Boolean(part && part.trim()))
        const fullName = nameParts.join(' ') || user?.email || 'Freelancer'

        return (
                <header className='sticky top-0 z-40 border-b border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_10px_40px_rgba(15,23,42,0.1)]'>
                        <div className='mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 md:px-6'>
                                <Link to='/' className='flex items-center gap-2 text-slate-900'>
                                        <span className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary via-secondary to-primary text-white shadow-lg shadow-primary/25 ring-1 ring-white/70'>
                                                <span className='text-base font-semibold leading-none'>W</span>
                                        </span>
                                        <span className='hidden text-lg font-semibold tracking-tight md:inline-block'>Workreap-ish</span>
                                </Link>

                                <nav className='hidden flex-1 items-center gap-1 text-sm font-medium text-slate-600 md:flex'>
                                        {navItems.map(item => (
                                                <NavLink
                                                        key={item.label}
                                                        to={item.to}
                                                        className={({ isActive }) =>
                                                                `inline-flex items-center rounded-xl px-3 py-2 transition hover:bg-primary/10 hover:text-primary ${
                                                                        isActive ? 'bg-primary/10 text-primary' : ''
                                                                }`
                                                        }
                                                >
                                                        {item.label}
                                                </NavLink>
                                        ))}
                                </nav>

                                <div className='ml-auto hidden items-center gap-3 md:flex'>
                                        <div className='rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600'>
                                                Available now
                                        </div>
                                        <NotificationDropdown />
                                        <UserMenu user={{ name: fullName, avatar: user?.avatar, role: user?.role }} />
                                </div>

                                <button
                                        className='ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/90 p-2 text-slate-600 shadow-sm transition hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:hidden'
                                        onClick={() => setOpen(prev => !prev)}
                                        aria-label='Toggle navigation'
                                >
                                        <svg width='24' height='24' viewBox='0 0 24 24' fill='none'>
                                                <path d='M4 6h16M4 12h16M4 18h16' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
                                        </svg>
                                </button>
                        </div>

                        {open && (
                                <div className='mx-4 mb-4 rounded-3xl border border-white/60 bg-white/95 p-4 shadow-lg shadow-primary/5 md:hidden'>
                                        <nav className='flex flex-col gap-2 text-sm font-medium text-slate-600'>
                                                {navItems.map(item => (
                                                        <NavLink
                                                                key={item.label}
                                                                to={item.to}
                                                                className='rounded-xl px-4 py-2 hover:bg-primary/10 hover:text-primary'
                                                                onClick={() => setOpen(false)}
                                                        >
                                                                {item.label}
                                                        </NavLink>
                                                ))}
                                        </nav>
                                        <div className='mt-4 flex items-center justify-between'>
                                                <span className='rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600'>
                                                        Available now
                                                </span>
                                                <div className='flex items-center gap-2'>
                                                        <NotificationDropdown />
                                                        <UserMenu user={{ name: fullName, avatar: user?.avatar, role: user?.role }} />
                                                </div>
                                        </div>
                                </div>
                        )}
                </header>
        )
}
