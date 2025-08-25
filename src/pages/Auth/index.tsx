import VideoDecoration from './VideoDecoration'
import { useLocation } from 'react-router-dom'
import SignupForm from './SignupForm'
import SigninForm from './SigninForm'
import { routes } from '~/config/routes'
import VerifyPage from './VerifyPage'

const AuthPage = () => {
	const location = useLocation()

	// Kiểm tra đường dẫn có chứa 'signup' hay không (không phân biệt hoa thường)
	const isSignup = location.pathname === routes.auth.signup
	const isSignin = location.pathname === routes.auth.signin
	const isVerifing = location.pathname === routes.auth.verify
	return (
		<div className='flex max-w-[1600px] mx-auto h-screen'>
			{/* Cột video */}
			<div className='hidden md:block md:w-1/2 h-full'>
				<VideoDecoration />
			</div>
			{/* Cột form */}
			<div className='w-full md:w-1/2'>
				{isSignin && <SigninForm />}
				{isSignup && <SignupForm />}
				{isVerifing && <VerifyPage />}
			</div>
		</div>
	)
}

export default AuthPage
