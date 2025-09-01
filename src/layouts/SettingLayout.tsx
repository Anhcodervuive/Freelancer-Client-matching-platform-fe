import { Outlet } from 'react-router-dom'
import SettingSidebar from './partials/SettingSideBar'

const SettingLayout = () => {
	return (
		<div className='grid grid-cols-1 lg:grid-cols-[280px_1fr]'>
			<div>
				<h2 className='font-bold'>Setting</h2>
				<SettingSidebar />
			</div>
			<div>
				<Outlet />
			</div>
		</div>
	)
}

export default SettingLayout
