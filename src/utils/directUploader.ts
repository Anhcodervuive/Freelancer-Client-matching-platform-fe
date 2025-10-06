import axios from 'axios'
import authorizeAxiosInstance from './authorizeAxios'

type CloudinarySignResp = {
	ok: boolean
	cloud_name: string
	api_key: string
	timestamp: number
	folder: string
	resource_type: 'image' | 'video' | 'raw'
	public_id?: string
	signature: string
}

type R2PresignResp = {
	ok: boolean
	method: 'PUT'
	url: string
	headers: Record<string, string>
	key: string
	publicUrl: string
	expiresIn: number
	bucket: string
}

export type UploadedMeta = {
	provider: 'cloudinary' | 'r2'
	kind: 'image' | 'video' | 'file'
	url: string
	publicId?: string
	width?: number
	height?: number
	duration?: number
	mime: string
	name: string
	size: number
	key?: string
	bucket?: string
}

const isImage = (mime: string) => mime.startsWith('image/')
const isVideo = (mime: string) => mime.startsWith('video/')

export async function uploadDirect(
	file: File,
	threadId: string,
	opt?: { onProgress?: (_pct: number) => void; folder?: string }
): Promise<UploadedMeta> {
	const mime = file.type || 'application/octet-stream'
	const size = file.size
	const name = file.name
	const folder = opt?.folder ?? 'chat'

	// --- Cloudinary ---
	if (isImage(mime) || isVideo(mime)) {
		const resource_type = isImage(mime) ? 'image' : 'video'
		// 1) xin chữ ký
		const { data: sign } = await authorizeAxiosInstance.post<CloudinarySignResp>('/upload/cloudinary/sign', {
			resource_type,
			folder,
			threadId
		})
		if (!sign.ok) throw new Error('Sign cloudinary failed')

		// 2) upload trực tiếp
		const form = new FormData()
		form.append('file', file)
		form.append('api_key', sign.api_key)
		form.append('timestamp', String(sign.timestamp))
		form.append('signature', sign.signature)
		form.append('folder', sign.folder)

		const uploadUrl = `https://api.cloudinary.com/v1_1/${sign.cloud_name}/${resource_type}/upload`
		const { data: result } = await axios.post(uploadUrl, form, {
			headers: { 'Content-Type': 'multipart/form-data' },
			onUploadProgress: e => {
				if (opt?.onProgress && e.total) opt.onProgress(Math.round((e.loaded / e.total) * 100))
			}
		})

		return {
			provider: 'cloudinary',
			kind: resource_type,
			url: result.secure_url || result.url,
			publicId: result.public_id,
			width: result.width,
			height: result.height,
			duration: result.duration,
			mime,
			name,
			size
		}
	}

	// --- R2 (file thường) ---
	const { data: pre } = await authorizeAxiosInstance.post<R2PresignResp>('/upload/r2/presign', {
		filename: name,
		contentType: mime,
		size,
		folder,
		threadId
	})
	if (!pre.ok) throw new Error('R2 presign failed')

	await axios.put(pre.url, file, {
		headers: pre.headers,
		onUploadProgress: e => {
			if (opt?.onProgress && e.total) opt.onProgress(Math.round((e.loaded / e.total) * 100))
		}
	})

	return {
		provider: 'r2',
		kind: 'file',
		url: pre.publicUrl,
		key: pre.key,
		bucket: pre.bucket,
		mime,
		name,
		size
	}
}
