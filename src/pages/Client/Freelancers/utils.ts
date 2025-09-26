import type {
        ClientFreelancerDetail,
        ClientFreelancerListItem,
        ClientFreelancerPortfolioItem
} from '~/types/client-freelancer'

export type FreelancerLike = (ClientFreelancerListItem | ClientFreelancerDetail | null | undefined) &
        Record<string, unknown>

const asRecord = (value: unknown): Record<string, unknown> =>
        value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const pickString = (value: unknown): string | undefined => {
        if (typeof value === 'string' && value.trim()) return value.trim()
        if (typeof value === 'number' && Number.isFinite(value)) return String(value)
        return undefined
}

const firstNonEmpty = (...candidates: Array<unknown>): string | undefined => {
        for (const candidate of candidates) {
                if (typeof candidate === 'function') {
                        const value = pickString((candidate as () => unknown)())
                        if (value) return value
                        continue
                }

                const value = pickString(candidate)
                if (value) return value
        }
        return undefined
}

const pickNumber = (value: unknown): number | undefined => {
        if (typeof value === 'number' && Number.isFinite(value)) return value
        if (typeof value === 'string' && value.trim()) {
                const parsed = Number(value)
                if (Number.isFinite(parsed)) return parsed
        }
        return undefined
}

const joinName = (...parts: Array<unknown>) => {
        const filtered = parts
                .map(part => pickString(part))
                .filter((part): part is string => Boolean(part && part.trim()))
        return filtered.length ? filtered.join(' ') : undefined
}

const normalizePercentage = (value?: number): number | undefined => {
        if (value === undefined) return undefined
        if (!Number.isFinite(value)) return undefined
        if (value <= 1) {
                return Math.round(value * 100)
        }
        return Math.round(value)
}

const extractNameList = (value: unknown): string[] => {
        if (!value) return []
        const result = new Set<string>()
        const items = Array.isArray(value) ? value : [value]
        items.forEach(item => {
                if (!item && item !== 0) return
                if (typeof item === 'string') {
                        const normalized = item.trim()
                        if (normalized) result.add(normalized)
                        return
                }

                if (typeof item === 'number' && Number.isFinite(item)) {
                        result.add(String(item))
                        return
                }

                const record = asRecord(item)
                const candidate =
                        firstNonEmpty(
                                record.name,
                                record.label,
                                record.title,
                                () => asRecord(record.skill).name,
                                () => asRecord(record.specialty).name
                        ) ?? pickString(record)

                if (candidate) result.add(candidate)
        })

        return Array.from(result)
}

export type NormalizedFreelancer = {
        id: string
        name: string
        avatar?: string
        title?: string
        bio?: string
        location?: string
        hourlyRateAmount?: number
        hourlyRateCurrency?: string
        experienceLevel?: string
        jobSuccess?: number
        totalEarned?: number
        rating?: number
        completedJobs?: number
        skills: string[]
        specialties: string[]
}

export const normalizeFreelancer = (
        freelancer: ClientFreelancerListItem | ClientFreelancerDetail
): NormalizedFreelancer | null => {
        const id = getFreelancerId(freelancer)
        if (!id) return null

        return {
                id,
                name: getFreelancerName(freelancer),
                avatar: getFreelancerAvatar(freelancer),
                title: getFreelancerTitle(freelancer),
                bio: getFreelancerBio(freelancer),
                location: getFreelancerLocation(freelancer),
                hourlyRateAmount: getFreelancerHourlyRate(freelancer).amount,
                hourlyRateCurrency: getFreelancerHourlyRate(freelancer).currency,
                experienceLevel: getFreelancerExperienceLevel(freelancer),
                jobSuccess: getFreelancerJobSuccess(freelancer),
                totalEarned: getFreelancerTotalEarned(freelancer),
                rating: getFreelancerRating(freelancer),
                completedJobs: getFreelancerCompletedJobs(freelancer),
                skills: getFreelancerSkillNames(freelancer),
                specialties: getFreelancerSpecialtyNames(freelancer)
        }
}

export const getFreelancerInitials = (name?: string) => {
        if (!name) return 'FR'
        const parts = name
                .split(' ')
                .map(part => part.trim())
                .filter(Boolean)
                .slice(0, 2)
        if (!parts.length) return 'FR'
        return parts
                .map(part => part.charAt(0).toUpperCase())
                .join('')
}

