// hooks/useFreelancerProfile.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFreelancerProfileAPI, updateFreelancerProfileAPI } from '~/apis/freelancerProfile.api'
import type { FreelancerProfile } from '~/types/profile'

export function useFreelancerProfile(userId?: string) {
	const qc = useQueryClient()

	const query = useQuery({
		enabled: !!userId,
		queryKey: ['freelancerProfile', userId],
		queryFn: () => getFreelancerProfileAPI(userId)
	})

	const mutate = useMutation({
		mutationFn: (payload: Partial<FreelancerProfile>) => updateFreelancerProfileAPI(payload, userId),
		// Optimistic update mượt như Upwork
		onMutate: async vars => {
			await qc.cancelQueries({ queryKey: ['freelancerProfile', userId] })
			const prev = qc.getQueryData(['freelancerProfile', userId])
			qc.setQueryData(['freelancerProfile', userId], (old: FreelancerProfile) => ({ ...old, ...vars }))
			return { prev }
		},
		onError: (_e, _vars, ctx) => {
			if (ctx?.prev) qc.setQueryData(['freelancerProfile', userId], ctx.prev)
		},
		onSettled: () => qc.invalidateQueries({ queryKey: ['freelancerProfile', userId] })
	})

	return {
		...query,
		save: mutate.mutateAsync,
		saving: mutate.isPending
	}
}
