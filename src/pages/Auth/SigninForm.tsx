import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { toast } from 'react-toastify'
import { Eye, EyeOff, Lock, Mail, Github, Chrome } from 'lucide-react'
import type { AppDispatch } from '~/redux/store'
import { signinUserAPI } from '~/redux/user/userSlice'
import { EMAIL_RULE, EMAIL_RULE_MESSAGE, FIELD_REQUIRED_MESSAGE } from '~/utils/validator'
import { routes } from '~/config/routes'

export type SigninInputs = {
	email: string
	password: string
}

export default function SigninForm() {
	const dispatch: AppDispatch = useDispatch()
	const navigate = useNavigate()

	const {
		register,
		handleSubmit,
		formState: { errors }
	} = useForm<SigninInputs>()

	const [showPassword, setShowPassword] = useState(false)
	const [submitting, setSubmitting] = useState(false)

	const onSubmit: SubmitHandler<SigninInputs> = async data => {
		try {
			setSubmitting(true)
			await toast.promise(
				// Nếu thunk của bạn hỗ trợ unwrap(), có thể dùng: await dispatch(signinUserAPI(data)).unwrap()
				dispatch(signinUserAPI(data)),
				{ pending: 'Signing you in...' }
			)
			navigate(routes.comons.home)
		} catch (err) {
			console.log(err)
			// Lỗi đã được toast trong thunk hoặc interceptor; có thể bổ sung tại đây nếu cần
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className='min-h-screen'>
			{/* Right panel / form */}
			<div className='flex items-center justify-center bg-base-100'>
				<div className='w-full max-w-md p-6'>
					<div className='mb-8'>
						<h1 className='text-3xl font-bold tracking-tight'>Workreap</h1>
						<p className='mt-2 text-base-content/60'>
							New here?{' '}
							<Link to={routes.auth.signup} className='link link-primary font-medium'>
								Create an account
							</Link>
						</p>
					</div>

					<div className='card bg-base-100 border border-base-200 shadow-xl rounded-2xl'>
						<div className='card-body'>
							<h2 className='card-title mb-2'>Sign in</h2>

							{/* Social auth */}
							<div className='grid grid-cols-2 gap-2'>
								<button type='button' className='btn btn-outline w-full'>
									<Chrome size={18} />
									Google
								</button>
								<button type='button' className='btn btn-outline w-full'>
									<Github size={18} />
									GitHub
								</button>
							</div>

							<div className='divider'>or continue with email</div>

							<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
								{/* Email */}
								<div>
									<label className='label text-sm font-medium'>Email</label>
									<div className='relative'>
										<input
											type='email'
											placeholder='you@example.com'
											{...register('email', {
												required: FIELD_REQUIRED_MESSAGE,
												pattern: { value: EMAIL_RULE, message: EMAIL_RULE_MESSAGE }
											})}
											className={`input input-bordered w-full pl-10 ${errors.email ? 'input-error' : ''}`}
										/>
										<Mail className='absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50' size={18} />
									</div>
									{errors.email && <p className='text-xs text-error mt-1'>{errors.email.message}</p>}
								</div>

								{/* Password */}
								<div>
									<label className='label text-sm font-medium'>Password</label>
									<div className='relative'>
										<input
											type={showPassword ? 'text' : 'password'}
											placeholder='••••••••'
											{...register('password', { required: FIELD_REQUIRED_MESSAGE })}
											className={`input input-bordered w-full pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
										/>
										<Lock className='absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50' size={18} />
										<button
											type='button'
											className='absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-primary'
											tabIndex={-1}
											onClick={() => setShowPassword(v => !v)}>
											{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
										</button>
									</div>
									{errors.password && <p className='text-xs text-error mt-1'>{errors.password.message}</p>}
								</div>

								<div className='flex items-center justify-end text-sm'>
									<Link to={'/'} className='link link-primary'>
										Forgot password?
									</Link>
								</div>

								<button type='submit' className={`btn btn-primary w-full ${submitting ? 'btn-disabled' : ''}`}>
									{submitting && <span className='loading loading-spinner'></span>}
									{submitting ? 'Signing in...' : 'Sign in'}
								</button>
							</form>
						</div>
					</div>

					<p className='mt-6 text-center text-xs text-base-content/60'>
						Protected by reCAPTCHA and subject to our Terms & Privacy.
					</p>
				</div>
			</div>
		</div>
	)
}
