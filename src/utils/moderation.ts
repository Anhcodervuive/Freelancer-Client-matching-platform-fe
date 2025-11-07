const moderationCategoryLabelMap: Record<string, string> = {
        insult: 'Insult / abusive language',
        hate: 'Hate speech',
        harassment: 'Harassment',
        sexual: 'Sexual content',
        violence: 'Violence',
        spam: 'Spam'
}

const toTitleCase = (value: string) => value.replace(/(^|[\s_-])(\w)/g, (_, boundary: string, char: string) => `${boundary}${char.toUpperCase()}`)

export const formatModerationCategory = (value?: string | null) => {
        if (!value) return undefined
        const normalized = moderationCategoryLabelMap[value]
        if (normalized) return normalized
        return toTitleCase(value.toLowerCase())
}

export const formatModerationScore = (value?: number | null) => {
        if (value === undefined || value === null || Number.isNaN(value)) return undefined
        return `${Math.round(value * 100)}% confidence`
}
