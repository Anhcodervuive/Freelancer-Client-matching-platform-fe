import { CalendarClock, Hash, UserRound, Clock3, FileText } from 'lucide-react'
import type { PlatformTerm, PlatformTermsSection } from '~/types/platform-terms'

type PlatformTermPreviewDialogProps = {
        open: boolean
        term?: PlatformTerm
        loading?: boolean
        onClose: () => void
}

const formatDateTime = (value?: string | null) => {
        if (!value) return '—'
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return '—'
        return date.toLocaleString('vi-VN', { hour12: false })
}

const renderMetadata = (metadata?: Record<string, unknown> | null) => {
        if (!metadata || Object.keys(metadata).length === 0) {
                return <span className='text-base-content/60'>Không có</span>
        }

        return (
                <pre className='whitespace-pre-wrap rounded-lg bg-base-200/70 p-3 text-xs font-mono text-base-content/80'>
                        {JSON.stringify(metadata, null, 2)}
                </pre>
        )
}

const renderBody = (body: unknown) => {
        if (typeof body === 'string') {
                const trimmed = body.trim()
                if (trimmed.length === 0) {
                        return <p className='text-sm text-base-content/60'>Chưa có nội dung</p>
                }

                return (
                        <div
                                className='prose prose-sm max-w-none text-base-content [&_p]:my-2'
                                dangerouslySetInnerHTML={{ __html: trimmed }}
                        />
                )
        }

        try {
                return (
                        <pre className='whitespace-pre-wrap rounded-lg bg-base-200/70 p-3 text-xs font-mono text-base-content/80'>
                                {JSON.stringify(body, null, 2)}
                        </pre>
                )
        } catch {
                return <p className='text-sm text-base-content/70'>{String(body ?? '')}</p>
        }
}

const SectionCard = ({ section, index }: { section: PlatformTermsSection; index: number }) => (
        <div className='rounded-2xl border border-base-200 bg-base-100 p-4 space-y-3'>
                <div className='flex items-center justify-between gap-3 border-b border-base-200 pb-3'>
                        <div>
                                <div className='flex items-center gap-2 text-sm font-semibold uppercase text-base-content/70'>
                                        <FileText className='size-4' /> Section {index + 1}
                                </div>
                                <div className='mt-1 text-base font-medium'>{section.title ?? section.code}</div>
                        </div>
                        <div className='text-right text-xs text-base-content/60'>
                                <div className='flex items-center justify-end gap-1'>
                                        <Hash className='size-3.5' />
                                        <span>{section.code}</span>
                                </div>
                                {section.version && (
                                        <div className='flex items-center justify-end gap-1'>
                                                <Clock3 className='size-3.5' />
                                                <span>Version {section.version}</span>
                                        </div>
                                )}
                        </div>
                </div>

                <div className='space-y-2'>
                        <p className='text-xs font-semibold uppercase text-base-content/60'>Nội dung</p>
                        {renderBody(section.body)}
                </div>

                <div className='space-y-2'>
                        <p className='text-xs font-semibold uppercase text-base-content/60'>Metadata</p>
                        {renderMetadata(section.metadata ?? undefined)}
                </div>
        </div>
)

