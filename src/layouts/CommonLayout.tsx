import { Outlet } from 'react-router-dom'
import PublicNavbar from './partials/PublicNavbar'
import PublicFooter from './partials/PublicFooter'
import type { ReactElement } from 'react'

type prop = {
	children?: ReactElement
}

export default function CommonLayout({ children }: prop) {
	return (
		<div className='min-h-dvh flex flex-col'>
			<PublicNavbar />
			<main className='flex-1'>
				<div className='max-w-7xl mx-auto px-3 md:px-4 py-6 space-y-6'>
					<Outlet />
					{children}
				</div>
			</main>
			<PublicFooter />
		</div>
	)
}
