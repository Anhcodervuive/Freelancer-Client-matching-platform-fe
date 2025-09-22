// components/profile/LanguagesSection.tsx
import { useEffect, useMemo, useState } from 'react'
import { useProfileLanguages } from '~/hooks/api/useFreelancerLanguages'
import LanguageManagerModal from './LanguageManagerModal'
import { languageNameFromCode } from '~/constants/language'
import type { LanguageProficiency } from '~/types/profile'
import { Pencil, Plus } from 'lucide-react'

type Props = { userId?: string; editable?: boolean }

export default function LanguagesSection({ userId, editable = true }: Props) {
        const { listQ, addOne, removeOne } = useProfileLanguages(userId)
        const [open, setOpen] = useState<null | 'add' | 'edit'>(null)

        const current = useMemo(() => listQ.data ?? [], [listQ.data])

        useEffect(() => {
                if (!editable) {
                        setOpen(null)
                }
        }, [editable])

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
                <section className='rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]'>
                        <div className='flex items-center justify-between'>
                                <h3 className='text-lg font-semibold text-slate-900'>Languages</h3>
                                {editable && (
                                        <div className='flex gap-2'>
                                                <button className='btn btn-ghost btn-circle btn-sm text-primary hover:bg-primary/10' title='Add language' onClick={() => setOpen('add')}>
                                                        <Plus />
                                                </button>
                                                <button
                                                        className='btn btn-ghost btn-circle btn-sm text-primary hover:bg-primary/10'
                                                        title='Edit languages'
                                                        onClick={() => setOpen('edit')}>
                                                        <Pencil />
                                                </button>
                                        </div>
                                )}
                        </div>

                        {listQ.isLoading ? (
                                <div className='flex w-52 flex-col gap-4'>
                                        <div className='skeleton h-4 w-full'></div>
                                        <div className='skeleton h-4 w-full'></div>
                                </div>
                        ) : listQ.isError ? (
                                <div className='mt-2 text-sm text-error'>Failed to load languages.</div>
                        ) : current.length ? (
                                <div className='mt-2 space-y-2'>
                                        {current.map(l => (
                                                <div key={l.languageCode} className='flex flex-col rounded-2xl border border-white/70 bg-white/75 px-4 py-2 shadow-inner shadow-white/20 sm:flex-row sm:items-center sm:justify-between'>
                                                        <span className='font-medium text-slate-900'>{languageNameFromCode(l.languageCode)}</span>
                                                        <span className='text-sm text-slate-500'>
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
                                <div className='mt-2 text-sm text-slate-500'>
                                        {editable ? 'No languages yet.' : 'No language information available.'}
                                </div>
                        )}

			{/* Modal Add */}
                        {editable && (
                                <>
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
                                </>
                        )}
                </section>
        )
}
