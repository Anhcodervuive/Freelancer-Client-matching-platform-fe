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
                <div className='rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_22px_75px_rgba(15,23,42,0.1)]'>
                        {!edit && (
                                <div className='grid gap-6'>
                                        <div className='flex items-center justify-between'>
                                                <div>
                                                        <h3 className='text-xl font-semibold text-slate-900'>Account</h3>
                                                        <p className='text-sm text-slate-500'>Thông tin liên hệ chính của bạn trên Workreap-ish.</p>
                                                </div>
                                                <button className='btn btn-ghost btn-sm btn-circle text-primary hover:bg-primary/10' onClick={() => setEdit(true)}>
                                                        <Pencil />
                                                </button>
                                        </div>
                                        <div className='grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]'>
                                                <div className='rounded-3xl border border-white/70 bg-white/70 p-3 shadow-inner shadow-white/20'>
                                                        <AvatarUploader src={data?.avatar} />
                                                </div>
                                                <div className='grid gap-4 sm:grid-cols-2'>
                                                        <div className='rounded-2xl border border-white/60 bg-white/75 p-4 shadow-inner shadow-white/30'>
                                                                <p className='text-xs font-semibold uppercase tracking-[0.28em] text-slate-400'>User ID</p>
                                                                <p className='mt-2 text-sm font-medium text-slate-900'>{data?.id}</p>
                                                        </div>
                                                        <div className='rounded-2xl border border-white/60 bg-white/75 p-4 shadow-inner shadow-white/30'>
                                                                <p className='text-xs font-semibold uppercase tracking-[0.28em] text-slate-400'>Name</p>
                                                                <p className='mt-2 text-sm font-medium text-slate-900'>
                                                                        {data?.firstName} {data?.lastName}
                                                                </p>
                                                        </div>
                                                        <div className='rounded-2xl border border-white/60 bg-white/75 p-4 shadow-inner shadow-white/30'>
                                                                <p className='text-xs font-semibold uppercase tracking-[0.28em] text-slate-400'>Email</p>
                                                                <p className='mt-2 text-sm font-medium text-slate-900 break-words'>{data?.email}</p>
                                                        </div>
                                                        <div className='rounded-2xl border border-white/60 bg-white/75 p-4 shadow-inner shadow-white/30'>
                                                                <p className='text-xs font-semibold uppercase tracking-[0.28em] text-slate-400'>Phone number</p>
                                                                <p className='mt-2 text-sm font-medium text-slate-900'>{data?.phoneNumber ?? 'Not provided'}</p>
                                                        </div>
                                                </div>
                                        </div>
                                </div>
                        )}

                        {edit && (
                                <form className='mt-2 grid gap-4' onSubmit={handleSubmit}>
                                        <div className='flex items-center justify-between'>
                                                <h3 className='text-xl font-semibold text-slate-900'>Edit account</h3>
                                                <span className='text-xs uppercase tracking-[0.3em] text-slate-400'>All fields required</span>
                                        </div>
                                        <div className='grid gap-4 sm:grid-cols-2'>
                                                <div>
                                                        <label className='label text-sm font-medium text-slate-600'>First name</label>
                                                        <input
                                                                className='input input-bordered w-full rounded-xl border-white/60 bg-white/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                                                                value={form.firstName || ''}
                                                                onChange={e => setForm(s => ({ ...s, firstName: e.target.value }))}
                                                                required
                                                        />
                                                </div>
                                                <div>
                                                        <label className='label text-sm font-medium text-slate-600'>Last name</label>
                                                        <input
                                                                className='input input-bordered w-full rounded-xl border-white/60 bg-white/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
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
                                        <div className='flex flex-wrap gap-3 pt-2'>
                                                <button className={`btn rounded-full bg-gradient-to-r from-primary to-secondary px-6 text-white shadow-lg shadow-primary/30 hover:shadow-primary/40 ${disabled ? 'btn-disabled' : ''}`} type='submit'>
                                                        {isUpdate ? 'Saving…' : 'Update'}
                                                </button>
                                                <button type='button' className='btn rounded-full border border-white/60 bg-white/70 px-6 text-slate-700 hover:border-primary/40 hover:bg-primary/10' onClick={() => setEdit(false)}>
                                                        Cancel
                                                </button>
                                        </div>
                                </form>
                        )}
                </div>
        )
}
