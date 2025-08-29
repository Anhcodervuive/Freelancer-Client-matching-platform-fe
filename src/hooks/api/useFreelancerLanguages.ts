// hooks/useProfileLanguages.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllProfileLanguage, addProfileLanguage, deleteProfileLanguage } from '~/apis/profileLanguage.api'
import type { LanguageProficiency } from '~/types/profile'

export function useProfileLanguages(userId?: string) {
	const qc = useQueryClient()

	const listQ = useQuery({
		queryKey: ['profileLanguages', userId],
		enabled: !!userId,
		queryFn: () => getAllProfileLanguage(userId)
	})

	const addOne = useMutation({
		mutationFn: (p: { languageCode: string; proficiency: LanguageProficiency }) => addProfileLanguage({ userId, ...p }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['profileLanguages', userId] })
	})

	const removeOne = useMutation({
		mutationFn: (code: string) => deleteProfileLanguage(userId, code),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['profileLanguages', userId] })
	})

	return { listQ, addOne, removeOne }
}
