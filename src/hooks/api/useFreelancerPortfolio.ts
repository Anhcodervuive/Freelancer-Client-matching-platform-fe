import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
        createFreelancerPortfolioAPI,
        deleteFreelancerPortfolioAPI,
        getFreelancerPortfolioAPI,
        updateFreelancerPortfolioAPI
} from '~/apis/freelancerProfile.api'
import type { UpsertFreelancerPortfolioDto } from '~/types/profile'

export function useFreelancerPortfolio(userId?: string) {
        const qc = useQueryClient()

        const listQuery = useQuery({
                enabled: !!userId,
                queryKey: ['freelancerPortfolio', userId],
                queryFn: () => getFreelancerPortfolioAPI(userId)
        })

        const createMutation = useMutation({
                mutationFn: (payload: UpsertFreelancerPortfolioDto) =>
                        createFreelancerPortfolioAPI(payload, userId),
                onSuccess: () => qc.invalidateQueries({ queryKey: ['freelancerPortfolio', userId] })
        })

        const updateMutation = useMutation({
                mutationFn: (params: { portfolioId: string; payload: UpsertFreelancerPortfolioDto }) =>
                        updateFreelancerPortfolioAPI(params.payload, userId, params.portfolioId),
                onSuccess: () => qc.invalidateQueries({ queryKey: ['freelancerPortfolio', userId] })
        })

        const deleteMutation = useMutation({
                mutationFn: (portfolioId: string) => deleteFreelancerPortfolioAPI(userId, portfolioId),
                onSuccess: () => qc.invalidateQueries({ queryKey: ['freelancerPortfolio', userId] })
        })

        return {
                listQuery,
                createMutation,
                updateMutation,
                deleteMutation
        }
}
