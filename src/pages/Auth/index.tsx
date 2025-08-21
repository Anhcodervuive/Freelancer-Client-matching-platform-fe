import VideoDecoration from './VideoDecoration'
import { useLocation } from 'react-router-dom'
import SignupForm from './SignupForm'
import SigninForm from './SigninForm'

const AuthPage = () => {
	const location = useLocation()

	// Kiểm tra đường dẫn có chứa 'signup' hay không (không phân biệt hoa thường)
	const isSignup = location.pathname.toLowerCase().includes('signup')
	return (
		<div className='bg-base-200 flex max-w-[1600px] mx-auto h-screen'>
			{/* Cột video */}
			<div className='hidden md:block md:w-1/2 h-full'>
				<VideoDecoration />
			</div>
			{/* Cột form */}
			<div className='w-full md:w-1/2'>
				{isSignup ? <SignupForm /> : <SigninForm />}
			</div>
		</div>
	)
}

export default AuthPage
