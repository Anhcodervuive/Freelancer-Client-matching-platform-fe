import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Tag } from 'lucide-react'
import { toSlug } from '~/utils/form'
import type { Category } from '~/types/Category'

const CategorySchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters').max(80),
	slug: z
		.string()
		.min(2, 'Slug must be at least 2 characters')
		.regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'),
	description: z.string().max(300).optional().or(z.literal('')),
	sortOrder: z.coerce.number().int().min(0).default(0),
	isActive: z.boolean().default(true)
})

export type CategoryFormValues = z.input<typeof CategorySchema>
export type CategoryParsed = z.output<typeof CategorySchema>

export default function CategoryFormModal({
	open,
	onClose,
	initial,
	onSubmit
}: {
	open: boolean
	onClose: () => void
	initial?: Partial<Category>
	onSubmit: (_data: CategoryParsed) => Promise<void>
}) {
	const {
		register,
		handleSubmit,
		watch,
		setValue,
		reset,
		formState: { errors, isSubmitting }
	} = useForm<CategoryFormValues>({
		resolver: zodResolver(CategorySchema),
		defaultValues: {
			name: initial?.name ?? '',
			slug: initial?.slug ?? '',
			description: initial?.description ?? '',
			isActive: initial?.isActive ?? true,
			sortOrder: initial?.sortOrder ?? 0
		}
	})

	const nameValue = watch('name')
	useEffect(() => {
		// Auto-generate slug when creating; for edit, keep user's explicit slug unless name changes from empty.
		if (!initial?.id) {
			setValue('slug', toSlug(nameValue || ''))
		}
	}, [nameValue, initial?.id, setValue])

	// mỗi khi mở modal (hoặc đổi bản ghi), nạp lại form
	useEffect(() => {
		const defaults = {
			name: initial?.name ?? '',
			slug: initial?.slug ?? '',
			description: initial?.description ?? '',
			isActive: initial?.isActive ?? true,
			sortOrder: (initial?.sortOrder ?? 0) as number
		}
		reset(defaults)
	}, [
		initial?.description,
		initial?.id,
		initial?.isActive,
		initial?.name,
		initial?.slug,
		initial?.sortOrder,
		open,
		reset
	])

	return (
		<dialog className={`modal ${open ? 'modal-open' : ''}`}>
			<div className='modal-box max-w-2xl'>
				<h3 className='font-bold text-xl flex items-center gap-2'>
					<Tag className='size-5' /> {initial?.id ? 'Edit category' : 'New category'}
				</h3>
				<form
					className='mt-4 space-y-4'
					onSubmit={handleSubmit(async data => {
						await onSubmit({
							...data,
							isActive: data.isActive ?? true,
							sortOrder: Number(data.sortOrder)
						})
						onClose()
					})}>
					{/* Grid 2 cột: 140px cho label, 1fr cho control */}
					<div className='grid gap-4 sm:grid-cols-[140px_1fr]'>
						{/* Name */}
						<div className='contents'>
							<label className='self-center text-sm font-medium'>Name</label>
							<div>
								<input
									type='text'
									className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
									placeholder='e.g. Web Development'
									{...register('name')}
								/>
								{errors.name && <p className='mt-1 text-error text-sm'>{errors.name.message}</p>}
							</div>
						</div>

						{/* Slug */}
						<div className='contents'>
							<div className='self-center'>
								<div className='text-sm font-medium'>Slug</div>
								<div className='text-xs text-base-content/60'>lowercase-with-hyphens</div>
							</div>
							<div>
								<input
									type='text'
									className={`input input-bordered w-full ${errors.slug ? 'input-error' : ''}`}
									placeholder='web-development'
									{...register('slug')}
									onBlur={e => setValue('slug', toSlug(e.target.value))}
								/>
								{errors.slug && <p className='mt-1 text-error text-sm'>{errors.slug.message}</p>}
							</div>
						</div>

						{/* Description */}
						<div className='contents'>
							<div className='self-start'>
								<div className='text-sm font-medium'>Description</div>
								<div className='text-xs text-base-content/60'>optional</div>
							</div>
							<div>
								<textarea
									className={`textarea textarea-bordered h-28 w-full ${errors.description ? 'textarea-error' : ''}`}
									placeholder='Short description about this category'
									{...register('description')}
								/>
								{errors.description && <p className='mt-1 text-error text-sm'>{errors.description.message}</p>}
							</div>
						</div>

						{/* Sort order */}
						<div className='contents'>
							<div className='self-center'>
								<div className='text-sm font-medium'>Sort order</div>
								<div className='text-xs text-base-content/60'>integer, default 0</div>
							</div>
							<div>
								<input
									type='number'
									className={`input input-bordered w-40 ${errors.sortOrder ? 'input-error' : ''}`}
									placeholder='0'
									step={1}
									{...register('sortOrder', { valueAsNumber: true })}
								/>
								{errors.sortOrder && <p className='mt-1 text-error text-sm'>{String(errors.sortOrder.message)}</p>}
							</div>
						</div>

						{/* Active (toggle) */}
						<div className='contents'>
							<span className='self-center text-sm font-medium'>Active</span>
							<label className='flex items-center gap-3'>
								{/* Làm toggle to và tròn để hợp với input */}
								<input
									type='checkbox'
									className='toggle toggle-primary toggle-lg'
									{...register('isActive')}
									aria-label='Active'
								/>
								<span className='text-sm text-base-content/70'>Enable category</span>
							</label>
						</div>
					</div>

					<div className='modal-action'>
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
