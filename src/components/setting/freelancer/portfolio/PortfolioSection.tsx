import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PortfolioManagerModal from './PortfolioManagerModal'
import PortfolioViewerDialog from './PortfolioViewerDialog'
import { useFreelancerPortfolio } from '~/hooks/api/useFreelancerPortfolio'
import type {
        FreelancerPortfolioItem,
        FreelancerPortfolioMedia,
        PortfolioVisibility
} from '~/types/profile'

const placeholderColors = [
        'from-emerald-400/60 to-emerald-500/60',
        'from-sky-400/60 to-blue-500/60',
        'from-amber-400/60 to-orange-500/60',
        'from-fuchsia-400/60 to-purple-500/60'
]

const placeholderIcons = ['🎨', '🛠️', '🚀', '💡']

type Props = {
        userId?: string
        editable?: boolean
}

type VisibilityFilter = 'ALL' | PortfolioVisibility

function getMimeType(media?: FreelancerPortfolioMedia | null) {
        if (!media) return undefined
        return media.asset?.mimeType ?? undefined
}

function getMediaUrl(media?: FreelancerPortfolioMedia | null) {
        if (!media) return undefined
        return media.asset?.url ?? undefined
}

function isImageMedia(media?: FreelancerPortfolioMedia | null) {
        if (!media) return false
        const mime = getMimeType(media)
        if (mime && mime.startsWith('image')) return true
        const url = getMediaUrl(media)
        if (!url) return false
        return /\.(png|jpe?g|gif|webp|avif)$/i.test(url)
}

function isVideoMedia(media?: FreelancerPortfolioMedia | null) {
        if (!media) return false
        const mime = getMimeType(media)
        if (mime && mime.startsWith('video')) return true
        const url = getMediaUrl(media)
        if (!url) return false
        return /\.(mp4|webm|ogg)$/i.test(url)
}

function getCoverMedia(item: FreelancerPortfolioItem | undefined) {
        if (!item) return undefined
        if (item.coverAsset && isImageMedia(item.coverAsset)) return item.coverAsset
        const firstImage = item.galleryAssets?.find(media => isImageMedia(media))
        if (firstImage) return firstImage
        return item.coverAsset ?? item.galleryAssets?.[0]
}

