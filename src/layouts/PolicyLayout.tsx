import { NavLink, Outlet } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { routes } from '~/config/routes'

const policyLinks = [
        {
                to: routes.comons.policies.connectAccount,
                label: 'Stripe Connect account policy',
                description: 'Eligibility, onboarding, and closure requirements'
        }
]

const baseLinkClass =
        'flex flex-col gap-1 rounded-xl border px-4 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5'

const activeLinkClass =
        'border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 text-primary'

const inactiveLinkClass = 'border-slate-200/70 bg-white/70 text-slate-600'

const descriptionClass = 'text-xs leading-relaxed text-slate-400'

const linkLabelClass = 'text-sm font-semibold'

const PolicyLayout = () => {
        return (
                <div className='space-y-8'>
                        <header className='space-y-3 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
                                <span className='inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary'>
                                        <ShieldCheck className='h-4 w-4' />
                                        Policies &amp; guidelines
                                </span>
                                <h1 className='text-2xl font-semibold text-slate-900'>Trust &amp; compliance library</h1>
                                <p className='max-w-3xl text-sm leading-relaxed text-slate-600'>
                                        Learn how freelancers can keep their accounts in good standing. These policies cover the
                                        requirements for financial compliance, marketplace safety, and responsible use of Stripe
                                        Connect.
                                </p>
                        </header>

                        <div className='grid gap-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]'>
                                <nav className='space-y-3 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
                                        <p className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>All policies</p>
                                        <div className='space-y-2'>
                                                {policyLinks.map(link => (
                                                        <NavLink
                                                                key={link.to}
                                                                to={link.to}
                                                                className={({ isActive }) =>
                                                                        `${baseLinkClass} ${
                                                                                isActive ? activeLinkClass : inactiveLinkClass
                                                                        }`
                                                                }
                                                        >
                                                                <span className={linkLabelClass}>{link.label}</span>
                                                                <span className={descriptionClass}>{link.description}</span>
                                                        </NavLink>
                                                ))}
                                        </div>
                                </nav>

                                <section className='min-h-[400px] space-y-6 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
                                        <Outlet />
                                </section>
                        </div>
                </div>
        )
}

export default PolicyLayout
