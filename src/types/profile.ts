import type { CategoryLite, SpecialtyLite } from './specialty'

export type LanguageProficiency = 'BASIC' | 'CONVERSATIONAL' | 'FLUENT' | 'NATIVE'

export type SerializedProfile = {
        id: string
        firstName?: string | null
        lastName?: string | null
        fullName?: string | null
        avatar?: string | null
        title?: string | null
        companyName?: string | null
        country?: string | null
        city?: string | null
        [key: string]: unknown
}

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

export type PortfolioVisibility = 'PUBLIC' | 'PRIVATE' | (string & {})

export type FreelancerPortfolioSkill = {
        id: string
        name: string
        slug?: string | null
}

export type FreelancerPortfolioAssetMeta = {
        id: string
        kind: 'IMAGE' | 'VIDEO' | 'FILE' | (string & {})
        url?: string | null
        publicId?: string | null
        mimeType?: string | null
        width?: number | null
        height?: number | null
        bytes?: number | null
}

export type FreelancerPortfolioMedia = {
        id: string
        assetId: string
        role: 'COVER' | 'GALLERY' | (string & {})
        position: number
        label?: string | null
        caption?: string | null
        isPrimary: boolean
        createdAt: string
        asset: FreelancerPortfolioAssetMeta
}

export type FreelancerPortfolioItem = {
        id: string
        freelancerId: string
        title: string
        role?: string | null
        description?: string | null
        projectUrl?: string | null
        repositoryUrl?: string | null
        visibility: PortfolioVisibility
        startedAt?: string | null
        completedAt?: string | null
        publishedAt?: string | null
        createdAt: string
        updatedAt: string
        skills: FreelancerPortfolioSkill[]
        coverAsset?: FreelancerPortfolioMedia | null
        galleryAssets: FreelancerPortfolioMedia[]
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
