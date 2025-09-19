import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getFreelancerSkills } from '~/apis/freelancerProfile.api'
import type { FreelancerSkillItem, SkillLite } from '~/types/skill'

type Props = { userId?: string; editable?: boolean }

function hasNestedSkill(item: FreelancerSkillItem): item is { skillId?: string; skill: SkillLite } {
        return typeof item === 'object' && item !== null && 'skill' in item && Boolean((item as { skill?: SkillLite }).skill)
}

export default function SkillsSection({ userId, editable = true }: Props) {
        const { data, isLoading, isError } = useQuery({
                queryKey: ['freelancerSkills', userId],
                queryFn: () => getFreelancerSkills(userId!),
                enabled: !!userId
        })

        const displaySkills = useMemo(() => {
                if (!data) return []

                return data
                        .map(item => {
                                if (hasNestedSkill(item)) {
                                        const skill = item.skill
                                        if (!skill) return null
                                        return { id: skill.id ?? item.skillId ?? '', name: skill.name ?? '' }
                                }

                                const lite = item as SkillLite
                                return { id: lite.id, name: lite.name }
                        })
                        .filter((item): item is { id: string; name: string } => Boolean(item && item.id && item.name))
        }, [data])

        return (
                <section className='rounded-xl border border-base-200 bg-white/90 p-4'>
                        <h3 className='font-semibold'>Skills</h3>
                        {isLoading ? (
                                <div className='mt-3 flex flex-wrap gap-2'>
                                        <div className='skeleton h-6 w-24 rounded-full'></div>
                                        <div className='skeleton h-6 w-28 rounded-full'></div>
                                        <div className='skeleton h-6 w-20 rounded-full'></div>
                                </div>
                        ) : isError ? (
                                <div className='mt-2 text-sm text-red-600'>Failed to load skills.</div>
                        ) : displaySkills.length > 0 ? (
                                <div className='mt-3 flex flex-wrap gap-2'>
                                        {displaySkills.map(skill => (
                                                <span
                                                        key={skill.id}
                                                        className='badge badge-outline rounded-full px-3 py-2 text-sm font-medium'>
                                                        {skill.name}
                                                </span>
                                        ))}
                                </div>
                        ) : (
                                <div className='mt-2 text-sm text-base-content/60'>
                                        {editable ? 'Bạn chưa thêm kỹ năng nào.' : 'No skill information available.'}
                                </div>
                        )}
                </section>
        )
}
