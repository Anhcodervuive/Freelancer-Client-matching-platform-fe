import { NavLink } from 'react-router-dom'
import { Gavel, LayoutDashboard } from 'lucide-react'

import { routes } from '~/config/routes'

const navItemClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 transition ${
                isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-base-content/80 hover:bg-base-200'
        }`

export default function ArbitratorSidebar() {
        return (
                <nav className='w-72 space-y-6 p-4'>
                        <div>
                                <h2 className='px-3 text-sm font-semibold uppercase tracking-wide text-base-content/60'>Điều hướng</h2>
                                <ul className='mt-3 space-y-1'>
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
                        </div>
                </nav>
        )
}
