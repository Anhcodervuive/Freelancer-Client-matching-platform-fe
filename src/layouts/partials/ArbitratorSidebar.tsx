import { NavLink } from 'react-router-dom'
import { Gavel, LayoutDashboard, ShieldCheck, LifeBuoy } from 'lucide-react'

import { routes } from '~/config/routes'

const navItemClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-base-content/80 hover:bg-base-200'
        }`

export default function ArbitratorSidebar() {
        return (
                <aside className='flex h-full min-h-dvh w-72 flex-col bg-base-100'>
                        <div className='border-b border-base-200 px-5 py-6'>
                                <div className='flex items-center gap-3'>
                                        <div className='grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary'>
                                                <ShieldCheck size={22} />
                                        </div>
                                        <div>
                                                <p className='text-xs font-semibold uppercase tracking-wider text-primary/80'>Trọng tài</p>
                                                <h1 className='text-lg font-bold text-base-content'>Bàn điều hành</h1>
                                        </div>
                                </div>
                        </div>

                        <nav className='flex-1 overflow-y-auto px-4 py-6'>
                                <p className='px-3 text-xs font-semibold uppercase tracking-wide text-base-content/50'>Điều hướng chính</p>
                                <ul className='mt-4 space-y-1.5'>
                                        <li>
                                                <NavLink to={routes.arbitrator.dashboard} className={navItemClass} end>
                                                        <LayoutDashboard size={18} />
                                                        <span>Tổng quan</span>
                                                </NavLink>
                                        </li>
                                        <li>
                                                <NavLink to={routes.arbitrator.disputes.list} className={navItemClass}>
                                                        <Gavel size={18} />
                                                        <span>Tranh chấp</span>
                                                </NavLink>
                                        </li>
                                </ul>
                        </nav>

                        <div className='border-t border-base-200 px-5 py-6 text-xs text-base-content/70'>
                                <div className='flex items-start gap-3 rounded-2xl bg-base-200/80 p-3'>
                                        <LifeBuoy size={18} className='mt-0.5 text-primary' />
                                        <div>
                                                <p className='font-semibold text-base-content'>Hỗ trợ nhanh</p>
                                                <p>
                                                        Cần trợ giúp? Liên hệ đội ngũ admin qua{' '}
                                                        <a className='font-medium text-primary underline' href='mailto:support@workreap.local'>
                                                                support@workreap.local
                                                        </a>
                                                </p>
                                        </div>
                                </div>
                        </div>
                </aside>
        )
}
