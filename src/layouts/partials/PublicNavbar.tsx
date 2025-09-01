import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '~/redux/user/userSlice'
import UserMenu from './UserMenu'
import NotificationDropdown from './NotificationDropdown'
import { routes } from '~/config/routes'

export default function PublicNavbar() {
	const [open, setOpen] = useState(false)
	const user = useSelector(selectCurrentUser)
	const navigate = useNavigate()

	return (
		<header className='sticky top-0 z-40 bg-base-100/90 backdrop-blur border-b border-base-200'>
			<div className='max-w-[1500px] mx-auto px-4 py-3 flex items-center gap-3'>
				<Link to='/' className='flex items-center gap-2 font-semibold'>
					<span className='inline-flex size-8 rounded-full bg-primary' />
					<span>Workreap-ish</span>
				</Link>

				<nav className='hidden md:flex ml-6 items-center gap-2 text-sm'>
					<div className='dropdown'>
						<button className='btn btn-ghost btn-sm'>Main</button>
						<ul className='menu dropdown-content bg-base-100 rounded-box z-[1] w-64 p-2 shadow'>
							<li>
								<NavLink to='/'>Home</NavLink>
							</li>
							<li>
								<NavLink to='/explore'>Explore</NavLink>
							</li>
						</ul>
					</div>

					<div className='dropdown'>
						<button className='btn btn-ghost btn-sm'>Explore</button>
						<ul className='menu dropdown-content bg-base-100 rounded-box z-[1] w-64 p-2 shadow'>
							<li>
								<NavLink to='/search'>Search</NavLink>
							</li>
						</ul>
					</div>

					<div className='dropdown'>
						<button className='btn btn-ghost btn-sm'>Find by category</button>
						<ul className='menu dropdown-content bg-base-100 rounded-box z-[1] w-64 p-2 shadow'>
							<li>
								<button onClick={() => navigate('/search?cat=design')}>Design</button>
							</li>
							<li>
								<button onClick={() => navigate('/search?cat=dev')}>Development</button>
							</li>
						</ul>
					</div>
				</nav>

				<div className='ml-auto hidden md:flex items-center gap-2'>
					<input
						placeholder='Search'
						className='input input-sm input-bordered w-64'
						onKeyDown={e => {
							if (e.key === 'Enter') navigate('/search?q=' + (e.target as HTMLInputElement).value)
						}}
					/>
					{user ? (
						<>
							<NotificationDropdown />
							<UserMenu user={{ name: user.displayName, avatar: user.avatar, role: user.role }} />
						</>
					) : (
						<>
							<Link to='/signin' className='btn btn-sm'>
								Sign in
							</Link>
							<Link to='/register' className='btn btn-sm btn-primary'>
								Register
							</Link>
						</>
					)}
				</div>

				{/* Mobile */}
				<button className='md:hidden btn btn-ghost btn-sm ml-auto' onClick={() => setOpen(v => !v)}>
					<svg width='24' height='24' viewBox='0 0 24 24'>
						<path d='M4 6h16M4 12h16M4 18h16' stroke='currentColor' strokeWidth='2' />
					</svg>
				</button>
			</div>

			{open && (
				<div className='md:hidden px-4 pb-4 space-y-2'>
					<NavLink to='/' className='btn btn-ghost btn-sm w-full' onClick={() => setOpen(false)}>
						Home
					</NavLink>
					<NavLink to='/explore' className='btn btn-ghost btn-sm w-full' onClick={() => setOpen(false)}>
						Explore
					</NavLink>
					<NavLink to='/search' className='btn btn-ghost btn-sm w-full' onClick={() => setOpen(false)}>
						Search
					</NavLink>
					<div className='flex gap-2 pt-2'>
						<Link to={routes.auth.signin} className='btn btn-sm flex-1' onClick={() => setOpen(false)}>
							Sign in
						</Link>
						<Link to={routes.auth.signup} className='btn btn-sm btn-primary flex-1' onClick={() => setOpen(false)}>
							Sign up
						</Link>
					</div>
				</div>
			)}
		</header>
	)
}
