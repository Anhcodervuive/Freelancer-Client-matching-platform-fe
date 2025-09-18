import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { logoutUserAPI } from '~/redux/user/userSlice'
import { routes } from '~/config/routes'
import type { AppDispatch } from '~/redux/store'
import { Role } from '~/types/user'
import { DEFAULT_AVATAR } from '~/constants/image'

export default function UserMenu({ user }: { user: { name?: string; avatar?: string; role?: string } }) {
        const dispatch: AppDispatch = useDispatch()
        const navigate = useNavigate()
        const avatarSrc = user.avatar?.trim() ? user.avatar : DEFAULT_AVATAR
        const handleLogout = async () => {
                await dispatch(logoutUserAPI(false)).unwrap()
                navigate(routes.auth.signin)
        }
        return (
                <div className='dropdown dropdown-end'>
                        <label tabIndex={0} className='btn btn-ghost btn-circle avatar'>
                                <div className='w-8 h-8 rounded-full overflow-hidden border border-base-300 bg-base-200'>
                                        <img
                                                src={avatarSrc}
                                                alt={user.name ?? 'User avatar'}
                                                className='h-full w-full object-cover'
                                                onError={event => {
                                                        event.currentTarget.onerror = null
                                                        event.currentTarget.src = DEFAULT_AVATAR
                                                }}
                                        />
                                </div>
                        </label>
			<ul tabIndex={0} className='menu menu-sm dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-56'>
				<li className='px-3 pb-2 text-sm font-medium'>{user.name}</li>
				{user.role == Role.FREELANCER && (
					<li>
						<Link to={routes.me.freelancer.profile}>profile</Link>
					</li>
				)}
				{user.role == Role.ADMIN && (
					<li>
						<Link to={routes.admin.category.list}>Admin</Link>
					</li>
				)}
				<li>
					<Link to={routes.me.setting.contactInfo}>Settings</Link>
				</li>
				<li>
					<button onClick={handleLogout}>Logout</button>
				</li>
			</ul>
		</div>
	)
}
