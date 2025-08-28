export type LanguageProficiency = 'BASIC' | 'CONVERSATIONAL' | 'FLUENT' | 'NATIVE'

export type ProfileLanguage = {
	userId: string
	languageCode: string // 'en'
	proficiency: LanguageProficiency
	createdAt?: string
	updatedAt?: string
}
