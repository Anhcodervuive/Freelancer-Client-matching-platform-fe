import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Image as ImageIcon, Upload, X } from 'lucide-react'
import { uploadFreelancerPortfolioAssetAPI } from '~/apis/freelancerProfile.api'
import { useFreelancerPortfolio } from '~/hooks/api/useFreelancerPortfolio'
import type { FreelancerPortfolioItem, FreelancerPortfolioMedia } from '~/types/profile'

type Props = {
        initial: FreelancerPortfolioItem | null
        onClose: () => void
        userId?: string
}

const MAX_MEDIA_ITEMS = 12

function assetKey(asset: FreelancerPortfolioMedia) {
        return asset.id ?? asset.url ?? ''
}

function getDisplayUrl(asset: FreelancerPortfolioMedia) {
        return asset.url ?? asset.thumbnailUrl ?? ''
}

function isImageAsset(asset: FreelancerPortfolioMedia) {
        if (asset.type && asset.type.startsWith('image')) return true
        const url = getDisplayUrl(asset)
        return /\.(png|jpe?g|webp|gif|avif)$/i.test(url)
}

function extractSkillNames(item: FreelancerPortfolioItem | null | undefined) {
        if (!item?.skills) return []
        const names: string[] = []
        for (const skill of item.skills) {
                if (!skill) continue
                if (typeof skill === 'string') {
                        const value = skill.trim()
                        if (value && !names.includes(value)) names.push(value)
                } else if (skill.name) {
                        const value = skill.name.trim()
                        if (value && !names.includes(value)) names.push(value)
                }
        }
        return names
}

