import { Menu, Bell } from 'lucide-react'
import { useSelector } from 'react-redux'

import { selectCurrentUser } from '~/redux/user/userSlice'
import { DEFAULT_AVATAR } from '~/constants/image'

export default function ArbitratorTopbar() {
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

                return user?.email ?? 'Trọng tài'
        })()

        const avatarSrc = user?.avatar?.trim() ? user.avatar : DEFAULT_AVATAR

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

                                        <div className='avatar placeholder'>
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
                                </div>
                        </div>
                </header>
        )
}
