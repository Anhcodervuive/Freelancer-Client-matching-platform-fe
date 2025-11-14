import { Link, NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { routes } from '~/config/routes'
import { selectCurrentUser } from '~/redux/user/userSlice'
import { Role } from '~/types'

type SidebarItem = {
        label: string
        to?: string
        badge?: string
        exact?: boolean
        roles?: Role[]
}

const billingItems: SidebarItem[] = [
        {
                label: 'Billing & Payments',
                to: routes.me.setting.payment.list
        }
]

const userSettingItems: SidebarItem[] = [
        { label: 'Membership & Connects' },
        { label: 'Contact Info', to: routes.me.setting.contactInfo, exact: true },
        { label: 'My Profile' },
        { label: 'Profile Settings' },
        { label: 'Get Paid', to: routes.me.setting.getPaid, roles: [Role.freelancer] },
        { label: 'My Teams' },
        { label: 'Connected Services' },
        { label: 'Password & Security' },
        { label: 'Identity Verification', badge: 'New' },
        { label: 'Notification Settings' },
        { label: 'Appeals Tracker' }
]

const baseClasses =
        'flex w-full items-center justify-between rounded-2xl border px-4 py-2 text-left text-sm font-medium transition'

const linkClasses = (isActive: boolean) =>
        `${baseClasses} ${
                isActive
                        ? 'border-primary/40 bg-primary/10 text-primary shadow-sm shadow-primary/10'
                        : 'border-transparent bg-white/60 text-slate-600 hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
        }`

const disabledClasses = `${baseClasses} cursor-not-allowed border-slate-100 bg-white/50 text-slate-400`

export default function SettingSidebar() {
        const currentUser = useSelector(selectCurrentUser)
        const role = currentUser?.role

        const visibleUserSettingItems = userSettingItems.filter(item => {
                if (!item.roles?.length) return true
                if (!role) return false

                return item.roles.includes(role)
        })

        return (
                <aside className='rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)]'>
                        <nav className='space-y-6'>
                                <div>
                                        <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Billing</p>
                                        <ul className='mt-3 space-y-2'>
                                                {billingItems.map(item => (
                                                        <li key={item.label}>
                                                                {item.to ? (
                                                                        <NavLink
                                                                                to={item.to}
                                                                                className={({ isActive }) => linkClasses(isActive)}
                                                                        >
                                                                                <span>{item.label}</span>
                                                                                <span className='text-xs text-slate-400'>→</span>
                                                                        </NavLink>
                                                                ) : (
                                                                        <button type='button' className={disabledClasses} disabled>
                                                                                <span>{item.label}</span>
                                                                        </button>
                                                                )}
                                                        </li>
                                                ))}
                                        </ul>
                                </div>

                                <div>
                                        <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>User settings</p>
                                        <ul className='mt-3 space-y-2'>
                                                {visibleUserSettingItems.map(item => (
                                                        <li key={item.label}>
                                                                {item.to ? (
                                                                        <NavLink
                                                                                to={item.to}
                                                                                end={item.exact}
                                                                                className={({ isActive }) => linkClasses(isActive)}
                                                                        >
                                                                                <span>{item.label}</span>
                                                                                {item.badge && (
                                                                                        <span className='inline-flex items-center rounded-full bg-gradient-to-r from-primary/90 to-secondary/90 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm'>
                                                                                                {item.badge}
                                                                                        </span>
                                                                                )}
                                                                        </NavLink>
                                                                ) : (
                                                                        <button type='button' className={disabledClasses} disabled>
                                                                                <span>{item.label}</span>
                                                                                {item.badge && (
                                                                                        <span className='inline-flex items-center rounded-full bg-gradient-to-r from-primary/90 to-secondary/90 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm'>
                                                                                                {item.badge}
                                                                                        </span>
                                                                                )}
                                                                        </button>
                                                                )}
                                                        </li>
                                                ))}
                                        </ul>
                                </div>

                                <div>
                                        <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Support & legal</p>
                                        <ul className='mt-3 space-y-2'>
                                                <li>
                                                        <Link
                                                                to={routes.comons.platformTerms}
                                                                target='_blank'
                                                                rel='noopener noreferrer'
                                                                className={`${baseClasses} border-slate-200/70 bg-white/70 text-slate-600 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary`}
                                                        >
                                                                <span>Terms & conditions</span>
                                                                <span className='text-xs text-slate-400'>↗</span>
                                                        </Link>
                                                </li>
                                        </ul>
                                </div>
                        </nav>
                </aside>
        )
}
