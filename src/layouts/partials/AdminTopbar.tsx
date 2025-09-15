import { Link } from 'react-router-dom'
import { Menu, Bell } from 'lucide-react'

export default function AdminTopbar() {
	return (
		<header className='sticky top-0 z-20 bg-base-100 border-b border-base-200'>
			<div className='flex items-center gap-3 px-4 py-3'>
				{/* Drawer toggle (mobile) */}
				<label htmlFor='admin-drawer' className='btn btn-ghost btn-square lg:hidden'>
					<Menu />
				</label>

				{/* Title / Breadcrumb placeholder */}
				<div className='hidden md:block'>
					<h2 className='text-lg font-semibold'>Dashboard</h2>
					<p className='text-xs text-base-content/60'>Admin tools & project operations</p>
				</div>

				{/* Search */}
				<div className='flex-1' />

				{/* Actions */}
				<div className='flex items-center gap-2'>
					<button className='btn btn-ghost btn-circle'>
						<Bell size={18} />
					</button>

					{/* Avatar dropdown */}
					<div className='dropdown dropdown-end'>
						<div tabIndex={0} role='button' className='btn btn-ghost btn-circle avatar'>
							<div className='w-9 rounded-full ring ring-base-300'>
								<img alt='avatar' src='https://i.pravatar.cc/120?img=5' />
							</div>
						</div>
						<ul tabIndex={0} className='menu dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-56 p-2 shadow'>
							<li className='menu-title'>Ava Anderson</li>
							<li>
								<Link to='/admin/profile'>My profile</Link>
							</li>
							<li>
								<Link to='/admin/settings'>Settings</Link>
							</li>
							<li>
								<Link className='text-error' to='/logout'>
									Logout
								</Link>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</header>
	)
}
