import { Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import PublicNavbar from './partials/PublicNavbar'
import ClientNavbar from './partials/ClientNavbar'
import FreelancerNavbar from './partials/FreelancerNavbar'
import PublicFooter from './partials/PublicFooter'
import { selectCurrentUser } from '~/redux/user/userSlice'
import { Role } from '~/types/user'

export default function JobChatLayout() {
        const currentUser = useSelector(selectCurrentUser)
        const role = currentUser?.role
        const Navbar = role === Role.CLIENT ? ClientNavbar : role === Role.FREELANCER ? FreelancerNavbar : PublicNavbar

        return (
                <div className='flex min-h-dvh flex-col bg-gradient-to-b from-slate-100 via-white to-slate-100/70'>
                        <Navbar />

                        <main className='flex flex-1 flex-col overflow-hidden px-4 py-6 md:px-8 lg:px-12'>
                                <div className='relative flex flex-1 flex-col overflow-hidden rounded-[40px] border border-white/70 bg-white/70 p-4 shadow-[0_30px_120px_rgba(15,23,42,0.12)] backdrop-blur'>
                                        <div className='pointer-events-none absolute inset-0 -z-10 hidden rounded-[64px] border border-white/60 bg-white/40 shadow-[0_40px_140px_rgba(15,23,42,0.1)] blur-3xl lg:block' />
                                        <div className='flex h-full flex-1 flex-col overflow-hidden rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]'>
                                                <div className='flex h-full flex-1 overflow-hidden'>
                                                        <Outlet />
                                                </div>
                                        </div>
                                </div>
                        </main>

                        <PublicFooter />
                </div>
        )
}
