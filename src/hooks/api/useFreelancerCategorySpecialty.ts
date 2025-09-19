import { useQuery } from '@tanstack/react-query'
import {
        getFreelancerCategories,
        getFreelancerSpecialties
} from '~/apis/freelancerProfile.api'
import type { Category } from '~/types/Category'
import type { SpecialtyLite } from '~/types/specialty'
import type { FreelancerCategoryResponse, FreelancerSpecialtyResponse } from '~/types/profile'

export type ProfileCategory = Pick<Category, 'id' | 'name'>
export type ProfileSpecialty = SpecialtyLite & { categoryName?: string }

function normalizeCategory(item: FreelancerCategoryResponse | null | undefined): ProfileCategory | null {
        if (!item) return null
        const id = item.categoryId ?? item.id ?? item.category?.id
        if (!id) return null
        const rawName = item.category?.name ?? item.name
        const name = typeof rawName === 'string' && rawName.trim().length > 0 ? rawName : 'Unnamed category'
        return { id, name }
}

function normalizeSpecialty(item: FreelancerSpecialtyResponse | null | undefined): ProfileSpecialty | null {
        if (!item) return null
        const fromSpecialty = item.specialty ?? undefined
        const id = item.specialtyId ?? item.id ?? fromSpecialty?.id
        const categoryId =
                item.categoryId ?? fromSpecialty?.categoryId ?? fromSpecialty?.category?.id ?? item.category?.id
        if (!id || !categoryId) return null
        const rawName = fromSpecialty?.name ?? item.name
        const name = typeof rawName === 'string' && rawName.trim().length > 0 ? rawName : 'Unnamed specialty'
        const categoryName = item.category?.name ?? fromSpecialty?.category?.name
        return { id, name, categoryId, categoryName }
}

export function useFreelancerCategorySpecialty(userId?: string) {
        const categoriesQuery = useQuery({
                queryKey: ['freelancerCategories', userId],
                enabled: !!userId,
                queryFn: () => getFreelancerCategories(userId),
                select: (rows: FreelancerCategoryResponse[]) =>
                        Array.isArray(rows)
                                ? rows
                                          .map(normalizeCategory)
                                          .filter((item): item is ProfileCategory => Boolean(item))
                                : []
        })

        const specialtiesQuery = useQuery({
                queryKey: ['freelancerSpecialties', userId],
                enabled: !!userId,
                queryFn: () => getFreelancerSpecialties(userId),
                select: (rows: FreelancerSpecialtyResponse[]) =>
                        Array.isArray(rows)
                                ? rows
                                          .map(normalizeSpecialty)
                                          .filter((item): item is ProfileSpecialty => Boolean(item))
                                : []
        })

        return {
                categories: categoriesQuery.data ?? [],
                specialties: specialtiesQuery.data ?? [],
                categoriesQuery,
                specialtiesQuery
        }
}
