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
				'rounded-full bg-base-200 border border-base-300',
				'hover:bg-base-300 transition-colors',
				'text-sm leading-none',
				className
			].join(' ')}>
			{/* favicon (Google s2 – nhẹ, có cache) */}
			<img
				src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`}
				alt=''
				className='w-4 h-4 rounded-sm'
				onError={e => {
					;(e.currentTarget as HTMLImageElement).style.display = 'none'
				}}
			/>

			<a
				href={href}
				target='_blank'
				rel='noreferrer'
				title={full}
				className='no-underline text-base-content hover:underline max-w-[240px] truncate'>
				{label}
			</a>

			<ExternalLink size={14} className='opacity-60' />

			{onRemove && (
				<button
					type='button'
					className='btn btn-xs btn-circle btn-ghost ml-0.5'
					aria-label='Remove link'
					onClick={onRemove}>
					<X size={14} />
				</button>
			)}
		</div>
	)
}
