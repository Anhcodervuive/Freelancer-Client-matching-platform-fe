import authorizeAxiosInstance from '~/utils/authorizeAxios'
import type { AdminUser, AdminUserListResponse } from '~/types/admin-user'
import type { Role } from '~/types/user'

type ListParams = {
        page: number
        limit: number
        role?: Role
        isActive?: boolean
        search?: string
}

const baseUrl = '/admin/users'

export const listAdminUsers = async (params: ListParams): Promise<AdminUserListResponse> => {
        const searchParams = new URLSearchParams({
                page: params.page.toString(),
                limit: params.limit.toString()
        })

        if (params.role) {
                searchParams.set('role', params.role)
        }

        if (typeof params.isActive === 'boolean') {
                searchParams.set('isActive', params.isActive ? 'true' : 'false')
        }

        if (params.search) {
                searchParams.set('search', params.search)
        }

        const response = await authorizeAxiosInstance.get(`${baseUrl}?${searchParams.toString()}`)
        return response.data
}

export const getAdminUserDetail = async (userId: string): Promise<AdminUser> => {
        const response = await authorizeAxiosInstance.get(`${baseUrl}/${userId}`)
        return response.data.data
}

type UpdateRolePayload = {
        role: Role
}

export const updateAdminUserRole = async (userId: string, payload: UpdateRolePayload): Promise<AdminUser> => {
        const response = await authorizeAxiosInstance.patch(`${baseUrl}/${userId}/role`, payload)
        return response.data.data
}

type UpdateStatusPayload = {
        isActive: boolean
}

export const updateAdminUserStatus = async (
        userId: string,
        payload: UpdateStatusPayload
): Promise<AdminUser> => {
        const response = await authorizeAxiosInstance.patch(`${baseUrl}/${userId}/status`, payload)
        return response.data.data
}

export type BanAdminUserPayload = {
        reason: string
        note?: string
        expiresAt?: string
}

export const banAdminUser = async (
        userId: string,
        payload: BanAdminUserPayload
): Promise<AdminUser> => {
        const body = payload.expiresAt
                ? {
                                ...payload,
                                expiresAt: new Date(payload.expiresAt).toISOString()
                        }
                : payload
        const response = await authorizeAxiosInstance.post(`${baseUrl}/${userId}/ban`, body)
        return response.data.data
}

export type UnbanAdminUserPayload = {
        reactivate: boolean
}

export const unbanAdminUser = async (
        userId: string,
        payload: UnbanAdminUserPayload
): Promise<AdminUser> => {
        const response = await authorizeAxiosInstance.post(`${baseUrl}/${userId}/unban`, payload)
        return response.data.data
}
