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

export const toTitleCase = (value: string): string => {
        return value
                .replace(/[_-]+/g, ' ')
                .split(' ')
                .map(part => part.trim())
                .filter(Boolean)
                .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                .join(' ')
}

const languageDisplay = (() => {
        try {
                if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
                        return new Intl.DisplayNames(['en'], { type: 'language' })
                }
        } catch {
                return undefined
        }
        return undefined
})()

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

const pickBoolean = (value: unknown): boolean | undefined => {
        if (typeof value === 'boolean') return value
        if (typeof value === 'number') {
                if (value === 1) return true
                if (value === 0) return false
        }
        if (typeof value === 'string') {
                const normalized = value.trim().toLowerCase()
                if (!normalized) return undefined
                if (['true', '1', 'yes', 'y'].includes(normalized)) return true
                if (['false', '0', 'no', 'n'].includes(normalized)) return false
        }
        return undefined
}

const pickDateString = (value: unknown): string | undefined => {
        if (!value && value !== 0) return undefined

        if (value instanceof Date && !Number.isNaN(value.getTime())) {
                return value.toISOString()
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
                const milliseconds = value > 1e12 ? value : value * 1000
                const date = new Date(milliseconds)
                return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
        }

        if (typeof value === 'string') {
                const trimmed = value.trim()
                if (!trimmed) return undefined
                const numeric = Number(trimmed)
                if (Number.isFinite(numeric) && trimmed.replace(/[\d.]/g, '').length === 0) {
                        return pickDateString(numeric)
                }

                const date = new Date(trimmed)
                return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
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
        totalHoursWorked?: number
        availability?: string
        availableHoursPerWeek?: number
        memberSince?: string
        isSaved: boolean
        skills: string[]
        specialties: string[]
        categories: string[]
        languages: Array<{ name: string; proficiency?: string }>
        latestInvitation?: NormalizedFreelancerInvitation
}

export type NormalizedFreelancerInvitation = {
        id?: string
        jobId?: string
        status?: string
        sentAt?: string
        respondedAt?: string
        expiresAt?: string
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
                totalHoursWorked: getFreelancerTotalHoursWorked(freelancer),
                availability: getFreelancerAvailability(freelancer),
                availableHoursPerWeek: getFreelancerAvailableHoursPerWeek(freelancer),
                memberSince: getFreelancerMemberSince(freelancer),
                isSaved: getFreelancerSavedStatus(freelancer),
                skills: getFreelancerSkillNames(freelancer),
                specialties: getFreelancerSpecialtyNames(freelancer),
                categories: getFreelancerCategoryNames(freelancer),
                languages: getFreelancerLanguageList(freelancer),
                latestInvitation: getFreelancerLatestInvitation(freelancer)
        }
}

const extractInvitation = (value: unknown): NormalizedFreelancerInvitation | undefined => {
        if (!value) return undefined
        const record = asRecord(value)
        const id = pickString(record.id)
        const jobRecord = asRecord(record.job)
        const jobId = pickString(record.jobId ?? jobRecord.id)
        const status = pickString(record.status ?? record.state)
        const sentAt = pickDateString(record.sentAt ?? record.createdAt)
        const respondedAt = pickDateString(record.respondedAt ?? record.updatedAt)
        const expiresAt = pickDateString(record.expiresAt ?? record.expiredAt)

        if (!id && !jobId && !status && !sentAt && !respondedAt && !expiresAt) {
                return undefined
        }

        return { id, jobId, status: status?.toUpperCase(), sentAt, respondedAt, expiresAt }
}

export const getFreelancerLatestInvitation = (
        freelancer: FreelancerLike
): NormalizedFreelancerInvitation | undefined => {
        const base = asRecord(freelancer)
        const candidates: unknown[] = []

        if (base.latestJobInvitation) candidates.push(base.latestJobInvitation)
        if (base.latestInvitation) candidates.push(base.latestInvitation)
        if (base.currentInvitation) candidates.push(base.currentInvitation)
        if (base.jobInvitation) candidates.push(base.jobInvitation)
        if (base.invitation) candidates.push(base.invitation)

        const jobInvitations = base.jobInvitations
        if (Array.isArray(jobInvitations)) {
                candidates.push(...jobInvitations)
        }

        const invitations = base.invitations
        if (Array.isArray(invitations)) {
                candidates.push(...invitations)
        }

        for (const candidate of candidates) {
                const invitation = extractInvitation(candidate)
                if (invitation) {
                        return invitation
                }
        }

        return undefined
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

export const getFreelancerSavedStatus = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): boolean => {
        if (!freelancer) return false
        const base = freelancer as Record<string, unknown>
        const meta = asRecord(base.meta)

        const candidates = [
                base.isSaved,
                base.saved,
                meta.isSaved,
                meta.saved,
                asRecord(base.freelancerProfile).isSaved,
                asRecord(base.freelancerProfile).saved
        ]

        for (const candidate of candidates) {
                const value = pickBoolean(candidate)
                if (value !== undefined) return value
        }

        return false
}

