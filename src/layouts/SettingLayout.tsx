import { Outlet } from 'react-router-dom'
import SettingSidebar from './partials/SettingSideBar'
import type { ReactElement } from 'react'

const SettingLayout = ({ children }: { children?: ReactElement }) => {
        return (
                <div className='grid gap-8 lg:grid-cols-[320px_1fr]'>
                        <aside className='space-y-6'>
                                <div className='rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)]'>
                                        <h2 className='text-2xl font-bold text-slate-900'>Settings</h2>
                                        <p className='mt-2 text-sm text-slate-500'>Điều chỉnh tài khoản, thanh toán và bảo mật của bạn tại một nơi.</p>
                                </div>
                                <SettingSidebar />
                        </aside>
                        <div className='space-y-6'>{children ? children : <Outlet />}</div>
                </div>
        )
}

export default SettingLayout
