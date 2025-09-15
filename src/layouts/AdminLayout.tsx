import { Outlet } from 'react-router-dom'
import AdminSidebar from './partials/AdminSidebar'
import AdminTopbar from './partials/AdminTopbar'

export default function AdminLayout() {
	return (
		<div className='drawer lg:drawer-open min-h-dvh bg-base-300'>
			{/* Toggle checkbox for drawer (mobile) */}
			<input id='admin-drawer' type='checkbox' className='drawer-toggle' />
			<div className='drawer-content flex flex-col'>
				{/* Topbar */}
				<AdminTopbar />
				{/* Page body */}
				<main className='p-4 md:p-6 bg-base-100 shadow-inner rounded-t-2xl flex-1'>
					<Outlet />
				</main>
			</div>

			{/* Sidebar */}
			<div className='drawer-side'>
				<label htmlFor='admin-drawer' aria-label='close sidebar' className='drawer-overlay' />
				<aside className='w-72 bg-base-100 border-r border-base-200'>
					<AdminSidebar />
				</aside>
			</div>
		</div>
	)
}
