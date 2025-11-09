import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '~/redux/user/userSlice'
import NotificationDropdown from './NotificationDropdown'
import UserMenu from './UserMenu'
import { routes } from '~/config/routes'
import { ChevronDown } from 'lucide-react'

const secondaryNavItems = [
        { label: 'Workroom', to: routes.contracts.list },
        { label: 'Messages', to: routes.messages.jobs },
        { label: 'Financial Overview', to: routes.freelancer.financial.overview },
        { label: 'Payouts', to: routes.freelancer.financial.payouts },
        { label: 'My Profile', to: routes.me.freelancer.profile }
]

const findWorkMenuItems = [
        {
                label: 'Job marketplace',
                description: 'Browse active projects curated for your skills.',
                to: routes.freelancer.jobs.list
        },
        {
                label: 'Saved jobs',
                description: 'Revisit opportunities you have bookmarked.',
                to: routes.freelancer.jobs.saved
        },
        {
                label: 'Proposals',
                description: 'Review invitations and proposals you have submitted.',
                to: routes.freelancer.jobs.invitations
        },
        {
                label: 'Offers',
                description: 'View offers from clients and respond promptly.',
                to: routes.freelancer.offers.list
        }
]

export default function FreelancerNavbar() {
	const [open, setOpen] = useState(false)
	const [findWorkOpen, setFindWorkOpen] = useState(false)
	const [mobileFindWorkOpen, setMobileFindWorkOpen] = useState(false)
	const user = useSelector(selectCurrentUser)
	const location = useLocation()

        const nameParts = [user?.firstName, user?.lastName].filter((part): part is string => Boolean(part && part.trim()))
        const fullName = nameParts.join(' ') || user?.email || 'Freelancer'
        const findWorkPaths = findWorkMenuItems.map(item => item.to)
        const isFindWorkActive = findWorkPaths.some(path => location.pathname.startsWith(path))

	useEffect(() => {
		setFindWorkOpen(false)
		setMobileFindWorkOpen(false)
		setOpen(false)
	}, [location.pathname])

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
					<div
						className='relative'
						onMouseEnter={() => setFindWorkOpen(true)}
						onMouseLeave={() => setFindWorkOpen(false)}>
						<button
							type='button'
							onClick={() => setFindWorkOpen(prev => !prev)}
							className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 transition hover:bg-primary/10 hover:text-primary ${
								isFindWorkActive ? 'bg-primary/10 text-primary' : ''
							}`}
							aria-haspopup='true'
							aria-expanded={findWorkOpen}>
							Find Work
							<ChevronDown className={`size-4 transition-transform ${findWorkOpen ? 'rotate-180' : ''}`} />
						</button>

						{findWorkOpen && (
							<div className='absolute left-0 top-full mt-2 w-[280px] rounded-2xl border border-slate-200 bg-white/95 p-3 text-sm shadow-xl shadow-primary/10 backdrop-blur'>
								<div className='flex flex-col gap-2'>
									{findWorkMenuItems.map(item => (
										<Link
											key={item.label}
											to={item.to}
											className='rounded-xl border border-transparent px-3 py-2 text-left text-slate-600 transition hover:border-primary/20 hover:bg-primary/10 hover:text-primary'
											onClick={() => setFindWorkOpen(false)}>
											<div className='font-semibold text-slate-800'>{item.label}</div>
											<p className='text-xs text-slate-500'>{item.description}</p>
										</Link>
									))}
								</div>
							</div>
						)}
					</div>

					{secondaryNavItems.map(item => (
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
				</nav>

				<div className='ml-auto hidden items-center gap-3 md:flex'>
					<div className='rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600'>
						Available now
					</div>
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
					<nav className='flex flex-col gap-2 text-sm font-medium text-slate-600'>
						<div className='rounded-xl border border-white/70 bg-white/80'>
							<button
								type='button'
								className={`flex w-full items-center justify-between rounded-xl px-4 py-2 text-left ${
									isFindWorkActive ? 'bg-primary/10 text-primary' : ''
								}`}
								onClick={() => setMobileFindWorkOpen(prev => !prev)}>
								<span>Find Work</span>
								<ChevronDown className={`size-4 transition-transform ${mobileFindWorkOpen ? 'rotate-180' : ''}`} />
							</button>
							{mobileFindWorkOpen && (
								<div className='flex flex-col gap-1 border-t border-white/60 px-2 py-2 text-sm text-slate-600'>
									{findWorkMenuItems.map(item => (
										<NavLink
											key={item.label}
											to={item.to}
											className='rounded-lg px-3 py-2 hover:bg-primary/10 hover:text-primary'
											onClick={() => {
												setOpen(false)
												setMobileFindWorkOpen(false)
											}}>
											<div className='font-medium'>{item.label}</div>
											<p className='text-xs text-slate-500'>{item.description}</p>
										</NavLink>
									))}
								</div>
							)}
						</div>

						{secondaryNavItems.map(item => (
							<NavLink
								key={item.label}
								to={item.to}
								className='rounded-xl px-4 py-2 hover:bg-primary/10 hover:text-primary'
								onClick={() => setOpen(false)}>
								{item.label}
							</NavLink>
						))}
					</nav>
					<div className='mt-4 flex items-center justify-between'>
						<span className='rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600'>
							Available now
						</span>
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