export default function PortfolioManagerModal({ initial, onClose, userId }: Props) {
        const { createMutation, updateMutation } = useFreelancerPortfolio(userId)
        const editing = Boolean(initial?.id)

        const [title, setTitle] = useState(initial?.title ?? '')
        const [overview, setOverview] = useState(initial?.overview ?? '')
        const [role, setRole] = useState(initial?.role ?? '')
        const [projectUrl, setProjectUrl] = useState(initial?.projectUrl ?? '')
        const [skills, setSkills] = useState<string[]>(() => extractSkillNames(initial))
        const [skillInput, setSkillInput] = useState('')
        const [assets, setAssets] = useState<FreelancerPortfolioMedia[]>(() => initial?.attachments ?? [])
        const [coverKey, setCoverKey] = useState<string | null>(() => {
                const cover = initial?.attachments?.find(media => media?.isCover)
                const fallback = cover ?? initial?.attachments?.[0]
                return fallback ? assetKey(fallback) : null
        })
        const [uploadingProgress, setUploadingProgress] = useState<Record<string, number>>({})
        const fileInputRef = useRef<HTMLInputElement>(null)

        const isUploading = useMemo(() => Object.keys(uploadingProgress).length > 0, [uploadingProgress])
        const isSaving = createMutation.isPending || updateMutation.isPending
        const canSave = title.trim().length > 0 && !isUploading
        const disableUpload = !userId || isUploading || assets.length >= MAX_MEDIA_ITEMS

        useEffect(() => {
                const handler = (event: KeyboardEvent) => {
                        if (event.key === 'Escape') onClose()
                }
                window.addEventListener('keydown', handler)
                return () => window.removeEventListener('keydown', handler)
        }, [onClose])

        const handleAddSkill = (value: string) => {
                const trimmed = value.trim()
                if (!trimmed) return
                setSkills(prev => {
                        if (prev.some(item => item.toLowerCase() === trimmed.toLowerCase())) return prev
                        return [...prev, trimmed]
                })
        }

        const handleSkillKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
                if (['Enter', 'Tab', ','].includes(event.key)) {
                        event.preventDefault()
                        handleAddSkill(skillInput)
                        setSkillInput('')
                }
        }

        const handleSkillBlur = () => {
                if (skillInput.trim()) {
                        handleAddSkill(skillInput)
                        setSkillInput('')
                }
        }

        const handleRemoveSkill = (skill: string) => {
                setSkills(prev => prev.filter(item => item !== skill))
        }

        const handleRemoveAsset = (media: FreelancerPortfolioMedia) => {
                const key = assetKey(media)
                setAssets(prev => {
                        const filtered = prev.filter(item => assetKey(item) !== key)
                        setCoverKey(current => {
                                if (!current || current !== key) return current
                                const next = filtered[0]
                                return next ? assetKey(next) : null
                        })
                        return filtered
                })
        }

        const handlePickCover = (media: FreelancerPortfolioMedia) => {
                const key = assetKey(media)
                if (!key) return
                setCoverKey(key)
        }

        const handleFilesSelected = async (files: FileList | null) => {
                if (!files || !userId) return
                const fileArray = Array.from(files)

                for (const file of fileArray) {
                        const uploadKey = `${file.name}-${file.size}-${file.lastModified}-${Date.now()}`
                        setUploadingProgress(prev => ({ ...prev, [uploadKey]: 0 }))
                        try {
                                const uploaded = await uploadFreelancerPortfolioAssetAPI({
                                        userId,
                                        file,
                                        onProgress(percent) {
                                                setUploadingProgress(prev => ({ ...prev, [uploadKey]: percent }))
                                        }
                                })
                                setAssets(prev => [...prev, uploaded])
                                setCoverKey(current => current ?? assetKey(uploaded))
                        } catch (error) {
                                console.error(error)
                        } finally {
                                setUploadingProgress(prev => {
                                        const clone = { ...prev }
                                        delete clone[uploadKey]
                                        return clone
                                })
                        }
                }

                if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                }
        }

        const effectiveCoverKey = useMemo(() => {
                if (!assets.length) return null
                if (coverKey && assets.some(asset => assetKey(asset) === coverKey)) {
                        return coverKey
                }
                const first = assets[0]
                return first ? assetKey(first) : null
        }, [assets, coverKey])

        const handleSubmit = () => {
                if (!canSave) return

                const attachments = assets
                        .filter(asset => getDisplayUrl(asset))
                        .map((asset, index) => ({
                                id: asset.id,
                                url: asset.url ?? asset.thumbnailUrl ?? '',
                                type: asset.type ?? null,
                                name: asset.name ?? null,
                                thumbnailUrl: asset.thumbnailUrl ?? null,
                                isCover: effectiveCoverKey ? assetKey(asset) === effectiveCoverKey : index === 0,
                                order: index
                        }))

                const payload = {
                        title: title.trim(),
                        overview: overview.trim() ? overview.trim() : null,
                        role: role.trim() ? role.trim() : null,
                        projectUrl: projectUrl.trim() ? projectUrl.trim() : null,
                        skills,
                        attachments
                }

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
                                        <button
                                                type='button'
                                                className='btn btn-ghost btn-circle'
                                                onClick={onClose}
                                                title='Đóng'
                                        >
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
                                                                value={overview}
                                                                onChange={event => setOverview(event.target.value)}
                                                        />
                                                </div>

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
                                                                <span className='label-text font-semibold'>Kỹ năng sử dụng (tuỳ chọn)</span>
                                                        </label>
                                                        <div className='flex flex-wrap gap-2 rounded-2xl border border-base-300 bg-base-100 p-3'>
                                                                {skills.map(skill => (
                                                                        <span key={skill} className='inline-flex items-center gap-2 rounded-full bg-base-200 px-3 py-1 text-sm font-medium'>
                                                                                {skill}
                                                                                <button
                                                                                        type='button'
                                                                                        className='btn btn-ghost btn-circle btn-xs text-base-content/60'
                                                                                        onClick={() => handleRemoveSkill(skill)}
                                                                                        title='Xoá'
                                                                                >
                                                                                        <X size={14} />
                                                                                </button>
                                                                        </span>
                                                                ))}
                                                                <input
                                                                        className='min-w-[120px] flex-1 border-none bg-transparent text-sm outline-none focus:outline-none'
                                                                        placeholder='Nhập kỹ năng và nhấn Enter'
                                                                        value={skillInput}
                                                                        onChange={event => setSkillInput(event.target.value)}
                                                                        onKeyDown={handleSkillKeyDown}
                                                                        onBlur={handleSkillBlur}
                                                                />
                                                        </div>
                                                        <p className='mt-2 text-xs text-base-content/60'>Nhấn Enter để thêm kỹ năng. Ví dụ: React, Figma, Node.js.</p>
                                                </div>
                                        </div>

                                        <div className='space-y-4'>
                                                <div>
                                                        <div className='mb-3 flex items-center justify-between'>
                                                                <span className='text-sm font-semibold text-base-content'>Hình ảnh & video</span>
                                                                <span className='text-xs text-base-content/60'>
                                                                        {assets.length}/{MAX_MEDIA_ITEMS}
                                                                </span>
                                                        </div>
                                                        <div className='grid grid-cols-2 gap-3'>
                                                                {assets.map(media => {
                                                                        const key = assetKey(media)
                                                                        const displayUrl = getDisplayUrl(media)
                                                                        const isImage = isImageAsset(media)
                                                                        return (
                                                                                <div
                                                                                        key={key}
                                                                                        className='group relative overflow-hidden rounded-2xl border border-base-200 bg-base-200/40'
                                                                                >
                                                                                        {isImage ? (
                                                                                                <img src={displayUrl} alt={media.name ?? title} className='h-36 w-full object-cover' />
                                                                                        ) : (
                                                                                                <div className='flex h-36 flex-col items-center justify-center gap-2 text-base-content/70'>
                                                                                                        <ImageIcon size={28} />
                                                                                                        <span className='text-xs font-medium'>Không thể xem trước</span>
                                                                                                </div>
                                                                                        )}
                                                                                        <button
                                                                                                type='button'
                                                                                                className='btn btn-circle btn-ghost btn-xs absolute right-2 top-2 bg-black/50 text-white backdrop-blur-sm'
                                                                                                onClick={() => handleRemoveAsset(media)}
                                                                                                title='Xoá'
                                                                                        >
                                                                                                <X size={14} />
                                                                                        </button>
                                                                                        {effectiveCoverKey === key ? (
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

                                                                {Object.entries(uploadingProgress).map(([key, percent]) => (
                                                                        <div
                                                                                key={key}
                                                                                className='flex h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-base-300 bg-base-200/40 text-sm text-base-content/70'
                                                                        >
                                                                                <Upload className='mb-2 opacity-60' />
                                                                                <span>Đang tải lên…</span>
                                                                                <progress className='progress progress-primary mt-2 w-4/5' max={100} value={percent}></progress>
                                                                        </div>
                                                                ))}
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
                                                                <span className='text-xs text-base-content/60'>Hỗ trợ JPG, PNG, WEBP, GIF, MP4, tối đa 12 tệp.</span>
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
                                        <button
                                                type='button'
                                                className='btn btn-primary'
                                                onClick={handleSubmit}
                                                disabled={!canSave || isSaving}
                                        >
                                                {isSaving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo portfolio'}
                                        </button>
                                </div>
                        </div>
                </div>
        )
}
