import type {
        FreelancerCategoryResponse,
        FreelancerPortfolioItem,
        FreelancerProfile,
        FreelancerSpecialtyResponse,
        LanguageProficiency,
        PortfolioVisibility,
        ProfileLanguage
} from '~/types/profile'
import type { FreelancerSkillItem } from '~/types/skill'
import authorizeAxiosInstance from '~/utils/authorizeAxios'

const freelancerProfileBaseUrl = '/profile'

export const getAllProfileLanguage = async (userId?: string): Promise<ProfileLanguage[]> => {
        const res = await authorizeAxiosInstance.get(`${freelancerProfileBaseUrl}/${userId}/language`)
        return res.data ?? []
}

export const getFreelancerCategories = async (userId?: string): Promise<FreelancerCategoryResponse[]> => {
        if (!userId) return []
        const res = await authorizeAxiosInstance.get(`${freelancerProfileBaseUrl}/${userId}/category`)
        return res.data ?? []
}

export const getFreelancerSkills = async (userId?: string): Promise<FreelancerSkillItem[]> => {
        const res = await authorizeAxiosInstance.get<FreelancerSkillItem[]>(`${freelancerProfileBaseUrl}/${userId}/skill`)
        return res.data ?? []
}

export const getFreelancerSpecialties = async (userId?: string): Promise<FreelancerSpecialtyResponse[]> => {
        if (!userId) return []
        const res = await authorizeAxiosInstance.get(`${freelancerProfileBaseUrl}/${userId}/specialty`)
        return res.data ?? []
}

export const addFreelancerSkill = async ({
	userId,
	skillId,
	weight
}: {
	userId?: string
	skillId: string
	weight?: number
}) => {
	const res = await authorizeAxiosInstance.put(`${freelancerProfileBaseUrl}/${userId}/skill`, {
		skillId,
		weight
	})
	return res.data
}

export const deleteFreelancerSkill = async (userId?: string, skillId?: string) => {
	const res = await authorizeAxiosInstance.delete(`${freelancerProfileBaseUrl}/${userId}/skill/${skillId}`)
	return res.data
}

// POST /profiles/:userId/languages { languageCode, proficiency }
export async function addProfileLanguage(params: {
	userId?: string
	languageCode: string
	proficiency: LanguageProficiency
}): Promise<ProfileLanguage> {
	const res = await authorizeAxiosInstance.put(`${freelancerProfileBaseUrl}/${params.userId}/language`, {
		languageCode: params.languageCode,
		proficiency: params.proficiency
	})
	return res.data
}

// DELETE /profiles/:userId/languages/:code
export async function deleteProfileLanguage(userId?: string, code?: string) {
	const res = await authorizeAxiosInstance.delete(`${freelancerProfileBaseUrl}/${userId}/language/${code}`)
	return res.data
}

export async function getEducationsAPI(userId?: string) {
	const { data } = await authorizeAxiosInstance.get(`${freelancerProfileBaseUrl}/${userId}/education`)
	return data
}
export async function createEducationAPI(payload: unknown, userId?: string) {
	const { data } = await authorizeAxiosInstance.post(`${freelancerProfileBaseUrl}/${userId}/education`, payload)
	return data
}
export async function updateEducationAPI(payload: unknown, userId?: string, edutionId?: string) {
	const { data } = await authorizeAxiosInstance.put(
		`${freelancerProfileBaseUrl}/${userId}/education/${edutionId}`,
		payload
	)
	return data
}
export async function deleteEducationAPI(userId?: string, edutionId?: string) {
        const { data } = await authorizeAxiosInstance.delete(`${freelancerProfileBaseUrl}/${userId}/education/${edutionId}`)
        return data
}

export async function getFreelancerPortfolioAPI(userId?: string): Promise<FreelancerPortfolioItem[]> {
        if (!userId) return []
        const { data } = await authorizeAxiosInstance.get<FreelancerPortfolioItem[]>(
                `${freelancerProfileBaseUrl}/${userId}/portfolio`
        )
        return data ?? []
}

