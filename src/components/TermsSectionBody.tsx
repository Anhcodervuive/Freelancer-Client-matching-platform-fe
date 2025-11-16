import type { FC } from 'react'

import type { PlatformTermsBody } from '~/types/platform-terms'

type TermsSectionBodyProps = {
        body: PlatformTermsBody | unknown
}

const TermsSectionBody: FC<TermsSectionBodyProps> = ({ body }) => {
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

export default TermsSectionBody
