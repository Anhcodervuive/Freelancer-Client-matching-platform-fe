import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, CalendarClock, Clock3, FileText, Hash } from 'lucide-react'

import {
        getLatestPlatformTerms,
        getPlatformTermsByVersion,
        listPublicPlatformTerms
} from '~/apis/platform-terms.api'
import type { PlatformTerm, PlatformTermsSection } from '~/types/platform-terms'

const formatDate = (value?: string | null) => {
        if (!value) return null
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) {
                return null
        }

        return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
        })
}

const renderSectionBody = (body: unknown) => {
        if (typeof body === 'string') {
                const trimmed = body.trim()
                if (!trimmed) {
                        return (
                                <p className='text-sm text-base-content/60'>Nội dung section hiện đang trống.</p>
                        )
                }

                return (
                        <div
                                className='prose prose-sm max-w-none text-base-content [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2'
                                dangerouslySetInnerHTML={{ __html: trimmed }}
                        />
                )
        }

        if (!body) {
                return <p className='text-sm text-base-content/60'>Nội dung section hiện đang trống.</p>
        }

        try {
                return (
                        <pre className='whitespace-pre-wrap rounded-lg bg-base-200/80 p-3 text-xs font-mono text-base-content/80'>
                                {JSON.stringify(body, null, 2)}
                        </pre>
                )
        } catch {
                return <p className='text-sm text-base-content/70'>{String(body)}</p>
        }
}

const SectionCard = ({ section, index }: { section: PlatformTermsSection; index: number }) => {
        return (
                <article className='space-y-3 rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm'>
                        <header className='flex flex-col gap-2 border-b border-dashed border-base-200 pb-3 md:flex-row md:items-center md:justify-between'>
                                <div>
                                        <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                <FileText className='size-4' />
                                                Section {index + 1}
                                        </div>
                                        <h3 className='text-lg font-semibold text-base-content'>
                                                {section.title || section.code}
                                        </h3>
                                </div>
                                <div className='flex flex-wrap items-center gap-3 text-xs text-base-content/60'>
                                        <span className='inline-flex items-center gap-1'>
                                                <Hash className='size-3.5' />
                                                {section.code}
                                        </span>
                                        {section.version ? (
                                                <span className='inline-flex items-center gap-1'>
                                                        <Clock3 className='size-3.5' /> Version {section.version}
                                                </span>
                                        ) : null}
                                </div>
                        </header>

                        <div className='space-y-2'>
                                <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Nội dung</p>
                                {renderSectionBody(section.body)}
                        </div>

                        {section.metadata && Object.keys(section.metadata).length > 0 ? (
                                <div className='space-y-2'>
                                        <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>Metadata</p>
                                        <pre className='whitespace-pre-wrap rounded-lg bg-base-200/60 p-3 text-xs font-mono text-base-content/80'>
                                                {JSON.stringify(section.metadata, null, 2)}
                                        </pre>
                                </div>
                        ) : null}
                </article>
        )
}

const getSortTimestamp = (term: PlatformTerm | undefined) => {
        if (!term) return 0
        const fallbackDates = [term.effectiveFrom, term.updatedAt, term.createdAt, term.effectiveTo]
        for (const value of fallbackDates) {
                if (!value) continue
                const timestamp = new Date(value).getTime()
                if (!Number.isNaN(timestamp)) {
                        return timestamp
                }
        }

        return 0
}

const usePlatformTerms = () => {
        const latestQuery = useQuery({
                queryKey: ['platform-terms', 'public', 'latest'],
                queryFn: getLatestPlatformTerms
        })

        const listQuery = useQuery({
                queryKey: ['platform-terms', 'public', 'list'],
                queryFn: () => listPublicPlatformTerms({ page: 1, limit: 50 })
        })

        return { latestQuery, listQuery }
}

