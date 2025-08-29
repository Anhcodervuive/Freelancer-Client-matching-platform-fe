export type LanguageProficiency = 'BASIC' | 'CONVERSATIONAL' | 'FLUENT' | 'NATIVE'

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
