import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Eye, FileStack, Loader2, PencilLine, Plus, RefreshCcw, Search } from 'lucide-react'
import { toast } from 'react-toastify'
import { useDebounce } from '~/hooks/comons/useDebounce'
import {
        createPlatformTerm,
        getPlatformTermDetail,
        listPlatformTerms,
        updatePlatformTerm
} from '~/apis/admin/platform-terms.api'
import type {
        CreatePlatformTermPayload,
        PlatformTerm,
        PlatformTermsStatus,
        UpdatePlatformTermPayload
} from '~/types/platform-terms'
import PlatformTermFormModal, { type PlatformTermFormSubmitPayload } from './PlatformTermFormModal'
import PlatformTermPreviewDialog from './PlatformTermPreviewDialog'

const LIMIT_OPTIONS = [10, 20, 50]

const STATUS_LABEL: Record<PlatformTermsStatus, string> = {
        DRAFT: 'Bản nháp',
        ACTIVE: 'Đang hiệu lực',
        RETIRED: 'Ngừng áp dụng'
}

const STATUS_BADGE: Record<PlatformTermsStatus, string> = {
        DRAFT: 'badge-ghost',
        ACTIVE: 'badge-success',
        RETIRED: 'badge-neutral'
}

const formatDateTime = (value?: string | null) => {
        if (!value) return '—'
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return '—'
        return date.toLocaleString('vi-VN', { hour12: false })
}

type QueryKey = ['platform-terms', { page: number; limit: number; status?: PlatformTermsStatus; search?: string }]

