import { ExternalLink, X } from 'lucide-react'
import { parseLinkLabel } from '~/utils/url'

type Props = {
	url: string
	onRemove?: () => void // có => hiện nút xoá (dùng trong edit)
	className?: string
}

export default function LinkChip({ url, onRemove, className = '' }: Props) {
	const { href, host, label, full } = parseLinkLabel(url)

        return (
                <div
                        className={[
                                'inline-flex items-center gap-1.5 px-3 py-1',
                                'rounded-full border border-white/60 bg-white/70 text-slate-600 shadow-inner shadow-white/30',
                                'transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
                                'text-sm leading-none',
                                className
                        ].join(' ')}>
                        {/* favicon (Google s2 – nhẹ, có cache) */}
                        <img
                                src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`}
                                alt=''
                                className='h-4 w-4 rounded-sm'
                                onError={e => {
                                        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                                }}
                        />

                        <a href={href} target='_blank' rel='noreferrer' title={full} className='max-w-[240px] truncate no-underline text-slate-700 hover:underline'>
                                {label}
                        </a>

                        <ExternalLink size={14} className='text-primary/70' />

                        {onRemove && (
                                <button
                                        type='button'
                                        className='btn btn-xs btn-circle btn-ghost ml-0.5 text-slate-500 hover:bg-primary/10 hover:text-primary'
                                        aria-label='Remove link'
                                        onClick={onRemove}>
                                        <X size={14} />
                                </button>
                        )}
                </div>
        )
}