export const getFreelancerId = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): string | undefined => {
        if (!freelancer) return undefined
        const base = freelancer as Record<string, unknown>
        const user = asRecord(base.user)
        const candidates = [
                base.id,
                base.userId,
                base.freelancerId,
                user.id,
                (base as Record<string, unknown>)._id,
                (base as Record<string, unknown>).slug
        ]

        for (const candidate of candidates) {
                if (candidate === undefined || candidate === null) continue
                const value = String(candidate).trim()
                if (value) return value
        }
        return undefined
}

export const getFreelancerName = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): string => {
        if (!freelancer) return 'Freelancer'
        const base = freelancer as Record<string, unknown>
        const user = asRecord(base.user)
        const candidate =
                firstNonEmpty(
                        joinName(base.firstName, base.lastName),
                        base.fullName,
                        base.name,
                        joinName(user.firstName, user.lastName),
                        user.fullName,
                        user.name
                ) ?? 'Freelancer'
        return candidate
}

export const getFreelancerAvatar = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): string | undefined => {
        if (!freelancer) return undefined
        const base = freelancer as Record<string, unknown>
        const user = asRecord(base.user)
        return firstNonEmpty(
                base.avatar,
                base.imageUrl,
                base.photoUrl,
                base.picture,
                user.avatar,
                () => asRecord(base.freelancerProfile).avatar
        )
}

export const getFreelancerTitle = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): string | undefined => {
        if (!freelancer) return undefined
        const base = freelancer as Record<string, unknown>
        const profile = asRecord(base.freelancerProfile)
        return firstNonEmpty(base.title, base.headline, profile.title, profile.overview)
}

export const getFreelancerBio = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): string | undefined => {
        if (!freelancer) return undefined
        const base = freelancer as Record<string, unknown>
        const profile = asRecord(base.freelancerProfile)
        return firstNonEmpty(base.bio, base.overview, base.about, base.summary, profile.bio, profile.overview)
}

export const getFreelancerLocation = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): string | undefined => {
        if (!freelancer) return undefined
        const base = freelancer as Record<string, unknown>
        const profile = asRecord(base.freelancerProfile)
        const user = asRecord(base.user)
        const locationRecord = asRecord(base.location)

        const city = firstNonEmpty(base.city, profile.city, user.city, locationRecord.city, locationRecord.cityName)
        const country = firstNonEmpty(
                base.country,
                profile.country,
                user.country,
                locationRecord.country,
                locationRecord.countryName,
                typeof base.location === 'string' ? base.location : undefined
        )

        const parts = [city, country].filter((part): part is string => Boolean(part && part.trim()))
        return parts.length ? parts.join(', ') : parts[0]
}

export const getFreelancerHourlyRate = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): { amount?: number; currency?: string } => {
        if (!freelancer) return {}
        const base = freelancer as Record<string, unknown>
        const profile = asRecord(base.freelancerProfile)

        const amount =
                pickNumber(base.hourlyRate) ??
                pickNumber(base.rate) ??
                pickNumber(profile.hourlyRate) ??
                pickNumber(asRecord(base.stats).hourlyRate)
        const currency = firstNonEmpty(
                base.currency,
                base.hourlyRateCurrency,
                profile.currency,
                asRecord(base.stats).currency
        )

        return { amount, currency }
}

export const getFreelancerExperienceLevel = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): string | undefined => {
        if (!freelancer) return undefined
        const base = freelancer as Record<string, unknown>
        const profile = asRecord(base.freelancerProfile)
        return firstNonEmpty(base.experienceLevel, profile.experienceLevel)
}

export const getFreelancerJobSuccess = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): number | undefined => {
        if (!freelancer) return undefined
        const base = freelancer as Record<string, unknown>
        const stats = asRecord(base.stats)
        const raw =
                pickNumber(base.jobSuccessPercent) ??
                pickNumber(base.jobSuccessScore) ??
                pickNumber(base.jobSuccess) ??
                pickNumber(base.jobSuccessRate) ??
                pickNumber(base.successRate) ??
                pickNumber(stats.jobSuccessPercent) ??
                pickNumber(stats.jobSuccessScore) ??
                pickNumber(stats.jobSuccess) ??
                pickNumber(stats.jobSuccessRate) ??
                pickNumber(stats.successRate)
        return normalizePercentage(raw)
}

export const getFreelancerTotalEarned = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): number | undefined => {
        if (!freelancer) return undefined
        const base = freelancer as Record<string, unknown>
        const stats = asRecord(base.stats)
        return pickNumber(base.totalEarned) ?? pickNumber(stats.totalEarned)
}

