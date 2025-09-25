import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { createSkill, deleteSkill, searchSkills, updateSkill } from '~/apis/admin/skkill.api'
import { useDebounce } from '~/hooks/comons/useDebounce'
import type { SkillLite } from '~/types/skill'
import SkillFormModal, { type SkillForm } from './FormModal'

export default function SkillsAdminPage() {
	const qc = useQueryClient()
	const [q, setQ] = useState('')
	const dq = useDebounce(q, 400)
	const [page, setPage] = useState(1)
	const limit = 10
	const queryKey = ['skills-admin', dq, page]
	const { data, isFetching } = useQuery({ queryKey, queryFn: () => searchSkills({ search: dq, page, limit }) })
	const items = data?.data ?? []
	const total = data?.total ?? 0
	const totalPages = Math.max(1, Math.ceil(total / limit))

	const mCreate = useMutation({
		mutationFn: (p: SkillForm) => createSkill(p),
		onSuccess: () => qc.invalidateQueries({ queryKey })
	})
	const mUpdate = useMutation({
		mutationFn: ({ id, patch }: { id: string; patch: Partial<SkillLite> }) => updateSkill(id, patch),
		onSuccess: () => qc.invalidateQueries({ queryKey })
	})
	const mDelete = useMutation({
		mutationFn: (id: string) => deleteSkill(id),
		onSuccess: () => qc.invalidateQueries({ queryKey })
	})

	const [openAdd, setOpenAdd] = useState(false)
	const [editRow, setEditRow] = useState<SkillLite | null>(null)

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<div className='join w-full md:w-96'>
					<div className='join-item input input-bordered w-full flex items-center gap-2'>
						<Search className='w-4 h-4 opacity-60' />
						<input
							className='grow outline-none'
							placeholder='Search skills...'
							value={q}
							onChange={e => {
								setQ(e.target.value)
								setPage(1)
							}}
						/>
					</div>
				</div>
				<button className='btn btn-primary' onClick={() => setOpenAdd(true)}>
					<Plus className='w-4 h-4 mr-1' />
					Add Skill
				</button>
			</div>

			<div className='bg-base-100 rounded-xl border border-base-300 overflow-x-auto'>
				<table className='table'>
					<thead>
						<tr>
							<th>Name</th>
							<th>Slug</th>
							<th>Active</th>
							<th className='hidden lg:table-cell'>Description</th>
							<th className='w-28'>Actions</th>
						</tr>
					</thead>
					<tbody>
						{items.map((s: SkillLite) => (
							<tr key={s.id}>
								<td>{s.name}</td>
								<td className='text-xs opacity-80'>{s.slug}</td>
								<td>
									{s.isActive ? (
										<span className='badge badge-success'>Active</span>
									) : (
										<span className='badge'>Disabled</span>
									)}
								</td>
								<td className='hidden lg:table-cell'>{s.description?.slice(0, 140) ?? ''}</td>
								<td className='flex gap-2'>
									<button className='btn btn-ghost btn-sm' onClick={() => setEditRow(s)}>
										<Pencil className='w-4 h-4' />
									</button>
									<button className='btn btn-ghost btn-sm' onClick={() => mDelete.mutate(s.id)}>
										<Trash2 className='w-4 h-4' />
									</button>
								</td>
							</tr>
						))}
						{items.length === 0 && (
							<tr>
								<td colSpan={5} className='text-center py-10 opacity-60'>
									{isFetching ? 'Đang tải...' : 'Không có dữ liệu'}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			<div className='flex items-center justify-between'>
				<div className='join'>
					<button className='join-item btn' disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
						«
					</button>
					<button className='join-item btn btn-ghost'>
						{page}/{totalPages}
					</button>
					<button
						className='join-item btn'
						disabled={page >= totalPages}
						onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
						»
					</button>
				</div>
				<div className='text-sm opacity-60'>{total} kết quả</div>
			</div>

			{/* Add Modal */}
			<SkillFormModal
				open={openAdd}
				onClose={() => setOpenAdd(false)}
				onSubmit={async (v: SkillForm) => {
					await mCreate.mutateAsync(v)
				}}
			/>

			{/* Edit Modal */}
			<SkillFormModal
				open={!!editRow}
				onClose={() => setEditRow(null)}
				initial={editRow ?? undefined}
				onSubmit={async (v: SkillForm) => {
					if (editRow?.id) {
						await mUpdate.mutateAsync({ id: editRow.id, patch: v })
					}
				}}
			/>
		</div>
	)
}
