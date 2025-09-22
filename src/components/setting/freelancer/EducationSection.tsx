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
                <div className='rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]'>
                        <div className='mb-4 flex items-center justify-between'>
                                <h3 className='text-lg font-semibold text-slate-900'>Education</h3>
                                {editable && (
                                        <button
                                                className='btn btn-ghost btn-circle btn-sm text-primary hover:bg-primary/10'
                                                onClick={() => {
                                                        setEditing(null)
                                                        setOpen(true)
                                                }}
                                                title='Add education'
                                        >
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
                                        <div className='mt-2 text-sm text-error'>Failed to load education history.</div>
                                ) : (
                                        items.map((it: FreelancerEducation, index: string) => (
                                                <div key={it.id} className='flex items-start justify-between rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-inner shadow-white/20'>
                                                        <div>
                                                                <div className='font-semibold text-slate-900'>{it.schoolName}</div>
                                                                {(it.degreeTitle || it.fieldOfStudy) && (
                                                                        <div className='text-sm text-slate-500'>
                                                                                {it.degreeTitle ?? ''}
                                                                                {it.degreeTitle && it.fieldOfStudy ? ', ' : ''}
                                                                                {it.fieldOfStudy ?? ''}
                                                                        </div>
                                                                )}
                                                                <div className='text-xs text-slate-400'>
                                                                        {it.startYear ?? '—'}
                                                                        {it.startYear || it.endYear ? ' - ' : ''}
                                                                        {it.endYear ?? 'Present'}
                                                                </div>
                                                        </div>
                                                        {editable && (
                                                                <div className='flex gap-1'>
                                                                        <button
                                                                                className='btn btn-ghost btn-sm btn-circle text-slate-500 hover:bg-primary/10 hover:text-primary'
                                                                                onClick={() => {
                                                                                        setEditing(it)
                                                                                        setOpen(true)
                                                                                }}
                                                                                title='Edit education'
                                                                        >
                                                                                <Pencil size={16} />
                                                                        </button>
                                                                        <button
                                                                                className='btn btn-ghost btn-sm btn-circle text-error hover:bg-error/10'
                                                                                onClick={() => deleteMutation.mutate(it.id ?? index)}
                                                                                title='Delete education'
                                                                        >
                                                                                <Trash2 size={16} />
                                                                        </button>
                                                                </div>
                                                        )}
                                                </div>
                                        ))
                                )}
                                {items.length === 0 && (
                                        <div className='text-sm text-slate-500'>
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