export const getFreelancerName = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): string => {
        if (!freelancer) return 'Freelancer'
        const base = freelancer as Record<string, unknown>
        const user = asRecord(base.user)
        const profile = asRecord(base.profile)
        const candidate =
                firstNonEmpty(
                        joinName(base.firstName, base.lastName),
                        base.fullName,
                        base.name,
                        profile.displayName,
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
        const profile = asRecord(base.profile)
        return firstNonEmpty(
                base.avatar,
                base.imageUrl,
                base.photoUrl,
                base.picture,
                user.avatar,
                profile.avatarUrl,
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
        const marketplaceProfile = asRecord(base.profile)
        const locationRecord = asRecord(base.location)
        const profileLocation = asRecord(marketplaceProfile.location)

        const city = firstNonEmpty(
                base.city,
                profile.city,
                user.city,
                locationRecord.city,
                locationRecord.cityName,
                profileLocation.city
        )
        const country = firstNonEmpty(
                base.country,
                profile.country,
                user.country,
                locationRecord.country,
                locationRecord.countryName,
                typeof base.location === 'string' ? base.location : undefined,
                profileLocation.country
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

export const getFreelancerCategoryNames = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): string[] => {
        if (!freelancer) return []
        const base = freelancer as Record<string, unknown>
        const profile = asRecord(base.freelancerProfile)
        const marketplaceProfile = asRecord(base.profile)
        return extractNameList(base.categories ?? profile.categories ?? marketplaceProfile.categories)
}

export const getFreelancerLanguageList = (
        freelancer?: ClientFreelancerDetail | ClientFreelancerListItem | null
): Array<{ name: string; proficiency?: string }> => {
        if (!freelancer) return []
        const base = freelancer as Record<string, unknown>
        const languages = base.languages ?? asRecord(base.freelancerProfile).languages
        if (!Array.isArray(languages)) return []
        return languages
                .map(language => {
                        if (!language) return null
                        if (typeof language === 'string') {
                                const normalizedName = (() => {
                                        if (!languageDisplay) return toTitleCase(language)
                                        const displayName = languageDisplay.of(language.toLowerCase())
                                        return displayName ?? toTitleCase(language)
                                })()
                                return { name: normalizedName }
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
                        const normalizedName = (() => {
                                if (!languageDisplay) return toTitleCase(name)
                                const displayName = languageDisplay.of(String(name).toLowerCase())
                                return displayName ?? toTitleCase(String(name))
                        })()
                        return { name: normalizedName, proficiency }
                })
                .filter((item): item is { name: string; proficiency?: string } => Boolean(item))
}

export const getFreelancerTotalHoursWorked = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): number | undefined => {
        if (!freelancer) return undefined
        const base = freelancer as Record<string, unknown>
        const stats = asRecord(base.stats)
        const profile = asRecord(base.freelancerProfile)

        const candidates = [
                base.totalHoursWorked,
                base.totalHours,
                base.hoursWorked,
                base.hoursBilled,
                base.billedHours,
                base.lifetimeHours,
                profile.totalHoursWorked,
                profile.totalHours,
                profile.hoursWorked,
                profile.hoursBilled,
                profile.billedHours,
                stats.totalHoursWorked,
                stats.totalHours,
                stats.hoursWorked,
                stats.hoursBilled,
                stats.billedHours,
                stats.lifetimeHours
        ]

        for (const candidate of candidates) {
                const value = pickNumber(candidate)
                if (value !== undefined) return value
        }

        return undefined
}

export const getFreelancerAvailability = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): string | undefined => {
        if (!freelancer) return undefined
        const base = freelancer as Record<string, unknown>
        const stats = asRecord(base.stats)
        const profile = asRecord(base.freelancerProfile)
        const user = asRecord(base.user)

        const candidate = firstNonEmpty(
                base.availability,
                base.availabilityType,
                base.availabilityStatus,
                profile.availability,
                profile.availabilityType,
                stats.availability,
                stats.availabilityType,
                user.availability
        )

        return candidate
}

export const getFreelancerAvailableHoursPerWeek = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): number | undefined => {
        if (!freelancer) return undefined
        const base = freelancer as Record<string, unknown>
        const stats = asRecord(base.stats)
        const profile = asRecord(base.freelancerProfile)

        const candidates = [
                base.availableHoursPerWeek,
                base.hoursPerWeek,
                base.weeklyAvailability,
                profile.availableHoursPerWeek,
                profile.hoursPerWeek,
                profile.weeklyAvailability,
                stats.availableHoursPerWeek
        ]

        for (const candidate of candidates) {
                const value = pickNumber(candidate)
                if (value !== undefined) return value
        }

        return undefined
}

export const getFreelancerMemberSince = (
        freelancer?: ClientFreelancerListItem | ClientFreelancerDetail | null
): string | undefined => {
        if (!freelancer) return undefined
        const base = freelancer as Record<string, unknown>
        const profile = asRecord(base.freelancerProfile)
        const marketplaceProfile = asRecord(base.profile)
        const stats = asRecord(base.stats)
        const user = asRecord(base.user)

        const candidates = [
                base.memberSince,
                base.joinedAt,
                base.createdAt,
                base.updatedAt,
                profile.createdAt,
                marketplaceProfile.createdAt,
                stats.createdAt,
                user.createdAt
        ]

        for (const candidate of candidates) {
                const value = pickDateString(candidate)
                if (value) return value
        }

        return undefined
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

export const formatLabel = (value?: string): string | undefined => {
        if (!value) return undefined
        return toTitleCase(value)
}

export const formatProficiency = (value?: string): string | undefined => formatLabel(value)

export const formatMemberSince = (value?: string): string | undefined => {
        if (!value) return undefined
        try {
                const date = new Date(value)
                if (Number.isNaN(date.getTime())) return undefined
                return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date)
        } catch {
                return undefined
        }
}

export const formatNumberValue = (value: number): string => {
        const hasFraction = !Number.isInteger(value)
        return new Intl.NumberFormat('en-US', {
                maximumFractionDigits: hasFraction ? 1 : 0,
                minimumFractionDigits: hasFraction ? 1 : 0
        }).format(value)
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
