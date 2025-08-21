import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Role } from '~/types'
import {
	EMAIL_RULE,
	EMAIL_RULE_MESSAGE,
	FIELD_REQUIRED_MESSAGE,
	PASSWORD_CONFIRMATION_MESSAGE,
} from '~/utils/validator'

type Inputs = {
	email: string
	password: string
	confirmPassword: string
	firstName: string
	lastName: string
	role: Role
	isAgreeCondition: boolean
}

const SignupForm = () => {
	const {
		register,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm<Inputs>()
	const [isShowPassword, setIsShowPasswor] = useState(false)
	const onSubmit: SubmitHandler<Inputs> = (data) => {
		if (!data.isAgreeCondition) {
			toast.warn('Please agree our terms and condition')
		}
	}
	return (
		<div className='flex flex-col items-center justify-center h-full w-full'>
			<div className='w-1/2'>
				<Link to={'/'} className='btn btn-link px-0 md:hidden' role='button'>
					<ArrowLeft />
					Home
				</Link>
				<h1 className='mb-8'>Workreap</h1>
				<div className='mb-10'>
					<h2>Sign up</h2>
					<h5 className='text-gray-400'>
						Already have an account?{' '}
						<Link className='text-info' to={'/signin'}>
							Sign in
						</Link>
					</h5>
				</div>
			</div>
			<div className='w-11/12'>
				<form onSubmit={handleSubmit(onSubmit)}>
					<div className='grid grid-cols-2 gap-4'>
						<fieldset className='fieldset'>
							<legend className='fieldset-legend text-base'>First name</legend>
							<input
								type='text'
								{...register('firstName', {
									required: FIELD_REQUIRED_MESSAGE,
								})}
								className='input input-md w-full'
								placeholder='Type here'
							/>
							{errors.firstName && (
								<div className='mt-1 text-sm text-error'>
									{errors.firstName.message}
								</div>
							)}
						</fieldset>
						<fieldset className='fieldset'>
							<legend className='fieldset-legend text-base'>Last name:</legend>
							<input
								type='text'
								{...register('lastName', {
									required: FIELD_REQUIRED_MESSAGE,
								})}
								className='input input-md w-full'
								placeholder='Type here'
							/>
							{errors.lastName && (
								<div className='mt-1 text-sm text-error'>
									{errors.lastName.message}
								</div>
							)}
						</fieldset>
						<fieldset className='fieldset'>
							<legend className='fieldset-legend text-base'>Email</legend>
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
							<legend className='fieldset-legend text-base'>Role</legend>
							<select
								defaultValue=''
								className='select'
								{...register('role', {
									validate: (value) => {
										if (value) {
											return true
										}
										return false
									},
								})}>
								<option disabled={true} value=''>
									none
								</option>
								<option value={Role.freelancer}>Freelancer</option>
								<option value={Role.client}>Client</option>
							</select>
						</fieldset>
						<fieldset className='fieldset'>
							<legend className='fieldset-legend text-base'>Password</legend>
							<div className='relative'>
								<input
									type={isShowPassword ? 'text' : 'password'}
									{...register('password', {
										required: FIELD_REQUIRED_MESSAGE,
									})}
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
						<fieldset className='fieldset'>
							<legend className='fieldset-legend text-base'>
								Cofirm password
							</legend>
							<div className='relative'>
								<input
									type={isShowPassword ? 'text' : 'password'}
									{...register('confirmPassword', {
										validate: (value) => {
											if (value !== watch('password')) {
												return PASSWORD_CONFIRMATION_MESSAGE
											}
											return true
										},
									})}
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
							{errors.confirmPassword && (
								<div className='mt-1 text-sm text-error'>
									{errors.confirmPassword.message}
								</div>
							)}
						</fieldset>
					</div>
					<div className='mt-5 w-full flex flex-col gap-3 justify-center items-center'>
						<div className='flex items-center gap-2'>
							<input
								type='checkbox'
								{...register('isAgreeCondition')}
								className='checkbox checkbox-xs checkbox-primary'
							/>
							<p className='text-gray-400'>
								I have read and agree to all?{' '}
								<Link to='/' className='text-info'>
									Terms and condition
								</Link>
							</p>
						</div>
						<button type='submit' className='btn btn-primary block w-1/2'>
							Sign up
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

export default SignupForm
