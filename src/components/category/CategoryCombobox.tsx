import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getAllCategories } from '~/apis/admin/category.api'
import { useDebounce } from '~/hooks/comons/useDebounce'

type Props = { value?: string; onChange: (_id: string) => void }

export default function CategoryCombobox({ value, onChange }: Props) {
	const [open, setOpen] = useState(false)
	const [q, setQ] = useState('')
	const dq = useDebounce(q, 400)

	const { data } = useQuery({
		queryKey: ['categories-lite', dq],
		queryFn: () => getAllCategories({ page: 1, limit: 100, search: dq }),
		staleTime: 60_000
	})
	const list = useMemo(() => data?.data ?? [], [data])
	const selected = useMemo(() => list.find(c => c.id === value), [list, value])

	const wrapRef = useRef<HTMLDivElement>(null)

	// đóng khi click ra ngoài / ESC
	useEffect(() => {
		const onDocClick = (e: MouseEvent) => {
			if (!wrapRef.current) return
			if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
		}
		const onEsc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false)
		}
		document.addEventListener('mousedown', onDocClick)
		document.addEventListener('keydown', onEsc)
		return () => {
			document.removeEventListener('mousedown', onDocClick)
			document.removeEventListener('keydown', onEsc)
		}
	}, [])

	return (
		// quan trọng: dropdown bao TRÊN button + content
		<div ref={wrapRef} className='dropdown dropdown-bottom w-full'>
			<button
				type='button'
				className='btn btn-outline w-full justify-between'
				onClick={() => setOpen(o => !o)}
				aria-expanded={open}>
				<span className='truncate'>{selected ? selected.name : 'Select a category'}</span>
				<ChevronDown className='size-4 shrink-0' />
			</button>

			{/* daisyUI: dropdown-content là absolute; control bằng dropdown-open hoặc ẩn/hiện thủ công */}
			<div className={`dropdown-content z-[60] w-full ${open ? '' : 'hidden'}`}>
				<div className='mt-2 bg-base-100 shadow w-full'>
					<div className='p-2 border-b border-base-300'>
						<label className='input input-bordered flex items-center gap-2'>
							<Search className='size-4 opacity-70' />
							<input value={q} onChange={e => setQ(e.target.value)} placeholder='Search category...' className='grow' />
						</label>
					</div>

					<ul className='menu max-h-64 overflow-auto'>
						{list.length === 0 && <li className='p-3 text-base-content/60'>No results</li>}
						{list.map(c => (
							<li key={c.id}>
								<button
									type='button'
									onClick={() => {
										onChange(c.id)
										setOpen(false)
									}}>
									{c.name}
								</button>
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	)
}
