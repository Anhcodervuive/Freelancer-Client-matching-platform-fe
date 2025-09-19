// components/freelancer/EducationSection.tsx
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useFreelancerEducation } from '~/hooks/api/useFreelancerEducation'
import EducationManagerModal from './EducationManagerModal'
import type { FreelancerEducation } from '~/types/profile'

type Props = { userId?: string; editable?: boolean }

export function EducationSection({ userId, editable = true }: Props) {
        const { listQuery, deleteMutation } = useFreelancerEducation(userId)
        const [open, setOpen] = useState(false)
        const [editing, setEditing] = useState<FreelancerEducation | null>(null)

        const items = listQuery.data ?? []

        useEffect(() => {
                if (!editable) {
                        setOpen(false)
                        setEditing(null)
                }
        }, [editable])

	return (
		<div className='bg-white/90 rounded-xl p-4'>
			<div className='flex items-center justify-between mb-3'>
                                <h3 className='font-bold text-lg'>Education</h3>
                                {editable && (
                                        <button
                                                className='btn btn-ghost btn-circle btn-sm text-green-700'
                                                onClick={() => {
                                                        setEditing(null)
                                                        setOpen(true)
                                                }}>
                                                <Plus />
                                        </button>
                                )}
                        </div>

			<div className='space-y-3'>
				{listQuery.isLoading ? (
					<div className='flex w-52 flex-col gap-4'>
						<div className='skeleton h-4 w-full'></div>
						<div className='skeleton h-4 w-full'></div>
					</div>
				) : listQuery.isError ? (
					<div className='text-sm text-red-600 mt-2'>Failed to load languages</div>
				) : (
					items.map((it: FreelancerEducation, index: string) => (
						<div key={it.id} className='flex items-start justify-between p-3 bg-base-200 rounded-lg'>
							<div>
								<div className='font-semibold'>{it.schoolName}</div>
								{(it.degreeTitle || it.fieldOfStudy) && (
									<div className='text-sm opacity-70'>
										{it.degreeTitle ?? ''}
										{it.degreeTitle && it.fieldOfStudy ? ', ' : ''}
										{it.fieldOfStudy ?? ''}
									</div>
								)}
								<div className='text-xs opacity-60'>
									{it.startYear ?? '—'}
									{it.startYear || it.endYear ? ' - ' : ''}
									{it.endYear ?? 'Present'}
								</div>
							</div>
                                                        {editable && (
                                                                <div className='flex gap-1'>
                                                                        <button
                                                                                className='btn btn-ghost btn-sm btn-circle'
                                                                                onClick={() => {
                                                                                        setEditing(it)
                                                                                        setOpen(true)
                                                                                }}
                                                                                title='Edit'>
                                                                                <Pencil size={16} />
                                                                        </button>
                                                                        <button
                                                                                className='btn btn-ghost btn-sm btn-circle text-error'
                                                                                onClick={() => deleteMutation.mutate(it.id ?? index)}
                                                                                title='Delete'>
                                                                                <Trash2 size={16} />
                                                                        </button>
                                                                </div>
                                                        )}
                                                </div>
                                        ))
                                )}
                                {items.length === 0 && (
                                        <div className='text-sm opacity-70'>
                                                {editable ? 'No education yet. Add your first entry.' : 'No education information available.'}
                                        </div>
                                )}
                        </div>

                        {editable && open && (
                                <EducationManagerModal userId={userId} initial={editing} onClose={() => setOpen(false)} />
                        )}
                </div>
        )
}
