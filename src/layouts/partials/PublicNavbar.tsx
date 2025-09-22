import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '~/redux/user/userSlice'
import UserMenu from './UserMenu'
import NotificationDropdown from './NotificationDropdown'
import { routes } from '~/config/routes'

export default function PublicNavbar() {
        const [open, setOpen] = useState(false)
        const user = useSelector(selectCurrentUser)
        const navigate = useNavigate()

        return (
                <header className='sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_8px_28px_rgba(15,23,42,0.08)]'>
                        <div className='mx-auto flex w-full max-w-6xl items-center gap-2.5 px-4 py-2.5 md:px-6 md:py-3'>
                                <Link to='/' className='group flex items-center gap-2.5 text-slate-900'>
                                        <span className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary via-secondary to-primary text-white shadow-lg shadow-primary/25 ring-1 ring-white/70 transition-transform duration-200 group-hover:scale-105'>
                                                <span className='text-base font-semibold leading-none'>W</span>
                                        </span>
                                        <span className='hidden text-lg font-semibold leading-tight tracking-tight sm:inline-block'>Workreap-ish</span>
                                </Link>

                                <nav className='ml-4 hidden items-center gap-1 text-sm font-medium text-slate-600 md:flex'>
                                        <div className='dropdown dropdown-hover'>
                                                <button className='inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-white'>
                                                        Main
                                                </button>
                                                <ul className='menu dropdown-content z-30 w-64 rounded-2xl border border-white/60 bg-white/95 p-2 shadow-xl shadow-primary/5'>
                                                        <li>
                                                                <NavLink to='/' className='rounded-lg px-3 py-2 hover:bg-primary/10 hover:text-primary'>
                                                                        Home
                                                                </NavLink>
                                                        </li>
                                                        <li>
                                                                <NavLink to='/explore' className='rounded-lg px-3 py-2 hover:bg-primary/10 hover:text-primary'>
                                                                        Explore
                                                                </NavLink>
                                                        </li>
                                                </ul>
                                        </div>

                                        <div className='dropdown dropdown-hover'>
                                                <button className='inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-white'>
                                                        Explore
                                                </button>
                                                <ul className='menu dropdown-content z-30 w-64 rounded-2xl border border-white/60 bg-white/95 p-2 shadow-xl shadow-primary/5'>
                                                        <li>
                                                                <NavLink to='/search' className='rounded-lg px-3 py-2 hover:bg-primary/10 hover:text-primary'>
                                                                        Search
                                                                </NavLink>
                                                        </li>
                                                </ul>
                                        </div>

                                        <div className='dropdown dropdown-hover'>
                                                <button className='inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium text-slate-600 transition hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-white'>
                                                        Find by category
                                                </button>
                                                <ul className='menu dropdown-content z-30 w-64 rounded-2xl border border-white/60 bg-white/95 p-2 shadow-xl shadow-primary/5'>
                                                        <li>
                                                                <button className='rounded-lg px-3 py-2 text-left hover:bg-primary/10 hover:text-primary' onClick={() => navigate('/search?cat=design')}>
                                                                        Design
                                                                </button>
                                                        </li>
                                                        <li>
                                                                <button className='rounded-lg px-3 py-2 text-left hover:bg-primary/10 hover:text-primary' onClick={() => navigate('/search?cat=dev')}>
                                                                        Development
                                                                </button>
                                                        </li>
                                                </ul>
                                        </div>
                                </nav>

                                <div className='ml-auto hidden items-center gap-2 md:flex'>
                                        <input
                                                placeholder='Search the marketplace'
                                                className='w-48 rounded-xl border border-white/60 bg-white/85 px-3 py-2 text-sm text-slate-600 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 md:w-60'
                                                onKeyDown={e => {
                                                        if (e.key === 'Enter') navigate('/search?q=' + (e.target as HTMLInputElement).value)
                                                }}
                                        />
                                        {user ? (
                                                <div className='flex items-center gap-2'>
                                                        <NotificationDropdown />
                                                        <UserMenu user={{ name: `${user.firstName} ${user.lastName}`, avatar: user.avatar, role: user.role }} />
                                                </div>
                                        ) : (
                                                <div className='flex items-center gap-1.5'>
                                                        <Link
                                                                to={routes.auth.signin}
                                                                className='inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-white'
                                                        >
                                                                Sign in
                                                        </Link>
                                                        <Link
                                                                to={routes.auth.signup}
                                                                className='inline-flex items-center rounded-xl bg-gradient-to-r from-primary to-secondary px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:shadow-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-white'
                                                        >
                                                                Register
                                                        </Link>
                                                </div>
                                        )}
                                </div>

                                <button
                                        className='ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/80 p-2 text-slate-600 shadow-sm transition hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:hidden'
                                        onClick={() => setOpen(v => !v)}
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
                                                <NavLink to='/' className='rounded-xl px-4 py-2 hover:bg-primary/10 hover:text-primary' onClick={() => setOpen(false)}>
                                                        Home
                                                </NavLink>
                                                <NavLink to='/explore' className='rounded-xl px-4 py-2 hover:bg-primary/10 hover:text-primary' onClick={() => setOpen(false)}>
                                                        Explore
                                                </NavLink>
                                                <NavLink to='/search' className='rounded-xl px-4 py-2 hover:bg-primary/10 hover:text-primary' onClick={() => setOpen(false)}>
                                                        Search
                                                </NavLink>
                                        </nav>
                                        <div className='mt-4 flex flex-col gap-2'>
                                                <input
                                                        placeholder='Search the marketplace'
                                                        className='w-full rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-sm text-slate-600 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                                                        onKeyDown={e => {
                                                                if (e.key === 'Enter') {
                                                                        navigate('/search?q=' + (e.target as HTMLInputElement).value)
                                                                        setOpen(false)
                                                                }
                                                        }}
                                                />
                                                {user ? (
                                                        <div className='flex items-center gap-2'>
                                                                <NotificationDropdown />
                                                                <UserMenu user={{ name: `${user.firstName} ${user.lastName}`, avatar: user.avatar, role: user.role }} />
                                                        </div>
                                                ) : (
                                                        <div className='flex gap-2'>
                                                                <Link
                                                                        to={routes.auth.signin}
                                                                        className='flex-1 rounded-xl border border-primary/40 px-3 py-2 text-center text-sm font-medium text-primary transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20'
                                                                        onClick={() => setOpen(false)}
                                                                >
                                                                        Sign in
                                                                </Link>
                                                                <Link
                                                                        to={routes.auth.signup}
                                                                        className='flex-1 rounded-xl bg-gradient-to-r from-primary to-secondary px-3 py-2 text-center text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:shadow-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30'
                                                                        onClick={() => setOpen(false)}
                                                                >
                                                                        Sign up
                                                                </Link>
                                                        </div>
                                                )}
                                        </div>
                                </div>
                        )}
                </header>
        )
}
