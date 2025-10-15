import type { LanguageProficiency } from '~/types/profile'
import { extractFileExtension } from './format'

export type NormalizedLocation = { code: string; label: string }
export type NormalizedLanguageRequirement = {
        languageCode: string
        proficiency: LanguageProficiency
}
export type NormalizedSkills = { required: string[]; preferred: string[] }
export type NormalizedScreeningQuestion = { question: string; isRequired: boolean }
export type NormalizedAttachment = {
        id: string
        label: string
        fileName?: string
        mimeType?: string
        size?: number
        createdAt?: string
        url?: string
        extension?: string
}

const ALLOWED_PROFICIENCIES: readonly LanguageProficiency[] = [
        'BASIC',
        'CONVERSATIONAL',
        'FLUENT',
        'NATIVE'
] as const

const proficiencySet = new Set<string>(ALLOWED_PROFICIENCIES)

type UnknownRecord = Record<string, unknown>
type SkillExtractor = (_value: unknown) => string | undefined

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

const ensureNumber = (value: unknown): number | undefined => {
        if (typeof value === 'number' && Number.isFinite(value)) return value
        if (typeof value === 'string') {
                const trimmed = value.trim()
                if (!trimmed) return undefined
                const parsed = Number(trimmed)
                if (Number.isFinite(parsed)) return parsed
        }
        return undefined
}

const pickTrimmedString = (...values: unknown[]): string | undefined => {
        for (const value of values) {
                if (typeof value === 'string') {
                        const trimmed = value.trim()
                        if (trimmed) return trimmed
                }
        }
        return undefined
}

const normalizeSkillEntries = (
        value: unknown,
        extractor: SkillExtractor
): string[] =>
        toArray(value)
                .map(entry => extractor(entry))
                .filter((result): result is string => Boolean(result))

const pickSkillLabel = (entry: unknown): string | undefined => {
        if (typeof entry === 'string') {
                const trimmed = entry.trim()
                return trimmed || undefined
        }

        if (isRecord(entry)) {
                const label = pickTrimmedString(
                        entry.name,
                        entry.label,
                        entry.slug,
                        entry.title,
                        entry.value
                )
                if (label) return label

                const identifier = pickTrimmedString(
                        ensureIdentifier(entry.id),
                        ensureIdentifier(entry.skillId),
                        ensureIdentifier(entry.code)
                )
                if (identifier) return identifier
        }

        if (entry != null) {
                const asString = String(entry).trim()
                if (asString) return asString
        }

        return undefined
}

const pickSkillId = (entry: unknown): string | undefined => {
        if (typeof entry === 'string') {
                const trimmed = entry.trim()
                return trimmed || undefined
        }

        if (isRecord(entry)) {
                const identifier =
                        ensureIdentifier(entry.id) ??
                        ensureIdentifier(entry.skillId) ??
                        ensureIdentifier(entry.code) ??
                        ensureIdentifier(entry.slug) ??
                        ensureIdentifier(entry.name)
                if (identifier) return identifier
        }

        if (entry != null) {
                const asString = String(entry).trim()
                if (asString) return asString
        }

        return undefined
}

const decodeSegment = (value: string): string => {
        try {
                return decodeURIComponent(value)
        } catch {
                return value
        }
}

