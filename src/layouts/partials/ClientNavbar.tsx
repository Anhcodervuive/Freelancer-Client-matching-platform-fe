import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '~/redux/user/userSlice'
import NotificationDropdown from './NotificationDropdown'
import UserMenu from './UserMenu'
import { routes } from '~/config/routes'
import { ChevronDown } from 'lucide-react'

const primaryLinks = [
        { label: 'Talent Marketplace', to: routes.comons.home },
        { label: 'Find Freelancers', to: routes.client.freelancers.list }
]

const workspaceLinks = [
        { label: 'Workroom', to: routes.contracts.list },
        { label: 'Messages', to: routes.messages.jobs },
        { label: 'My Jobs', to: routes.me.client.jobs.list },
        { label: 'Offers', to: routes.me.client.offers.list },
        { label: 'Financial', to: routes.client.financial.spending }
]

export default function ClientNavbar() {
        const [open, setOpen] = useState(false)
        const [workspaceOpen, setWorkspaceOpen] = useState(false)
        const user = useSelector(selectCurrentUser)
        const navigate = useNavigate()
        const workspaceRef = useRef<HTMLDivElement | null>(null)

        useEffect(() => {
                function handleClickOutside(event: MouseEvent) {
                        if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
                                setWorkspaceOpen(false)
                        }
                }

                if (workspaceOpen) {
                        document.addEventListener('mousedown', handleClickOutside)
                }

                return () => {
                        document.removeEventListener('mousedown', handleClickOutside)
                }
        }, [workspaceOpen])

        const nameParts = [user?.firstName, user?.lastName].filter((part): part is string => Boolean(part && part.trim()))
        const fullName = nameParts.join(' ') || user?.email || 'Client'

        return (
		<header className='sticky top-0 z-40 border-b border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_10px_40px_rgba(15,23,42,0.1)]'>
			<div className='mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 md:px-6'>
				<Link to='/' className='flex items-center gap-2 text-slate-900'>
					<span className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary via-secondary to-primary text-white shadow-lg shadow-primary/25 ring-1 ring-white/70'>
						<span className='text-base font-semibold leading-none'>W</span>
					</span>
					<span className='hidden text-lg font-semibold tracking-tight md:inline-block'>Workreap-ish</span>
				</Link>

                                <nav className='hidden flex-1 items-center gap-1 text-sm font-medium text-slate-600 md:flex'>
                                        {primaryLinks.map(item => (
                                                <NavLink
                                                        key={item.label}
                                                        to={item.to}
                                                        className={({ isActive }) =>
                                                                `inline-flex items-center rounded-xl px-3 py-2 transition hover:bg-primary/10 hover:text-primary ${
                                                                        isActive ? 'bg-primary/10 text-primary' : ''
                                                                }`
                                                        }>
                                                        {item.label}
                                                </NavLink>
                                        ))}

                                        <div className='relative' ref={workspaceRef}>
                                                <button
                                                        type='button'
                                                        className='inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm transition hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20'
                                                        onClick={() => setWorkspaceOpen(prev => !prev)}
                                                        aria-haspopup='true'
                                                        aria-expanded={workspaceOpen}>
                                                        Workspace
                                                        <ChevronDown
                                                                size={16}
                                                                className={workspaceOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
                                                        />
                                                </button>

                                                {workspaceOpen && (
                                                        <div className='absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10'>
                                                                <ul className='space-y-1 text-sm text-slate-600'>
                                                                        {workspaceLinks.map(item => (
                                                                                <li key={item.label}>
                                                                                        <NavLink
                                                                                                to={item.to}
                                                                                                className={({ isActive }) =>
                                                                                                        `flex items-center justify-between rounded-xl px-3 py-2 hover:bg-primary/10 hover:text-primary ${
                                                                                                                isActive ? 'bg-primary/10 text-primary' : ''
                                                                                                        }`
                                                                                                }
                                                                                                onClick={() => setWorkspaceOpen(false)}>
                                                                                                {item.label}
                                                                                        </NavLink>
                                                                                </li>
                                                                        ))}
                                                                </ul>
                                                        </div>
                                                )}
                                        </div>
                                </nav>

				<div className='ml-auto hidden items-center gap-3 md:flex'>
					<button
						className='inline-flex items-center rounded-xl border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-white'
						onClick={() => navigate(routes.me.client.jobs.create)}>
						Post a job
					</button>
					<NotificationDropdown />
					<UserMenu user={{ name: fullName, avatar: user?.avatar, role: user?.role }} />
				</div>

				<button
					className='ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/90 p-2 text-slate-600 shadow-sm transition hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:hidden'
					onClick={() => setOpen(prev => !prev)}
					aria-label='Toggle navigation'>
					<svg width='24' height='24' viewBox='0 0 24 24' fill='none'>
						<path d='M4 6h16M4 12h16M4 18h16' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
					</svg>
				</button>
			</div>

			{open && (
				<div className='mx-4 mb-4 rounded-3xl border border-white/60 bg-white/95 p-4 shadow-lg shadow-primary/5 md:hidden'>
                                        <nav className='flex flex-col gap-3 text-sm font-medium text-slate-600'>
                                                <div>
                                                        <p className='px-4 text-xs font-semibold uppercase tracking-wide text-slate-400'>Explore</p>
                                                        <div className='mt-1 flex flex-col gap-2'>
                                                                {primaryLinks.map(item => (
                                                                        <NavLink
                                                                                key={item.label}
                                                                                to={item.to}
                                                                                className='rounded-xl px-4 py-2 hover:bg-primary/10 hover:text-primary'
                                                                                onClick={() => setOpen(false)}>
                                                                                {item.label}
                                                                        </NavLink>
                                                                ))}
                                                        </div>
                                                </div>

                                                <div>
                                                        <p className='px-4 text-xs font-semibold uppercase tracking-wide text-slate-400'>Workspace</p>
                                                        <div className='mt-1 flex flex-col gap-2'>
                                                                {workspaceLinks.map(item => (
                                                                        <NavLink
                                                                                key={item.label}
                                                                                to={item.to}
                                                                                className='rounded-xl px-4 py-2 hover:bg-primary/10 hover:text-primary'
                                                                                onClick={() => setOpen(false)}>
                                                                                {item.label}
                                                                        </NavLink>
                                                                ))}
                                                        </div>
                                                </div>
                                        </nav>
					<div className='mt-4 flex flex-col gap-3'>
						<button
							className='w-full rounded-xl border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20'
							onClick={() => {
								navigate(routes.me.client.jobs.create)
								setOpen(false)
							}}>
							Post a job
						</button>
						<div className='flex items-center gap-2'>
							<NotificationDropdown />
							<UserMenu user={{ name: fullName, avatar: user?.avatar, role: user?.role }} />
						</div>
					</div>
				</div>
			)}
		</header>
	)
}
