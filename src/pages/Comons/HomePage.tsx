import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { routes } from '~/config/routes'
import type { AppDispatch } from '~/redux/store'
import { logoutUserAPI } from '~/redux/user/userSlice'

const HomePage = () => {
	const dispatch: AppDispatch = useDispatch()
	const navigate = useNavigate()

	const handleLogout = () => {
		toast
			.promise(dispatch(logoutUserAPI(false)), {
				pending: 'loading....'
			})
			.then(() => {
				navigate(routes.auth.signin)
			})
	}

	return (
		<div className='bg-base-200'>
			HomePage
			<div>
				<button className='btn' onClick={handleLogout}>
					Logout
				</button>
			</div>
		</div>
	)
}

export default HomePage
