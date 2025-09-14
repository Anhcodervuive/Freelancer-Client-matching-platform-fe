import { useQuery } from '@tanstack/react-query'
import { Check, Search } from 'lucide-react'
import { useState } from 'react'
import { attachSkillsBulk, searchSkills } from '~/apis/admin/skkill.api'
import { useDebounce } from '~/hooks/comons/useDebounce'
import type { OwnerType, SkillLite } from '~/types/skill'

export default function AttachSkillsInlinePanel({
	ownerType,
	ownerId,
	existingSkillIds,
	onDone,
	defaultWeight
}: {
	ownerType: OwnerType
	ownerId: string
	existingSkillIds: Set<string>
	defaultWeight?: number
	onDone?: (_added: number) => void
}) {
	const [open, setOpen] = useState(false)
	const [q, setQ] = useState('')
	const dq = useDebounce(q, 400)
	const [page, setPage] = useState(1)
	const [mode, setMode] = useState<'byIds' | 'bulk'>('byIds')
	const [dw, setDw] = useState<number>(defaultWeight ?? (ownerType === 'specialty' ? 70 : 50))
	const [selected, setSelected] = useState<Map<string, number>>(new Map())

	const { data, isFetching } = useQuery({
		queryKey: ['skills-search', dq, page],
		queryFn: () => searchSkills({ search: dq, page, limit: 20, onlyActive: true }),
		enabled: open
	})

	const items = data?.data ?? []
	const total = data?.total ?? 0
	const totalPages = Math.max(1, Math.ceil(total / 20))

	const toggle = (id: string) => {
		if (existingSkillIds.has(id)) return
		setSelected(prev => {
			const next = new Map(prev)
			if (next.has(id)) {
				next.delete(id)
			} else {
				next.set(id, dw)
			}
			return next
		})
	}
	const setOneWeight = (id: string, w: number) =>
		setSelected(prev => {
			const n = new Map(prev)
			if (n.has(id)) n.set(id, Math.max(0, Math.min(100, Math.round(w))))
			return n
		})

	const submit = async () => {
		if (selected.size === 0) {
			setOpen(false)
			return
		}
		if (mode === 'byIds')
			await attachSkillsBulk(ownerType, ownerId, {
				items: [...selected.entries()].map(([skillId, weight]) => ({ skillId, weight }))
			})
		else
			await attachSkillsBulk(ownerType, ownerId, {
				items: [...selected.entries()].map(([skillId, weight]) => ({ skillId, weight }))
			})
		onDone?.(selected.size)
		setSelected(new Map())
		setOpen(false)
	}

	return (
		<div className='bg-base-200 rounded-xl p-4 border border-base-300'>
			<div className='flex items-center justify-between'>
				<div className='font-medium'>Attach skills</div>
				<div className='flex gap-2'>
					<button className={`btn btn-xs ${open ? 'btn-neutral' : 'btn-primary'}`} onClick={() => setOpen(v => !v)}>
						{open ? 'Close' : 'Open'}
					</button>
					<div className='join hidden md:inline-flex'>
						<button
							className={`join-item btn btn-xs ${mode === 'byIds' ? 'btn-active' : ''}`}
							onClick={() => setMode('byIds')}>
							By IDs
						</button>
						<button
							className={`join-item btn btn-xs ${mode === 'bulk' ? 'btn-active' : ''}`}
							onClick={() => setMode('bulk')}>
							Bulk
						</button>
					</div>
				</div>
			</div>

			{open && (
				<div className='mt-3 space-y-3'>
					<div className='join w-full'>
						<div className='join-item input input-bordered w-full flex items-center gap-2'>
							<Search className='w-4 h-4 opacity-60' />
							<input
								className='grow outline-none'
								placeholder='Tìm skill...'
								value={q}
								onChange={e => {
									setQ(e.target.value)
									setPage(1)
								}}
							/>
						</div>
						<div className='join-item flex items-center gap-2 px-2'>
							<span className='text-xs opacity-60'>Default</span>
							<input
								type='number'
								min={0}
								max={100}
								value={dw}
								onChange={e => setDw(Number(e.target.value))}
								className='input input-bordered input-xs w-16'
							/>
						</div>
					</div>

					<div className='overflow-auto max-h-[50vh]'>
						<table className='table'>
							<thead>
								<tr>
									<th></th>
									<th>Skill</th>
									<th className='hidden md:table-cell'>Description</th>
									{mode === 'bulk' && <th className='w-40'>Weight</th>}
								</tr>
							</thead>
							<tbody>
								{items.map((s: SkillLite) => {
									const disabled = existingSkillIds.has(s.id)
									const checked = selected.has(s.id)
									return (
										<tr key={s.id} className={disabled ? 'opacity-50' : ''}>
											<td>
												<input
													type='checkbox'
													className='checkbox'
													disabled={disabled}
													checked={checked}
													onChange={() => toggle(s.id)}
												/>
											</td>
											<td>
												<div className='font-medium'>{s.name}</div>
												<div className='text-xs opacity-60'>{s.slug}</div>
											</td>
											<td className='hidden md:table-cell'>{s.description?.slice(0, 120) ?? ''}</td>
											{mode === 'bulk' && (
												<td>
													{selected.has(s.id) ? (
														<div className='flex items-center gap-2'>
															<input
																type='range'
																min={0}
																max={100}
																value={selected.get(s.id) ?? 0}
																onChange={e => setOneWeight(s.id, Number(e.target.value))}
																className='range range-xs'
															/>
															<input
																type='number'
																min={0}
																max={100}
																value={selected.get(s.id) ?? 0}
																onChange={e => setOneWeight(s.id, Number(e.target.value))}
																className='input input-bordered input-xs w-16'
															/>
														</div>
													) : (
														<span className='opacity-50 text-sm'>—</span>
													)}
												</td>
											)}
										</tr>
									)
								})}
								{items.length === 0 && (
									<tr>
										<td colSpan={mode === 'bulk' ? 4 : 3} className='text-center py-8 opacity-60'>
											{isFetching ? 'Đang tải...' : 'Không có kết quả'}
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>

					<div className='flex items-center justify-between'>
						<div className='join'>
							<button
								className='join-item btn btn-sm'
								disabled={page <= 1}
								onClick={() => setPage(p => Math.max(1, p - 1))}>
								«
							</button>
							<button className='join-item btn btn-sm btn-ghost'>
								{page}/{totalPages}
							</button>
							<button
								className='join-item btn btn-sm'
								disabled={page >= totalPages}
								onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
								»
							</button>
						</div>
						<button className='btn btn-primary btn-sm' onClick={submit}>
							<Check className='w-4 h-4 mr-1' />
							Attach ({selected.size})
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
