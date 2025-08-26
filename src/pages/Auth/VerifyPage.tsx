import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { resendVerifyEmailAPI, verifyUserAPI } from '~/apis/auth.api'
import { routes } from '~/config/routes'
// import { MailCheck, MailWarning } from 'lucide-react' // Nếu bạn xài lucide-react

const RESEND_COOLDOWN = 30 // giây

const VerifyPage = () => {
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()
	const email = searchParams.get('email')
	const token = searchParams.get('token')
	const [isVerifing, setIsVerifing] = useState(false)
	const [isResending, setIsResending] = useState(false)
	const [resendCooldown, setResendCooldown] = useState(0)
	const [showSentMsg, setShowSentMsg] = useState(false)

	// Đếm ngược cooldown cho nút resend
	useEffect(() => {
		if (resendCooldown > 0) {
			const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
			return () => clearTimeout(timer)
		}
	}, [resendCooldown])

	useEffect(() => {
		if (token) {
			setIsVerifing(true)
			verifyUserAPI(token)
				.then(() => {
					toast.success('Xác thực email thành công!')
					navigate(routes.auth.signin)
				})
				.finally(() => setIsVerifing(false))
		}
	}, [navigate, token])

	const handleResend = async () => {
		if (!email) return
		setIsResending(true)
		setShowSentMsg(false)
		try {
			await resendVerifyEmailAPI(email)
			setShowSentMsg(true)
			toast.success('Đã gửi lại email xác thực!')
			setResendCooldown(RESEND_COOLDOWN)
		} finally {
			setIsResending(false)
		}
	}

	if (isVerifing) {
		return (
			<div className='flex items-center justify-center h-screen w-full'>
				<span className='loading loading-spinner text-primary loading-xl mr-4'></span>
				<p className='text-lg font-medium'>Đang xác thực tài khoản...</p>
			</div>
		)
	}

	return (
		<div className='min-h-screen flex items-center justify-center bg-base-100'>
			<div className='card shadow-xl bg-white/90 rounded-2xl max-w-md w-full p-8'>
				<div className='flex flex-col items-center gap-2'>
					{/* <MailCheck className='w-12 h-12 text-primary mb-2' /> */}
					<svg
						className='w-12 h-12 text-primary mb-2'
						fill='none'
						stroke='currentColor'
						strokeWidth={2}
						viewBox='0 0 24 24'>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
						/>
					</svg>
					<h1 className='text-2xl font-bold mb-1'>Verify your email</h1>
					<p className='text-base text-center mb-2'>
						We’ve sent an activation link to: <span className='font-medium text-primary'>{email}</span>
					</p>
					<p className='text-sm text-gray-500 text-center mb-3'>
						Please check your inbox and click on the link to complete the activation process.
					</p>

					<div className='flex flex-col gap-1 w-full items-center'>
						<button
							className='btn btn-outline btn-primary w-full'
							onClick={() => window.open('https://mail.google.com', '_blank')}>
							Mở Gmail
						</button>
						<div className='mt-2 text-center text-sm'>
							Didn’t get the email?
							<button
								className={`btn btn-link btn-xs ml-2 ${resendCooldown > 0 ? 'btn-disabled text-gray-400' : ''}`}
								onClick={handleResend}
								disabled={isResending || resendCooldown > 0}>
								{isResending ? (
									<span className='loading loading-spinner loading-xs'></span>
								) : resendCooldown > 0 ? (
									`Resend (${resendCooldown}s)`
								) : (
									'Resend'
								)}
							</button>
						</div>
						{showSentMsg && (
							<span className='text-green-600 text-xs mt-1 animate-fade-in'>
								Email đã được gửi lại, kiểm tra hộp thư!
							</span>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

export default VerifyPage
