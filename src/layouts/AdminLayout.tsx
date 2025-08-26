import { Outlet } from 'react-router-dom'
import AdminSidebar from './partials/AdminSidebar'
import AdminTopbar from './partials/AdminTopbar'

export default function AdminLayout() {
	return (
		<div className='min-h-dvh grid grid-cols-1 lg:grid-cols-[280px_1fr] bg-base-100'>
			<aside className='border-r border-base-200'>
				<AdminSidebar />
			</aside>
			<section className='flex min-h-dvh flex-col bg-base-300'>
				<AdminTopbar />
				<div className='p-4 md:p-6 bg-base-100 shadow-inner flex-1'>
					<Outlet />
				</div>
			</section>
		</div>
	)
}
