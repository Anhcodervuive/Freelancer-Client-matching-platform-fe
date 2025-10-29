import { Menu, Bell } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { selectCurrentUser, logoutUserAPI } from '~/redux/user/userSlice'
import { DEFAULT_AVATAR } from '~/constants/image'
import type { AppDispatch } from '~/redux/store'
import { routes } from '~/config/routes'

export default function ArbitratorTopbar() {
        const user = useSelector(selectCurrentUser)
        const dispatch = useDispatch<AppDispatch>()
        const navigate = useNavigate()

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

                return user?.email ?? 'Trọng tài'
        })()

        const avatarSrc = user?.avatar?.trim() ? user.avatar : DEFAULT_AVATAR

        const handleLogout = async () => {
                await dispatch(logoutUserAPI(false)).unwrap()
                navigate(routes.auth.signin)
        }

        return (
                <header className='sticky top-0 z-20 bg-base-100 border-b border-base-200'>
                        <div className='flex items-center gap-3 px-4 py-3'>
                                <label htmlFor='arbitrator-drawer' className='btn btn-ghost btn-square lg:hidden'>
                                        <Menu />
                                </label>

                                <div className='hidden md:block'>
                                        <h2 className='text-lg font-semibold'>Tranh chấp trọng tài</h2>
                                        <p className='text-xs text-base-content/60'>Quản lý hồ sơ tranh chấp và ra quyết định</p>
                                </div>

                                <div className='flex-1' />

                                <div className='flex items-center gap-2'>
                                        <button className='btn btn-ghost btn-circle'>
                                                <Bell size={18} />
                                        </button>

                                        <div className='dropdown dropdown-end'>
                                                <label tabIndex={0} className='btn btn-ghost btn-circle avatar'>
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
                                                </label>
                                                <ul tabIndex={0} className='menu dropdown-content mt-3 w-60 rounded-2xl bg-base-100 p-3 text-sm shadow-lg'>
                                                        <li className='pb-2'>
                                                                <div>
                                                                        <p className='font-semibold text-base-content'>{displayName}</p>
                                                                        {user?.email ? (
                                                                                <p className='text-xs text-base-content/60'>{user.email}</p>
                                                                        ) : null}
                                                                </div>
                                                        </li>
                                                        <li>
                                                                <button type='button' onClick={() => navigate(routes.arbitrator.dashboard)}>
                                                                        Bảng điều khiển
                                                                </button>
                                                        </li>
                                                        <li>
                                                                <button type='button' onClick={() => navigate(routes.arbitrator.disputes.list)}>
                                                                        Hồ sơ tranh chấp
                                                                </button>
                                                        </li>
                                                        <li>
                                                                <button type='button' className='text-error' onClick={handleLogout}>
                                                                        Đăng xuất
                                                                </button>
                                                        </li>
                                                </ul>
                                        </div>
                                </div>
                        </div>
                </header>
        )
}