export type UpsertFreelancerPortfolioForm = {
        title: string
        role?: string | null
        description?: string | null
        projectUrl?: string | null
        repositoryUrl?: string | null
        visibility?: PortfolioVisibility
        startedAt?: string | null
        completedAt?: string | null
        publishedAt?: string | null
        skillIds?: string[]
        coverAssetId?: string | null
        galleryAssetIds?: string[]
        coverFile?: File | null
        galleryFiles?: File[]
}

function buildPortfolioFormData(payload: UpsertFreelancerPortfolioForm): FormData {
        const formData = new FormData()

        formData.append('title', payload.title)

        if (payload.role !== undefined) formData.append('role', payload.role ?? '')
        if (payload.description !== undefined) formData.append('description', payload.description ?? '')
        if (payload.projectUrl !== undefined) formData.append('projectUrl', payload.projectUrl ?? '')
        if (payload.repositoryUrl !== undefined) formData.append('repositoryUrl', payload.repositoryUrl ?? '')
        if (payload.visibility !== undefined) formData.append('visibility', payload.visibility)
        if (payload.startedAt !== undefined) formData.append('startedAt', payload.startedAt ?? '')
        if (payload.completedAt !== undefined) formData.append('completedAt', payload.completedAt ?? '')
        if (payload.publishedAt !== undefined) formData.append('publishedAt', payload.publishedAt ?? '')

        if (payload.skillIds !== undefined) {
                if (payload.skillIds.length === 0) {
                        formData.append('skillIds', '[]')
                } else {
                        payload.skillIds.forEach(id => {
                                if (id) formData.append('skillIds', id)
                        })
                }
        }

        if (payload.coverAssetId !== undefined) {
                formData.append('coverAssetId', payload.coverAssetId ?? '')
        }

        if (payload.galleryAssetIds !== undefined) {
                if (payload.galleryAssetIds.length === 0) {
                        formData.append('galleryAssetIds', '[]')
                } else {
                        payload.galleryAssetIds.forEach(id => {
                                if (id) formData.append('galleryAssetIds', id)
                        })
                }
        }

        if (payload.coverFile) {
                formData.append('cover', payload.coverFile)
        }

        if (payload.galleryFiles) {
                payload.galleryFiles.forEach(file => {
                        formData.append('gallery', file)
                })
        }

        return formData
}

export async function createFreelancerPortfolioAPI(payload: UpsertFreelancerPortfolioForm, userId?: string) {
        const { data } = await authorizeAxiosInstance.post<FreelancerPortfolioItem>(
                `${freelancerProfileBaseUrl}/${userId}/portfolio`,
                buildPortfolioFormData(payload)
        )
        return data
}

export async function updateFreelancerPortfolioAPI(
        payload: UpsertFreelancerPortfolioForm,
        userId?: string,
        portfolioId?: string
) {
        const { data } = await authorizeAxiosInstance.put<FreelancerPortfolioItem>(
                `${freelancerProfileBaseUrl}/${userId}/portfolio/${portfolioId}`,
                buildPortfolioFormData(payload)
        )
        return data
}

export async function deleteFreelancerPortfolioAPI(userId?: string, portfolioId?: string) {
        const { data } = await authorizeAxiosInstance.delete(
                `${freelancerProfileBaseUrl}/${userId}/portfolio/${portfolioId}`
        )
        return data
}

export async function getFreelancerProfileAPI(userId?: string) {
        const response = await authorizeAxiosInstance.get(`${freelancerProfileBaseUrl}/${userId}/freelancer`)
        return response.data
}

export async function updateFreelancerProfileAPI(payload: Partial<Omit<FreelancerProfile, 'userId'>>, userId?: string) {
	const { data } = await authorizeAxiosInstance.put<FreelancerProfile>(
		`${freelancerProfileBaseUrl}/${userId}/freelancer`,
		payload
	)
	return data
}

export async function setFreelancerCategoryAndSpecialty(payload: { categoryIds: string[]; specialtyIds: string[] }) {
	const response = await authorizeAxiosInstance.post('/onboarding/cat-spe', {
		categoryIds: payload.categoryIds,
		specialtyIds: payload.specialtyIds
	})
	return response.data
}

export async function setFreelancerSkills(payload: { skillIds: string[] }) {
	const response = await authorizeAxiosInstance.post('/onboarding/skill', payload)
	return response.data
}
