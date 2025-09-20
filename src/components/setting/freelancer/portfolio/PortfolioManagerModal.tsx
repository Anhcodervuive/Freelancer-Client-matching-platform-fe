import { useEffect, useMemo, useRef, useState } from 'react'
import { Image as ImageIcon, Upload, X } from 'lucide-react'
import type { UpsertFreelancerPortfolioForm } from '~/apis/freelancerProfile.api'
import { useFreelancerPortfolio } from '~/hooks/api/useFreelancerPortfolio'
import { useFreelancerSkills } from '~/hooks/api/useFreelancerSkills'
import type {
        FreelancerPortfolioItem,
        FreelancerPortfolioSkill,
        PortfolioVisibility
} from '~/types/profile'

type Props = {
        initial: FreelancerPortfolioItem | null
        onClose: () => void
        userId?: string
}

const MAX_MEDIA_ITEMS = 12

type ExistingMediaItem = {
        kind: 'existing'
        id: string
        assetId: string
        url: string
        mimeType?: string | null
        isCover: boolean
}

type NewMediaItem = {
        kind: 'new'
        id: string
        file: File
        previewUrl: string
        mimeType: string
        isCover: boolean
}

type MediaItem = ExistingMediaItem | NewMediaItem

type SelectedSkill = Pick<FreelancerPortfolioSkill, 'id' | 'name'>

function createId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID()
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function toDateInputValue(value?: string | null) {
        if (!value) return ''
        return value.slice(0, 10)
}

function getMediaFromPortfolio(item: FreelancerPortfolioItem | null): MediaItem[] {
        if (!item) return []
        const list: MediaItem[] = []
        if (item.coverAsset) {
                list.push({
                        kind: 'existing',
                        id: item.coverAsset.id,
                        assetId: item.coverAsset.assetId,
                        url: item.coverAsset.asset?.url ?? '',
                        mimeType: item.coverAsset.asset?.mimeType ?? undefined,
                        isCover: true
                })
        }
        for (const media of item.galleryAssets ?? []) {
                        list.push({
                                kind: 'existing',
                                id: media.id,
                                assetId: media.assetId,
                                url: media.asset?.url ?? '',
                                mimeType: media.asset?.mimeType ?? undefined,
                                isCover: false
                        })
        }
        if (list.length > 0 && !list.some(media => media.isCover)) {
                list[0] = { ...list[0], isCover: true }
        }
        return list
}

function getDisplayUrl(media: MediaItem) {
        return media.kind === 'existing' ? media.url : media.previewUrl
}

function isImageMedia(media: MediaItem) {
        const mime = media.kind === 'existing' ? media.mimeType : media.mimeType
        if (mime && mime.startsWith('image')) return true
        const url = getDisplayUrl(media)
        return /\.(png|jpe?g|webp|gif|avif)$/i.test(url)
}

function normalizeVisibility(value?: PortfolioVisibility): PortfolioVisibility {
        if (!value) return 'PUBLIC'
        return value
}

