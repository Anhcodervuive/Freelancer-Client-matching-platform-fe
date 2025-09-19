import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
        addFreelancerSkill,
        deleteFreelancerSkill,
        getFreelancerSkills
} from '~/apis/freelancerProfile.api'
import type { FreelancerSkillItem, SkillLite } from '~/types/skill'

function isSkillLite(item: FreelancerSkillItem): item is SkillLite {
        return typeof (item as SkillLite).id === 'string' && typeof (item as SkillLite).name === 'string'
}

function normalizeFreelancerSkill(item: FreelancerSkillItem): SkillLite | null {
        if (isSkillLite(item)) {
                return item
        }

        const maybeSkill = (item as { skill?: SkillLite }).skill
        if (maybeSkill) {
                const fallbackId = (item as { skillId?: string }).skillId
                const id = maybeSkill.id ?? fallbackId
                if (!id) return null
                return { ...maybeSkill, id }
        }

        return null
}

export function useFreelancerSkills(userId?: string) {
        const qc = useQueryClient()

        const listQuery = useQuery({
                queryKey: ['freelancerSkills', userId],
                enabled: !!userId,
                queryFn: () => getFreelancerSkills(userId),
                select: (items: FreelancerSkillItem[]) =>
                        items
                                .map(normalizeFreelancerSkill)
                                .filter((item): item is SkillLite => Boolean(item && item.id && item.name))
        })

        const addSkill = useMutation({
                mutationFn: (params: { skillId: string; weight?: number }) =>
                        addFreelancerSkill({ userId, ...params }),
                onSuccess: () => qc.invalidateQueries({ queryKey: ['freelancerSkills', userId] })
        })

        const removeSkill = useMutation({
                mutationFn: (skillId: string) => deleteFreelancerSkill(userId, skillId),
                onSuccess: () => qc.invalidateQueries({ queryKey: ['freelancerSkills', userId] })
        })

        return {
                listQuery,
                addSkill,
                removeSkill
        }
}
