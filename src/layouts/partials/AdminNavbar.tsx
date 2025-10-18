import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { LayoutDashboard, Layers, Grid3X3, Menu } from 'lucide-react'
import NotificationDropdown from './NotificationDropdown'
import UserMenu from './UserMenu'
import { selectCurrentUser } from '~/redux/user/userSlice'
import { routes } from '~/config/routes'

const adminNavItems = [
        {
                label: 'Tổng quan',
                to: routes.admin.project,
                icon: LayoutDashboard
        },
        {
                label: 'Danh mục',
                to: routes.admin.category.list,
                icon: Grid3X3
        },
        {
                label: 'Chuyên ngành',
                to: routes.admin.specialty.list,
                icon: Layers
        }
]

export default function AdminNavbar() {
        const [isMenuOpen, setIsMenuOpen] = useState(false)
        const user = useSelector(selectCurrentUser)

        const displayName = [user?.firstName, user?.lastName]
                .filter((part): part is string => Boolean(part && part.trim()))
                .join(' ')
                .trim()
                || user?.email
                || 'Admin'

        return (
                <header className='sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 text-slate-100 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.38)]'>
                        <div className='mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 md:px-6'>
                                <Link to={routes.admin.project} className='group flex items-center gap-3'>
                                        <span className='inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary text-lg font-semibold text-white shadow-lg shadow-primary/30 ring-1 ring-white/40 transition-transform duration-200 group-hover:scale-105'>
                                                W
                                        </span>
                                        <div className='flex flex-col leading-tight'>
                                                <span className='text-sm font-semibold text-slate-200'>Workreap-ish</span>
                                                <span className='text-xs font-medium text-slate-400'>Bảng điều khiển quản trị</span>
                                        </div>
                                </Link>

                                <nav className='hidden flex-1 items-center gap-1 text-sm font-medium md:flex'>
                                        {adminNavItems.map(item => {
                                                const Icon = item.icon
                                                return (
                                                        <NavLink
                                                                key={item.label}
                                                                to={item.to}
                                                                className={({ isActive }) =>
                                                                        `inline-flex items-center gap-2 rounded-2xl px-3 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                                                                                isActive
                                                                                        ? 'bg-white/15 text-white shadow-inner shadow-primary/10'
                                                                                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                                                        }`
                                                                }
                                                        >
                                                                <Icon className='h-4 w-4' />
                                                                {item.label}
                                                        </NavLink>
                                                )
                                        })}
                                </nav>

                                <div className='ml-auto hidden items-center gap-3 md:flex'>
                                        <Link
                                                to={routes.admin.project}
                                                className='inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'
                                        >
                                                <LayoutDashboard className='h-4 w-4' />
                                                Bảng điều khiển
                                        </Link>
                                        <NotificationDropdown />
                                        <UserMenu user={{ name: displayName, avatar: user?.avatar, role: user?.role }} />
                                </div>

                                <button
                                        type='button'
                                        className='ml-auto inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/5 text-slate-100 transition hover:border-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-slate-900 md:hidden'
                                        onClick={() => setIsMenuOpen(prev => !prev)}
                                        aria-label='Toggle admin menu'
                                >
                                        <Menu className='h-5 w-5' />
                                </button>
                        </div>

                        {isMenuOpen && (
                                <div className='mx-4 mb-4 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/90 p-4 shadow-2xl shadow-primary/10 md:hidden'>
                                        <nav className='flex flex-col gap-2 text-sm font-medium'>
                                                {adminNavItems.map(item => {
                                                        const Icon = item.icon
                                                        return (
                                                                <NavLink
                                                                        key={item.label}
                                                                        to={item.to}
                                                                        className='inline-flex items-center gap-3 rounded-2xl px-4 py-2 text-slate-200 transition hover:bg-white/10 hover:text-white'
                                                                        onClick={() => setIsMenuOpen(false)}
                                                                >
                                                                        <Icon className='h-4 w-4' />
                                                                        {item.label}
                                                                </NavLink>
                                                        )
                                                })}
                                        </nav>
                                        <div className='flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200'>
                                                <div className='flex flex-col'>
                                                        <span className='font-semibold'>{displayName}</span>
                                                        <span className='text-xs text-slate-400'>Quản trị viên</span>
                                                </div>
                                                <UserMenu user={{ name: displayName, avatar: user?.avatar, role: user?.role }} />
                                        </div>
                                        <NotificationDropdown />
                                </div>
                        )}
                </header>
        )
}