export default function PortfolioManagerModal({ initial, onClose, userId }: Props) {
        const { createMutation, updateMutation } = useFreelancerPortfolio(userId)
        const { listQuery: skillQuery } = useFreelancerSkills(userId)
        const editing = Boolean(initial?.id)

        const [title, setTitle] = useState(initial?.title ?? '')
        const [role, setRole] = useState(initial?.role ?? '')
        const [description, setDescription] = useState(initial?.description ?? '')
        const [projectUrl, setProjectUrl] = useState(initial?.projectUrl ?? '')
        const [repositoryUrl, setRepositoryUrl] = useState(initial?.repositoryUrl ?? '')
        const [visibility, setVisibility] = useState<PortfolioVisibility>(normalizeVisibility(initial?.visibility))
        const [startedAt, setStartedAt] = useState(toDateInputValue(initial?.startedAt))
        const [completedAt, setCompletedAt] = useState(toDateInputValue(initial?.completedAt))
        const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>(() =>
                (initial?.skills ?? []).map(skill => ({ id: skill.id, name: skill.name }))
        )
        const [skillSelector, setSkillSelector] = useState('')
        const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => getMediaFromPortfolio(initial))

        const fileInputRef = useRef<HTMLInputElement>(null)
        const previewUrlsRef = useRef<Set<string>>(new Set())

        const isSaving = createMutation.isPending || updateMutation.isPending
        const canSave = title.trim().length > 0 && !isSaving
        const disableUpload = mediaItems.length >= MAX_MEDIA_ITEMS

        useEffect(() => {
                const handler = (event: KeyboardEvent) => {
                        if (event.key === 'Escape') onClose()
                }
                window.addEventListener('keydown', handler)
                return () => window.removeEventListener('keydown', handler)
        }, [onClose])

        useEffect(() => {
                const urls = previewUrlsRef.current
                return () => {
                        urls.forEach(url => URL.revokeObjectURL(url))
                        urls.clear()
                }
        }, [])

        const availableSkills = useMemo(() => skillQuery.data ?? [], [skillQuery.data])

        const handleAddSkill = () => {
                if (!skillSelector) return
                const skill = availableSkills.find(item => item.id === skillSelector)
                if (!skill) return
                setSelectedSkills(prev => {
                        if (prev.some(existing => existing.id === skill.id)) return prev
                        return [...prev, { id: skill.id, name: skill.name }]
                })
                setSkillSelector('')
        }

        const handleRemoveSkill = (skillId: string) => {
                setSelectedSkills(prev => prev.filter(skill => skill.id !== skillId))
        }

        const ensureCoverSelection = (items: MediaItem[]) => {
                if (items.length === 0) return items
                if (items.some(media => media.isCover)) return items
                const [first, ...rest] = items
                return [{ ...first, isCover: true }, ...rest]
        }

        const handleRemoveMedia = (media: MediaItem) => {
                setMediaItems(prev => {
                        const filtered = prev.filter(item => item.id !== media.id)
                        if (media.kind === 'new') {
                                previewUrlsRef.current.delete(media.previewUrl)
                                URL.revokeObjectURL(media.previewUrl)
                        }
                        return ensureCoverSelection(filtered)
                })
        }

        const handlePickCover = (media: MediaItem) => {
                setMediaItems(prev =>
                        prev.map(item => (item.id === media.id ? { ...item, isCover: true } : { ...item, isCover: false }))
                )
        }

        const handleFilesSelected = (files: FileList | null) => {
                if (!files?.length) return
                const nextItems: MediaItem[] = []
                Array.from(files).forEach(file => {
                        const previewUrl = URL.createObjectURL(file)
                        previewUrlsRef.current.add(previewUrl)
                        nextItems.push({
                                kind: 'new',
                                id: createId(),
                                file,
                                previewUrl,
                                mimeType: file.type,
                                isCover: false
                        })
                })
                setMediaItems(prev => {
                        const remaining = MAX_MEDIA_ITEMS - prev.length
                        if (remaining <= 0) return prev
                        const additions = nextItems.slice(0, remaining)
                        if (additions.length === 0) return prev
                        return ensureCoverSelection([...prev, ...additions])
                })
                if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                }
        }

        const coverMedia = useMemo(() => mediaItems.find(item => item.isCover) ?? mediaItems[0] ?? null, [mediaItems])
        const galleryMedia = useMemo(
                () => (coverMedia ? mediaItems.filter(item => item.id !== coverMedia.id) : mediaItems),
                [mediaItems, coverMedia]
        )

        const selectedSkillIds = useMemo(() => selectedSkills.map(skill => skill.id), [selectedSkills])

        const buildPayload = (): UpsertFreelancerPortfolioForm => {
                const trimmedTitle = title.trim()
                const payload: UpsertFreelancerPortfolioForm = {
                        title: trimmedTitle,
                        role: role.trim() || null,
                        description: description.trim() || null,
                        projectUrl: projectUrl.trim() || null,
                        repositoryUrl: repositoryUrl.trim() || null,
                        visibility,
                        skillIds: selectedSkillIds
                }

                const startedValue = startedAt.trim()
                if (startedValue) {
                        payload.startedAt = startedValue
                } else if (editing && initial?.startedAt) {
                        payload.startedAt = 'null'
                }

                const completedValue = completedAt.trim()
                if (completedValue) {
                        payload.completedAt = completedValue
                } else if (editing && initial?.completedAt) {
                        payload.completedAt = 'null'
                }

                if (coverMedia) {
                        if (coverMedia.kind === 'existing') {
                                payload.coverAssetId = coverMedia.assetId
                        } else {
                                payload.coverFile = coverMedia.file
                                if (editing && initial?.coverAsset) {
                                        payload.coverAssetId = null
                                }
                        }
                } else if (editing) {
                        payload.coverAssetId = null
                }

                const existingGalleryIds = galleryMedia
                        .filter((media): media is ExistingMediaItem => media.kind === 'existing')
                        .map(media => media.assetId)
                const newGalleryFiles = galleryMedia
                        .filter((media): media is NewMediaItem => media.kind === 'new')
                        .map(media => media.file)

                if (editing || existingGalleryIds.length > 0) {
                        payload.galleryAssetIds = existingGalleryIds
                } else if (existingGalleryIds.length === 0 && !editing) {
                        payload.galleryAssetIds = undefined
                }

                if (newGalleryFiles.length > 0) {
                        payload.galleryFiles = newGalleryFiles
                }

                return payload
        }

        const handleSubmit = () => {
                if (!canSave) return

                const payload = buildPayload()

                if (editing && initial?.id) {
                        updateMutation.mutate(
                                { portfolioId: initial.id, payload },
                                {
                                        onSuccess: onClose
                                }
                        )
                } else {
                        createMutation.mutate(payload, { onSuccess: onClose })
                }
        }

        return (
                <div className='fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm'>
                        <div className='w-full max-w-5xl overflow-hidden rounded-3xl bg-base-100 shadow-2xl'>
                                <div className='flex items-center justify-between border-b border-base-200 px-6 py-4'>
                                        <div>
                                                <h3 className='text-lg font-semibold text-base-content'>
                                                        {editing ? 'Chỉnh sửa portfolio' : 'Thêm portfolio mới'}
                                                </h3>
                                                <p className='text-sm text-base-content/70'>Giới thiệu dự án tiêu biểu để gây ấn tượng với khách hàng.</p>
                                        </div>
                                        <button type='button' className='btn btn-ghost btn-circle' onClick={onClose} title='Đóng'>
                                                <X />
                                        </button>
                                </div>

                                <div className='grid gap-6 px-6 py-6 lg:grid-cols-[1.05fr_0.95fr]'>
                                        <div className='space-y-5'>
                                                <div>
                                                        <label className='label'>
                                                                <span className='label-text font-semibold'>Tiêu đề</span>
                                                        </label>
                                                        <input
                                                                className='input input-bordered w-full'
                                                                placeholder='Ví dụ: Giao diện web thương mại điện tử'
                                                                value={title}
                                                                onChange={event => setTitle(event.target.value)}
                                                        />
                                                </div>

                                                <div>
                                                        <label className='label'>
                                                                <span className='label-text font-semibold'>Vai trò trong dự án (tuỳ chọn)</span>
                                                        </label>
                                                        <input
                                                                className='input input-bordered w-full'
                                                                placeholder='Ví dụ: UI/UX Designer'
                                                                value={role}
                                                                onChange={event => setRole(event.target.value)}
                                                        />
                                                </div>

                                                <div>
                                                        <label className='label'>
                                                                <span className='label-text font-semibold'>Mô tả dự án (tuỳ chọn)</span>
                                                        </label>
                                                        <textarea
                                                                className='textarea textarea-bordered min-h-[140px] w-full'
                                                                placeholder='Chia sẻ tóm tắt mục tiêu, giải pháp và kết quả đạt được.'
                                                                value={description}
                                                                onChange={event => setDescription(event.target.value)}
                                                        />
                                                </div>

                                                <div className='grid gap-4 md:grid-cols-2'>
                                                        <div>
                                                                <label className='label'>
                                                                        <span className='label-text font-semibold'>Đường dẫn dự án (tuỳ chọn)</span>
                                                                </label>
                                                                <input
                                                                        className='input input-bordered w-full'
                                                                        placeholder='https://'
                                                                        value={projectUrl}
                                                                        onChange={event => setProjectUrl(event.target.value)}
                                                                />
                                                        </div>
                                                        <div>
                                                                <label className='label'>
                                                                        <span className='label-text font-semibold'>Đường dẫn mã nguồn (tuỳ chọn)</span>
                                                                </label>
                                                                <input
                                                                        className='input input-bordered w-full'
                                                                        placeholder='https://'
                                                                        value={repositoryUrl}
                                                                        onChange={event => setRepositoryUrl(event.target.value)}
                                                                />
                                                        </div>
                                                </div>

                                                <div className='grid gap-4 md:grid-cols-2'>
                                                        <div>
                                                                <label className='label'>
                                                                        <span className='label-text font-semibold'>Thời gian bắt đầu</span>
                                                                </label>
                                                                <input
                                                                        type='date'
                                                                        className='input input-bordered w-full'
                                                                        value={startedAt}
                                                                        onChange={event => setStartedAt(event.target.value)}
                                                                />
                                                        </div>
                                                        <div>
                                                                <label className='label'>
                                                                        <span className='label-text font-semibold'>Thời gian hoàn thành</span>
                                                                </label>
                                                                <input
                                                                        type='date'
                                                                        className='input input-bordered w-full'
                                                                        value={completedAt}
                                                                        onChange={event => setCompletedAt(event.target.value)}
                                                                />
                                                        </div>
                                                </div>

                                                <div>
                                                        <label className='label'>
                                                                <span className='label-text font-semibold'>Trạng thái hiển thị</span>
                                                        </label>
                                                        <select
                                                                className='select select-bordered w-full'
                                                                value={visibility}
                                                                onChange={event => setVisibility(event.target.value as PortfolioVisibility)}
                                                        >
                                                                <option value='PUBLIC'>Công khai</option>
                                                                <option value='PRIVATE'>Riêng tư</option>
                                                        </select>
                                                </div>

                                                <div>
                                                        <label className='label'>
                                                                <span className='label-text font-semibold'>Kỹ năng sử dụng</span>
                                                        </label>
                                                        <div className='rounded-2xl border border-base-300 bg-base-100 p-3'>
                                                                <div className='flex flex-wrap gap-2'>
                                                                        {selectedSkills.map(skill => (
                                                                                <span
                                                                                        key={skill.id}
                                                                                        className='inline-flex items-center gap-2 rounded-full bg-base-200 px-3 py-1 text-sm font-medium'
                                                                                >
                                                                                        {skill.name}
                                                                                        <button
                                                                                                type='button'
                                                                                                className='btn btn-ghost btn-circle btn-xs text-base-content/60'
                                                                                                onClick={() => handleRemoveSkill(skill.id)}
                                                                                                title='Xoá'
                                                                                        >
                                                                                                <X size={14} />
                                                                                        </button>
                                                                                </span>
                                                                        ))}
                                                                </div>
                                                                <div className='mt-3 flex flex-col gap-2 sm:flex-row sm:items-center'>
                                                                        <select
                                                                                className='select select-bordered flex-1'
                                                                                value={skillSelector}
                                                                                onChange={event => setSkillSelector(event.target.value)}
                                                                        >
                                                                                <option value=''>Chọn kỹ năng</option>
                                                                                {availableSkills.map(skill => (
                                                                                        <option key={skill.id} value={skill.id}>
                                                                                                {skill.name}
                                                                                        </option>
                                                                                ))}
                                                                        </select>
                                                                        <button
                                                                                type='button'
                                                                                className='btn btn-outline btn-sm'
                                                                                onClick={handleAddSkill}
                                                                                disabled={!skillSelector}
                                                                        >
                                                                                Thêm kỹ năng
                                                                        </button>
                                                                </div>
                                                                {availableSkills.length === 0 && (
                                                                        <p className='mt-2 text-xs text-base-content/60'>
                                                                                Bạn chưa có kỹ năng nào trong hồ sơ. Hãy thêm kỹ năng ở mục "Skills" trước khi gắn vào portfolio.
                                                                        </p>
                                                                )}
                                                        </div>
                                                </div>
                                        </div>

                                        <div className='space-y-4'>
                                                <div>
                                                        <div className='mb-3 flex items-center justify-between'>
                                                                <span className='text-sm font-semibold text-base-content'>Hình ảnh & video</span>
                                                                <span className='text-xs text-base-content/60'>
                                                                        {mediaItems.length}/{MAX_MEDIA_ITEMS}
                                                                </span>
                                                        </div>
                                                        <div className='grid grid-cols-2 gap-3'>
                                                                {mediaItems.map(media => {
                                                                        const url = getDisplayUrl(media)
                                                                        const image = isImageMedia(media)
                                                                        return (
                                                                                <div
                                                                                        key={media.id}
                                                                                        className='group relative overflow-hidden rounded-2xl border border-base-200 bg-base-200/40'
                                                                                >
                                                                                        {image && url ? (
                                                                                                <img src={url} alt={title} className='h-36 w-full object-cover' />
                                                                                        ) : url ? (
                                                                                                <video src={url} className='h-36 w-full object-cover' controls />
                                                                                        ) : (
                                                                                                <div className='flex h-36 flex-col items-center justify-center gap-2 text-base-content/70'>
                                                                                                        <ImageIcon size={28} />
                                                                                                        <span className='text-xs font-medium'>Không thể xem trước</span>
                                                                                                </div>
                                                                                        )}
                                                                                        <button
                                                                                                type='button'
                                                                                                className='btn btn-circle btn-ghost btn-xs absolute right-2 top-2 bg-black/50 text-white backdrop-blur-sm'
                                                                                                onClick={() => handleRemoveMedia(media)}
                                                                                                title='Xoá'
                                                                                        >
                                                                                                <X size={14} />
                                                                                        </button>
                                                                                        {media.isCover ? (
                                                                                                <span className='absolute left-2 top-2 rounded-full bg-base-100/95 px-3 py-1 text-xs font-semibold uppercase text-primary shadow'>Ảnh bìa</span>
                                                                                        ) : (
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='absolute left-2 top-2 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold uppercase text-white transition hover:bg-black/70'
                                                                                                        onClick={() => handlePickCover(media)}
                                                                                                        title='Đặt làm ảnh bìa'
                                                                                                >
                                                                                                        Chọn làm bìa
                                                                                                </button>
                                                                                        )}
                                                                                </div>
                                                                        )
                                                                })}
                                                        </div>
                                                        <div className='mt-4 flex flex-wrap items-center gap-3'>
                                                                <button
                                                                        type='button'
                                                                        className='btn btn-outline btn-sm gap-2'
                                                                        onClick={() => fileInputRef.current?.click()}
                                                                        disabled={disableUpload}
                                                                >
                                                                        <Upload size={16} />
                                                                        Tải nội dung
                                                                </button>
                                                                <span className='text-xs text-base-content/60'>Hỗ trợ JPG, PNG, WEBP, GIF, MP4. Tối đa 12 tệp.</span>
                                                        </div>
                                                        <input
                                                                ref={fileInputRef}
                                                                type='file'
                                                                accept='image/png,image/jpeg,image/webp,image/avif,image/gif,video/mp4,video/webm'
                                                                multiple
                                                                className='hidden'
                                                                onChange={event => handleFilesSelected(event.target.files)}
                                                        />
                                                </div>
                                        </div>
                                </div>

                                <div className='flex items-center justify-end gap-3 border-t border-base-200 bg-base-100 px-6 py-4'>
                                        <button type='button' className='btn btn-ghost' onClick={onClose} disabled={isSaving}>
                                                Hủy
                                        </button>
                                        <button type='button' className='btn btn-primary' onClick={handleSubmit} disabled={!canSave}>
                                                {isSaving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo portfolio'}
                                        </button>
                                </div>
                        </div>
                </div>
        )
}
