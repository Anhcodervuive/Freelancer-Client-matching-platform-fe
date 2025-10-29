import { Link, NavLink } from 'react-router-dom'
import { Gavel, LayoutDashboard } from 'lucide-react'

import { routes } from '~/config/routes'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        [
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
                isActive
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'text-slate-100/80 hover:bg-white/10 hover:text-white'
        ].join(' ')

export default function ArbitratorNavbar() {
        return (
                <header className='sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 text-slate-100 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.38)]'>
                        <div className='mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-3 md:px-6'>
                                <Link to={routes.arbitrator.dashboard} className='group flex items-center gap-3'>
                                        <span className='inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary text-lg font-semibold text-white shadow-lg shadow-primary/30 ring-1 ring-white/40 transition-transform duration-200 group-hover:scale-105'>
                                                W
                                        </span>
                                        <div className='flex flex-col leading-tight'>
                                                <span className='text-sm font-semibold text-slate-200'>Workreap-ish</span>
                                                <span className='text-xs font-medium text-slate-400'>Khu vực trọng tài viên</span>
                                        </div>
                                </Link>

                                <nav className='flex items-center gap-2'>
                                        <NavLink to={routes.arbitrator.dashboard} className={navLinkClass} end>
                                                <LayoutDashboard className='h-4 w-4' />
                                                Tổng quan
                                        </NavLink>
                                        <NavLink to={routes.arbitrator.disputes.list} className={navLinkClass}>
                                                <Gavel className='h-4 w-4' />
                                                Tranh chấp
                                        </NavLink>
                                </nav>
                        </div>
                </header>
        )
}
