import { Pencil } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'react-toastify'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '~/redux/store'
import { selectCurrentUser, updateProfileAPI as updateProfileReduxAPI } from '~/redux/user/userSlice'
import type { UpdateProfileDto } from '~/types/profile'
import PhoneField from '../form/PhoneField'
import AvatarUploader from './AvatarUploader'

export function ContactInfoCard() {
	const data = useSelector(selectCurrentUser)
	const dispatch: AppDispatch = useDispatch()
	const [edit, setEdit] = useState(false)
	const [form, setForm] = useState<UpdateProfileDto>({
		firstName: data?.firstName,
		lastName: data?.lastName,
		phoneNumber: data?.phoneNumber
	})
	const [isUpdate, setIsUpdate] = useState(false)

	const disabled = isUpdate

        const handleSubmit = async (e: FormEvent) => {
                e.preventDefault()
                try {
                        setIsUpdate(true)
                        await dispatch(updateProfileReduxAPI(form)).unwrap()
                        setEdit(false)
                } catch (error) {
                        console.error(error)
                        toast.error('Failed to update contact information!')
                } finally {
                        setIsUpdate(false)
                }
        }

	return (
		<div className='card bg-base-100 border border-base-300'>
			<div className='card-body gap-6'>
				{!edit && (
					<div className='grid gap-6'>
						<div className='flex items-center justify-between'>
							<h3 className='text-xl'>Account</h3>
							<button className='btn btn-ghost btn-sm btn-circle text-green-700' onClick={() => setEdit(true)}>
								<Pencil />
							</button>
						</div>
						<div className='grid grid-cols-1 lg:grid-cols-[200px_1fr]'>
                                                        <AvatarUploader src={data?.avatar} />
							<div className='flex flex-col gap-2'>
								<div>
									<p className='font-semibold'>User ID</p>
									<p>{data?.id}</p>
								</div>
								<div>
									<p className='font-semibold'>Name</p>
									<p>
										{data?.firstName} {data?.lastName}
									</p>
								</div>
								<div>
									<p className='font-semibold'>Email</p>
									<p>{data?.email}</p>
								</div>
								<div>
									<p className='font-semibold'>Phone number</p>
									<p>{data?.phoneNumber ?? 'Not existed'}</p>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* ACCOUNT (edit) */}
				{edit && (
					<form className='grid gap-4' onSubmit={handleSubmit}>
						<h3 className='text-xl'>Account</h3>
						<div className='grid sm:grid-cols-2 gap-4'>
							<div className=''>
								<label className='label'>
									<span className='label-text'>First name</span>
								</label>
								<input
									className='input input-bordered w-full'
									value={form.firstName || ''}
									onChange={e => setForm(s => ({ ...s, firstName: e.target.value }))}
									required
								/>
							</div>
							<div className=''>
								<label className='label'>
									<span className='label-text'>Last name</span>
								</label>
								<input
									className='input input-bordered w-full'
									value={form.lastName || ''}
									onChange={e => setForm(s => ({ ...s, lastName: e.target.value }))}
									required
								/>
							</div>
							<PhoneField
								value={form.phoneNumber}
								onChange={(v: string) =>
									setForm({
										...form,
										phoneNumber: v
									})
								}
							/>
						</div>
						<div className='flex gap-3 pt-2'>
							<button className={`btn btn-primary ${disabled ? 'btn-disabled' : ''}`} type='submit'>
								{isUpdate ? 'Saving…' : 'Update'}
							</button>
							<button type='button' className='btn' onClick={() => setEdit(false)}>
								Cancel
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	)
}
