import { Pencil } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'react-toastify'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '~/redux/store'
import { selectCurrentUser, updateProfileAPI as updateProfileReduxAPI } from '~/redux/user/userSlice'
import type { UpdateProfileDto } from '~/types/profile'
import CountryAutocomplete, { type CountryOption } from '../form/CountryAutocomplete'
import countryList from 'react-select-country-list'

export function LocationCard() {
	const data = useSelector(selectCurrentUser)
	const dispatch: AppDispatch = useDispatch()
	const [edit, setEdit] = useState(false)
	const [countryVal, setCountryVal] = useState<CountryOption | null>(
		data?.country
			? countryList()
					.getData()
					.find(v => v.label === data.country!)!
			: null
	)
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
                        await dispatch(
                                updateProfileReduxAPI({
                                        ...form,
                                        country: countryVal?.label
                                })
                        ).unwrap()
                        setEdit(false)
                } catch (error) {
                        console.error(error)
                        toast.error('Failed to update location information!')
                } finally {
                        setIsUpdate(false)
                }
        }

        return (
                <div className='rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_22px_75px_rgba(15,23,42,0.1)]'>
                        {!edit && (
                                <div className='grid gap-6'>
                                        <div className='flex items-center justify-between'>
                                                <div>
                                                        <h3 className='text-xl font-semibold text-slate-900'>Location</h3>
                                                        <p className='text-sm text-slate-500'>Địa chỉ giúp khách hàng biết bạn đang làm việc từ đâu.</p>
                                                </div>
                                                <button className='btn btn-ghost btn-sm btn-circle text-primary hover:bg-primary/10' onClick={() => setEdit(true)}>
                                                        <Pencil />
                                                </button>
                                        </div>
                                        <div className='grid gap-4 sm:grid-cols-2'>
                                                <div className='rounded-2xl border border-white/60 bg-white/75 p-4 shadow-inner shadow-white/30'>
                                                        <p className='text-xs font-semibold uppercase tracking-[0.28em] text-slate-400'>Country</p>
                                                        <p className='mt-2 text-sm font-medium text-slate-900'>{data?.country ?? 'Not provided'}</p>
                                                </div>
                                                <div className='rounded-2xl border border-white/60 bg-white/75 p-4 shadow-inner shadow-white/30'>
                                                        <p className='text-xs font-semibold uppercase tracking-[0.28em] text-slate-400'>City</p>
                                                        <p className='mt-2 text-sm font-medium text-slate-900'>{data?.city ?? 'Not provided'}</p>
                                                </div>
                                                <div className='rounded-2xl border border-white/60 bg-white/75 p-4 shadow-inner shadow-white/30'>
                                                        <p className='text-xs font-semibold uppercase tracking-[0.28em] text-slate-400'>District</p>
                                                        <p className='mt-2 text-sm font-medium text-slate-900'>{data?.district ?? 'Not provided'}</p>
                                                </div>
                                                <div className='rounded-2xl border border-white/60 bg-white/75 p-4 shadow-inner shadow-white/30'>
                                                        <p className='text-xs font-semibold uppercase tracking-[0.28em] text-slate-400'>Address</p>
                                                        <p className='mt-2 text-sm font-medium text-slate-900'>{data?.address ?? 'Not provided'}</p>
                                                </div>
                                        </div>
                                </div>
                        )}

                        {edit && (
                                <form className='mt-2 grid gap-4' onSubmit={handleSubmit}>
                                        <div className='flex items-center justify-between'>
                                                <h3 className='text-xl font-semibold text-slate-900'>Update location</h3>
                                                <span className='text-xs uppercase tracking-[0.3em] text-slate-400'>Keep it accurate</span>
                                        </div>
                                        <div className='grid gap-4 sm:grid-cols-2'>
                                                <div>
                                                        <label className='label text-sm font-medium text-slate-600'>Country</label>
                                                        <CountryAutocomplete value={countryVal} onChange={value => setCountryVal(value)} />
                                                </div>
                                                <div>
                                                        <label className='label text-sm font-medium text-slate-600'>City</label>
                                                        <input
                                                                className='input input-bordered input-sm md:input-md w-full rounded-xl border-white/60 bg-white/70 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                                                                value={form.city || ''}
                                                                onChange={e => setForm(s => ({ ...s, city: e.target.value }))}
                                                                required
                                                        />
                                                </div>
                                                <div>
                                                        <label className='label text-sm font-medium text-slate-600'>District</label>
                                                        <input
                                                                className='input input-bordered input-sm md:input-md w-full rounded-xl border-white/60 bg-white/70 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                                                                value={form.district || ''}
                                                                onChange={e => setForm(s => ({ ...s, district: e.target.value }))}
                                                                required
                                                        />
                                                </div>
                                                <div>
                                                        <label className='label text-sm font-medium text-slate-600'>Address</label>
                                                        <input
                                                                className='input input-bordered input-sm md:input-md w-full rounded-xl border-white/60 bg-white/70 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                                                                value={form.address || ''}
                                                                onChange={e => setForm(s => ({ ...s, address: e.target.value }))}
                                                                required
                                                        />
                                                </div>
                                        </div>
                                                <div className='flex flex-wrap gap-3 pt-2'>
                                                        <button className={`btn btn-sm md:btn-md rounded-full bg-gradient-to-r from-primary to-secondary px-5 md:px-6 text-sm font-medium text-white shadow-lg shadow-primary/30 hover:shadow-primary/40 ${disabled ? 'btn-disabled' : ''}`} type='submit'>
                                                                {isUpdate ? 'Saving…' : 'Update'}
                                                        </button>
                                                        <button type='button' className='btn btn-sm md:btn-md rounded-full border border-white/60 bg-white/70 px-5 md:px-6 text-sm font-medium text-slate-700 transition hover:border-primary/40 hover:bg-primary/10' onClick={() => setEdit(false)}>
                                                                Cancel
                                                        </button>
                                                </div>
                                </form>
                        )}
                </div>
        )
}
