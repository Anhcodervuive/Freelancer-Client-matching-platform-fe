// hooks/useFreelancerEducation.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	createEducationAPI,
	deleteEducationAPI,
	getEducationsAPI,
	updateEducationAPI
} from '~/apis/freelancerProfile.api'
import type { FreelancerEducation } from '~/types/profile'

export function useFreelancerEducation(userId?: string) {
	const qc = useQueryClient()

	const listQuery = useQuery({
		enabled: !!userId,
		queryKey: ['freelancerEducations', userId],
		queryFn: () => getEducationsAPI(userId)
	})

	const createMutation = useMutation({
		mutationFn: (payload: FreelancerEducation) => createEducationAPI(payload, userId),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['freelancerEducations', userId] })
	})

	const updateMutation = useMutation({
		mutationFn: (params: { edutionId: string; payload: FreelancerEducation }) =>
			updateEducationAPI(params.payload, userId, params.edutionId),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['freelancerEducations', userId] })
	})

	const deleteMutation = useMutation({
		mutationFn: (edutionId: string) => deleteEducationAPI(userId, edutionId),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['freelancerEducations', userId] })
	})

	return {
		listQuery,
		createMutation,
		updateMutation,
		deleteMutation
	}
}
