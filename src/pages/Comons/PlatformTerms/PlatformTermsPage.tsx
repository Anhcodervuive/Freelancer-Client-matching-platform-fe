import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, FileText } from 'lucide-react'

import { getLatestPlatformTerms } from '~/apis/platform-terms.api'
import type { PlatformTerm, PlatformTermsSection } from '~/types/platform-terms'

const renderSectionBody = (body: unknown) => {
        if (typeof body === 'string') {
                const trimmed = body.trim()
                if (!trimmed) {
                        return <p className='text-sm text-slate-500'>Nội dung section hiện đang trống.</p>
                }

                return (
                        <div
                                className='prose prose-sm max-w-none text-slate-700 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_p]:my-3 [&_ul]:my-3 [&_ol]:my-3'
                                dangerouslySetInnerHTML={{ __html: trimmed }}
                        />
                )
        }

        if (!body) {
                return <p className='text-sm text-slate-500'>Nội dung section hiện đang trống.</p>
        }

        try {
                return (
                        <pre className='whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs font-mono text-slate-500'>
                                {JSON.stringify(body, null, 2)}
                        </pre>
                )
        } catch {
                return <p className='text-sm text-slate-500'>{String(body)}</p>
        }
}

const PlatformTermsPage = () => {
        const latestQuery = useQuery({
                queryKey: ['platform-terms', 'public', 'latest'],
                queryFn: getLatestPlatformTerms
        })

        const activeTerm: PlatformTerm | undefined = latestQuery.data
        const isLoading = latestQuery.isLoading
        const isFetching = latestQuery.isFetching
        const hasError = latestQuery.isError

        const sections = useMemo(() => {
                if (!activeTerm?.body || typeof activeTerm.body !== 'object') return []
                const maybeSections = (activeTerm.body as Record<string, unknown>).sections
                if (!Array.isArray(maybeSections)) return []
                return maybeSections as PlatformTermsSection[]
        }, [activeTerm])

        return (
                <div className='mx-auto w-full max-w-5xl space-y-12 pb-16 pt-10'>
                        <header className='space-y-4 rounded-3xl border border-slate-100 bg-white/95 p-8 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm'>
                                <span className='inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white'>
                                        <BookOpen className='h-4 w-4' /> Điều khoản sử dụng
                                </span>
                                <div className='space-y-2'>
                                        <h1 className='text-3xl font-semibold text-slate-900'>Điều khoản nền tảng</h1>
                                        {activeTerm?.version ? (
                                                <p className='text-sm text-slate-500'>Phiên bản {activeTerm.version}</p>
                                        ) : null}
                                </div>
                                <p className='max-w-3xl text-sm leading-relaxed text-slate-600'>Vui lòng đọc kỹ toàn bộ điều khoản bên dưới để nắm rõ trách nhiệm và quyền lợi khi sử dụng nền tảng.</p>
                        </header>

                        <div className='grid gap-8 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]'>
                                <aside className='space-y-4 rounded-3xl border border-slate-100 bg-white/95 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur-sm'>
                                        <p className='text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>Mục lục</p>
                                        {isLoading ? (
                                                <div className='space-y-2'>
                                                        {Array.from({ length: 4 }).map((_, index) => (
                                                                <div key={index} className='h-10 animate-pulse rounded-xl bg-slate-100' />
                                                        ))}
                                                </div>
                                        ) : sections.length > 0 ? (
                                                <ol className='space-y-2 text-sm text-slate-600'>
                                                        {sections.map((section, index) => (
                                                                <li key={`${section.code ?? 'section'}-${index}`}>
                                                                        <a
                                                                                className='flex items-start gap-2 rounded-xl px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900'
                                                                                href={`#section-${index + 1}`}
                                                                        >
                                                                                <span className='mt-0.5 text-xs font-semibold text-slate-400'>
                                                                                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                                                                                </span>
                                                                                <span className='flex-1'>{section.title || section.code || `Section ${index + 1}`}</span>
                                                                        </a>
                                                                </li>
                                                        ))}
                                                </ol>
                                        ) : (
                                                <p className='text-sm text-slate-500'>Hiện chưa có mục lục cho phiên bản này.</p>
                                        )}
                                </aside>

                                <main className='space-y-8 rounded-3xl border border-slate-100 bg-white/95 p-8 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm'>
                                        {isLoading ? (
                                                <div className='space-y-4'>
                                                        <div className='h-8 w-1/2 animate-pulse rounded-lg bg-slate-100' />
                                                        <div className='h-4 w-2/3 animate-pulse rounded-lg bg-slate-100' />
                                                        <div className='space-y-3'>
                                                                {Array.from({ length: 3 }).map((_, index) => (
                                                                        <div key={index} className='h-24 animate-pulse rounded-2xl bg-slate-100' />
                                                                ))}
                                                        </div>
                                                </div>
                                        ) : activeTerm ? (
                                                <div className='space-y-8'>
                                                        <header className='space-y-2 border-b border-slate-200 pb-6'>
                                                                <h2 className='text-2xl font-semibold text-slate-900'>{activeTerm.title}</h2>
                                                                <p className='text-sm text-slate-600'>Các điều khoản được chia theo từng mục cụ thể để bạn dễ dàng tra cứu.</p>
                                                        </header>

                                                        {sections.length > 0 ? (
                                                                <div className='space-y-12'>
                                                                        {sections.map((section, index) => (
                                                                                <article
                                                                                        key={`${section.code ?? 'section'}-${index}`}
                                                                                        id={`section-${index + 1}`}
                                                                                        className='scroll-mt-24 space-y-4 border-b border-slate-200 pb-12 last:border-b-0 last:pb-0'
                                                                                >
                                                                                        <header className='space-y-2'>
                                                                                                <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
                                                                                                        <FileText className='h-4 w-4 text-slate-500' />
                                                                                                        Section {index + 1}
                                                                                                </div>
                                                                                                <h3 className='text-xl font-semibold text-slate-900'>
                                                                                                        {section.title || section.code || `Section ${index + 1}`}
                                                                                                </h3>
                                                                                        </header>

                                                                                        {renderSectionBody(section.body)}
                                                                                </article>
                                                                        ))}
                                                                </div>
                                                        ) : (
                                                                <div className='rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500'>
                                                                        Phiên bản này chưa có mục nội dung nào được công bố.
                                                                </div>
                                                        )}
                                                </div>
                                        ) : hasError ? (
                                                <div className='space-y-3 text-center'>
                                                        <p className='text-base font-semibold text-error'>Không thể tải nội dung điều khoản.</p>
                                                        <p className='text-sm text-slate-500'>Vui lòng thử lại sau.</p>
                                                </div>
                                        ) : isFetching ? (
                                                <div className='space-y-4'>
                                                        <div className='h-8 w-1/2 animate-pulse rounded-lg bg-slate-100' />
                                                        <div className='h-4 w-2/3 animate-pulse rounded-lg bg-slate-100' />
                                                        <div className='space-y-3'>
                                                                {Array.from({ length: 3 }).map((_, index) => (
                                                                        <div key={index} className='h-24 animate-pulse rounded-2xl bg-slate-100' />
                                                                ))}
                                                        </div>
                                                </div>
                                        ) : (
                                                <div className='space-y-3 text-center text-sm text-slate-500'>
                                                        Hiện chưa có điều khoản công khai nào.
                                                </div>
                                        )}
                                </main>
                        </div>
                </div>
        )
}

export default PlatformTermsPage