const PlatformTermsPage = () => {
        const { latestQuery, listQuery } = usePlatformTerms()
        const [selectedVersion, setSelectedVersion] = useState<'latest' | string>('latest')

        const versionItems = useMemo(() => {
                const map = new Map<string, PlatformTerm>()

                listQuery.data?.data.forEach(term => {
                        if (term?.version) {
                                map.set(term.version, term)
                        }
                })

                if (latestQuery.data?.version) {
                        map.set(latestQuery.data.version, latestQuery.data)
                }

                return Array.from(map.values()).sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a))
        }, [latestQuery.data, listQuery.data])

        const activeVersion = selectedVersion === 'latest' ? latestQuery.data?.version : selectedVersion

        const detailQuery = useQuery({
                queryKey: ['platform-terms', 'public', 'detail', selectedVersion],
                queryFn: () => getPlatformTermsByVersion(selectedVersion),
                enabled: selectedVersion !== 'latest'
        })

        const activeTerm: PlatformTerm | undefined = selectedVersion === 'latest'
                ? latestQuery.data
                : detailQuery.data

        const isLoadingActiveTerm = selectedVersion === 'latest'
                ? latestQuery.isLoading
                : detailQuery.isLoading || (detailQuery.isFetching && !detailQuery.data)

        const isFetchingActiveTerm = selectedVersion === 'latest' ? latestQuery.isFetching : detailQuery.isFetching

        const hasError = selectedVersion === 'latest' ? latestQuery.isError : detailQuery.isError

        const sections = useMemo(() => {
                if (!activeTerm?.body || typeof activeTerm.body !== 'object') return []
                const maybeSections = (activeTerm.body as Record<string, unknown>).sections
                if (!Array.isArray(maybeSections)) return []
                return maybeSections as PlatformTermsSection[]
        }, [activeTerm])

        return (
                <div className='space-y-10 pb-16'>
                        <header className='space-y-4 rounded-3xl border border-white/70 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
                                <span className='inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary'>
                                        <BookOpen className='h-4 w-4' /> Điều khoản nền tảng
                                </span>
                                <h1 className='text-3xl font-semibold text-slate-900'>Các điều khoản sử dụng nền tảng</h1>
                                <p className='max-w-3xl text-sm leading-relaxed text-slate-600'>
                                        Xem lại toàn bộ điều khoản đang áp dụng cho cộng đồng. Mỗi section chứa nội dung chi tiết và có thể khác nhau theo từng phiên bản.
                                </p>
                        </header>

                        <div className='grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]'>
                                <aside className='space-y-4 rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
                                        <div className='space-y-2'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>Phiên bản</p>
                                                <button
                                                        type='button'
                                                        onClick={() => setSelectedVersion('latest')}
                                                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                                                selectedVersion === 'latest'
                                                                        ? 'border-primary/50 bg-primary/10 text-primary'
                                                                        : 'border-slate-200/80 text-slate-600 hover:border-primary/30 hover:bg-primary/5'
                                                        }`}
                                                >
                                                        <span className='block text-sm font-semibold'>Phiên bản mới nhất</span>
                                                        <span className='mt-1 block text-xs text-slate-400'>
                                                                {latestQuery.data?.version
                                                                        ? `Đang áp dụng: ${latestQuery.data.version}`
                                                                        : latestQuery.isLoading
                                                                                ? 'Đang tải...'
                                                                                : 'Chưa có dữ liệu'}
                                                        </span>
                                                </button>
                                        </div>

                                        <div className='space-y-2'>
                                                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'>Lịch sử</p>
                                                <div className='space-y-2'>
                                                        {listQuery.isError ? (
                                                                <p className='text-sm text-error'>Không thể tải danh sách phiên bản.</p>
                                                        ) : listQuery.isLoading ? (
                                                                <div className='space-y-2'>
                                                                        {Array.from({ length: 4 }).map((_, index) => (
                                                                                <div
                                                                                        key={index}
                                                                                        className='h-12 animate-pulse rounded-2xl bg-slate-100'
                                                                                />
                                                                        ))}
                                                                </div>
                                                        ) : versionItems.length > 0 ? (
                                                                versionItems.map(term => {
                                                                        const formattedDate = formatDate(term.effectiveFrom)
                                                                        const isActive = activeVersion === term.version

                                                                        return (
                                                                                <button
                                                                                        key={term.id}
                                                                                        type='button'
                                                                                        onClick={() => setSelectedVersion(term.version)}
                                                                                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                                                                                isActive
                                                                                                        ? 'border-primary/50 bg-primary/10 text-primary'
                                                                                                        : 'border-slate-200/80 text-slate-600 hover:border-primary/30 hover:bg-primary/5'
                                                                                        }`}
                                                                                >
                                                                                        <span className='flex items-center justify-between text-sm font-semibold'>
                                                                                                <span>{term.version}</span>
                                                                                                {formattedDate ? (
                                                                                                        <span className='text-xs font-medium text-slate-400'>
                                                                                                                {formattedDate}
                                                                                                        </span>
                                                                                                ) : null}
                                                                                        </span>
                                                                                        <span className='mt-1 block text-xs text-slate-400'>
                                                                                                {term.title}
                                                                                        </span>
                                                                                </button>
                                                                        )
                                                                })
                                                        ) : (
                                                                <p className='text-sm text-slate-500'>Chưa có phiên bản nào được công bố.</p>
                                                        )}
                                                </div>
                                        </div>
                                </aside>

                                <main className='space-y-6 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
                                        {isLoadingActiveTerm ? (
                                                <div className='space-y-4'>
                                                        <div className='h-8 w-1/2 animate-pulse rounded-lg bg-slate-100' />
                                                        <div className='h-4 w-2/3 animate-pulse rounded-lg bg-slate-100' />
                                                        <div className='space-y-3'>
                                                                {Array.from({ length: 2 }).map((_, index) => (
                                                                        <div key={index} className='h-24 animate-pulse rounded-2xl bg-slate-100' />
                                                                ))}
                                                        </div>
                                                </div>
                                        ) : activeTerm ? (
                                                <div className='space-y-6'>
                                                        <header className='space-y-3 border-b border-base-200 pb-4'>
                                                                <div className='flex flex-wrap items-center justify-between gap-3'>
                                                                        <div>
                                                                                <p className='text-xs font-semibold uppercase tracking-[0.3em] text-primary'>
                                                                                        Phiên bản {activeTerm.version}
                                                                                </p>
                                                                                <h2 className='text-2xl font-semibold text-slate-900'>{activeTerm.title}</h2>
                                                                        </div>
                                                                        <div className='flex flex-col items-end gap-2 text-xs text-slate-500 md:flex-row md:items-center'>
                                                                                <span className='inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary'>
                                                                                        {activeTerm.status === 'ACTIVE'
                                                                                                ? 'Đang áp dụng'
                                                                                                : activeTerm.status === 'RETIRED'
                                                                                                        ? 'Ngừng áp dụng'
                                                                                                        : 'Bản nháp'}
                                                                                </span>
                                                                                <span className='inline-flex items-center gap-1'>
                                                                                        <CalendarClock className='size-3.5 text-primary' />
                                                                                        {formatDate(activeTerm.effectiveFrom) ?? 'Chưa có hiệu lực'}
                                                                                </span>
                                                                        </div>
                                                                </div>
                                                                <div className='flex flex-wrap items-center gap-3 text-xs text-slate-500'>
                                                                        <span className='inline-flex items-center gap-1'>
                                                                                <Clock3 className='size-3.5 text-primary' />
                                                                                Cập nhật: {formatDate(activeTerm.updatedAt) ?? '—'}
                                                                        </span>
                                                                        <span className='inline-flex items-center gap-1'>
                                                                                <CalendarClock className='size-3.5 text-primary' />
                                                                                Áp dụng từ: {formatDate(activeTerm.effectiveFrom) ?? '—'}
                                                                        </span>
                                                                        {activeTerm.effectiveTo ? (
                                                                                <span className='inline-flex items-center gap-1'>
                                                                                        <CalendarClock className='size-3.5 text-primary' />
                                                                                        Đến: {formatDate(activeTerm.effectiveTo)}
                                                                                </span>
                                                                        ) : null}
                                                                </div>
                                                        </header>

                                                        {sections.length > 0 ? (
                                                                <div className='space-y-5'>
                                                                        {sections.map((section, index) => (
                                                                                <SectionCard key={`${section.code}-${index}`} section={section} index={index} />
                                                                        ))}
                                                                </div>
                                                        ) : (
                                                                <div className='rounded-2xl border border-dashed border-base-300 p-6 text-center text-sm text-base-content/60'>
                                                                        Phiên bản này chưa có section nào được cấu hình.
                                                                </div>
                                                        )}
                                                </div>
                                        ) : hasError ? (
                                                <div className='space-y-3 text-center'>
                                                        <p className='text-base font-semibold text-error'>Không thể tải nội dung điều khoản.</p>
                                                        <p className='text-sm text-base-content/60'>Vui lòng thử lại sau.</p>
                                                </div>
                                        ) : isFetchingActiveTerm ? (
                                                <div className='space-y-4'>
                                                        <div className='h-8 w-1/2 animate-pulse rounded-lg bg-slate-100' />
                                                        <div className='h-4 w-2/3 animate-pulse rounded-lg bg-slate-100' />
                                                        <div className='space-y-3'>
                                                                {Array.from({ length: 2 }).map((_, index) => (
                                                                        <div key={index} className='h-24 animate-pulse rounded-2xl bg-slate-100' />
                                                                ))}
                                                        </div>
                                                </div>
                                        ) : (
                                                <div className='space-y-3 text-center text-sm text-base-content/60'>
                                                        Chọn một phiên bản ở bên trái để xem nội dung chi tiết.
                                                </div>
                                        )}
                                </main>
                        </div>
                </div>
        )
}

export default PlatformTermsPage
