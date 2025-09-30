import { useCallback, useLayoutEffect, useRef, useState } from 'react'
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

        const navbarContainerRef = useRef<HTMLDivElement | null>(null)
        const footerContainerRef = useRef<HTMLDivElement | null>(null)
        const [workspaceHeight, setWorkspaceHeight] = useState<number>()

        const updateWorkspaceHeight = useCallback(() => {
                if (typeof window === 'undefined') {
                        return
                }

                const viewportHeight = window.innerHeight
                const navbarHeight = navbarContainerRef.current?.offsetHeight ?? 0
                const footerHeight = footerContainerRef.current?.offsetHeight ?? 0
                const nextHeight = Math.max(0, viewportHeight - navbarHeight - footerHeight)

                setWorkspaceHeight(nextHeight)
        }, [])

        useLayoutEffect(() => {
                updateWorkspaceHeight()
        }, [updateWorkspaceHeight])

        useLayoutEffect(() => {
                if (typeof window === 'undefined') {
                        return
                }

                const handleResize = () => updateWorkspaceHeight()

                window.addEventListener('resize', handleResize)

                return () => {
                        window.removeEventListener('resize', handleResize)
                }
        }, [updateWorkspaceHeight])

        useLayoutEffect(() => {
                if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
                        return
                }

                const resizeObserver = new ResizeObserver(() => updateWorkspaceHeight())

                if (navbarContainerRef.current) {
                        resizeObserver.observe(navbarContainerRef.current)
                }

                if (footerContainerRef.current) {
                        resizeObserver.observe(footerContainerRef.current)
                }

                return () => {
                        resizeObserver.disconnect()
                }
        }, [updateWorkspaceHeight])

        return (
                <div className='flex min-h-dvh flex-col bg-slate-100'>
                        <div ref={navbarContainerRef} className='flex flex-col'>
                                <Navbar />
                        </div>

                        <main
                                className='flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-4 md:px-6 lg:px-10'
                                style={workspaceHeight ? { height: `${workspaceHeight}px` } : undefined}
                        >
                                <div className='relative flex h-full w-full flex-1 flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white/70 p-4 shadow-[0_30px_120px_rgba(15,23,42,0.12)] backdrop-blur'>
                                        <div className='pointer-events-none absolute inset-0 -z-10 hidden rounded-[64px] border border-white/60 bg-white/40 shadow-[0_40px_140px_rgba(15,23,42,0.1)] blur-3xl lg:block' />
                                        <div className='flex h-full flex-1 flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]'>
                                                <div className='flex h-full flex-1 overflow-hidden'>
                                                        <Outlet />
                                                </div>
                                        </div>
                                </div>
                        </main>
                        <div ref={footerContainerRef} className='flex flex-col'>
                                <PublicFooter />
                        </div>
                </div>
        )
}
