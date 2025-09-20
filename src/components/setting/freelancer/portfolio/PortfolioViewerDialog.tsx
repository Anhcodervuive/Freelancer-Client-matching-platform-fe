import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Play, X } from 'lucide-react'
import type { FreelancerPortfolioItem, FreelancerPortfolioMedia } from '~/types/profile'

type Props = {
        item: FreelancerPortfolioItem
        onClose: () => void
        editable?: boolean
        onEdit?: () => void
}

function getDisplayUrl(asset: FreelancerPortfolioMedia | undefined) {
        if (!asset) return undefined
        return asset.asset?.url ?? undefined
}

function getMimeType(asset: FreelancerPortfolioMedia | undefined) {
        if (!asset) return undefined
        return asset.asset?.mimeType ?? undefined
}

function formatDate(value?: string | null) {
        if (!value) return undefined
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return undefined
        return date.toLocaleDateString()
}

function isImageAsset(asset: FreelancerPortfolioMedia | undefined) {
        if (!asset) return false
        const mime = asset.asset?.mimeType
        if (mime && mime.startsWith('image')) return true
        const url = getDisplayUrl(asset)
        if (!url) return false
        return /\.(png|jpe?g|gif|webp|avif)$/i.test(url)
}

function isVideoAsset(asset: FreelancerPortfolioMedia | undefined) {
        if (!asset) return false
        const mime = getMimeType(asset)
        if (mime && mime.startsWith('video')) return true
        const url = getDisplayUrl(asset)
        if (!url) return false
        return /\.(mp4|webm|ogg)$/i.test(url)
}

