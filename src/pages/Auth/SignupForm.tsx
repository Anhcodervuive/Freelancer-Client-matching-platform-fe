import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { routes } from '~/config/routes'
import {
	EMAIL_RULE,
	EMAIL_RULE_MESSAGE,
	FIELD_REQUIRED_MESSAGE,
	PASSWORD_CONFIRMATION_MESSAGE
} from '~/utils/validator'
import { signupUserAPI } from '~/apis/auth.api'

type Inputs = {
	email: string
	password: string
	confirmPassword: string
	firstName: string
	lastName: string
	isAgreeCondition: boolean
}

const SignupForm = () => {
	const {
		register,
		handleSubmit,
		watch,
		formState: { errors }
	} = useForm<Inputs>()
	const navigate = useNavigate()
	const [isShowPassword, setIsShowPassword] = useState(false)
	const [isShowConfirm, setIsShowConfirm] = useState(false)
	const isAgree = watch('isAgreeCondition')
	const onSubmit: SubmitHandler<Inputs> = data => {
		if (!data.isAgreeCondition) {
			toast.warn('Please agree to our terms and conditions!')
			return
		}
		toast
			.promise(signupUserAPI(data), {
				pending: 'signing up...'
			})
			.then(() => {
				const params = new URLSearchParams({ email: data.email })
				navigate(`${routes.auth.verify}?${params.toString()}`)
			})
	}

	return (
		<div className='min-h-screen flex items-center justify-center bg-base-100'>
			<div className='card shadow-2xl bg-white/95 rounded-2xl w-full max-w-lg p-8'>
				<div className='flex flex-col items-center mb-8'>
					<UserPlus2 className='w-12 h-12 text-primary mb-2' />
					<h1 className='text-2xl font-bold tracking-tight mb-1'>Sign up to Workreap</h1>
					<p className='text-gray-500 text-base'>Welcome! Create your account below.</p>
					<p className='mt-2 text-sm text-gray-400'>
						Already have an account?{' '}
						<Link className='text-info font-semibold' to={routes.auth.signin}>
							Sign in
						</Link>
					</p>
				</div>
				<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
						<div>
							<label className='label text-base font-medium'>First name</label>
							<input
								type='text'
								{...register('firstName', { required: FIELD_REQUIRED_MESSAGE })}
								className={`input input-bordered w-full ${errors.firstName ? 'input-error' : ''}`}
								placeholder='Type here'
							/>
							{errors.firstName && <p className='text-xs text-error mt-1'>{errors.firstName.message}</p>}
						</div>
						<div>
							<label className='label text-base font-medium'>Last name</label>
							<input
								type='text'
								{...register('lastName', { required: FIELD_REQUIRED_MESSAGE })}
								className={`input input-bordered w-full ${errors.lastName ? 'input-error' : ''}`}
								placeholder='Type here'
							/>
							{errors.lastName && <p className='text-xs text-error mt-1'>{errors.lastName.message}</p>}
						</div>
					</div>
					<div>
						<label className='label text-base font-medium'>Email</label>
						<input
							type='email'
							{...register('email', {
								required: FIELD_REQUIRED_MESSAGE,
								pattern: {
									value: EMAIL_RULE,
									message: EMAIL_RULE_MESSAGE
								}
							})}
							className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
							placeholder='Type here'
						/>
						{errors.email && <p className='text-xs text-error mt-1'>{errors.email.message}</p>}
					</div>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
						<div>
							<label className='label text-base font-medium'>Password</label>
							<div className='relative'>
								<input
									type={isShowPassword ? 'text' : 'password'}
									{...register('password', { required: FIELD_REQUIRED_MESSAGE })}
									className={`input input-bordered w-full pr-10 ${errors.password ? 'input-error' : ''}`}
									placeholder='Type here'
								/>
								<button
									type='button'
									className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary'
									tabIndex={-1}
									onClick={() => setIsShowPassword(v => !v)}>
									{isShowPassword ? <EyeOff size={20} /> : <Eye size={20} />}
								</button>
							</div>
							{errors.password && <p className='text-xs text-error mt-1'>{errors.password.message}</p>}
						</div>
						<div>
							<label className='label text-base font-medium'>Confirm password</label>
							<div className='relative'>
								<input
									type={isShowConfirm ? 'text' : 'password'}
									{...register('confirmPassword', {
										validate: value => {
											if (value !== watch('password')) {
												return PASSWORD_CONFIRMATION_MESSAGE
											}
											return true
										}
									})}
									className={`input input-bordered w-full pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
									placeholder='Type here'
								/>
								<button
									type='button'
									className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary'
									tabIndex={-1}
									onClick={() => setIsShowConfirm(v => !v)}>
									{isShowConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
								</button>
							</div>
							{errors.confirmPassword && <p className='text-xs text-error mt-1'>{errors.confirmPassword.message}</p>}
						</div>
					</div>
					<div className='flex items-center gap-2 mt-2'>
						<input
							type='checkbox'
							{...register('isAgreeCondition')}
							className='checkbox checkbox-primary'
							id='agree-term'
						/>
						<label htmlFor='agree-term' className='text-sm text-gray-600 select-none'>
							I have read and agree to all{' '}
                                                        <Link
                                                                to={routes.comons.platformTerms}
                                                                className='text-info underline hover:text-primary'
                                                        >
                                                                Terms and conditions
                                                        </Link>
						</label>
					</div>
					<button type='submit' className='btn btn-primary w-full mt-3' disabled={!isAgree}>
						Sign up
					</button>
				</form>
			</div>
		</div>
	)
}

export default SignupForm
