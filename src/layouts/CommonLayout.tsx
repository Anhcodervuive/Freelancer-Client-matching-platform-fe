import { Outlet } from 'react-router-dom'
import PublicNavbar from './partials/PublicNavbar'
import PublicFooter from './partials/PublicFooter'

export default function CommonLayout() {
	return (
		<div className='min-h-dvh flex flex-col bg-base-100'>
			<PublicNavbar />
			<main className='flex-1'>
				<Outlet />
			</main>
			<PublicFooter />
		</div>
	)
}