export default function PortfolioViewerDialog({ item, onClose, editable, onEdit }: Props) {
        const attachments = useMemo(() => {
                const list: FreelancerPortfolioMedia[] = []
                if (item.coverAsset) list.push(item.coverAsset)
                if (item.galleryAssets?.length) list.push(...item.galleryAssets)
                return list
        }, [item])
        const [currentIndex, setCurrentIndex] = useState(0)

        useEffect(() => {
                setCurrentIndex(0)
        }, [item?.id])

        useEffect(() => {
                const handler = (event: KeyboardEvent) => {
                        if (event.key === 'Escape') onClose()
                        if (event.key === 'ArrowRight') setCurrentIndex(prev => (prev + 1) % Math.max(attachments.length, 1))
                        if (event.key === 'ArrowLeft')
                                setCurrentIndex(prev => (prev - 1 + Math.max(attachments.length, 1)) % Math.max(attachments.length, 1))
                }
                window.addEventListener('keydown', handler)
                return () => window.removeEventListener('keydown', handler)
        }, [attachments.length, onClose])

        const currentAsset = attachments[currentIndex]
        const currentUrl = getDisplayUrl(currentAsset)
        const isImage = isImageAsset(currentAsset)
        const isVideo = isVideoAsset(currentAsset)
        const currentMime = getMimeType(currentAsset)

        const timeline = useMemo(() => {
                if (!item.startedAt && !item.completedAt) return null
                const start = formatDate(item.startedAt)
                const end = formatDate(item.completedAt)
                if (start && end) return `${start} - ${end}`
                if (start) return `Bắt đầu từ ${start}`
                if (end) return `Hoàn thành ${end}`
                return null
        }, [item.completedAt, item.startedAt])

        const goNext = () => {
                if (!attachments.length) return
                setCurrentIndex(prev => (prev + 1) % attachments.length)
        }

        const goPrev = () => {
                if (!attachments.length) return
                setCurrentIndex(prev => (prev - 1 + attachments.length) % attachments.length)
        }

        return (
                <div className='fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/80 px-4 py-10 backdrop-blur-sm'>
                        <div className='relative w-full max-w-5xl overflow-hidden rounded-3xl bg-base-100 shadow-2xl'>
                                <button
                                        type='button'
                                        className='btn btn-ghost btn-circle absolute right-4 top-4 z-20'
                                        onClick={onClose}
                                        title='Đóng'
                                >
                                        <X />
                                </button>
                                <div className='grid gap-0 md:grid-cols-[1.1fr_0.9fr]'>
                                        <div className='relative flex min-h-[260px] items-center justify-center bg-base-200 md:min-h-[420px]'>
                                                {currentUrl ? (
                                                        isImage ? (
                                                                <img
                                                                        key={currentAsset?.id ?? currentAsset?.assetId ?? currentIndex}
                                                                        src={currentUrl}
                                                                        alt={item.title}
                                                                        className='max-h-[70vh] w-full max-w-full object-contain'
                                                                />
                                                        ) : isVideo ? (
                                                                <video
                                                                        key={currentAsset?.id ?? currentAsset?.assetId ?? currentIndex}
                                                                        className='max-h-[70vh] w-full max-w-full rounded-2xl bg-black object-contain'
                                                                        controls
                                                                        preload='metadata'
                                                                        playsInline
                                                                >
                                                                        <source src={currentUrl} type={currentMime} />
                                                                        Trình duyệt của bạn không hỗ trợ phát video.
                                                                </video>
                                                        ) : (
                                                                <div className='flex max-h-[70vh] w-full max-w-full items-center justify-center px-8 text-center text-sm text-base-content/70'>
                                                                        Không thể xem trước tệp này. Hãy tải xuống để xem chi tiết.
                                                                </div>
                                                        )
                                                ) : (
                                                        <div className='flex h-full w-full items-center justify-center text-base-content/60'>
                                                                Không có media hiển thị
                                                        </div>
                                                )}

                                                {isVideo && currentUrl && (
                                                        <div className='absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold uppercase text-white backdrop-blur'>
                                                                <Play size={16} />
                                                                Video
                                                        </div>
                                                )}

                                                {attachments.length > 1 && (
                                                        <>
                                                                <button
                                                                        type='button'
                                                                        className='btn btn-circle btn-ghost absolute left-4 top-1/2 z-10 -translate-y-1/2 bg-black/40 text-white backdrop-blur-sm hover:bg-black/60'
                                                                        onClick={goPrev}
                                                                        title='Trước'
                                                                >
                                                                        <ChevronLeft />
                                                                </button>
                                                                <button
                                                                        type='button'
                                                                        className='btn btn-circle btn-ghost absolute right-4 top-1/2 z-10 -translate-y-1/2 bg-black/40 text-white backdrop-blur-sm hover:bg-black/60'
                                                                        onClick={goNext}
                                                                        title='Tiếp'
                                                                >
                                                                        <ChevronRight />
                                                                </button>
                                                        </>
                                                )}

                                                {attachments.length > 1 && (
                                                        <div className='absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4'>
                                                                {attachments.map((media, idx) => {
                                                                        const thumbUrl = getDisplayUrl(media)
                                                                        const thumbImage = isImageAsset(media)
                                                                        const thumbVideo = isVideoAsset(media)
                                                                        const active = currentIndex === idx
                                                                        return (
                                                                                <button
                                                                                        key={media.id ?? `${media.assetId}-${idx}`}
                                                                                        type='button'
                                                                                        className={`h-14 w-20 overflow-hidden rounded-xl border-2 transition ${
                                                                                                active
                                                                                                        ? 'border-primary shadow-lg'
                                                                                                        : 'border-transparent opacity-70 hover:opacity-100'
                                                                                        }`}
                                                                                        onClick={() => setCurrentIndex(idx)}
                                                                                >
                                                                                        {thumbUrl && thumbImage && (
                                                                                                <img src={thumbUrl} alt='' className='h-full w-full object-cover' />
                                                                                        )}
                                                                                        {thumbUrl && thumbVideo && (
                                                                                                <div className='relative flex h-full w-full items-center justify-center bg-black/80 text-white'>
                                                                                                        <Play size={20} />
                                                                                                </div>
                                                                                        )}
                                                                                        {thumbUrl && !thumbImage && !thumbVideo && (
                                                                                                <div className='flex h-full w-full items-center justify-center bg-base-200 text-[10px] font-medium uppercase text-base-content/60'>
                                                                                                        File
                                                                                                </div>
                                                                                        )}
                                                                                        {!thumbUrl && (
                                                                                                <div className='flex h-full w-full items-center justify-center bg-base-200 text-xs text-base-content/60'>
                                                                                                        —
                                                                                                </div>
                                                                                        )}
                                                                                </button>
                                                                        )
                                                                })}
                                                        </div>
                                                )}
                                        </div>

                                        <div className='flex flex-col justify-between p-6 md:p-8'>
                                                <div className='space-y-4'>
                                                        <div>
                                                                <h3 className='text-2xl font-semibold text-base-content'>{item.title}</h3>
                                                                {item.role && (
                                                                        <div className='mt-2 text-xs uppercase tracking-[0.16em] text-base-content/60'>
                                                                                {item.role}
                                                                        </div>
                                                                )}
                                                        </div>
                                                        {item.description && (
                                                                <p className='whitespace-pre-line text-sm leading-relaxed text-base-content/80'>
                                                                        {item.description}
                                                                </p>
                                                        )}
                                                        {item.skills && item.skills.length > 0 && (
                                                                <div>
                                                                        <div className='text-sm font-semibold text-base-content'>Kỹ năng</div>
                                                                        <div className='mt-2 flex flex-wrap gap-2'>
                                                                                {item.skills.map(skill => {
                                                                                        const name = typeof skill === 'string' ? skill : skill?.name
                                                                                        if (!name) return null
                                                                                        return (
                                                                                                <span
                                                                                                        key={name}
                                                                                                        className='badge badge-outline rounded-full px-3 py-2 text-xs font-medium'
                                                                                                >
                                                                                                        {name}
                                                                                                </span>
                                                                                        )
                                                                                })}
                                                                        </div>
                                                                </div>
                                                        )}
                                                        <div className='flex flex-wrap gap-3'>
                                                                {item.projectUrl && (
                                                                        <a
                                                                                href={item.projectUrl}
                                                                                target='_blank'
                                                                                rel='noreferrer'
                                                                                className='btn btn-outline btn-sm gap-2'
                                                                        >
                                                                                <ExternalLink size={16} />
                                                                                Xem dự án
                                                                        </a>
                                                                )}
                                                                {item.repositoryUrl && (
                                                                        <a
                                                                                href={item.repositoryUrl}
                                                                                target='_blank'
                                                                                rel='noreferrer'
                                                                                className='btn btn-outline btn-sm gap-2'
                                                                        >
                                                                                <ExternalLink size={16} />
                                                                                Xem mã nguồn
                                                                        </a>
                                                                )}
                                                        </div>
                                                        {timeline && (
                                                                <div className='text-xs text-base-content/60'>
                                                                        {timeline}
                                                                </div>
                                                        )}
                                                        <div className='text-xs uppercase tracking-[0.16em] text-base-content/50'>
                                                                Trạng thái: {item.visibility === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}
                                                        </div>
                                                </div>

                                                {editable && onEdit && (
                                                        <div className='mt-6 flex justify-end'>
                                                                <button
                                                                        type='button'
                                                                        className='btn btn-primary btn-sm'
                                                                        onClick={() => {
                                                                                onEdit()
                                                                        }}
                                                                >
                                                                        Chỉnh sửa mục này
                                                                </button>
                                                        </div>
                                                )}
                                        </div>
                                </div>
                        </div>
                </div>
        )
}
