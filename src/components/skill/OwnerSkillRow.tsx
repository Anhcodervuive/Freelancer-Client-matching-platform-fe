import { Loader2, RotateCcw, Trash } from 'lucide-react'
import React from 'react'
import type { OwnerSkillItem } from '~/types/skill'
import { clampWeight } from '~/utils/skill'

export default function OwnerSkillRow({
	row,
	checked,
	onToggle,
	onChangeWeight,
	onDelete,
	onRestore,
	isMutating
}: {
	row: OwnerSkillItem
	checked: boolean
	onToggle: () => void
	onChangeWeight: (_weight: number) => void
	onDelete: () => void
	onRestore: () => void
	isMutating: boolean
}) {
	const [local, setLocal] = React.useState(row.weight)
	React.useEffect(() => {
		setLocal(row.weight)
	}, [row.weight])
	React.useEffect(() => {
		const t = setTimeout(() => {
			if (local !== row.weight) onChangeWeight(clampWeight(local))
		}, 500)
		return () => clearTimeout(t)
	}, [local, row.weight, onChangeWeight])

	return (
		<tr key={row.skillId} className={row.isDeleted ? 'opacity-50' : ''}>
			<td>
				<input type='checkbox' className='checkbox' checked={checked} onChange={onToggle} />
			</td>
			<td>
				<div className='font-medium'>{row.skill.name}</div>
				<div className='text-xs opacity-60'>{row.skill.slug}</div>
			</td>
			<td className='hidden lg:table-cell'>{row.skill.description?.slice(0, 120) ?? ''}</td>
			<td>
				<div className='flex items-center gap-2'>
					<input
						type='range'
						min={0}
						max={100}
						value={local}
						onChange={e => setLocal(Number(e.target.value))}
						className='range range-xs'
					/>
					<input
						type='number'
						min={0}
						max={100}
						value={local}
						onChange={e => setLocal(Number(e.target.value))}
						className='input input-bordered input-xs w-16'
					/>
					{isMutating && <Loader2 className='w-4 h-4 animate-spin' />}
				</div>
			</td>
			<td>
				<span className={`badge ${row.isDeleted ? 'badge-neutral' : 'badge-success'}`}>
					{row.isDeleted ? 'Deleted' : 'Active'}
				</span>
			</td>
			<td className='flex gap-2'>
				{!row.isDeleted ? (
					<button className='btn btn-ghost btn-sm' onClick={onDelete}>
						<Trash className='w-4 h-4' />
					</button>
				) : (
					<button className='btn btn-ghost btn-sm' onClick={onRestore}>
						<RotateCcw className='w-4 h-4' />
					</button>
				)}
			</td>
		</tr>
	)
}
