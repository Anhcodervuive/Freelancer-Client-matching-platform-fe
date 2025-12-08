import type { Role } from '~/types'
import type { UpdateProfileDto } from '~/types/profile'
import type { User } from '~/types/user'
import authorizeAxiosInstance from '~/utils/authorizeAxios'

const profileBaseUrl = '/profile'

export const uploadAvatar = async (
	file: File,
	opts?: { onProgress?: (_percent: number) => void; signal?: AbortSignal }
) => {
	const fd = new FormData()
	fd.append('avatar', file)
	const res = await authorizeAxiosInstance.put(`${profileBaseUrl}/upload-avatar`, fd, {
		// ❗ KHÔNG đặt 'Content-Type' thủ công; axios tự thêm boundary cho FormData
		onUploadProgress: e => {
			if (opts?.onProgress && e.total) {
				const pct = Math.round((e.loaded * 100) / e.total)
				opts.onProgress(pct)
			}
		},
		signal: opts?.signal
	})
	return res.data
}

export const updateRole = async (role: Role) => {
	const resposne = await authorizeAxiosInstance.post('/onboarding/role', { role })
	return resposne.data
}

export const updateProfileAPI = async (data: UpdateProfileDto) => {
	const res = await authorizeAxiosInstance.put(`${profileBaseUrl}`, data)
	return res.data
}

export const getProfileInfo = async (userId: string, interaction: string = ''): Promise<User> => {
	const response = await authorizeAxiosInstance.get(`${profileBaseUrl}/${userId}`, {
		params: {
			interactionSource: interaction
		}
	})
	return response.data
}
