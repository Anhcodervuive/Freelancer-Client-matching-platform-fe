import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
        createFreelancerPortfolioAPI,
        deleteFreelancerPortfolioAPI,
        getFreelancerPortfolioAPI,
        updateFreelancerPortfolioAPI,
        type UpsertFreelancerPortfolioForm
} from '~/apis/freelancerProfile.api'
import type { PortfolioVisibility } from '~/types/profile'

type UseFreelancerPortfolioOptions = {
        visibility?: PortfolioVisibility
}

export function useFreelancerPortfolio(userId?: string, options: UseFreelancerPortfolioOptions = {}) {
        const qc = useQueryClient()
        const { visibility } = options

        const queryKey = ['freelancerPortfolio', userId, visibility ?? 'ALL'] as const

        const listQuery = useQuery({
                enabled: !!userId,
                queryKey,
                queryFn: () => getFreelancerPortfolioAPI(userId, { visibility })
        })

        const createMutation = useMutation({
                mutationFn: (payload: UpsertFreelancerPortfolioForm) =>
                        createFreelancerPortfolioAPI(payload, userId),
                onSuccess: () =>
                        qc.invalidateQueries({
                                predicate: query =>
                                        Array.isArray(query.queryKey) &&
                                        query.queryKey[0] === 'freelancerPortfolio' &&
                                        query.queryKey[1] === userId
                        })
        })

        const updateMutation = useMutation({
                mutationFn: (params: { portfolioId: string; payload: UpsertFreelancerPortfolioForm }) =>
                        updateFreelancerPortfolioAPI(params.payload, userId, params.portfolioId),
                onSuccess: () =>
                        qc.invalidateQueries({
                                predicate: query =>
                                        Array.isArray(query.queryKey) &&
                                        query.queryKey[0] === 'freelancerPortfolio' &&
                                        query.queryKey[1] === userId
                        })
        })

        const deleteMutation = useMutation({
                mutationFn: (portfolioId: string) => deleteFreelancerPortfolioAPI(userId, portfolioId),
                onSuccess: () =>
                        qc.invalidateQueries({
                                predicate: query =>
                                        Array.isArray(query.queryKey) &&
                                        query.queryKey[0] === 'freelancerPortfolio' &&
                                        query.queryKey[1] === userId
                        })
        })

        return {
                listQuery,
                createMutation,
                updateMutation,
                deleteMutation
        }
}
