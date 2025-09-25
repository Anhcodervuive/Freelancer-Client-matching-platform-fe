import type { LanguageProficiency } from '~/types/profile'

export type NormalizedLocation = { code: string; label: string }
export type NormalizedLanguageRequirement = {
        languageCode: string
        proficiency: LanguageProficiency
}
export type NormalizedSkills = { required: string[]; preferred: string[] }
export type NormalizedScreeningQuestion = { question: string; isRequired: boolean }
export type NormalizedAttachment = { id: string; label: string; url?: string }

const ALLOWED_PROFICIENCIES: readonly LanguageProficiency[] = [
        'BASIC',
        'CONVERSATIONAL',
        'FLUENT',
        'NATIVE'
] as const

const proficiencySet = new Set<string>(ALLOWED_PROFICIENCIES)

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
        typeof value === 'object' && value !== null && !Array.isArray(value)

const ensureString = (value: unknown): string | undefined => {
        if (typeof value === 'string') return value
        return undefined
}

const ensureIdentifier = (value: unknown): string | undefined => {
        if (typeof value === 'string') return value
        if (typeof value === 'number') return String(value)
        return undefined
}

const toArray = (value: unknown): unknown[] => {
        if (Array.isArray(value)) return value
        if (isRecord(value)) return [value]
        if (typeof value === 'string') {
                try {
                        const parsed = JSON.parse(value)
                        return Array.isArray(parsed) ? parsed : []
                } catch {
                        return []
                }
        }
        return []
}

const toStringArray = (value: unknown): string[] =>
        toArray(value)
                .map(item => ensureString(item))
                .filter((item): item is string => Boolean(item?.trim()))
                .map(item => item.trim())

export const normalizePreferredLocations = (value: unknown): NormalizedLocation[] =>
        toArray(value)
                .map((entry, index) => {
                        if (typeof entry === 'string') {
                                const trimmed = entry.trim()
                                if (!trimmed) return null
                                return { code: trimmed, label: trimmed }
                        }

                        if (isRecord(entry)) {
                                const code =
                                        ensureIdentifier(entry.code) ??
                                        ensureIdentifier(entry.value) ??
                                        ensureIdentifier(entry.id)
                                const label =
                                        ensureString(entry.label) ??
                                        ensureString(entry.name) ??
                                        (code ? String(code) : undefined)

                                if (code || label) {
                                        const normalizedCode = String(code ?? label)
                                        const normalizedLabel = label ?? normalizedCode
                                        return { code: normalizedCode, label: normalizedLabel }
                                }
                        }

                        if (entry != null) {
                                const asString = String(entry)
                                if (asString) {
                                        return { code: `${index}`, label: asString }
                                }
                        }

                        return null
                })
                .filter((item): item is NormalizedLocation => item !== null)

export const normalizeLanguages = (
        value: unknown
): NormalizedLanguageRequirement[] =>
        toArray(value)
                .map(item => {
                        if (typeof item === 'string') {
                                const trimmed = item.trim()
                                if (!trimmed) return null
                                return { languageCode: trimmed.toLowerCase(), proficiency: 'CONVERSATIONAL' as const }
                        }

                        if (isRecord(item)) {
                                const code =
                                        ensureString(item.languageCode) ??
                                        ensureString(item.code) ??
                                        ensureString(item.id)
                                if (!code) return null

                                const proficiencyRaw = ensureString(item.proficiency) ?? ensureString(item.level)
                                const normalizedProficiency = proficiencyRaw
                                        ? proficiencyRaw.toUpperCase()
                                        : 'CONVERSATIONAL'
                                const proficiency = proficiencySet.has(normalizedProficiency)
                                        ? (normalizedProficiency as LanguageProficiency)
                                        : ('CONVERSATIONAL' as const)

                                return { languageCode: code.toLowerCase(), proficiency }
                        }

                        return null
                })
                .filter((item): item is NormalizedLanguageRequirement => item !== null)

export const normalizeSkills = (value: unknown): NormalizedSkills => {
        if (!value) {
                return { required: [], preferred: [] }
        }

        if (isRecord(value)) {
                const required = toStringArray(value.required)
                const preferred = toStringArray(value.preferred)
                return { required, preferred }
        }

        const asArray = toArray(value)
        if (asArray.length > 0) {
                const required = asArray
                        .map(entry => (isRecord(entry) ? toStringArray(entry.required) : []))
                        .flat()
                return { required, preferred: [] }
        }

        return { required: [], preferred: [] }
}

export const normalizeScreeningQuestions = (
        value: unknown
): NormalizedScreeningQuestion[] =>
        toArray(value)
                .map(item => {
                        if (isRecord(item)) {
                                const question = ensureString(item.question)?.trim()
                                if (!question) return null
                                const isRequired = item.isRequired === undefined ? true : Boolean(item.isRequired)
                                return { question, isRequired }
                        }

                        if (typeof item === 'string') {
                                const trimmed = item.trim()
                                if (!trimmed) return null
                                return { question: trimmed, isRequired: true }
                        }

                        return null
                })
                .filter((item): item is NormalizedScreeningQuestion => item !== null)

const normalizeAttachmentRecord = (
        attachment: Record<string, unknown>,
        index: number
): NormalizedAttachment => {
        const identifier =
                ensureIdentifier(attachment.id) ??
                ensureIdentifier(attachment.assetId) ??
                ensureIdentifier(attachment.fileId) ??
                ensureIdentifier(attachment.attachmentId) ??
                ensureIdentifier(attachment.key)

        const label =
                ensureString(attachment.name) ??
                ensureString(attachment.fileName) ??
                ensureString(attachment.label) ??
                (identifier ? String(identifier) : undefined) ??
                `Attachment ${index + 1}`

        const url =
                ensureString(attachment.url) ??
                ensureString(attachment.fileUrl) ??
                ensureString(attachment.downloadUrl)

        return { id: identifier ?? label, label, url: url ?? undefined }
}

export const normalizeAttachments = (value: unknown): NormalizedAttachment[] =>
        toArray(value)
                .map((item, index) => {
                        if (typeof item === 'string') {
                                const trimmed = item.trim()
                                if (!trimmed) return null
                                return { id: trimmed, label: trimmed }
                        }

                        if (isRecord(item)) {
                                return normalizeAttachmentRecord(item, index)
                        }

                        return null
                })
                .filter((item): item is NormalizedAttachment => item !== null)

export const extractAttachmentIdentifiers = (value: unknown): string[] =>
        normalizeAttachments(value)
                .map(attachment => attachment.id)
                .filter((id): id is string => Boolean(id))

export const normalizeCustomTerms = (
        value: Record<string, unknown> | null | undefined
): Partial<Record<string, string>> => {
        if (!value) return {}
        const entries = Object.entries(value)
                .map(([key, val]) => {
                        if (val === undefined || val === null) return null
                        if (typeof val === 'string') {
                                const trimmed = val.trim()
                                if (!trimmed) return null
                                return [key, trimmed] as const
                        }

                        try {
                                return [key, JSON.stringify(val, null, 2)] as const
                        } catch {
                                return [key, String(val)] as const
                        }
                })
                .filter((entry): entry is readonly [string, string] => entry !== null)

        return Object.fromEntries(entries)
}
