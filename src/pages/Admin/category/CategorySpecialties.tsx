// src/pages/admin/categories/AdminCategorySpecialtiesPage.tsx
import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit3, Trash2, ArrowLeft } from 'lucide-react'
import { useDebounce } from '~/hooks/comons/useDebounce'
import { getCategoryById } from '~/apis/admin/category.api'
import { getSpecialtiesByCategory, createSpecialty, updateSpecialty, deleteSpecialty } from '~/apis/admin/specialty.api'
import SpecialtyFormModal from '../specialty/FormModal'
import type { Specialty } from '~/types/specialty'
import { routes } from '~/config/routes'

const PAGE_SIZE = 12

export default function CategorySpecialtiesPage() {
	const { id: categoryId = '' } = useParams()
	const [q, setQ] = useState('')
	const [page, setPage] = useState(1)
	const [editing, setEditing] = useState<null | Specialty>(null) // specialty row
	const [open, setOpen] = useState(false)

	const dq = useDebounce(q, 400)
	const qc = useQueryClient()

	const catQ = useQuery({
		queryKey: ['category', categoryId],
		queryFn: () => getCategoryById(categoryId),
		enabled: !!categoryId
	})

	const listQ = useQuery({
		queryKey: ['specialties-by-category', categoryId, dq, page],
		queryFn: () => getSpecialtiesByCategory({ categoryId, page, limit: PAGE_SIZE, search: dq }),
		enabled: !!categoryId
	})

	const delMut = useMutation({
		mutationFn: (sid: string) => deleteSpecialty(sid),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['specialties-by-category', categoryId] })
	})

	const total = listQ.data?.total ?? 0
	const items = listQ.data?.data ?? []
	const pages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

	return (
		<div className='mx-auto max-w-6xl p-6 space-y-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div className='breadcrumbs text-sm'>
					<ul>
						<li>
							<Link to={routes.admin.category.list}>Categories</Link>
						</li>
						<li>{catQ.data?.name ?? '...'}</li>
						<li>Specialties</li>
					</ul>
				</div>
				<Link to='/admin/categories' className='btn btn-ghost gap-2'>
					<ArrowLeft size={18} /> Back
				</Link>
			</div>

			<div className='rounded-2xl bg-base-200 p-5 shadow-sm'>
				<div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
					<div>
						<h2 className='text-xl font-bold'>{catQ.data?.name ?? '...'}</h2>
						<p className='text-sm text-base-content/60'>Quản lý các Specialty thuộc Category này</p>
					</div>

					<div className='flex gap-3'>
						<div className='join'>
							<input
								className='input input-bordered join-item w-64'
								placeholder='Search specialties...'
								value={q}
								onChange={e => {
									setQ(e.target.value)
									setPage(1)
								}}
							/>
							<button className='btn btn-square join-item' onClick={() => setQ('')}>
								✕
							</button>
						</div>
						<button
							className='btn btn-primary gap-2'
							onClick={() => {
								setEditing(null)
								setOpen(true)
							}}>
							<Plus size={18} /> Add
						</button>
					</div>
				</div>

				<div className='mt-5 overflow-x-auto'>
					<table className='table'>
						<thead>
							<tr>
								<th className='w-12'>#</th>
								<th>Name</th>
								<th className='w-32'>Sort</th>
								<th className='w-24'>Active</th>
								<th className='w-44'>Updated</th>
								<th className='w-28'></th>
							</tr>
						</thead>
						<tbody>
							{items.map((row: Specialty, i: number) => (
								<tr key={row.id} className='hover'>
									<td>{(page - 1) * PAGE_SIZE + i + 1}</td>
									<td className='font-medium'>{row.name}</td>
									<td>{row.sortOrder ?? '-'}</td>
									<td>
										<span className={`badge ${row.isActive ? 'badge-success' : 'badge-ghost'}`}>
											{row.isActive ? 'Active' : 'Disabled'}
										</span>
									</td>
									<td>{new Date(row.updatedAt).toLocaleString()}</td>
									<td>
										<div className='flex items-center gap-2'>
											<button
												className='btn btn-sm btn-outline'
												onClick={() => {
													setEditing(row)
													setOpen(true)
												}}>
												<Edit3 size={16} /> Edit
											</button>
											<button
												className='btn btn-sm btn-error btn-outline'
												onClick={() => {
													if (confirm(`Xóa "${row.name}"?`)) delMut.mutate(row.id)
												}}>
												<Trash2 size={16} />
											</button>
										</div>
									</td>
								</tr>
							))}
							{!listQ.isLoading && items.length === 0 && (
								<tr>
									<td colSpan={6} className='py-10 text-center text-base-content/60'>
										Không có Specialty nào
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{pages > 1 && (
					<div className='mt-4 flex justify-end'>
						<div className='join'>
							<button className='btn join-item' disabled={page === 1} onClick={() => setPage(p => p - 1)}>
								Prev
							</button>
							<button className='btn join-item btn-ghost no-animation'>
								Page {page} / {pages}
							</button>
							<button className='btn join-item' disabled={page === pages} onClick={() => setPage(p => p + 1)}>
								Next
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Modal Create / Edit */}
			{open && (
				<SpecialtyFormModal
					open={open}
					onClose={() => setOpen(false)}
					initial={
						editing
							? {
									id: editing.id,
									categoryId: categoryId,
									name: editing.name,
									slug: editing.slug,
									description: editing.description,
									sortOrder: editing.sortOrder,
									isActive: editing.isActive
							  }
							: undefined
					}
					onSubmit={async payload => {
						if (editing) {
							await updateSpecialty(editing.id, payload)
						} else {
							await createSpecialty(payload)
						}
						setOpen(false)
						qc.invalidateQueries({ queryKey: ['specialties-by-category', categoryId] })
					}}
				/>
			)}
		</div>
	)
}