const fileNameFromUrl = (value?: string): string | undefined => {
        if (!value) return undefined
        const trimmed = value.trim()
        if (!trimmed) return undefined
        const withoutQuery = trimmed.split(/[?#]/)[0] ?? trimmed
        const segments = withoutQuery.split('/').filter(Boolean)
        const last = segments[segments.length - 1]
        if (!last) return undefined
        return decodeSegment(last)
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
                const required = normalizeSkillEntries(value.required, pickSkillLabel)
                const preferred = normalizeSkillEntries(value.preferred, pickSkillLabel)
                return { required, preferred }
        }

        const required = normalizeSkillEntries(value, pickSkillLabel)
        return { required, preferred: [] }
}

export const normalizeSkillIds = (value: unknown): NormalizedSkills => {
        if (!value) {
                return { required: [], preferred: [] }
        }

        if (isRecord(value)) {
                const required = normalizeSkillEntries(value.required, pickSkillId)
                const preferred = normalizeSkillEntries(value.preferred, pickSkillId)
                return { required, preferred }
        }

        const required = normalizeSkillEntries(value, pickSkillId)
        return { required, preferred: [] }
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
        const asset = isRecord(attachment.asset) ? attachment.asset : undefined
        const metadata = isRecord(attachment.metadata) ? attachment.metadata : undefined

        const identifier =
                ensureIdentifier(attachment.id) ??
                ensureIdentifier(attachment.assetId) ??
                ensureIdentifier(attachment.fileId) ??
                ensureIdentifier(attachment.attachmentId) ??
                ensureIdentifier(attachment.key) ??
                (asset
                        ? ensureIdentifier(asset.id) ??
                          ensureIdentifier(asset.assetId) ??
                          ensureIdentifier(asset.fileId) ??
                          ensureIdentifier(asset.key)
                        : undefined)

        const sanitizedIdentifier = identifier?.trim()

        const url =
                pickTrimmedString(
                        attachment.url,
                        attachment.fileUrl,
                        attachment.downloadUrl,
                        (attachment as UnknownRecord)['viewUrl'],
                        (attachment as UnknownRecord)['previewUrl'],
                        (attachment as UnknownRecord)['signedUrl'],
                        (attachment as UnknownRecord)['link'],
                        (attachment as UnknownRecord)['href'],
                        asset?.url,
                        asset?.fileUrl,
                        asset?.downloadUrl,
                        (asset as UnknownRecord | undefined)?.['viewUrl'],
                        (asset as UnknownRecord | undefined)?.['previewUrl'],
                        (asset as UnknownRecord | undefined)?.['signedUrl'],
                        (asset as UnknownRecord | undefined)?.['link'],
                        (asset as UnknownRecord | undefined)?.['href']
                ) ?? undefined

        const assetName = asset
                ? pickTrimmedString(
                          asset.name,
                          asset.fileName,
                          asset.filename,
                          asset.originalName,
                          asset.originalFilename,
                          asset.label,
                          asset.title
                  )
                : undefined

        const explicitName = pickTrimmedString(
                attachment.name,
                attachment.fileName,
                attachment.filename,
                attachment.originalName,
                attachment.originalFilename,
                attachment.title,
                assetName
        )

        const rawLabel = pickTrimmedString(attachment.label)
        const labelCandidate =
                rawLabel && sanitizedIdentifier && rawLabel.toLowerCase() === sanitizedIdentifier.toLowerCase()
                        ? undefined
                        : rawLabel

        const urlFileName = fileNameFromUrl(url)

        const label =
                explicitName ??
                urlFileName ??
                labelCandidate ??
                sanitizedIdentifier ??
                `Attachment ${index + 1}`

        const fileName = urlFileName ?? explicitName ?? labelCandidate ?? sanitizedIdentifier

        const extension = extractFileExtension(fileName ?? label)

        const mimeType =
                pickTrimmedString(
                        attachment.mimeType,
                        attachment.fileType,
                        attachment.contentType,
                        metadata?.mimeType,
                        metadata?.contentType,
                        asset?.mimeType,
                        asset?.contentType,
                        asset?.fileType
                ) ?? undefined

        const size =
                ensureNumber(attachment.size) ??
                ensureNumber(attachment.fileSize) ??
                ensureNumber(attachment.bytes) ??
                (metadata ? ensureNumber(metadata.size) ?? ensureNumber(metadata.bytes) : undefined) ??
                (asset ? ensureNumber(asset.size) ?? ensureNumber(asset.bytes) : undefined)

        const createdAt =
                pickTrimmedString(
                        attachment.createdAt,
                        (attachment as UnknownRecord)['created_at'],
                        attachment.uploadedAt,
                        attachment.updatedAt,
                        metadata?.createdAt,
                        (metadata as UnknownRecord | undefined)?.['created_at'],
                        metadata?.uploadedAt,
                        asset?.createdAt,
                        (asset as UnknownRecord | undefined)?.['created_at']
                ) ?? undefined

        return {
                id: sanitizedIdentifier ?? label,
                label,
                fileName: fileName ?? undefined,
                mimeType,
                size,
                createdAt,
                url,
                extension
        }
}

export const normalizeAttachments = (value: unknown): NormalizedAttachment[] =>
        toArray(value)
                .map((item, index) => {
                        if (typeof item === 'string') {
                                const trimmed = item.trim()
                                if (!trimmed) return null
                                return {
                                        id: trimmed,
                                        label: trimmed,
                                        fileName: trimmed,
                                        extension: extractFileExtension(trimmed)
                                }
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