export default function AdminPlatformTermsPage() {
        const [page, setPage] = useState(1)
        const [limit, setLimit] = useState(10)
        const [status, setStatus] = useState<PlatformTermsStatus | 'ALL'>('ALL')
        const [search, setSearch] = useState('')

        const [formOpen, setFormOpen] = useState(false)
        const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
        const [editingId, setEditingId] = useState<string | null>(null)
        const [previewId, setPreviewId] = useState<string | null>(null)

        const debouncedSearch = useDebounce(search, 400)

        const qc = useQueryClient()

        const listQuery = useQuery({
                queryKey: [
                        'platform-terms',
                        {
                                page,
                                limit,
                                status: status === 'ALL' ? undefined : status,
                                search: debouncedSearch || undefined
                        }
                ] satisfies QueryKey,
                queryFn: () =>
                        listPlatformTerms({
                                page,
                                limit,
                                status: status === 'ALL' ? undefined : status,
                                search: debouncedSearch || undefined
                        }),
                placeholderData: keepPreviousData
        })

        const editingQuery = useQuery({
                queryKey: editingId ? ['platform-term', editingId] : ['platform-term', null],
                queryFn: () => getPlatformTermDetail(editingId ?? ''),
                enabled: formOpen && formMode === 'edit' && !!editingId
        })

        const previewQuery = useQuery({
                queryKey: previewId ? ['platform-term', previewId] : ['platform-term', null],
                queryFn: () => getPlatformTermDetail(previewId ?? ''),
                enabled: !!previewId
        })

        const createMutation = useMutation({
                mutationFn: (payload: CreatePlatformTermPayload) => createPlatformTerm(payload),
                onSuccess: () => {
                        toast.success('Tạo điều khoản thành công')
                        qc.invalidateQueries({ queryKey: ['platform-terms'] })
                }
        })

        const updateMutation = useMutation({
                mutationFn: ({ termsId, payload }: { termsId: string; payload: UpdatePlatformTermPayload }) =>
                        updatePlatformTerm(termsId, payload),
                onSuccess: () => {
                        toast.success('Cập nhật điều khoản thành công')
                        qc.invalidateQueries({ queryKey: ['platform-terms'] })
                }
        })

        const total = listQuery.data?.meta.total ?? 0
        const items = listQuery.data?.data ?? []
        const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit])

        const isSubmitting = createMutation.isPending || updateMutation.isPending

        const handleSubmit = async (formPayload: PlatformTermFormSubmitPayload) => {
                if (formMode === 'create') {
                        await createMutation.mutateAsync(formPayload)
                } else if (editingId) {
                        const payload: UpdatePlatformTermPayload = {
                                version: formPayload.version,
                                title: formPayload.title,
                                status: formPayload.status,
                                effectiveFrom: formPayload.effectiveFrom,
                                effectiveTo: formPayload.effectiveTo,
                                body: formPayload.body
                        }
                        await updateMutation.mutateAsync({ termsId: editingId, payload })
                }
        }

        return (
                <div className='mx-auto max-w-6xl space-y-6'>
                        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                                <div>
                                        <h1 className='text-2xl font-semibold flex items-center gap-2'>
                                                <FileStack className='size-6 text-primary' /> Quản lý điều khoản nền tảng
                                        </h1>
                                        <p className='mt-1 text-sm text-base-content/60 max-w-2xl'>
                                                Theo dõi phiên bản điều khoản, lịch sử hiệu lực và cấu trúc section để đồng bộ với UI và API.
                                        </p>
                                </div>
                                <div className='flex items-center gap-3'>
                                        <button
                                                type='button'
                                                className='btn btn-outline gap-2'
                                                onClick={() => listQuery.refetch()}
                                                disabled={listQuery.isFetching}
                                        >
                                                {listQuery.isFetching ? (
                                                        <Loader2 className='size-4 animate-spin' />
                                                ) : (
                                                        <RefreshCcw className='size-4' />
                                                )}
                                                Làm mới
                                        </button>
                                        <button
                                                type='button'
                                                className='btn btn-primary gap-2'
                                                onClick={() => {
                                                        setFormMode('create')
                                                        setEditingId(null)
                                                        setFormOpen(true)
                                                }}
                                        >
                                                <Plus className='size-4' /> Tạo điều khoản
                                        </button>
                                </div>
                        </div>

                        <div className='rounded-2xl border border-base-200 bg-base-100 shadow-sm'>
                                <div className='border-b border-base-200 p-4'>
                                        <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px] md:items-center'>
                                                <label className='input input-bordered flex items-center gap-2'>
                                                        <Search className='size-4 text-base-content/50' />
                                                        <input
                                                                className='w-full'
                                                                placeholder='Tìm theo phiên bản hoặc tiêu đề'
                                                                value={search}
                                                                onChange={event => {
                                                                        setSearch(event.target.value)
                                                                        setPage(1)
                                                                }}
                                                        />
                                                </label>

                                                <select
                                                        className='select select-bordered'
                                                        value={status}
                                                        onChange={event => {
                                                                const next = event.target.value as PlatformTermsStatus | 'ALL'
                                                                setStatus(next)
                                                                setPage(1)
                                                        }}
                                                >
                                                        <option value='ALL'>Tất cả trạng thái</option>
                                                        <option value='DRAFT'>Bản nháp</option>
                                                        <option value='ACTIVE'>Đang hiệu lực</option>
                                                        <option value='RETIRED'>Ngừng áp dụng</option>
                                                </select>

                                                <select
                                                        className='select select-bordered'
                                                        value={limit}
                                                        onChange={event => {
                                                                setLimit(Number(event.target.value))
                                                                setPage(1)
                                                        }}
                                                >
                                                        {LIMIT_OPTIONS.map(option => (
                                                                <option key={option} value={option}>
                                                                        {option} / trang
                                                                </option>
                                                        ))}
                                                </select>
                                        </div>
                                </div>

                                <div className='overflow-x-auto'>
                                        <table className='table'>
                                                <thead>
                                                        <tr>
                                                                <th>#</th>
                                                                <th>Phiên bản</th>
                                                                <th>Tiêu đề</th>
                                                                <th>Trạng thái</th>
                                                                <th>Hiệu lực</th>
                                                                <th>Section</th>
                                                                <th>Cập nhật</th>
                                                                <th></th>
                                                        </tr>
                                                </thead>
                                                <tbody>
                                                        {listQuery.isLoading && (
                                                                <tr>
                                                                        <td colSpan={8} className='py-12 text-center text-base-content/60'>
                                                                                <Loader2 className='mx-auto size-6 animate-spin' />
                                                                                <p className='mt-2 text-sm'>Đang tải danh sách điều khoản...</p>
                                                                        </td>
                                                                </tr>
                                                        )}

                                                        {!listQuery.isLoading && items.length === 0 && (
                                                                <tr>
                                                                        <td colSpan={8} className='py-12 text-center text-base-content/60'>
                                                                                <div className='flex flex-col items-center gap-2'>
                                                                                        <AlertTriangle className='size-6 text-warning' />
                                                                                        <p>Không tìm thấy điều khoản nào</p>
                                                                                </div>
                                                                        </td>
                                                                </tr>
                                                        )}

                                                        {items.map((term: PlatformTerm, index) => {
                                                                const sections = Array.isArray(term.body?.sections) ? term.body?.sections : []
                                                                return (
                                                                        <tr key={term.id} className='hover'>
                                                                                <td>{(page - 1) * limit + index + 1}</td>
                                                                                <td className='font-medium'>{term.version}</td>
                                                                                <td>
                                                                                        <div>
                                                                                                <p className='font-medium'>{term.title}</p>
                                                                                                <p className='text-xs text-base-content/60 truncate max-w-xs'>
                                                                                                        {term.body && typeof term.body === 'object' && 'sections' in term.body
                                                                                                                ? `${sections?.length ?? 0} section`
                                                                                                                : 'Đang sử dụng cấu trúc tự do'}
                                                                                                </p>
                                                                                        </div>
                                                                                </td>
                                                                                <td>
                                                                                        <span className={`badge ${STATUS_BADGE[term.status]}`}>{STATUS_LABEL[term.status]}</span>
                                                                                </td>
                                                                                <td className='text-sm text-base-content/70'>
                                                                                        <div>Bắt đầu: {formatDateTime(term.effectiveFrom)}</div>
                                                                                        <div>Kết thúc: {formatDateTime(term.effectiveTo)}</div>
                                                                                </td>
                                                                                <td>{sections?.length ?? 0}</td>
                                                                                <td className='text-sm text-base-content/70'>{formatDateTime(term.updatedAt)}</td>
                                                                                <td>
                                                                                        <div className='flex items-center gap-2 justify-end'>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-ghost btn-sm gap-2'
                                                                                                        onClick={() => {
                                                                                                                setPreviewId(term.id)
                                                                                                        }}
                                                                                                >
                                                                                                        <Eye className='size-4' /> Xem
                                                                                                </button>
                                                                                                <button
                                                                                                        type='button'
                                                                                                        className='btn btn-outline btn-sm gap-2'
                                                                                                        onClick={() => {
                                                                                                                setFormMode('edit')
                                                                                                                setEditingId(term.id)
                                                                                                                setFormOpen(true)
                                                                                                        }}
                                                                                                >
                                                                                                        <PencilLine className='size-4' /> Sửa
                                                                                                </button>
                                                                                        </div>
                                                                                </td>
                                                                        </tr>
                                                                )
                                                        })}
                                                </tbody>
                                        </table>
                                </div>

                                {pages > 1 && (
                                        <div className='flex items-center justify-between border-t border-base-200 p-4 text-sm text-base-content/70'>
                                                <div>
                                                        Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)} trong tổng số {total} điều khoản
                                                </div>
                                                <div className='join'>
                                                        <button
                                                                type='button'
                                                                className='btn join-item'
                                                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                                                disabled={page === 1}
                                                        >
                                                                «
                                                        </button>
                                                        <button className='btn join-item btn-ghost no-animation'>Trang {page} / {pages}</button>
                                                        <button
                                                                type='button'
                                                                className='btn join-item'
                                                                onClick={() => setPage(prev => Math.min(pages, prev + 1))}
                                                                disabled={page === pages}
                                                        >
                                                                »
                                                        </button>
                                                </div>
                                        </div>
                                )}
                        </div>

                        <PlatformTermFormModal
                                open={formOpen}
                                mode={formMode}
                                initialTerm={formMode === 'edit' ? editingQuery.data : undefined}
                                loading={formMode === 'edit' && editingQuery.isLoading}
                                submitting={isSubmitting}
                                onClose={() => {
                                        setFormOpen(false)
                                        setEditingId(null)
                                        setFormMode('create')
                                }}
                                onSubmit={handleSubmit}
                        />

                        <PlatformTermPreviewDialog
                                open={!!previewId}
                                term={previewQuery.data}
                                loading={previewQuery.isLoading}
                                onClose={() => setPreviewId(null)}
                        />
                </div>
        )
}
