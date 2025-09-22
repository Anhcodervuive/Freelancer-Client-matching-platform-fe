import { routes } from '~/config/routes'

const items = [
	{ label: 'Membership & Connects' },
	{ label: 'Contact Info', active: true },
	{ label: 'My Profile' },
	{ label: 'Profile Settings' },
	{ label: 'Get Paid' },
	{ label: 'My Teams' },
	{ label: 'Connected Services' },
	{ label: 'Password & Security' },
	{ label: 'Identity Verification', badge: 'New' },
	{ label: 'Notification Settings' },
	{ label: 'Appeals Tracker' }
]
export default function SettingSidebar() {
        return (
                <aside className='rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)]'>
                        <nav className='space-y-6'>
                                <div>
                                        <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Billing</p>
                                        <ul className='mt-3 space-y-2'>
                                                <li>
                                                        <a
                                                                className='flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary'
                                                                href={routes.me.setting.payment.list}
                                                        >
                                                                Billing &amp; Payments
                                                                <span className='text-xs text-slate-400'>→</span>
                                                        </a>
                                                </li>
                                        </ul>
                                </div>

                                <div>
                                        <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>User settings</p>
                                        <ul className='mt-3 space-y-2'>
                                                {items.map(it => (
                                                        <li key={it.label}>
                                                                <button
                                                                        type='button'
                                                                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-2 text-left text-sm font-medium transition ${
                                                                                it.active
                                                                                        ? 'border-primary/40 bg-primary/10 text-primary shadow-sm shadow-primary/10'
                                                                                        : 'border-transparent bg-white/60 text-slate-600 hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
                                                                        }`}
                                                                >
                                                                        <span>{it.label}</span>
                                                                        {it.badge && (
                                                                                <span className='inline-flex items-center rounded-full bg-gradient-to-r from-primary/90 to-secondary/90 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm'>
                                                                                        {it.badge}
                                                                                </span>
                                                                        )}
                                                                </button>
                                                        </li>
                                                ))}
                                        </ul>
                                </div>
                        </nav>
                </aside>
        )
}
