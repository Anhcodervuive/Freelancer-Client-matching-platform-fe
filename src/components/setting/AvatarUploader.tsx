// src/components/AvatarUploader.tsx
import React from 'react'
import { Pencil } from 'lucide-react'
import { uploadAvatar } from '~/apis/profile.api'
import type { AppDispatch } from '~/redux/store'
import { useDispatch } from 'react-redux'
import { updateProfile } from '~/redux/user/userSlice'
import { DEFAULT_AVATAR } from '~/constants/image'

type Props = {
	src?: string | null // URL avatar hiện tại
	size?: number // px
	rounded?: 'full' | 'lg' | 'md'
	onUploaded?: (_newUrl: string) => void
	maxSizeMB?: number // mặc định 5MB
	editable?: boolean
}

export default function AvatarUploader({ src, size = 96, rounded = 'full', maxSizeMB = 5, editable = true }: Props) {
	const [imgSrc, setImgSrc] = React.useState<string | null>(src ?? null)
	const [pct, setPct] = React.useState<number | null>(null) // null = không upload
	const dispatch: AppDispatch = useDispatch()
	const fileRef = React.useRef<HTMLInputElement>(null)

	React.useEffect(() => {
		if (src && src.trim()) {
			setImgSrc(src)
			return
		}
		setImgSrc(null)
	}, [src])

	const trigger = () => {
		if (!editable) return
		fileRef.current?.click()
	}

	const onPick = async (file?: File) => {
		if (!file) return
		if (!/^image\/(png|jpe?g|webp|avif)$/i.test(file.type)) {
			alert('Chỉ chấp nhận PNG / JPG / WEBP / AVIF')
			return
		}
		if (file.size > maxSizeMB * 1024 * 1024) {
			alert(`Kích thước tối đa ${maxSizeMB}MB`)
			return
		}

		// preview lạc quan
		const previous = imgSrc
		const previewUrl = URL.createObjectURL(file)
		setImgSrc(previewUrl)
		setPct(0)

		try {
			const { avatarUrl } = await uploadAvatar(file, {
				onProgress(_percent) {
					setPct(_percent)
				}
			})
			// setImgSrc(avatarUrl)
			dispatch(updateProfile({ avatar: avatarUrl }))
		} catch (e) {
			setImgSrc(previous)
			console.log(e)
		} finally {
			setPct(null)
			URL.revokeObjectURL(previewUrl)
			if (fileRef.current) fileRef.current.value = ''
		}
	}

	return (
		<div className='relative shrink-0' style={{ width: size, height: size }}>
			<img
				src={imgSrc ?? DEFAULT_AVATAR}
				alt='avatar'
				className={[
					'w-full h-full object-cover bg-base-200 border border-base-300',
					rounded === 'full' ? 'rounded-full' : rounded === 'lg' ? 'rounded-lg' : 'rounded-md'
				].join(' ')}
				onError={event => {
					event.currentTarget.onerror = null
					setImgSrc(DEFAULT_AVATAR)
				}}
			/>

			{editable && (
				<button
					type='button'
					onClick={trigger}
					className='absolute -bottom-1 -right-1 btn btn-ghost btn-circle bg-white/90 border border-primary text-primary'
					title='Đổi ảnh đại diện'
					disabled={!!pct}>
					<Pencil size={16} />
				</button>
			)}

			{/* overlay progress (%), thay spinner */}
			{pct !== null && (
				<div
					className={[
						'absolute inset-0 grid place-items-center',
						rounded === 'full' ? 'rounded-full' : rounded === 'lg' ? 'rounded-lg' : 'rounded-md',
						'bg-base-100/60 backdrop-blur-[1px]'
					].join(' ')}>
					<div
						className='radial-progress text-primary'
						style={{ ['--value' as never]: pct, ['--size' as never]: '4rem', ['--thickness' as never]: '4px' }}
						aria-valuenow={pct}
						role='progressbar'>
						{pct}%
					</div>
				</div>
			)}

			{editable && (
				<input
					ref={fileRef}
					type='file'
					accept='image/png,image/jpeg,image/webp,image/avif'
					className='hidden'
					onChange={e => onPick(e.target.files?.[0] ?? undefined)}
				/>
			)}
		</div>
	)
}
