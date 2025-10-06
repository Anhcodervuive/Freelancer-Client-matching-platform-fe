import { useEffect, useState } from 'react'
import { FileIcon, FileAudio, FileText, X } from 'lucide-react'

type Attachment = {
	id: string // key duy nhất
	file: File
	url: string // ObjectURL (nếu cần)
	kind: 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'other'
}

type ChatAttachmentPreviewProps = {
	files: File[]
	onRemove?: (_index: number) => void
	className?: string
}

const detectKind = (f: File): Attachment['kind'] => {
	const t = f.type
	if (t.startsWith('image/')) return 'image'
	if (t.startsWith('video/')) return 'video'
	if (t.startsWith('audio/')) return 'audio'
	// PDF có MIME riêng
	if (t === 'application/pdf') return 'pdf'
	// vài text phổ biến
	if (t.startsWith('text/') || t === 'application/json' || /\.(txt|md|csv|json)$/i.test(f.name)) {
		return 'text'
	}
	return 'other'
}

const formatBytes = (n: number) => {
	if (n < 1024) return `${n} B`
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
	return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function ChatAttachmentPreview({ files, onRemove, className = '' }: ChatAttachmentPreviewProps) {
	const [attachments, setAttachments] = useState<Attachment[]>([])

	// Tạo/reuse ObjectURL khi danh sách files thay đổi
	useEffect(() => {
		const next = files.map((f, idx) => {
			const kind = detectKind(f)
			// Chỉ cần ObjectURL cho media/ảnh; chip thường có thể không cần
			const needUrl = kind === 'image' || kind === 'video' || kind === 'audio'
			const url = needUrl ? URL.createObjectURL(f) : ''
			return {
				id: `${f.name}-${f.size}-${idx}-${f.lastModified}`,
				file: f,
				url,
				kind
			}
		})

		// Revoke các URL cũ
		setAttachments(prev => {
			prev.forEach(a => a.url && URL.revokeObjectURL(a.url))
			return next
		})

		return () => {
			next.forEach(a => a.url && URL.revokeObjectURL(a.url))
		}
	}, [files])

	if (!attachments.length) return null

	return (
		<div className={`mt-2 flex flex-wrap gap-2 ${className}`}>
			{attachments.map((a, idx) => {
				const name = a.file.name
				const size = formatBytes(a.file.size)

				if (a.kind === 'image') {
					return (
						<div key={a.id} className='indicator'>
							<span className='indicator-item indicator-start'>
								{onRemove && (
									<button
										type='button'
										className='btn btn-xs btn-circle btn-error'
										onClick={() => onRemove(idx)}
										aria-label='Xoá tệp'>
										<X className='w-3 h-3' />
									</button>
								)}
							</span>
							<div className='w-16 h-16 rounded-box overflow-hidden border border-base-300'>
								<img src={a.url} alt={name} className='w-full h-full object-cover' />
							</div>
						</div>
					)
				}

				if (a.kind === 'video') {
					return (
						<div key={a.id} className='rounded-box border border-base-300 p-2 max-w-[200px]'>
							<video src={a.url} className='w-40 h-24 rounded' controls preload='metadata' />
							<div className='flex items-center justify-between mt-1'>
								<span className='text-xs opacity-60'>{size}</span>
								{onRemove && (
									<button className='btn btn-ghost btn-xs' onClick={() => onRemove(idx)}>
										Xoá
									</button>
								)}
							</div>
						</div>
					)
				}

				if (a.kind === 'audio') {
					return (
						<div key={a.id} className='rounded-box border border-base-300 p-2 flex items-center gap-2'>
							<FileAudio className='w-4 h-4' />
							<div className='min-w-0'>
								<div className='text-sm truncate'>{name}</div>
								<div className='text-xs opacity-60'>{size}</div>
								<audio src={a.url} controls className='mt-1 w-56' preload='metadata' />
							</div>
							{onRemove && (
								<button className='btn btn-ghost btn-xs ml-auto' onClick={() => onRemove(idx)}>
									Xoá
								</button>
							)}
						</div>
					)
				}

				// PDF & Text: hiển thị chip nhỏ gọn
				if (a.kind === 'pdf' || a.kind === 'text') {
					const Icon = a.kind === 'pdf' ? FileText : FileText
					return (
						<div key={a.id} className='badge gap-1 py-3 px-3 rounded-box'>
							<Icon className='w-4 h-4' />
							<span className='max-w-[160px] truncate'>{name}</span>
							<span className='opacity-60 text-xs'>· {size}</span>
							{onRemove && (
								<button className='btn btn-ghost btn-xs ml-1' onClick={() => onRemove(idx)}>
									Xoá
								</button>
							)}
						</div>
					)
				}

				// Other: chip mặc định
				return (
					<div key={a.id} className='badge gap-1 py-3 px-3 rounded-box'>
						<FileIcon className='w-4 h-4' />
						<span className='max-w-[160px] truncate'>{name}</span>
						<span className='opacity-60 text-xs'>· {size}</span>
						{onRemove && (
							<button className='btn btn-ghost btn-xs ml-1' onClick={() => onRemove(idx)}>
								Xoá
							</button>
						)}
					</div>
				)
			})}
		</div>
	)
}
