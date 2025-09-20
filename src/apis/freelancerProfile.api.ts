import type {
        FreelancerCategoryResponse,
        FreelancerPortfolioItem,
        FreelancerPortfolioMedia,
        FreelancerProfile,
        FreelancerSpecialtyResponse,
        LanguageProficiency,
        ProfileLanguage,
        UpsertFreelancerPortfolioDto
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

export async function createFreelancerPortfolioAPI(payload: UpsertFreelancerPortfolioDto, userId?: string) {
        const { data } = await authorizeAxiosInstance.post<FreelancerPortfolioItem>(
                `${freelancerProfileBaseUrl}/${userId}/portfolio`,
                payload
        )
        return data
}

export async function updateFreelancerPortfolioAPI(
        payload: UpsertFreelancerPortfolioDto,
        userId?: string,
        portfolioId?: string
) {
        const { data } = await authorizeAxiosInstance.put<FreelancerPortfolioItem>(
                `${freelancerProfileBaseUrl}/${userId}/portfolio/${portfolioId}`,
                payload
        )
        return data
}

export async function deleteFreelancerPortfolioAPI(userId?: string, portfolioId?: string) {
        const { data } = await authorizeAxiosInstance.delete(
                `${freelancerProfileBaseUrl}/${userId}/portfolio/${portfolioId}`
        )
        return data
}

export async function uploadFreelancerPortfolioAssetAPI(params: {
        userId?: string
        file: File
        onProgress?: (_percent: number) => void
}): Promise<FreelancerPortfolioMedia> {
        if (!params.userId) {
                throw new Error('Missing userId')
        }

        const fd = new FormData()
        fd.append('file', params.file)

        const { data } = await authorizeAxiosInstance.post<FreelancerPortfolioMedia>(
                `${freelancerProfileBaseUrl}/${params.userId}/portfolio/upload`,
                fd,
                {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        onUploadProgress(event) {
                                if (!params.onProgress) return
                                if (!event.total) return
                                const percent = Math.round((event.loaded * 100) / event.total)
                                params.onProgress(percent)
                        }
                }
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
