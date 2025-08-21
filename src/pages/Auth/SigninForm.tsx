import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { Link } from 'react-router-dom'
import {
	EMAIL_RULE,
	EMAIL_RULE_MESSAGE,
	FIELD_REQUIRED_MESSAGE,
} from '~/utils/validator'

type Inputs = {
	email: string
	password: string
}

const SigninForm = () => {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<Inputs>()
	const [isShowPassword, setIsShowPasswor] = useState(false)
	const onSubmit: SubmitHandler<Inputs> = (data) => console.log(data)

	return (
		<div className='flex flex-col items-center justify-center h-full w-full'>
			<div className='w-2/3'>
				<Link to={'/'} className='btn btn-link px-0 md:hidden' role='button'>
					<ArrowLeft />
					Home
				</Link>
				<h1 className='mb-8'>Workreap</h1>
				<div className='mb-8'>
					<h2>Sign in</h2>
					<h5 className='text-gray-400'>
						Or you don't have an account?{' '}
						<Link className='text-info' to={'/signup'}>
							Sign up
						</Link>
					</h5>
				</div>
				<form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-3'>
					<fieldset className='fieldset'>
						<legend className='fieldset-legend text-lg'>Email</legend>
						<input
							type='text'
							{...register('email', {
								required: FIELD_REQUIRED_MESSAGE,
								pattern: {
									value: EMAIL_RULE,
									message: EMAIL_RULE_MESSAGE,
								},
							})}
							className='input input-md w-full'
							placeholder='Type here'
						/>
						{errors.email && (
							<div className='mt-1 text-sm text-error'>
								{errors.email.message}
							</div>
						)}
					</fieldset>
					<fieldset className='fieldset'>
						<legend className='fieldset-legend text-lg'>Password</legend>
						<div className='relative'>
							<input
								type={isShowPassword ? 'text' : 'password'}
								{...register('password', { required: FIELD_REQUIRED_MESSAGE })}
								className='input input-md w-full'
								placeholder='Type here'
							/>
							<button
								type='button'
								className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary focus:outline-none z-10'
								tabIndex={-1}
								onClick={() => setIsShowPasswor(!isShowPassword)}>
								{isShowPassword ? <EyeOff /> : <Eye />}
							</button>
						</div>
						{errors.password && (
							<div className='mt-1 text-sm text-error'>
								{errors.password.message}
							</div>
						)}
					</fieldset>
					<div className='flex flex-col gap-4 justify-center items-center'>
						<p className='text-gray-400'>
							Forgot your password?{' '}
							<Link to='/' className='text-info'>
								Reset password
							</Link>
						</p>
						<button type='submit' className='btn btn-primary btn-wide'>
							Sign up
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

export default SigninForm
