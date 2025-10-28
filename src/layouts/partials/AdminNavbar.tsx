import { Link } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { routes } from '~/config/routes'

export default function AdminNavbar() {
        return (
                <header className='sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 text-slate-100 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.38)]'>
                        <div className='mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6'>
                                <Link to={routes.comons.home} className='group flex items-center gap-3'>
                                        <span className='inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary text-lg font-semibold text-white shadow-lg shadow-primary/30 ring-1 ring-white/40 transition-transform duration-200 group-hover:scale-105'>
                                                W
                                        </span>
                                        <div className='flex flex-col leading-tight'>
                                                <span className='text-sm font-semibold text-slate-200'>Workreap-ish</span>
                                                <span className='text-xs font-medium text-slate-400'>Bảng điều khiển quản trị</span>
                                        </div>
                                </Link>

                                <Link
                                        to={routes.admin.project}
                                        className='inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'
                                >
                                        <LayoutDashboard className='h-4 w-4' />
                                        Bảng điều khiển
                                </Link>
                        </div>
                </header>
        )
}
