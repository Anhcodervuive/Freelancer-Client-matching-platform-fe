import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, EllipsisVertical, Pencil, Plus, RefreshCcw, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { createSpecialty, deleteSpecialty, getSpecialties, updateSpecialty } from '~/apis/admin/specialty.api'
import CategoryCombobox from '~/components/category/CategoryCombobox'
import { useDebounce } from '~/hooks/comons/useDebounce'
import type { Specialty } from '~/types/specialty'
import { formatDate } from '~/utils/form'
import SpecialtyFormModal from './FormModal'
import ConfirmDelete from '~/components/ConfirmDelete'
import { Link } from 'react-router-dom'
import { routes } from '~/config/routes'
// ---------- Page ----------
export default function SpecialtiesGlobal() {
	const [page, setPage] = useState(1)
	const [limit] = useState(10)
	const [search, setSearch] = useState('')
	const debounced = useDebounce(search, 400)

	const [categoryId, setCategoryId] = useState<string | null>(null)

	const [modalOpen, setModalOpen] = useState(false)
	const [editing, setEditing] = useState<Specialty | null>(null)
	const [confirmOpen, setConfirmOpen] = useState(false)
	const [toDelete, setToDelete] = useState<Specialty | null>(null)

	const qc = useQueryClient()

	const qKey = useMemo(
		() => ['specialties', { page, limit, search: debounced, categoryId }],
		[page, limit, debounced, categoryId]
	)
	const { data, isLoading, isError, isFetching, refetch } = useQuery({
		queryKey: qKey,
		queryFn: () => getSpecialties({ page, limit, search: debounced, categoryId: categoryId ?? undefined }),
		staleTime: 20_000
	})

	const createMut = useMutation({
		mutationFn: createSpecialty,
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['specialties'] })
			toast.success('Specialty created')
		}
	})
	const updateMut = useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: Partial<Specialty> }) => updateSpecialty(id, payload),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['specialties'] })
			toast.success('Specialty updated')
		}
	})
	const deleteMut = useMutation({
		mutationFn: (id: string) => deleteSpecialty(id),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ['specialties'] })
			toast.success('Specialty deleted')
		}
	})

	const total = data?.total ?? 0
	const pages = Math.max(1, Math.ceil(total / limit))

	return (
		<div className='p-6'>
			{/* Header */}
			<div className='mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h1 className='text-2xl font-semibold'>Specialties</h1>
					<p className='text-base-content/70'>Manage specialties across all categories.</p>
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
						<Plus className='size-4' /> New specialty
					</button>
				</div>
			</div>

			{/* Filters */}
			<div className='mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
				<label className='input input-bordered flex items-center gap-2'>
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
				<div>
					<CategoryCombobox
						value={categoryId ?? undefined}
						onChange={id => {
							setCategoryId(id)
							setPage(1)
						}}
					/>
					<div className='text-xs mt-1 text-base-content/60'>Filter by category (optional)</div>
				</div>
			</div>

			{/* Table */}
			<div className='card bg-base-100 shadow-sm'>
				<div className='overflow-x-auto'>
					<table className='table'>
						<thead>
							<tr>
								<th className='w-[26%]'>Name</th>
								<th className='w-[16%]'>Slug</th>
								<th className='w-[20%]'>Category</th>
								<th className='w-[10%]'>Order</th>
								<th className='w-[14%]'>Status</th>
								<th className='w-[14%]'>Updated</th>
								<th className='w-[8%] text-right'>Actions</th>
							</tr>
						</thead>
						<tbody>
							{isLoading && (
								<tr>
									<td colSpan={7}>
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
									<td colSpan={7}>
										<div className='alert alert-error m-4'>Failed to load. Please try again.</div>
									</td>
								</tr>
							)}
							{!isLoading && (data?.data?.length ?? 0) === 0 && (
								<tr>
									<td colSpan={7}>
										<div className='p-8 text-center text-base-content/70'>No specialties found.</div>
									</td>
								</tr>
							)}
							{data?.data?.map(s => (
								<tr key={s.id} className='hover'>
									<td>
										<div className='font-medium'>{s.name}</div>
										{s.description ? (
											<div className='text-sm text-base-content/70 line-clamp-1'>{s.description}</div>
										) : null}
									</td>
									<td>
										<div className='badge'>{s.slug}</div>
									</td>
									<td>{s.category?.name ?? '—'}</td>
									<td>
										<div className='join'>
											<button
												className='btn btn-xs join-item'
												title='Move up'
												onClick={() =>
													updateMut.mutate({
														id: s.id,
														payload: { sortOrder: Math.max(0, s.sortOrder - 1), categoryId: s.categoryId }
													})
												}>
												-
											</button>
											<button className='btn btn-xs join-item btn-ghost pointer-events-none'>{s.sortOrder}</button>
											<button
												className='btn btn-xs join-item'
												title='Move down'
												onClick={() =>
													updateMut.mutate({
														id: s.id,
														payload: { sortOrder: s.sortOrder + 1, categoryId: s.categoryId }
													})
												}>
												+
											</button>
										</div>
									</td>
									<td>
										{s.isActive ? (
											<span className='badge badge-success gap-1'>
												<CheckCircle2 className='size-3' /> Active
											</span>
										) : (
											<span className='badge badge-ghost'>Inactive</span>
										)}
									</td>
									<td className='text-sm'>{formatDate(s.updatedAt)}</td>
									<td className='text-right'>
										<div className='flex justify-end gap-2'>
											<button
												className='btn btn-sm'
												onClick={() => {
													setEditing(s)
													setModalOpen(true)
												}}>
												<Pencil className='size-4' />
											</button>
											<button
												className='btn btn-sm btn-error'
												onClick={() => {
													setToDelete(s)
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
														<Link to={routes.admin.specialty.specialtySkills(s.id)} className='btn btn-link'>
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
			<SpecialtyFormModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
				initial={editing ?? undefined}
				onSubmit={async form => {
					if (editing) await updateMut.mutateAsync({ id: editing.id, payload: form })
					else await createMut.mutateAsync(form)
				}}
			/>

                        <ConfirmDelete
                                open={confirmOpen}
                                title='Delete specialty'
                                name={toDelete?.name || ''}
                                isProcessing={deleteMut.isPending}
                                onClose={() => {
                                        setConfirmOpen(false)
                                        setToDelete(null)
                                }}
                                onConfirm={async () => {
                                        if (toDelete) await deleteMut.mutateAsync(toDelete.id)
                                }}
                        />
                </div>
        )
}
