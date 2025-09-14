import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil, Trash2, RefreshCcw, CheckCircle2, XCircle, EllipsisVertical } from 'lucide-react'
import type { Category } from '~/types/Category'
import CategoryFormModal from './FormModal'
import ConfirmDelete from '~/components/ConfirmDelete'
import { createCategory, deleteCategory, getAllCategories, updateCategory } from '~/apis/admin/category.api'
import { toast } from 'react-toastify'
import { useDebounce } from '~/hooks/comons/useDebounce'
import { Link } from 'react-router-dom'
import { routes } from '~/config/routes'

const formatDate = (iso: string) => new Date(iso).toLocaleString()

// ---------- Main Page ----------
export default function AdminCategories() {
	const [page, setPage] = useState(1)
	const [limit] = useState(3)
	const [search, setSearch] = useState('')
	const searchDebouced = useDebounce<string>(search, 1000)

	const [modalOpen, setModalOpen] = useState(false)
	const [editing, setEditing] = useState<Category | null>(null)

	const [confirmOpen, setConfirmOpen] = useState(false)
	const [toDelete, setToDelete] = useState<Category | null>(null)

	const qc = useQueryClient()
	const qKey = useMemo(() => ['categories', { page, limit, searchDebouced }], [page, limit, searchDebouced])

	const { data, isLoading, isError, refetch, isFetching } = useQuery({
		queryKey: qKey,
		queryFn: () => getAllCategories({ page, limit, search: searchDebouced })
	})

	// Mutations
	const createMut = useMutation({
		mutationFn: ({ payload }: { payload: Partial<Category> }) => createCategory(payload),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['categories'] })
			toast.success('Category created')
		},
		onError: () => toast.error('Category created failed!')
	})
	const updateMut = useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: Partial<Category> }) => updateCategory(id, payload),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['categories'] })
			toast.success('Category updated')
		},
		onError: () => toast.error('Category created failed!')
	})
	const deleteMut = useMutation({
		mutationFn: (id: string) => deleteCategory(id),
		onMutate: async id => {
			// Optimistic UI: remove immediately
			await qc.cancelQueries({ queryKey: ['categories'] })
			const prev = qc.getQueryData<{ data: Category[]; total: number }>(qKey)
			if (prev) {
				qc.setQueryData(qKey, {
					data: prev.data.filter(c => c.id !== id),
					total: Math.max(0, prev.total - 1)
				})
			}
			return { prev }
		},
		onError: (_err, _id, ctx) => {
			// rollback
			if (ctx?.prev) qc.setQueryData(qKey, ctx.prev)
			toast.success('Category created')
		},
		onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] }),
		onSuccess: () => toast.error('Category delete successfully!')
	})

	const total = data?.total ?? 0
	const pages = Math.max(1, Math.ceil(total / limit))

	return (
		<div className='p-6'>
			{/* Header */}
			<div className='mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h1 className='text-2xl font-semibold'>Categories</h1>
					<p className='text-base-content/70'>Create, update, and organize your project categories.</p>
				</div>
				<div className='flex gap-2'>
					<button className='btn' onClick={() => refetch()} disabled={isFetching}>
						<RefreshCcw className='size-4' /> Refresh
					</button>
					<button
						className='btn btn-primary'
						onClick={() => {
							setEditing(null)
							setModalOpen(true)
						}}>
						<Plus className='size-4' /> New category
					</button>
				</div>
			</div>

			{/* Filters */}
			<div className='mb-4'>
				<label className='input input-bordered flex items-center gap-2 max-w-md'>
					<Search className='size-4 opacity-70' />
					<input
						type='text'
						className='grow'
						placeholder='Search by name or slug...'
						value={search}
						onChange={e => {
							setSearch(e.target.value)
							setPage(1)
						}}
					/>
				</label>
			</div>

			{/* Table */}
			<div className='card bg-base-100 shadow-sm'>
				<div className='overflow-x-auto'>
					<table className='table'>
						<thead>
							<tr>
								<th className='w-[38%]'>Name</th>
								<th className='w-[22%]'>Slug</th>
								<th className='w-[14%]'>Status</th>
								<th className='w-[18%]'>Updated</th>
								<th className='w-[8%] text-right'>Actions</th>
							</tr>
						</thead>
						<tbody>
							{isLoading && (
								<tr>
									<td colSpan={5}>
										<div className='p-6'>
											<div className='skeleton h-10 mb-2' />
											<div className='skeleton h-10 mb-2' />
											<div className='skeleton h-10' />
										</div>
									</td>
								</tr>
							)}
							{!isLoading && isError && (
								<tr>
									<td colSpan={5}>
										<div className='alert alert-error m-4'>
											<XCircle className='size-5' />
											<span>Failed to load categories. Please try again.</span>
										</div>
									</td>
								</tr>
							)}
							{!isLoading && data?.data?.length === 0 && (
								<tr>
									<td colSpan={5}>
										<div className='p-8 text-center text-base-content/70'>No categories found.</div>
									</td>
								</tr>
							)}
							{data?.data?.map((c: Category) => (
								<tr key={c.id} className='hover'>
									<td>
										<div className='font-medium'>{c.name}</div>
										{c.description ? (
											<div className='text-sm text-base-content/70 line-clamp-1'>{c.description}</div>
										) : null}
									</td>
									<td>
										<div className='badge'>{c.slug}</div>
									</td>
									<td>
										{c.isActive ? (
											<span className='badge badge-success gap-1'>
												<CheckCircle2 className='size-3' /> Active
											</span>
										) : (
											<span className='badge badge-ghost'>Inactive</span>
										)}
									</td>
									<td className='text-sm'>{formatDate(c.updatedAt)}</td>
									<td className='text-right'>
										<div className='flex justify-end gap-2'>
											<button
												className='btn btn-sm'
												onClick={() => {
													setEditing(c)
													setModalOpen(true)
												}}>
												<Pencil className='size-4' />
											</button>
											<button
												className='btn btn-sm btn-error'
												onClick={() => {
													setToDelete(c)
													setConfirmOpen(true)
												}}>
												<Trash2 className='size-4' />
											</button>
											<details className='dropdown dropdown-bottom dropdown-end'>
												<summary className='btn btn-sm btn-ghost'>
													<EllipsisVertical />
												</summary>
												<ul className='menu dropdown-content bg-base-100 rounded-box z-1 p-2 shadow-sm'>
													<li>
														<Link to={routes.admin.category.categorySpecialties(c.id)} className='btn btn-link'>
															Specialty
														</Link>
													</li>
													<li>
														<Link to={routes.admin.category.categorySkills(c.id)} className='btn btn-link'>
															Skill
														</Link>
													</li>
												</ul>
											</details>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				<div className='p-4 flex items-center justify-between border-t border-base-300'>
					<div className='text-sm text-base-content/70'>Total: {total}</div>
					<div className='join'>
						<button className='btn join-item' disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
							«
						</button>
						<button className='btn join-item'>
							Page {page} / {pages}
						</button>
						<button
							className='btn join-item'
							disabled={page >= pages}
							onClick={() => setPage(p => Math.min(pages, p + 1))}>
							»
						</button>
					</div>
				</div>
			</div>

			{/* Modals */}
			<CategoryFormModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
				initial={editing ?? undefined}
				onSubmit={async form => {
					if (editing) {
						await updateMut.mutateAsync({ id: editing.id, payload: form })
					} else {
						await createMut.mutateAsync({ payload: form })
					}
				}}
			/>

			<ConfirmDelete
				open={confirmOpen}
				onClose={() => setConfirmOpen(false)}
				name={toDelete?.name || ''}
				onConfirm={async () => {
					if (toDelete) await deleteMut.mutateAsync(toDelete.id)
				}}
			/>
		</div>
	)
}
