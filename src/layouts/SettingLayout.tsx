import { Outlet } from 'react-router-dom'
import SettingSidebar from './partials/SettingSideBar'
import type { ReactElement } from 'react'

const SettingLayout = ({ children }: { children?: ReactElement }) => {
	return (
		<div className='grid grid-cols-1 lg:grid-cols-[280px_1fr]'>
			<div>
				<h2 className='font-bold'>Setting</h2>
				<SettingSidebar />
			</div>
			<div>{children ? children : <Outlet />}</div>
		</div>
	)
}

export default SettingLayout
