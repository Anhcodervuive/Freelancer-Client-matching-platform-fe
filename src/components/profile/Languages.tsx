// components/profile/LanguagesSection.tsx
import { useMemo, useState } from 'react'
import { useProfileLanguages } from '~/hooks/api/useProfileLanguages'
import LanguageManagerModal from './LanguageManagerModal'
import { languageNameFromCode } from '~/constants/language'
import type { LanguageProficiency } from '~/types/profile'
import { Pencil, Plus } from 'lucide-react'

type Props = { userId: string }

export default function LanguagesSection({ userId }: Props) {
	const { listQ, addOne, removeOne } = useProfileLanguages(userId)
	const [open, setOpen] = useState<null | 'add' | 'edit'>(null)

	const current = useMemo(() => listQ.data ?? [], [listQ.data])

	// hàm save chung cho modal (diff + gọi POST/DELETE)
	async function handleSave(
		nextRows: { languageCode: string; proficiency: LanguageProficiency }[],
		_type: 'ADD' | 'EDIT'
	) {
		const beforeMap = new Map(current.map(x => [x.languageCode, x.proficiency]))
		const afterMap = new Map(nextRows.map(x => [x.languageCode, x.proficiency]))

		const ops: Promise<unknown>[] = []

		// add/update
		for (const [code, prof] of afterMap) {
			const old = beforeMap.get(code)
			if (!old || old !== prof) {
				ops.push(addOne.mutateAsync({ languageCode: code, proficiency: prof }))
			}
		}
		if (_type === 'EDIT') {
			// delete
			for (const [code] of beforeMap) {
				if (!afterMap.has(code)) {
					ops.push(removeOne.mutateAsync(code))
				}
			}
		}
		await Promise.all(ops)
	}

	// dữ liệu truyền vào modal:
	const initialForAdd = useMemo(() => [], [])
	const initialForEdit = useMemo(
		() => current.map(x => ({ languageCode: x.languageCode, proficiency: x.proficiency })),
		[current]
	)

	return (
		<section className='rounded-xl border border-base-200 bg-white/90 p-4'>
			<div className='flex items-center justify-between'>
				<h3 className='font-semibold'>Languages</h3>
				<div className='flex gap-2'>
					<button className='btn btn-ghost btn-circle btn-sm text-green-700' title='Add' onClick={() => setOpen('add')}>
						<Plus />
					</button>
					<button
						className='btn btn-ghost btn-circle btn-sm text-green-700'
						title='Edit'
						onClick={() => setOpen('edit')}>
						<Pencil />
					</button>
				</div>
			</div>

			{listQ.isLoading ? (
				<div className='flex w-52 flex-col gap-4'>
					<div className='skeleton h-4 w-full'></div>
					<div className='skeleton h-4 w-full'></div>
				</div>
			) : listQ.isError ? (
				<div className='text-sm text-red-600 mt-2'>Failed to load languages</div>
			) : current.length ? (
				<div className='mt-2 space-y-1'>
					{current.map(l => (
						<div key={l.languageCode} className=''>
							<span className='font-medium mr-2'>{languageNameFromCode(l.languageCode)}:</span>{' '}
							<span className='text-base-content/60'>
								{l.proficiency === 'NATIVE'
									? 'Native or Bilingual'
									: l.proficiency === 'FLUENT'
									? 'Fluent'
									: l.proficiency === 'CONVERSATIONAL'
									? 'Conversational'
									: 'Basic'}
							</span>
						</div>
					))}
				</div>
			) : (
				<div className='text-sm text-base-content/60 mt-2'>No languages yet.</div>
			)}

			{/* Modal Add */}
			<LanguageManagerModal
				open={open === 'add'}
				onClose={() => setOpen(null)}
				title='Add language'
				initial={initialForAdd}
				onSave={handleSave}
				type='ADD'
			/>
			{/* Modal Edit */}
			<LanguageManagerModal
				open={open === 'edit'}
				onClose={() => setOpen(null)}
				title='Edit languages'
				initial={initialForEdit}
				onSave={handleSave}
				type='EDIT'
			/>
		</section>
	)
}
