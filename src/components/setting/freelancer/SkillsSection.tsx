import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import type { SkillLite } from '~/types/skill'
import { useFreelancerSkills } from '~/hooks/api/useFreelancerSkills'
import SkillsManagerModal from './SkillsManagerModal'

type Props = { userId?: string; editable?: boolean }

export default function SkillsSection({ userId, editable = true }: Props) {
        const { listQuery, addSkill, removeSkill } = useFreelancerSkills(userId)
        const [mode, setMode] = useState<'add' | 'manage' | null>(null)

        const skills = useMemo(() => listQuery.data ?? [], [listQuery.data])

        useEffect(() => {
                if (!editable) {
                        setMode(null)
                }
        }, [editable])

        async function handleSave(nextSkills: SkillLite[]) {
                if (!userId) return

                const currentIds = new Set(skills.map(skill => skill.id).filter(Boolean))
                const nextIds = new Set(nextSkills.map(skill => skill.id).filter(Boolean))

                const ops: Promise<unknown>[] = []

                for (const id of nextIds) {
                        if (!currentIds.has(id)) {
                                ops.push(addSkill.mutateAsync({ skillId: id }))
                        }
                }

                for (const id of currentIds) {
                        if (!nextIds.has(id)) {
                                ops.push(removeSkill.mutateAsync(id))
                        }
                }

                if (ops.length > 0) {
                        await Promise.all(ops)
                }
        }

        return (
                <section className='rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]'>
                        <div className='flex items-center justify-between'>
                                <h3 className='text-lg font-semibold text-slate-900'>Skills</h3>
                                {editable && (
                                        <div className='flex gap-2'>
                                                <button
                                                        className='btn btn-ghost btn-circle btn-sm text-primary hover:bg-primary/10'
                                                        title='Add skill'
                                                        onClick={() => setMode('add')}>
                                                        <Plus />
                                                </button>
                                                <button
                                                        className='btn btn-ghost btn-circle btn-sm text-primary hover:bg-primary/10'
                                                        title='Manage skills'
                                                        onClick={() => setMode('manage')}>
                                                        <Pencil />
                                                </button>
                                        </div>
                                )}
                        </div>

                        {listQuery.isLoading ? (
                                <div className='mt-3 flex flex-wrap gap-2'>
                                        <div className='skeleton h-6 w-24 rounded-full'></div>
                                        <div className='skeleton h-6 w-28 rounded-full'></div>
                                        <div className='skeleton h-6 w-20 rounded-full'></div>
                                </div>
                        ) : listQuery.isError ? (
                                <div className='mt-2 text-sm text-error'>Failed to load skills.</div>
                        ) : skills.length > 0 ? (
                                <div className='mt-3 flex flex-wrap gap-2'>
                                        {skills.map(skill => (
                                                <span
                                                        key={skill.id}
                                                        className='inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary shadow-sm'
                                                >
                                                        {skill.name}
                                                </span>
                                        ))}
                                </div>
                        ) : (
                                <div className='mt-2 text-sm text-slate-500'>
                                        {editable ? 'Bạn chưa thêm kỹ năng nào.' : 'No skill information available.'}
                                </div>
                        )}

                        {editable && mode && (
                                <SkillsManagerModal
                                        open={mode !== null}
                                        mode={mode}
                                        initial={skills}
                                        onClose={() => setMode(null)}
                                        onSave={handleSave}
                                />
                        )}
                </section>
        )
}
