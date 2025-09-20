import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PortfolioManagerModal from './PortfolioManagerModal'
import PortfolioViewerDialog from './PortfolioViewerDialog'
import { useFreelancerPortfolio } from '~/hooks/api/useFreelancerPortfolio'
import type { FreelancerPortfolioItem, FreelancerPortfolioMedia } from '~/types/profile'

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

function getCoverMedia(item: FreelancerPortfolioItem | undefined) {
        if (!item) return undefined
        return item.coverAsset ?? item.galleryAssets?.[0]
}

function getMediaUrl(media?: FreelancerPortfolioMedia | null) {
        if (!media) return undefined
        return media.asset?.url ?? undefined
}

export default function PortfolioSection({ userId, editable = true }: Props) {
        const { listQuery, deleteMutation } = useFreelancerPortfolio(userId)
        const [open, setOpen] = useState(false)
        const [editing, setEditing] = useState<FreelancerPortfolioItem | null>(null)
        const [viewer, setViewer] = useState<FreelancerPortfolioItem | null>(null)

        const items = useMemo(() => listQuery.data ?? [], [listQuery.data])
        const canEdit = editable && Boolean(userId)

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

        return (
                <section className='rounded-xl border border-base-200 bg-white/90 p-4'>
                        <div className='flex items-center justify-between gap-3'>
                                <div>
                                        <h3 className='text-lg font-semibold text-base-content'>Portfolio</h3>
                                        <p className='text-sm text-base-content/70'>Những dự án nổi bật mà bạn đã hoàn thành.</p>
                                </div>
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
                                                                                {url ? (
                                                                                        <img
                                                                                                src={url}
                                                                                                alt={item.title}
                                                                                                className='h-full w-full object-cover transition duration-300 group-hover:scale-105'
                                                                                        />
                                                                                ) : (
                                                                                        <div
                                                                                                className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${color} text-5xl`}
                                                                                                aria-hidden
                                                                                        >
                                                                                                {icon}
                                                                                        </div>
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
                                                {canEdit
                                                        ? 'Bạn chưa có portfolio nào. Hãy chia sẻ dự án đầu tiên của mình!'
                                                        : 'Freelancer chưa đăng tải portfolio nào.'}
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
