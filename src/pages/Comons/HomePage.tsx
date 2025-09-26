import { Link } from 'react-router-dom'
import { routes } from '~/config/routes'

const featureCards = [
        {
                title: 'Discover curated talent',
                description: 'Filter by skill, rate, timezone, and availability in seconds to assemble your ideal freelance squad.'
        },
        {
                title: 'Collaborate with clarity',
                description: 'Share briefs, milestones, and files in beautifully organised project hubs that keep everyone aligned.'
        },
        {
                title: 'Secure, effortless payments',
                description: 'Track time, approve deliverables, and release payouts with confidence thanks to automated safeguards.'
        }
]

const highlights = [
        { label: 'Projects delivered', value: '12K+' },
        { label: 'Verified experts', value: '4.8K' },
        { label: 'Avg. client rating', value: '4.9/5' }
]

const onboardingSteps = [
        {
                title: 'Create your workspace',
                description: 'Sign up in minutes to unlock tailored dashboards for clients or freelancers.'
        },
        {
                title: 'Complete guided onboarding',
                description: 'Answer a few focused questions so we can personalise job matches and recommendations.'
        },
        {
                title: 'Start collaborating',
                description: 'Access the marketplace, connect with talent, and manage projects once you are verified.'
        }
]

const HomePage = () => {
        return (
                <div className='space-y-16'>
                        <section className='relative overflow-hidden rounded-[42px] border border-white/70 bg-white/80 p-8 shadow-[0_40px_120px_rgba(15,23,42,0.12)] md:p-12'>
                                <div className='absolute -left-10 -top-10 size-40 rounded-full bg-primary/20 blur-3xl' aria-hidden></div>
                                <div className='absolute -right-16 bottom-0 size-48 rounded-full bg-secondary/20 blur-3xl' aria-hidden></div>
                                <div className='relative grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:items-center'>
                                        <div className='space-y-6'>
                                                <span className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-primary'>New era of freelancing</span>
                                                <h1 className='text-4xl font-bold leading-tight text-slate-900 md:text-5xl'>Join the Workreap-ish community and unlock curated opportunities.</h1>
                                                <p className='max-w-xl text-base text-slate-600 md:text-lg'>Our marketplace is available exclusively to signed-in members. Create an account, complete the guided onboarding, and then browse jobs or hire verified experts with confidence.</p>
                                                <div className='flex flex-wrap items-center gap-3'>
                                                        <Link
                                                                to={routes.auth.signup}
                                                                className='btn btn-lg rounded-full border-none bg-gradient-to-r from-primary to-secondary px-8 text-base font-semibold text-white shadow-lg shadow-primary/30 transition hover:shadow-primary/40'
                                                        >
                                                                Create your account
                                                        </Link>
                                                        <Link
                                                                to={routes.auth.signin}
                                                                className='btn btn-lg rounded-full border border-primary/20 bg-white/70 px-8 text-base font-semibold text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10'
                                                        >
                                                                I already have an account
                                                        </Link>
                                                </div>
                                                <dl className='grid gap-4 pt-4 sm:grid-cols-3'>
                                                        {highlights.map(item => (
                                                                <div key={item.label} className='rounded-3xl border border-white/80 bg-white/70 px-5 py-4 shadow-sm shadow-primary/10'>
                                                                        <dt className='text-xs font-semibold uppercase tracking-[0.25em] text-slate-400'>{item.label}</dt>
                                                                        <dd className='mt-2 text-2xl font-semibold text-slate-900'>{item.value}</dd>
                                                                </div>
                                                        ))}
                                                </dl>
                                        </div>

                                        <div className='relative grid gap-4 rounded-[32px] border border-white/60 bg-white/70 p-6 shadow-inner shadow-white/20 backdrop-blur'>
                                                <div className='rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-white to-secondary/20 p-5 shadow-lg shadow-primary/20'>
                                                        <div className='flex items-center justify-between'>
                                                                <div>
                                                                        <p className='text-xs font-semibold uppercase tracking-[0.25em] text-primary/80'>Active brief</p>
                                                                        <p className='mt-2 text-lg font-semibold text-slate-900'>Design responsive fintech dashboard</p>
                                                                </div>
                                                                <span className='rounded-full border border-primary/20 bg-white/70 px-3 py-1 text-xs font-medium text-primary'>In progress</span>
                                                        </div>
                                                        <ul className='mt-4 space-y-2 text-sm text-slate-600'>
                                                                <li className='flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-3 py-2'>
                                                                        <span>🧑‍🎨 Aurora Studio</span>
                                                                        <span className='text-xs font-semibold text-primary'>UI Design</span>
                                                                </li>
                                                                <li className='flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-3 py-2'>
                                                                        <span>💻 Devin Miles</span>
                                                                        <span className='text-xs font-semibold text-secondary'>Frontend</span>
                                                                </li>
                                                                <li className='flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-3 py-2'>
                                                                        <span>✍️ Content Guild</span>
                                                                        <span className='text-xs font-semibold text-accent'>Copywriting</span>
                                                                </li>
                                                        </ul>
                                                </div>
                                                <div className='grid gap-3 rounded-3xl border border-white/70 bg-white/70 p-5 shadow-sm shadow-primary/10'>
                                                        <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Timeline</p>
                                                        <div className='flex items-center gap-3'>
                                                                <div className='flex size-12 items-center justify-center rounded-full border border-primary/20 bg-gradient-to-br from-primary/15 to-secondary/15 text-lg font-semibold text-primary'>24</div>
                                                                <div>
                                                                        <p className='text-sm font-semibold text-slate-900'>Days to launch</p>
                                                                        <p className='text-xs text-slate-500'>Milestones locked &amp; team aligned</p>
                                                                </div>
                                                        </div>
                                                        <div className='rounded-2xl border border-white/70 bg-white/80 p-3 text-sm text-slate-600 shadow-inner shadow-white/30'>
                                                                “The smoothest collaboration platform we have used — everything feels intentionally designed.”
                                                        </div>
                                                </div>
                                        </div>
                                </div>
                        </section>

                        <section className='rounded-[32px] border border-white/60 bg-white/70 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)] md:p-12'>
                                <div className='grid gap-8 md:grid-cols-3 md:gap-10'>
                                        <div className='md:col-span-1'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-primary/70'>How it works</p>
                                                <h2 className='mt-3 text-3xl font-bold text-slate-900'>A guided path to the marketplace.</h2>
                                                <p className='mt-4 text-sm text-slate-600'>To protect both clients and freelancers, access to projects and talent is available once you finish onboarding. Here&apos;s what to expect after you click &ldquo;Get started&rdquo;.</p>
                                        </div>
                                        <ol className='grid gap-6 md:col-span-2'>
                                                {onboardingSteps.map((step, index) => (
                                                        <li key={step.title} className='relative rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm shadow-primary/10'>
                                                                <span className='inline-flex size-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary'>
                                                                        {String(index + 1).padStart(2, '0')}
                                                                </span>
                                                                <h3 className='mt-4 text-xl font-semibold text-slate-900'>{step.title}</h3>
                                                                <p className='mt-2 text-sm text-slate-600'>{step.description}</p>
                                                        </li>
                                                ))}
                                        </ol>
                                </div>
                        </section>

                        <section className='grid gap-6 md:grid-cols-3'>
                                {featureCards.map(card => (
                                        <div key={card.title} className='rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(15,23,42,0.12)]'>
                                                <h3 className='text-lg font-semibold text-slate-900'>{card.title}</h3>
                                                <p className='mt-3 text-sm text-slate-600'>{card.description}</p>
                                        </div>
                                ))}
                        </section>

                        <section className='grid gap-8 rounded-[38px] border border-white/70 bg-gradient-to-br from-primary/15 via-white to-secondary/20 p-8 shadow-[0_35px_100px_rgba(15,23,42,0.12)] md:grid-cols-[1.1fr_1fr] md:p-12'>
                                <div className='space-y-4'>
                                        <h2 className='text-3xl font-bold text-slate-900'>Built for modern teams and independent creators alike.</h2>
                                        <p className='text-base text-slate-600'>Whether you are scaling an agency or freelancing solo, Workreap-ish gives you refined tools, transparent workflows, and a supportive community to ship your best work.</p>
                                        <ul className='space-y-3 text-sm text-slate-600'>
                                                <li className='flex items-start gap-3'>
                                                        <span className='mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary'>✓</span>
                                                        Dedicated project spaces with file versioning and feedback tracking.
                                                </li>
                                                <li className='flex items-start gap-3'>
                                                        <span className='mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary'>✓</span>
                                                        Smart matching that pairs briefs with verified specialists in minutes.
                                                </li>
                                                <li className='flex items-start gap-3'>
                                                        <span className='mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary'>✓</span>
                                                        Insightful analytics to monitor progress, spend, and satisfaction at a glance.
                                                </li>
                                        </ul>
                                </div>
                                <div className='flex flex-col justify-between gap-6 rounded-3xl border border-white/70 bg-white/70 p-6 shadow-lg shadow-primary/10'>
                                        <div className='space-y-3'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Trusted by</p>
                                                <div className='flex flex-wrap gap-3 text-sm font-semibold text-slate-500'>
                                                        <span className='rounded-full border border-white/60 bg-white/80 px-4 py-2 shadow-sm'>Nova Labs</span>
                                                        <span className='rounded-full border border-white/60 bg-white/80 px-4 py-2 shadow-sm'>Pixel Forge</span>
                                                        <span className='rounded-full border border-white/60 bg-white/80 px-4 py-2 shadow-sm'>Atlas Studio</span>
                                                        <span className='rounded-full border border-white/60 bg-white/80 px-4 py-2 shadow-sm'>GlobeX</span>
                                                </div>
                                        </div>
                                        <div className='rounded-3xl border border-white/70 bg-white/80 p-5 text-sm text-slate-600 shadow-inner shadow-white/30'>
                                                “Our onboarding time dropped by half and client satisfaction soared once we migrated projects to Workreap-ish.”
                                                <div className='mt-4 flex items-center gap-3 text-sm font-semibold text-slate-900'>
                                                        <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white'>
                                                                JD
                                                        </span>
                                                        <div>
                                                                <p>Julia Donovan</p>
                                                                <p className='text-xs font-normal text-slate-500'>Operations Lead, Nova Labs</p>
                                                        </div>
                                                </div>
                                        </div>
                                </div>
                        </section>
                </div>
        )
}

export default HomePage