export default function PortfolioSection({ userId, editable = true }: Props) {
        const canEdit = editable && Boolean(userId)
        const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>(() =>
                canEdit ? 'ALL' : 'PUBLIC'
        )

        useEffect(() => {
                if (canEdit) {
                        setVisibilityFilter(prev => (prev === 'PUBLIC' ? 'ALL' : prev))
                } else {
                        setVisibilityFilter('PUBLIC')
                }
        }, [canEdit])

        const visibilityParam: PortfolioVisibility | undefined = canEdit
                ? visibilityFilter === 'ALL'
                        ? undefined
                        : visibilityFilter
                : 'PUBLIC'

        const { listQuery, deleteMutation } = useFreelancerPortfolio(userId, {
                visibility: visibilityParam
        })
        const [open, setOpen] = useState(false)
        const [editing, setEditing] = useState<FreelancerPortfolioItem | null>(null)
        const [viewer, setViewer] = useState<FreelancerPortfolioItem | null>(null)

        const items = useMemo(() => listQuery.data ?? [], [listQuery.data])
        const filterOptions = useMemo(() => {
                if (!canEdit) return []
                return [
                        { value: 'ALL' as VisibilityFilter, label: 'Tất cả' },
                        { value: 'PUBLIC' as VisibilityFilter, label: 'Công khai' },
                        { value: 'PRIVATE' as VisibilityFilter, label: 'Riêng tư' }
                ]
        }, [canEdit])
        const showFilterControls = filterOptions.length > 0

        useEffect(() => {
                if (!editable) {
                        setOpen(false)
                        setEditing(null)
                }
        }, [editable])

        const onDelete = (event: MouseEvent, portfolio: FreelancerPortfolioItem) => {
                event.stopPropagation()
                if (!portfolio.id) return
                if (!window.confirm('Bạn có chắc chắn muốn xoá portfolio này?')) return
                deleteMutation.mutate(portfolio.id)
        }

        const onEdit = (event: MouseEvent, portfolio: FreelancerPortfolioItem) => {
                event.stopPropagation()
                setEditing(portfolio)
                setOpen(true)
        }

        const emptyMessage = useMemo(() => {
                if (!canEdit) return 'Freelancer chưa đăng tải portfolio nào.'
                if (visibilityParam === 'PRIVATE') {
                        return 'Bạn chưa có dự án riêng tư nào. Hãy đánh dấu một dự án là riêng tư để chỉ mình bạn thấy.'
                }
                if (visibilityParam === 'PUBLIC') {
                        return 'Bạn chưa có portfolio công khai nào. Hãy chia sẻ những dự án tốt nhất của mình!'
                }
                return 'Bạn chưa có portfolio nào. Hãy chia sẻ dự án đầu tiên của mình!'
        }, [canEdit, visibilityParam])

        return (
                <section className='rounded-xl border border-base-200 bg-white/90 p-4'>
                        <div className='flex flex-wrap items-center justify-between gap-3'>
                                <div>
                                        <h3 className='text-lg font-semibold text-base-content'>Portfolio</h3>
                                        <p className='text-sm text-base-content/70'>Những dự án nổi bật mà bạn đã hoàn thành.</p>
                                </div>
                                <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                                        {showFilterControls && (
                                                <div className='flex items-center gap-2'>
                                                        <span className='text-xs font-semibold uppercase tracking-[0.16em] text-base-content/60'>
                                                                Hiển thị
                                                        </span>
                                                        <div className='join'>
                                                                {filterOptions.map(option => (
                                                                        <button
                                                                                key={option.value}
                                                                                type='button'
                                                                                className={`btn btn-xs join-item ${
                                                                                        option.value === visibilityFilter
                                                                                                ? 'btn-primary'
                                                                                                : 'btn-ghost'
                                                                                }`}
                                                                                onClick={() => {
                                                                                        if (option.value !== visibilityFilter) {
                                                                                                setVisibilityFilter(option.value)
                                                                                        }
                                                                                }}
                                                                        >
                                                                                {option.label}
                                                                        </button>
                                                                ))}
                                                        </div>
                                                </div>
                                        )}

                                        {canEdit && (
                                                <button
                                                        type='button'
                                                        className='btn btn-sm btn-primary gap-2'
                                                        onClick={() => {
                                                                setEditing(null)
                                                                setOpen(true)
                                                        }}
                                                >
                                                        <Plus size={16} />
                                                        Thêm mới
                                                </button>
                                        )}
                                </div>
                        </div>

                        <div className='mt-5'>
                                {listQuery.isLoading ? (
                                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                                                {Array.from({ length: 3 }).map((_, idx) => (
                                                        <div key={idx} className='h-64 rounded-2xl border border-base-200 bg-base-200/60'></div>
                                                ))}
                                        </div>
                                ) : listQuery.isError ? (
                                        <div className='rounded-xl border border-error/30 bg-error/5 p-4 text-sm text-error'>
                                                Không thể tải dữ liệu portfolio.
                                                <button
                                                        type='button'
                                                        className='btn btn-link btn-xs text-error'
                                                        onClick={() => listQuery.refetch()}
                                                >
                                                        Thử lại
                                                </button>
                                        </div>
                                ) : items.length > 0 ? (
                                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                                                {items.map((item, index) => {
                                                        const media = getCoverMedia(item)
                                                        const url = getMediaUrl(media)
                                                        const isImage = isImageMedia(media)
                                                        const isVideo = isVideoMedia(media)
                                                        const color = placeholderColors[index % placeholderColors.length]
                                                        const icon = placeholderIcons[index % placeholderIcons.length]
                                                        return (
                                                                <div
                                                                        key={item.id ?? index}
                                                                        role='button'
                                                                        tabIndex={0}
                                                                        onClick={() => setViewer(item)}
                                                                        onKeyDown={event => {
                                                                                if (event.key === 'Enter' || event.key === ' ') {
                                                                                        event.preventDefault()
                                                                                        setViewer(item)
                                                                                }
                                                                        }}
                                                                        className='group relative flex h-full flex-col overflow-hidden rounded-3xl border border-base-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus:outline-none'
                                                                >
                                                                        <div className='relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br text-4xl'>
                                                                                {url && isImage ? (
                                                                                        <img
                                                                                                src={url}
                                                                                                alt={item.title}
                                                                                                className='h-full w-full object-cover transition duration-300 group-hover:scale-105'
                                                                                        />
                                                                                ) : url && isVideo ? (
                                                                                        <video
                                                                                                src={url}
                                                                                                className='h-full w-full object-cover'
                                                                                                preload='metadata'
                                                                                                muted
                                                                                                playsInline
                                                                                                controls={false}
                                                                                                loop
                                                                                                aria-hidden
                                                                                                disablePictureInPicture
                                                                                                controlsList='nodownload noplaybackrate nofullscreen'
                                                                                        />
                                                                                ) : (
                                                                                        <div
                                                                                                className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${color} text-5xl`}
                                                                                                aria-hidden
                                                                                        >
                                                                                                {icon}
                                                                                        </div>
                                                                                )}
                                                                                {url && isVideo && (
                                                                                        <span className='absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase text-base-content shadow-sm'>Video</span>
                                                                                )}
                                                                                {canEdit && (
                                                                                        <div className='absolute right-3 top-3 flex gap-1 opacity-0 transition group-hover:opacity-100'>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-circle btn-ghost btn-xs'
                                                                                                        title='Chỉnh sửa'
                                                                                                        onClick={event => onEdit(event, item)}
                                                                                                >
                                                                                                        <Pencil size={16} />
                                                                                                </button>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-circle btn-ghost btn-xs text-error'
                                                                                                        title='Xoá portfolio'
                                                                                                        disabled={deleteMutation.isPending}
                                                                                                        onClick={event => onDelete(event, item)}
                                                                                                >
                                                                                                        <Trash2 size={16} />
                                                                                                </button>
                                                                                        </div>
                                                                                )}
                                                                        </div>
                                                                        <div className='flex flex-1 flex-col justify-between p-4'>
                                                                                <div>
                                                                                        <h4 className='text-base font-semibold text-base-content line-clamp-2'>{item.title}</h4>
                                                                                        {item.role && (
                                                                                                <div className='mt-1 text-xs uppercase tracking-wide text-base-content/60'>
                                                                                                        {item.role}
                                                                                                </div>
                                                                                        )}
                                                                                        {item.description && (
                                                                                                <p className='mt-2 text-sm text-base-content/70 line-clamp-3'>
                                                                                                        {item.description}
                                                                                                </p>
                                                                                        )}
                                                                                </div>
                                                                                {item.skills && item.skills.length > 0 && (
                                                                                        <div className='mt-4 flex flex-wrap gap-2'>
                                                                                                {item.skills.map(skill => {
                                                                                                        const name = skill?.name
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
                                                                                )}
                                                                        </div>
                                                                </div>
                                                        )
                                                })}
                                        </div>
                                ) : (
                                        <div className='rounded-2xl border border-dashed border-base-300 bg-base-200/40 p-8 text-center text-sm text-base-content/70'>
                                                {emptyMessage}
                                        </div>
                                )}
                        </div>

                        {canEdit && open && (
                                <PortfolioManagerModal
                                        userId={userId}
                                        initial={editing}
                                        onClose={() => {
                                                setOpen(false)
                                                setEditing(null)
                                        }}
                                />
                        )}

                        {viewer && (
                                <PortfolioViewerDialog
                                        item={viewer}
                                        editable={canEdit}
                                        onClose={() => setViewer(null)}
                                        onEdit={() => {
                                                setEditing(viewer)
                                                setOpen(true)
                                                setViewer(null)
                                        }}
                                />
                        )}
                </section>
        )
}
