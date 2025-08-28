import type { LanguageProficiency } from '~/types/profile'

// constants/languages.ts
export const LANGUAGE_OPTIONS = [
	{ value: 'en', name: 'English' },
	{ value: 'vi', name: 'Vietnamese' },
	{ value: 'zh', name: 'Chinese' },
	{ value: 'ja', name: 'Japanese' },
	{ value: 'fr', name: 'French' }
	// ... thêm cái bạn support
]

export const PROFICIENCY_OPTIONS: { value: LanguageProficiency; name: string }[] = [
	{ value: 'BASIC', name: 'Basic' },
	{ value: 'CONVERSATIONAL', name: 'Conversational' },
	{ value: 'FLUENT', name: 'Fluent' },
	{ value: 'NATIVE', name: 'Native' }
]

// helper để hiển thị label đẹp theo code
export function languageNameFromCode(code: string) {
	return LANGUAGE_OPTIONS.find(o => o.value === code)?.name ?? code.toUpperCase()
}