export const getFreelancerRating = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): number | undefined => {
        if (!freelancer) return undefined
        const base = freelancer as Record<string, unknown>
        const stats = asRecord(base.stats)
        return pickNumber(base.rating) ?? pickNumber(stats.rating)
}

export const getFreelancerCompletedJobs = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): number | undefined => {
        if (!freelancer) return undefined
        const base = freelancer as Record<string, unknown>
        const stats = asRecord(base.stats)
        return pickNumber(base.completedJobs) ?? pickNumber(stats.completedJobs)
}

export const getFreelancerSkillNames = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): string[] => {
        if (!freelancer) return []
        const base = freelancer as Record<string, unknown>
        return extractNameList(base.skills ?? base.freelancerSkills)
}

export const getFreelancerSpecialtyNames = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): string[] => {
        if (!freelancer) return []
        const base = freelancer as Record<string, unknown>
        return extractNameList(base.specialties ?? base.freelancerSpecialties)
}

export const getFreelancerLanguageList = (
        freelancer?: ClientFreelancerDetail | ClientFreelancerListItem | null
): Array<{ name: string; proficiency?: string }> => {
        if (!freelancer) return []
        const base = freelancer as Record<string, unknown>
        const languages = base.languages
        if (!Array.isArray(languages)) return []
        return languages
                .map(language => {
                        if (!language) return null
                        if (typeof language === 'string') {
                                return { name: language }
                        }
                        const record = asRecord(language)
                        const name =
                                firstNonEmpty(
                                        record.name,
                                        record.language,
                                        record.languageName,
                                        record.code,
                                        record.languageCode
                                )
                        if (!name) return null
                        const proficiency = firstNonEmpty(record.proficiency, record.level)
                        return { name, proficiency }
                })
                .filter((item): item is { name: string; proficiency?: string } => Boolean(item))
}

export type NormalizedPortfolioItem = {
        id: string
        title: string
        description?: string
        coverUrl?: string
        projectUrl?: string
        repositoryUrl?: string
        startedAt?: string
        completedAt?: string
        skills: string[]
}

export const getFreelancerPortfolioItems = (
        freelancer?: ClientFreelancerDetail | ClientFreelancerListItem | null
): NormalizedPortfolioItem[] => {
        if (!freelancer) return []
        const base = freelancer as Record<string, unknown>
        const rawItems =
                (Array.isArray(base.portfolios) && base.portfolios.length
                        ? base.portfolios
                        : Array.isArray(base.portfolioItems) && base.portfolioItems.length
                          ? base.portfolioItems
                          : Array.isArray(base.portfolio) && base.portfolio.length
                            ? base.portfolio
                            : []) as ClientFreelancerPortfolioItem[]

        return rawItems
                .map((item, index) => {
                        if (!item) return null
                        const record = item as Record<string, unknown>
                        const id = firstNonEmpty(item.id, `portfolio-${index}`) ?? `portfolio-${index}`
                        const title = firstNonEmpty(item.title, item.name) ?? 'Portfolio item'
                        const description = firstNonEmpty(
                                item.description,
                                item.summary,
                                item.caption,
                                (record.details as string | undefined)
                        )
                        const coverRecord = asRecord(item.coverAsset)
                        const coverUrl = firstNonEmpty(item.coverUrl, item.coverImage, coverRecord.url, coverRecord.secureUrl)
                        const projectUrl = pickString(item.projectUrl)
                        const repositoryUrl = pickString(item.repositoryUrl)
                        const startedAt = firstNonEmpty(item.startedAt, item.startDate)
                        const completedAt = firstNonEmpty(item.completedAt, item.endDate)

                        return {
                                id,
                                title,
                                description: description ?? undefined,
                                coverUrl: coverUrl ?? undefined,
                                projectUrl: projectUrl ?? undefined,
                                repositoryUrl: repositoryUrl ?? undefined,
                                startedAt: startedAt ?? undefined,
                                completedAt: completedAt ?? undefined,
                                skills: extractNameList(item.skills)
                        } satisfies NormalizedPortfolioItem
                })
                .filter((item): item is NormalizedPortfolioItem => Boolean(item))
}

export const formatCurrency = (amount?: number, currency?: string): string | undefined => {
        if (amount === undefined) return undefined
        try {
                return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency || 'USD',
                        maximumFractionDigits: 0
                }).format(amount)
        } catch {
                return currency ? `${amount} ${currency}` : `${amount}`
        }
}
