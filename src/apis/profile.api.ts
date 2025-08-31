import authorizeAxiosInstance from '~/utils/authorizeAxios'

const profileBaseUrl = '/me'

export const uploadAvatar = async (
	file: File,
	opts?: { onProgress?: (_percent: number) => void; signal?: AbortSignal }
) => {
	const fd = new FormData()
	fd.append('avatar', file)
	const res = await authorizeAxiosInstance.put(`${profileBaseUrl}/profile/upload-avatar`, fd, {
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
