import type { Role } from './user'

type Nullable<T> = T | null

export type AdminUserProfile = {
        firstName: Nullable<string>
        lastName: Nullable<string>
        phoneNumber: Nullable<string>
        country: Nullable<string>
        city: Nullable<string>
        district: Nullable<string>
        address: Nullable<string>
}

export type AdminUser = {
        id: string
        email: string
        role: Nullable<Role>
        isActive: boolean
        createdAt: string
        updatedAt: string
        profile: Nullable<AdminUserProfile>
        hasClientProfile: boolean
        hasFreelancerProfile: boolean
        ban?: Nullable<AdminUserBanInfo>
        banInfo?: Nullable<AdminUserBanInfo>
        latestBan?: Nullable<AdminUserBanInfo>
        banRecord?: Nullable<AdminUserBanInfo>
        banHistory?: AdminUserBanInfo[]
}

export type AdminUserListResponse = {
        data: AdminUser[]
        meta: {
                page: number
                limit: number
                total: number
        }
}

export type AdminUserBanInfo = {
        id?: string
        reason?: string | null
        note?: string | null
        expiresAt?: string | null
        createdAt?: string | null
        updatedAt?: string | null
        bannedAt?: string | null
        unbannedAt?: string | null
        bannedBy?: {
                id: string
                email?: string | null
                name?: string | null
        } | null
}
