import type { Contract } from '~/types/contract'
import { formatCurrency } from '~/utils/format'

export const getParticipantName = (profile?: Contract['client']['profile'] | null, fallback?: string | null) => {
        if (profile) {
                const parts = [profile.firstName, profile.lastName]
                        .map(part => (part ? part.trim() : ''))
                        .filter(Boolean)
                if (parts.length) {
                        return parts.join(' ')
                }
        }
        return fallback?.trim() || undefined
}

export const getParticipantLocation = (profile?: Contract['client']['profile'] | null) => {
        if (!profile) return undefined
        const segments = [profile.city, profile.country]
                .map(segment => (segment ? segment.trim() : ''))
                .filter(Boolean)
        if (!segments.length) return undefined
        return segments.join(', ')
}

export const extractSkillNames = (contract: Contract) => {
        const rawSkills = contract.jobPost?.requiredSkills
        if (!rawSkills || !Array.isArray(rawSkills)) return []
        return rawSkills
                .map(skill => {
                        if (!skill) return undefined
                        if (typeof skill === 'string') return skill
                        if ('name' in skill && typeof skill.name === 'string') return skill.name
                        if ('skill' in skill && skill.skill && typeof (skill as { skill: { name?: string } }).skill?.name === 'string') {
                                return (skill as { skill: { name?: string } }).skill.name
                        }
                        if ('label' in skill && typeof (skill as { label?: string }).label === 'string') return skill.label
                        return undefined
                })
                .filter((name): name is string => Boolean(name?.trim()))
                .map(name => name.trim())
}

export const extractLanguageLabels = (contract: Contract) => {
        const languages = contract.jobPost?.languages
        if (!languages || !Array.isArray(languages)) return []
        return languages
                .map(language => {
                        if (!language) return undefined
                        if (typeof language === 'string') return language
                        if ('languageCode' in language && typeof language.languageCode === 'string') {
                                return language.languageCode.toUpperCase()
                        }
                        if ('label' in language && typeof (language as { label?: string }).label === 'string') {
                                return (language as { label?: string }).label
                        }
                        return undefined
                })
                .filter((item): item is string => Boolean(item?.trim()))
                .map(item => item.trim())
}

export const getBudgetDisplay = (contract: Contract) => {
        const inferredCurrency = (contract as Record<string, unknown>).currency
        const currency =
                contract.totalPaidCurrency ||
                contract.fixedPriceCurrency ||
                contract.hourlyRateCurrency ||
                (typeof inferredCurrency === 'string' ? inferredCurrency : undefined)

        if (typeof contract.fixedPrice === 'number') {
                const value = formatCurrency(contract.fixedPrice, currency)
                if (value) return `Ngân sách cố định ${value}`
        }

        if (typeof contract.hourlyRate === 'number') {
                const rate = formatCurrency(contract.hourlyRate, currency)
                if (rate) {
                        const limit =
                                typeof contract.weeklyLimitHours === 'number'
                                        ? `${contract.weeklyLimitHours}h/tuần`
                                        : undefined
                        return limit ? `${rate} · ${limit}` : `${rate}/giờ`
                }
        }

        if (typeof contract.totalPaidAmount === 'number') {
                const paid = formatCurrency(contract.totalPaidAmount, currency)
                if (paid) return `Đã thanh toán ${paid}`
        }

        return undefined
}

export const getCurrency = (contract: Contract) => {
        const inferredCurrency = (contract as Record<string, unknown>).currency
        return (
                contract.totalPaidCurrency ||
                contract.fixedPriceCurrency ||
                contract.hourlyRateCurrency ||
                (typeof inferredCurrency === 'string' ? inferredCurrency : undefined)
        )
}