export default function PlatformTermPreviewDialog({ open, term, loading = false, onClose }: PlatformTermPreviewDialogProps) {
        const sections = Array.isArray(term?.body?.sections) ? term?.body?.sections : []

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box max-w-4xl space-y-6'>
                                <div className='flex items-start justify-between gap-3'>
                                        <div>
                                                <h3 className='text-xl font-semibold'>{term?.title ?? 'Xem điều khoản'}</h3>
                                                <p className='text-sm text-base-content/60'>
                                                        Theo dõi nhanh nội dung và metadata của từng section trong điều khoản nền tảng.
                                                </p>
                                        </div>
                                </div>

                                {loading ? (
                                        <div className='grid h-52 place-items-center text-base-content/60'>Đang tải dữ liệu...</div>
                                ) : (
                                        <div className='space-y-5'>
                                                <div className='rounded-2xl border border-base-200 bg-base-100 p-4 grid gap-3 md:grid-cols-2'>
                                                        <div>
                                                                <p className='text-xs uppercase text-base-content/60 font-semibold'>Phiên bản</p>
                                                                <p className='mt-1 text-base font-medium'>{term?.version}</p>
                                                        </div>
                                                        <div>
                                                                <p className='text-xs uppercase text-base-content/60 font-semibold'>Trạng thái</p>
                                                                <p className='mt-1'>
                                                                        <span
                                                                                className={`badge ${
                                                                                        term?.status === 'ACTIVE'
                                                                                                ? 'badge-success'
                                                                                                : term?.status === 'RETIRED'
                                                                                                        ? 'badge-neutral'
                                                                                                        : 'badge-ghost'
                                                                                }`}
                                                                        >
                                                                                {term?.status === 'ACTIVE'
                                                                                        ? 'Đang hiệu lực'
                                                                                        : term?.status === 'RETIRED'
                                                                                                ? 'Ngừng áp dụng'
                                                                                                : 'Bản nháp'}
                                                                        </span>
                                                                </p>
                                                        </div>
                                                        <div>
                                                                <p className='text-xs uppercase text-base-content/60 font-semibold'>Hiệu lực</p>
                                                                <div className='mt-1 space-y-1 text-sm text-base-content/80'>
                                                                        <div className='flex items-center gap-2'>
                                                                                <CalendarClock className='size-4 text-primary' />
                                                                                <span>Từ: {formatDateTime(term?.effectiveFrom)}</span>
                                                                        </div>
                                                                        <div className='flex items-center gap-2'>
                                                                                <CalendarClock className='size-4 text-primary' />
                                                                                <span>Đến: {formatDateTime(term?.effectiveTo)}</span>
                                                                        </div>
                                                                </div>
                                                        </div>
                                                        <div>
                                                                <p className='text-xs uppercase text-base-content/60 font-semibold'>Cập nhật</p>
                                                                <div className='mt-1 space-y-1 text-sm text-base-content/80'>
                                                                        <div className='flex items-center gap-2'>
                                                                                <Clock3 className='size-4 text-primary' />
                                                                                <span>Lúc: {formatDateTime(term?.updatedAt)}</span>
                                                                        </div>
                                                                        {term?.updatedBy && (
                                                                                <div className='flex items-center gap-2'>
                                                                                        <UserRound className='size-4 text-primary' />
                                                                                        <span>{term.updatedBy?.name ?? term.updatedBy?.email ?? term.updatedBy?.id}</span>
                                                                                </div>
                                                                        )}
                                                                </div>
                                                        </div>
                                                        <div>
                                                                <p className='text-xs uppercase text-base-content/60 font-semibold'>Tạo</p>
                                                                <div className='mt-1 space-y-1 text-sm text-base-content/80'>
                                                                        <div className='flex items-center gap-2'>
                                                                                <Clock3 className='size-4 text-primary' />
                                                                                <span>Lúc: {formatDateTime(term?.createdAt)}</span>
                                                                        </div>
                                                                        {term?.createdBy && (
                                                                                <div className='flex items-center gap-2'>
                                                                                        <UserRound className='size-4 text-primary' />
                                                                                        <span>{term.createdBy?.name ?? term.createdBy?.email ?? term.createdBy?.id}</span>
                                                                                </div>
                                                                        )}
                                                                </div>
                                                        </div>
                                                </div>

                                                <div className='space-y-4'>
                                                        <div className='flex items-center justify-between gap-3'>
                                                                <h4 className='text-base font-semibold'>Danh sách section</h4>
                                                                <span className='badge badge-outline'>
                                                                        {sections?.length ?? 0} section
                                                                        {sections && sections.length > 1 ? 's' : ''}
                                                                </span>
                                                        </div>

                                                        {sections && sections.length > 0 ? (
                                                                <div className='space-y-4 max-h-[50vh] overflow-y-auto pr-1'>
                                                                        {sections.map((section, index) => (
                                                                                <SectionCard key={`${section.code}-${index}`} section={section} index={index} />
                                                                        ))}
                                                                </div>
                                                        ) : (
                                                                <div className='rounded-xl border border-dashed border-base-300 p-6 text-center text-sm text-base-content/60'>
                                                                        Điều khoản chưa có section nào được cấu hình.
                                                                </div>
                                                        )}
                                                </div>
                                        </div>
                                )}

                                <div className='modal-action'>
                                        <button type='button' className='btn' onClick={onClose}>
                                                Đóng
                                        </button>
                                </div>
                        </div>
                        <form method='dialog' className='modal-backdrop'>
                                <button onClick={onClose}>close</button>
                        </form>
                </dialog>
        )
}
