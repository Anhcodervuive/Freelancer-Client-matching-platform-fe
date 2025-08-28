import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { LANGUAGE_OPTIONS, PROFICIENCY_OPTIONS } from '~/constants/language'
import type { LanguageProficiency } from '~/types/profile'

type Row = { languageCode: string; proficiency: LanguageProficiency; _id: string }

type Props = {
	open: boolean
	onClose: () => void
	initial: { languageCode: string; proficiency: LanguageProficiency }[] // từ server
	onSave: (_next: Row[], _type: 'EDIT' | 'ADD') => Promise<void> // sẽ diff và gọi POST/DELETE ngoài
	title?: string // "Add language" | "Edit languages"
	type: 'EDIT' | 'ADD'
}

export default function LanguageManagerModal({
	open,
	onClose,
	initial,
	onSave,
	title = 'Edit languages',
	type
}: Props) {
	const [rows, setRows] = useState<Row[]>([])

	// map để không cho duplicate language
	const taken = useMemo(() => new Set(rows.map(r => r.languageCode)), [rows])

	useEffect(() => {
		if (open) {
			setRows(
				initial.map(x => ({
					_id: `${x.languageCode}`,
					languageCode: x.languageCode,
					proficiency: x.proficiency
				}))
			)
		}
	}, [open, initial])

	function addRow() {
		// pick ngôn ngữ đầu tiên chưa dùng
		const firstFree = LANGUAGE_OPTIONS.find(o => !taken.has(o.value))
		if (!firstFree) return
		setRows(prev => [...prev, { _id: crypto.randomUUID(), languageCode: firstFree.value, proficiency: 'BASIC' }])
	}

	function removeRow(id: string) {
		setRows(prev => prev.filter(r => r._id !== id))
	}

	function changeRow(id: string, patch: Partial<Row>) {
		setRows(prev => prev.map(r => (r._id === id ? { ...r, ...patch } : r)))
	}

	const canSave = useMemo(() => {
		if (!rows.length) return true // cho phép để xoá hết
		// không duplicate và có value hợp lệ
		const set = new Set<string>()
		for (const r of rows) {
			if (!r.languageCode) return false
			if (set.has(r.languageCode)) return false
			set.add(r.languageCode)
		}
		return true
	}, [rows])

	if (!open) return null

	return (
		<div className='fixed inset-0 z-[60]'>
			{/* overlay */}
			<div className='absolute inset-0 bg-black/40' onClick={onClose} />

			{/* panel */}
			<div className='absolute inset-0 flex items-center justify-center p-8'>
				<div className='w-full max-w-2xl rounded-xl bg-white shadow-xl'>
					<div className='flex items-center justify-between px-8 pt-4'>
						<h3 className='text-lg font-semibold'>{title}</h3>
						<button className='btn btn-ghost btn-sm' onClick={onClose}>
							✕
						</button>
					</div>

					<div className='p-8 space-y-3'>
						{/* header row like Upwork */}
						<div className='grid grid-cols-1 md:grid-cols-2 gap-3 font-medium'>
							<div>Language</div>
							<div>Proficiency level</div>
						</div>

						{/* rows */}
						<div className='space-y-2'>
							{rows.map(r => (
								<div key={r._id} className='grid grid-cols-1 md:grid-cols-2 gap-3 items-center'>
									{/* Language select */}
									<select
										className='select select-sm border-base-200 w-full'
										value={r.languageCode}
										onChange={e => changeRow(r._id, { languageCode: e.target.value })}>
										{LANGUAGE_OPTIONS.map(o => (
											<option key={o.value} value={o.value} disabled={o.value !== r.languageCode && taken.has(o.value)}>
												{o.name}
											</option>
										))}
									</select>

									{/* Proficiency select + trash */}
									<div className='flex items-center gap-2'>
										<select
											className='select select-sm border-base-200 w-full'
											value={r.proficiency}
											onChange={e => changeRow(r._id, { proficiency: e.target.value as LanguageProficiency })}>
											{PROFICIENCY_OPTIONS.map(o => (
												<option key={o.value} value={o.value}>
													{o.name}
												</option>
											))}
										</select>

										<button
											title='Remove'
											className='btn btn-ghost btn-sm text-green-700'
											onClick={() => removeRow(r._id)}>
											🗑️
										</button>
									</div>
								</div>
							))}
						</div>

						{/* add another language */}
						<button className='btn btn-outline text-green-700 border-green-200' onClick={addRow}>
							<Plus /> Add another language
						</button>
					</div>

					{/* footer */}
					<div className='p-4 flex justify-end gap-2'>
						<button className='btn btn-ghost' onClick={onClose}>
							Cancel
						</button>
						<button
							className='btn btn-primary'
							disabled={!canSave}
							onClick={async () => {
								await onSave(rows, type)
								onClose()
							}}>
							Save
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
