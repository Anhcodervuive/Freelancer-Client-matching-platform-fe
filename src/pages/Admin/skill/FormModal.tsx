import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'
import type { SkillLite } from '~/types/skill'
import { toSlug } from '~/utils/form'

const Schema = z.object({
	name: z.string().min(2, 'Name too short'),
	slug: z.string().min(2, 'Slug required'),
	description: z.string().optional(),
	isActive: z.boolean()
})
export type SkillForm = z.infer<typeof Schema>

export default function SkillFormModal({
	open,
	onClose,
	initial,
	onSubmit
}: {
	open: boolean
	onClose: () => void
	initial?: Partial<SkillLite> | undefined
	onSubmit: (_v: SkillForm) => Promise<void> | void
}) {
	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors, isSubmitting }
	} = useForm<SkillForm>({
		resolver: zodResolver(Schema),
		defaultValues: { name: '', slug: '', description: '', isActive: true }
	})

	useEffect(() => {
		reset({
			name: initial?.name ?? '',
			slug: initial?.slug ?? '',
			description: initial?.description ?? '',
			isActive: initial?.isActive ?? true
		})
	}, [initial, open, reset])
	const name = watch('name')
	const slug = watch('slug')
	useEffect(() => {
		if (!initial?.id) {
			setValue('slug', toSlug(name || ''))
		}
	}, [initial?.id, name, setValue, slug])

	if (!open) return null
	return (
		<div className='modal modal-open'>
			<form
				className='modal-box'
				onSubmit={handleSubmit(async v => {
					await onSubmit(v)
					onClose()
				})}>
				<h3 className='font-bold text-lg mb-2'>{initial?.slug ? 'Edit Skill' : 'Add Skill'}</h3>
				<div className='space-y-3'>
					<label className='form-control'>
						<div className='label'>
							<span className='label-text'>Name</span>
						</div>
						<input className='input input-bordered w-full' {...register('name')} />
						{errors.name && <span className='text-error text-sm'>{errors.name.message}</span>}
					</label>
					<label className='form-control'>
						<div className='label'>
							<span className='label-text'>Slug</span>
						</div>
						<input className='input input-bordered w-full' {...register('slug')} />
						{errors.slug && <span className='text-error text-sm'>{errors.slug.message}</span>}
					</label>
					<label className='form-control'>
						<div className='label'>
							<span className='label-text'>Description</span>
						</div>
						<textarea className='textarea textarea-bordered w-full' rows={4} {...register('description')} />
					</label>
					<label className='label cursor-pointer justify-start gap-3'>
						<input type='checkbox' className='toggle' {...register('isActive')} />
						<span className='label-text'>Active</span>
					</label>
				</div>
				<div className='modal-action'>
					<button type='button' className='btn' onClick={onClose}>
						Cancel
					</button>
					<button type='submit' className='btn btn-primary' disabled={isSubmitting}>
						{isSubmitting ? 'Saving...' : 'Save'}
					</button>
				</div>
			</form>
			<div className='modal-backdrop' onClick={onClose} />
		</div>
	)
}
