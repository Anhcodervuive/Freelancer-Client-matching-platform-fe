import type { CategoryLite, SpecialtyLite } from './specialty'

export type LanguageProficiency = 'BASIC' | 'CONVERSATIONAL' | 'FLUENT' | 'NATIVE'

export type Profile = {
	id: string
	firstName: string
	lastName: string
	email: string
	phoneNumber: string
	country: string
	city: string
	district: string
	address: string
	// add fields as needed
}

export type UpdateProfileDto = Partial<Profile>

export type ProfileLanguage = {
	userId: string
	languageCode: string // 'en'
	proficiency: LanguageProficiency
	createdAt?: string
	updatedAt?: string
}

export type FreelancerEducation = {
	id?: string
	freelancerId?: string
	schoolName: string
	degreeTitle?: string | null
	fieldOfStudy?: string | null
	startYear?: number | null
	endYear?: number | null
}

export type FreelancerProfile = {
        userId: string
        title?: string | null
        bio?: string | null
        links?: string[] | null
}

export type FreelancerPortfolioSkill = {
        id?: string
        name: string
}

export type FreelancerPortfolioMedia = {
        id?: string
        url: string
        type?: string | null
        name?: string | null
        thumbnailUrl?: string | null
        isCover?: boolean | null
        order?: number | null
}

export type FreelancerPortfolioItem = {
        id?: string
        freelancerId?: string
        title: string
        overview?: string | null
        role?: string | null
        projectUrl?: string | null
        skills?: (FreelancerPortfolioSkill | string)[] | null
        attachments?: FreelancerPortfolioMedia[] | null
        createdAt?: string
        updatedAt?: string
}

export type UpsertFreelancerPortfolioDto = {
        title: string
        overview?: string | null
        role?: string | null
        projectUrl?: string | null
        skills?: string[]
        attachments?: Array<{
                id?: string
                url: string
                type?: string | null
                name?: string | null
                thumbnailUrl?: string | null
                isCover?: boolean | null
                order?: number | null
        }>
}

export type FreelancerCategoryResponse = {
        id?: string
        categoryId?: string
        name?: string
        category?: CategoryLite | null
        specialties?: Array<{
                id?: string
                specialtyId?: string
                name?: string
                specialty?: SpecialtyLite | null
        }> | null
}

export type FreelancerSpecialtyResponse = {
        id?: string
        specialtyId?: string
        name?: string
        categoryId?: string
        category?: CategoryLite | null
        specialty?: (SpecialtyLite & { category?: CategoryLite | null }) | null
}
