import { Link } from 'react-router-dom'
import { Menu, Bell } from 'lucide-react'
import { useSelector } from 'react-redux'

import { DEFAULT_AVATAR } from '~/constants/image'
import { selectCurrentUser } from '~/redux/user/userSlice'

export default function AdminTopbar() {
        const user = useSelector(selectCurrentUser)

        const displayName = (() => {
                const nameFromProfile = [
                        user?.firstName ?? user?.profile?.firstName,
                        user?.lastName ?? user?.profile?.lastName
                ]
                        .filter(Boolean)
                        .join(' ')
                        .trim()

                if (nameFromProfile.length) {
                        return nameFromProfile
                }

                if (user?.profile && typeof user.profile === 'object') {
                        const profileDisplay = (user.profile as Record<string, unknown>).displayName
                        if (typeof profileDisplay === 'string' && profileDisplay.trim().length) {
                                return profileDisplay.trim()
                        }
                }

                return user?.email ?? 'Quản trị viên'
        })()

        const avatarSrc = user?.avatar?.trim() ? user.avatar : DEFAULT_AVATAR

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
                                                                <img
                                                                        alt={displayName}
                                                                        src={avatarSrc}
                                                                        onError={event => {
                                                                                event.currentTarget.onerror = null
                                                                                event.currentTarget.src = DEFAULT_AVATAR
                                                                        }}
                                                                />
                                                        </div>
                                                </div>
                                                <ul tabIndex={0} className='menu dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-56 p-2 shadow'>
                                                        <li className='menu-title'>{displayName}</li>
                                                        {user?.email ? (
                                                                <li className='px-3 pb-1 text-xs text-base-content/60'>{user.email}</li>
                                                        ) : null}
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
