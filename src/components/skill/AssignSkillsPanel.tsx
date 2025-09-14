import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useDebounce } from '~/hooks/comons/useDebounce'
import { deleteOwnerSkill, getOwnerSkills, patchOwnerSkill, restoreOwnerSkill } from '~/apis/admin/skkill.api'
import type { OwnerSkillItem, OwnerType } from '~/types/skill'
import { Loader2, RotateCcw, Search, Settings2, Trash } from 'lucide-react'
import OwnerSkillRow from './OwnerSkillRow'
import AttachSkillsInlinePanel from './AttachSkillPanel'

export default function AssignSkillsPanel({ ownerType, ownerId }: { ownerType: OwnerType; ownerId: string }) {
	const qc = useQueryClient()
	const [q, setQ] = useState('')
	const dq = useDebounce(q, 400)
	const [page, setPage] = useState(1)
	const limit = 20
	const [selected, setSelected] = useState<Set<string>>(new Set())
	const [status, setStatus] = useState<'deleted' | 'all'>('all')

	const queryKey = ['owner-skills', ownerType, ownerId, dq, status, page]
	const { data, isFetching, isRefetching } = useQuery({
		queryKey,
		queryFn: () => getOwnerSkills(ownerType, ownerId, { search: dq, page, limit, status })
	})

	const items = useMemo(() => data?.data ?? [], [data])
	const total = data?.total ?? 0
	const existingSkillIds = useMemo(() => new Set(items.map(i => i.skillId)), [items])

	const clearSelection = () => setSelected(new Set())
	const toggleAll = (checked: boolean) => {
		if (!checked) return clearSelection()
		setSelected(new Set(items.map(i => i.skillId)))
	}
	const toggleOne = (id: string) =>
		setSelected(prev => {
			const next = new Set(prev)
			if (next.has(id)) {
				next.delete(id)
			} else {
				next.add(id)
			}
			return next
		})

	const mPatch = useMutation({
		mutationFn: ({ skillId, weight, isDeleted }: { skillId: string; weight?: number; isDeleted?: boolean }) =>
			patchOwnerSkill(ownerType, ownerId, skillId, { weight, isDeleted }),
		onMutate: async vars => {
			await qc.cancelQueries({ queryKey })
			const prev = qc.getQueryData<{ data: OwnerSkillItem[] }>(queryKey)
			qc.setQueryData<{ data: OwnerSkillItem[] }>(queryKey, old => {
				if (!old) return old
				const next = old.data.map((it: OwnerSkillItem) =>
					it.skillId === vars.skillId
						? {
								...it,
								...(typeof vars.weight === 'number' ? { weight: vars.weight } : {}),
								...(typeof vars.isDeleted === 'boolean' ? { isDeleted: vars.isDeleted } : {})
						  }
						: it
				)
				return { ...old, data: next }
			})
			return { prev }
		},
		onError: (_e, _v, ctx) => {
			if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev)
		},
		onSettled: () => qc.invalidateQueries({ queryKey })
	})
	const mDelete = useMutation({
		mutationFn: (skillId: string) => deleteOwnerSkill(ownerType, ownerId, skillId),
		onSettled: () => qc.invalidateQueries({ queryKey })
	})
	const mRestore = useMutation({
		mutationFn: (skillId: string) => restoreOwnerSkill(ownerType, ownerId, skillId),
		onSettled: () => qc.invalidateQueries({ queryKey })
	})

	return (
		<div className='space-y-3'>
			<div className='flex flex-col md:flex-row gap-3 md:items-center md:justify-between'>
				<div className='join w-full md:w-auto'>
					<div className='join-item input input-bordered w-full md:w-96 flex items-center gap-2'>
						<Search className='w-4 h-4 opacity-60' />
						<input
							className='grow'
							placeholder='Tìm skill...'
							value={q}
							onChange={e => {
								setQ(e.target.value)
								setPage(1)
							}}
						/>
						<select
							className='join-item select'
							value={status}
							onChange={e => {
								setStatus(e.target.value as 'deleted' | 'all')
								setPage(1)
							}}>
							<option value='deleted'>Deleted</option>
							<option value='all'>All</option>
						</select>
					</div>
					<div className='dropdown'>
						<div tabIndex={0} role='button' className='btn'>
							<Settings2 className='w-4 h-4 mr-2' />
							Bulk actions
						</div>
						<ul tabIndex={0} className='dropdown-content menu bg-base-200 rounded-box z-[1] w-56 p-2 shadow'>
							<li>
								<button
									disabled={selected.size === 0}
									onClick={() => {
										selected.forEach(id => mPatch.mutate({ skillId: id, weight: 60 }))
									}}>
									Set weight = 60
								</button>
							</li>
							<li>
								<button
									disabled={selected.size === 0}
									onClick={() => {
										selected.forEach(id => mPatch.mutate({ skillId: id, isDeleted: true }))
									}}>
									<Trash className='w-4 h-4' />
									Soft delete
								</button>
							</li>
							<li>
								<button
									disabled={selected.size === 0}
									onClick={() => {
										selected.forEach(id => mRestore.mutate(id))
									}}>
									<RotateCcw className='w-4 h-4' />
									Restore
								</button>
							</li>
						</ul>
					</div>
				</div>
			</div>

			<div className='bg-base-100 rounded-xl border border-base-300'>
				<div className='overflow-x-auto'>
					<table className='table'>
						<thead>
							<tr>
								<th>
									<input
										type='checkbox'
										className='checkbox'
										onChange={e => toggleAll(e.currentTarget.checked)}
										checked={selected.size > 0 && selected.size === items.length}
									/>
								</th>
								<th>Skill</th>
								<th className='hidden lg:table-cell'>Description</th>
								<th className='w-64'>Weight</th>
								<th className='w-28'>Status</th>
								<th className='w-40'>Actions</th>
							</tr>
						</thead>
						<tbody>
							{items.map((row: OwnerSkillItem) => (
								<OwnerSkillRow
									key={row.skillId}
									row={row}
									checked={selected.has(row.skillId)}
									onToggle={() => toggleOne(row.skillId)}
									onChangeWeight={w => mPatch.mutate({ skillId: row.skillId, weight: w })}
									onDelete={() => mDelete.mutate(row.skillId)}
									onRestore={() => mRestore.mutate(row.skillId)}
									isMutating={mPatch.isPending}
								/>
							))}
							{items.length === 0 && (
								<tr>
									<td colSpan={6} className='text-center py-10 opacity-60'>
										{isFetching ? 'Đang tải...' : 'Không có dữ liệu'}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				<div className='flex items-center justify-between p-3'>
					<div className='join'>
						<button className='join-item btn' disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
							«
						</button>
						<button className='join-item btn btn-ghost'>
							{total === 0 ? 1 : page}/{Math.max(1, Math.ceil(total / limit))}
						</button>
						<button
							className='join-item btn'
							disabled={page >= Math.max(1, Math.ceil(total / limit))}
							onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil(total / limit)), p + 1))}>
							»
						</button>
					</div>
					<div className='text-sm opacity-60'>
						{total} kết quả{' '}
						{(isFetching || isRefetching) && <Loader2 className='w-4 h-4 inline-block ml-2 animate-spin' />}
					</div>
				</div>
			</div>

			<AttachSkillsInlinePanel
				ownerType={ownerType}
				ownerId={ownerId}
				existingSkillIds={existingSkillIds}
				defaultWeight={ownerType === 'specialty' ? 70 : 50}
				onDone={() => qc.invalidateQueries({ queryKey })}
			/>
		</div>
	)
}
