import { Pencil } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '~/redux/store'
import { selectCurrentUser, updateProfileAPI as updateProfileReduxAPI } from '~/redux/user/userSlice'
import type { UpdateProfileDto } from '~/types/profile'
import CountryAutocomplete, { type CountryOption } from '../form/CountryAutocomplete'

export function LocationCard() {
	const data = useSelector(selectCurrentUser)
	const dispatch: AppDispatch = useDispatch()
	const [edit, setEdit] = useState(false)
	const [countryVal, setCountryVal] = useState<CountryOption | null>()
	const [form, setForm] = useState<UpdateProfileDto>({
		country: data?.country ?? '',
		city: data?.city,
		district: data?.district,
		address: data?.address
	})
	const [isUpdate, setIsUpdate] = useState(false)

	const disabled = isUpdate

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		try {
			setIsUpdate(true)
			dispatch(
				updateProfileReduxAPI({
					...form,
					country: countryVal?.label
				})
			)
			setEdit(false)
		} catch (_error) {
			//
			console.log(_error)
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
							<h3 className='text-xl'>Location</h3>
							<button className='btn btn-ghost btn-sm btn-circle text-green-700' onClick={() => setEdit(true)}>
								<Pencil />
							</button>
						</div>
						<div className='flex flex-col gap-2'>
							<div>
								<p className='font-semibold'>Country</p>
								<p>{data?.country ?? 'Not existed'}</p>
							</div>
							<div>
								<p className='font-semibold'>City</p>
								<p>{data?.city ?? 'Not existed'}</p>
							</div>
							<div>
								<p className='font-semibold'>District</p>
								<p>{data?.district ?? 'Not existed'}</p>
							</div>
							<div>
								<p className='font-semibold'>Address</p>
								<p>{data?.address ?? 'Not existed'}</p>
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
									<span className='label-text'>Country</span>
								</label>
								<CountryAutocomplete value={countryVal} onChange={value => setCountryVal(value)} />
							</div>
							<div className=''>
								<label className='label'>
									<span className='label-text'>City</span>
								</label>
								<input
									className='input input-bordered w-full'
									value={form.city || ''}
									onChange={e => setForm(s => ({ ...s, city: e.target.value }))}
									required
								/>
							</div>
							<div className=''>
								<label className='label'>
									<span className='label-text'>District</span>
								</label>
								<input
									className='input input-bordered w-full'
									value={form.district || ''}
									onChange={e => setForm(s => ({ ...s, district: e.target.value }))}
									required
								/>
							</div>
							<div className=''>
								<label className='label'>
									<span className='label-text'>Address</span>
								</label>
								<input
									className='input input-bordered w-full'
									value={form.address || ''}
									onChange={e => setForm(s => ({ ...s, address: e.target.value }))}
									required
								/>
							</div>
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
