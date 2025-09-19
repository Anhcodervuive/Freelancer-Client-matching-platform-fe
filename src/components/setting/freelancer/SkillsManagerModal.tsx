import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Search, X } from 'lucide-react'
import { searchSkills } from '~/apis/admin/skkill.api'
import { useDebounce } from '~/hooks/comons/useDebounce'
import type { SkillLite } from '~/types/skill'

type Props = {
        open: boolean
        mode: 'add' | 'manage'
        initial: SkillLite[]
        onClose: () => void
        onSave: (_next: SkillLite[]) => Promise<void>
}

export default function SkillsManagerModal({ open, mode, initial, onClose, onSave }: Props) {
        const [query, setQuery] = useState('')
        const [selected, setSelected] = useState<SkillLite[]>([])
        const [saving, setSaving] = useState(false)

        const debouncedQuery = useDebounce(query, 400)

        const { data, isFetching } = useQuery({
                queryKey: ['skills-search', debouncedQuery],
                queryFn: () => searchSkills({ search: debouncedQuery, limit: 20, onlyActive: true }),
                enabled: open
        })

        const results = data?.data ?? []

        useEffect(() => {
                if (open) {
                        setSelected(initial)
                        setQuery('')
                        setSaving(false)
                }
        }, [open, initial])

        const selectedIds = useMemo(() => new Set(selected.map(skill => skill.id)), [selected])

        const title = mode === 'manage' ? 'Manage skills' : 'Add skills'

        const addSkill = (skill: SkillLite) => {
                setSelected(prev => {
                        if (prev.some(item => item.id === skill.id)) {
                                return prev
                        }
                        return [...prev, skill]
                })
        }

        const removeSkill = (skillId: string) => {
                setSelected(prev => prev.filter(item => item.id !== skillId))
        }

        const handleSave = async () => {
                try {
                        setSaving(true)
                        await onSave(selected)
                        onClose()
                } catch (error) {
                        console.error(error)
                } finally {
                        setSaving(false)
                }
        }

        if (!open) return null

        return (
                <div className='fixed inset-0 z-[60]'>
                        <div className='absolute inset-0 bg-black/40' onClick={() => (!saving ? onClose() : null)} />

                        <div className='absolute inset-0 flex items-center justify-center p-6 md:p-10'>
                                <div className='w-full max-w-3xl rounded-xl bg-white shadow-xl'>
                                        <div className='flex items-center justify-between px-8 pt-5'>
                                                <h3 className='text-lg font-semibold'>{title}</h3>
                                                <button className='btn btn-ghost btn-sm' onClick={onClose} disabled={saving}>
                                                        ✕
                                                </button>
                                        </div>

                                        <div className='px-8 pb-4 pt-2 space-y-6'>
                                                <div>
                                                        <div className='text-sm font-medium text-base-content'>Selected skills</div>
                                                        <div className='mt-3 flex flex-wrap gap-2'>
                                                                {selected.map(skill => (
                                                                        <div
                                                                                key={skill.id}
                                                                                className='flex items-center gap-2 rounded-full border border-base-200 bg-base-100 px-3 py-1'>
                                                                                <span className='text-sm font-medium'>{skill.name}</span>
                                                                                <button
                                                                                        type='button'
                                                                                        className='text-base-content/60 hover:text-error'
                                                                                        onClick={() => removeSkill(skill.id)}
                                                                                        disabled={saving}
                                                                                        title={`Remove ${skill.name}`}>
                                                                                        <X size={14} />
                                                                                </button>
                                                                        </div>
                                                                ))}
                                                        </div>
                                                        {selected.length === 0 && (
                                                                <div className='mt-2 text-sm text-base-content/60'>No skills selected yet.</div>
                                                        )}
                                                </div>

                                                <div className='space-y-3'>
                                                        <div className='relative'>
                                                                <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60' />
                                                                <input
                                                                        className='input input-bordered w-full pl-9'
                                                                        placeholder='Search skills...'
                                                                        value={query}
                                                                        onChange={e => setQuery(e.target.value)}
                                                                />
                                                        </div>

                                                        <div className='max-h-72 overflow-y-auto rounded-xl border border-base-200'>
                                                                {isFetching && (
                                                                        <div className='p-4 text-sm text-base-content/60'>Loading skills...</div>
                                                                )}
                                                                {!isFetching && results.length === 0 && (
                                                                        <div className='p-4 text-sm text-base-content/60'>No skills found.</div>
                                                                )}
                                                                <div className='divide-y divide-base-200'>
                                                                        {results.map(skill => {
                                                                                const isSelected = selectedIds.has(skill.id)
                                                                                return (
                                                                                        <div
                                                                                                key={skill.id}
                                                                                                className='flex items-center justify-between gap-4 p-4 hover:bg-base-100'>
                                                                                                <div>
                                                                                                        <div className='font-medium'>{skill.name}</div>
                                                                                                        <div className='text-xs text-base-content/60'>{skill.slug}</div>
                                                                                                </div>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className={`btn btn-sm ${
                                                                                                                isSelected
                                                                                                                        ? 'btn-ghost text-green-700'
                                                                                                                        : 'btn-outline border-green-200 text-green-700'
                                                                                                        }`}
                                                                                                        onClick={() => addSkill(skill)}
                                                                                                        disabled={isSelected || saving}>
                                                                                                        {isSelected ? <Check size={16} /> : 'Add'}
                                                                                                </button>
                                                                                        </div>
                                                                                )
                                                                        })}
                                                                </div>
                                                        </div>
                                                </div>
                                        </div>

                                        <div className='flex items-center justify-end gap-3 border-t border-base-200 px-6 py-4'>
                                                <button className='btn btn-ghost' onClick={onClose} disabled={saving}>
                                                        Cancel
                                                </button>
                                                <button className='btn btn-primary' onClick={handleSave} disabled={saving}>
                                                        {saving ? 'Saving...' : 'Save'}
                                                </button>
                                        </div>
                                </div>
                        </div>
                </div>
        )
}
