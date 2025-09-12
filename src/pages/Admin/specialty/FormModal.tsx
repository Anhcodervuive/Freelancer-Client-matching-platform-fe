import { zodResolver } from '@hookform/resolvers/zod'
import { Tag } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import z from 'zod'
import CategoryCombobox from '~/components/category/CategoryCombobox'
import type { Specialty } from '~/types/specialty'
import { toSlug } from '~/utils/form'

// ---------- Schema ----------
const SpecialtySchema = z.object({
	categoryId: z.string().min(1, 'Please select a category').optional(),
	name: z.string().min(2, 'Name must be at least 2 characters').max(80),
	slug: z
		.string()
		.min(2, 'Slug must be at least 2 characters')
		.regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'),
	description: z.string().max(300).optional().or(z.literal('')),
	sortOrder: z.coerce.number().int().min(0).default(0),
	isActive: z.boolean().default(true)
})

type SpecialtyFormValues = z.input<typeof SpecialtySchema>

export default function SpecialtyFormModal({
	open,
	onClose,
	initial,
	onSubmit
}: {
	open: boolean
	onClose: () => void
	initial?: Partial<Specialty>
	onSubmit: (_data: z.output<typeof SpecialtySchema>) => Promise<void>
}) {
	/* Kiểm tra nếu mà nó có categoryId trên url nghĩa là đang chỉnh sửa specialy rieng cho 1 category */
	const { id: categoryId = '' } = useParams()
	const {
		register,
		handleSubmit,
		setValue,
		watch,
		reset,
		formState: { errors, isSubmitting }
	} = useForm<SpecialtyFormValues>({
		resolver: zodResolver(SpecialtySchema),
		defaultValues: {
			categoryId: initial?.categoryId || categoryId || '',
			name: initial?.name ?? '',
			slug: initial?.slug ?? '',
			description: initial?.description ?? '',
			sortOrder: initial?.sortOrder ?? 0,
			isActive: initial?.isActive ?? true
		}
	})

	useEffect(() => {
		reset({
			categoryId: initial?.categoryId || categoryId || '',
			name: initial?.name ?? '',
			slug: initial?.slug ?? '',
			description: initial?.description ?? '',
			sortOrder: initial?.sortOrder ?? 0,
			isActive: initial?.isActive ?? true
		})
	}, [
		categoryId,
		initial?.categoryId,
		initial?.description,
		initial?.id,
		initial?.isActive,
		initial?.name,
		initial?.slug,
		initial?.sortOrder,
		open,
		reset
	])

	const name = watch('name')

	useEffect(() => {
		if (!initial?.id) setValue('slug', toSlug(name || ''))
	}, [name, initial?.id, setValue])

	return (
		<dialog className={`modal ${open ? 'modal-open' : ''}`}>
			<div className='modal-box max-w-2xl'>
				<h3 className='font-bold text-xl flex items-center gap-2'>
					<Tag className='size-5' /> {initial?.id ? 'Edit specialty' : 'New specialty'}
				</h3>
				<form
					className='mt-4'
					onSubmit={handleSubmit(async data => {
						await onSubmit({
							...data,
							sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : Number(data.sortOrder) || 0,
							isActive: data.isActive ?? true
						})
						onClose()
					})}>
					<div className='grid gap-4 sm:grid-cols-[160px_1fr]'>
						<div className='contents'>
							<label className='self-center text-sm font-medium'>Category</label>
							<div>
								<CategoryCombobox
									value={watch('categoryId')}
									onChange={id => setValue('categoryId', id, { shouldValidate: true })}
								/>
								{errors.categoryId && <p className='text-error text-sm mt-1'>{errors.categoryId.message}</p>}
							</div>
						</div>

						<div className='contents'>
							<label className='self-center text-sm font-medium'>Name</label>
							<div>
								<input
									className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
									placeholder='e.g. Frontend Development'
									{...register('name')}
								/>
								{errors.name && <p className='mt-1 text-error text-sm'>{errors.name.message}</p>}
							</div>
						</div>

						<div className='contents'>
							<div className='self-center'>
								<div className='text-sm font-medium'>Slug</div>
								<div className='text-xs text-base-content/60'>lowercase-with-hyphens</div>
							</div>
							<div>
								<input
									className={`input input-bordered w-full ${errors.slug ? 'input-error' : ''}`}
									placeholder='frontend-development'
									{...register('slug')}
									onBlur={e => setValue('slug', toSlug(e.target.value))}
								/>
								{errors.slug && <p className='mt-1 text-error text-sm'>{errors.slug.message}</p>}
							</div>
						</div>

						<div className='contents'>
							<div className='self-start'>
								<div className='text-sm font-medium'>Description</div>
								<div className='text-xs text-base-content/60'>optional</div>
							</div>
							<div>
								<textarea
									className={`textarea textarea-bordered h-28 w-full ${errors.description ? 'textarea-error' : ''}`}
									placeholder='Short description'
									{...register('description')}
								/>
								{errors.description && <p className='mt-1 text-error text-sm'>{errors.description.message}</p>}
							</div>
						</div>

						<div className='contents'>
							<div className='self-center'>
								<div className='text-sm font-medium'>Sort order</div>
								<div className='text-xs text-base-content/60'>0 = top</div>
							</div>
							<div>
								<input
									type='number'
									step={1}
									className={`input input-bordered w-40 ${errors.sortOrder ? 'input-error' : ''}`}
									placeholder='0'
									{...register('sortOrder', { valueAsNumber: true })}
								/>
								{errors.sortOrder && <p className='mt-1 text-error text-sm'>{String(errors.sortOrder.message)}</p>}
							</div>
						</div>

						<div className='contents'>
							<span className='self-center text-sm font-medium'>Active</span>
							<label className='flex items-center gap-3'>
								<input type='checkbox' className='toggle toggle-primary toggle-lg' {...register('isActive')} />
								<span className='text-sm text-base-content/70'>Enable specialty</span>
							</label>
						</div>
					</div>

					<div className='modal-action mt-6'>
						<button type='button' className='btn' onClick={onClose} disabled={isSubmitting}>
							Cancel
						</button>
						<button type='submit' className='btn btn-primary' disabled={isSubmitting}>
							{initial?.id ? 'Save changes' : 'Create'}
						</button>
					</div>
				</form>
			</div>
			<form method='dialog' className='modal-backdrop'>
				<button onClick={onClose}>close</button>
			</form>
		</dialog>
	)
}
