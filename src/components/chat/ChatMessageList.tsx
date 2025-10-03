import { CheckCheck, FileText, ImageIcon } from 'lucide-react'
import { useInView } from 'react-intersection-observer'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ChatMessage } from '~/types/chat'
import type { FetchNextPageOptions, InfiniteQueryObserverResult } from '@tanstack/react-query'
import type { ViewModel } from '~/hooks/chat/useThreadChats'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '~/redux/user/userSlice'

type ChatMessageListProps = {
	messages: ChatMessage[]
	jobTitle: string
	isFetchingNextPage: boolean
	hasNextPage: boolean
	fetchNextPage: (_options?: FetchNextPageOptions | undefined) => Promise<InfiniteQueryObserverResult<ViewModel, Error>>
}

function formatTime(date: string) {
	return new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: 'numeric'
	}).format(new Date(date))
}

export default function ChatMessageList({
	messages,
	jobTitle,
	isFetchingNextPage,
	hasNextPage,
	fetchNextPage
}: ChatMessageListProps) {
	const topRef = useRef<HTMLDivElement | null>(null)
	const currentUser = useSelector(selectCurrentUser)
	const scrollBoxRef = useRef<HTMLDivElement | null>(null)
	const [ioPaused, setIoPaused] = useState(false)
	const { ref: inViewRef, inView } = useInView({
		root: scrollBoxRef.current,
		rootMargin: '0px',
		threshold: 0,
		skip: ioPaused
	})

	const userIntentRef = useRef(false)
	const didJumpOnce = useRef(false)

	// 1) Lần đầu có dữ liệu -> nhảy xuống đáy đúng 1 lần
	useLayoutEffect(() => {
		if (didJumpOnce.current) return
		if (!scrollBoxRef.current) return
		if (messages.length === 0) return

		console.log('flag 1')
		// đợi layout xong rồi set scroll
		requestAnimationFrame(() => {
			const el = scrollBoxRef.current!
			el.scrollTop = el.scrollHeight
			didJumpOnce.current = true
		})
	}, [messages.length])

	// 2) Nếu message có ảnh/emoji làm đổi chiều cao sau paint, bồi thêm 1 nhịp
	// useEffect(() => {
	// 	if (!didJumpOnce.current) return
	// 	const el = scrollBoxRef.current
	// 	if (!el) return
	// 	console.log('flag 2')
	// 	const t = setTimeout(() => {
	// 		el.scrollTop = el.scrollHeight
	// 	}, 50)
	// 	return () => clearTimeout(t)
	// }, [messages.length])

	useEffect(() => {
		const el = scrollBoxRef.current
		if (!el) return
		const onScroll = () => {
			// user kéo lên gần đỉnh (<= 40px)
			if (el.scrollTop <= 40) userIntentRef.current = true
		}
		el.addEventListener('scroll', onScroll, { passive: true })
		return () => el.removeEventListener('scroll', onScroll)
	}, [])

	// Giữ vị trí scroll khi prepend thêm trang cũ
	const prevHeightRef = useRef<number>(0)
	useEffect(() => {
		const el = scrollBoxRef.current
		if (!el) return
		if (ioPaused) return

		// trước khi fetchNextPage (prepend), lưu height
		const onBefore = () => {
			prevHeightRef.current = el.scrollHeight
		}
		// hook đơn giản: trước khi fetchNextPage bạn gọi onBefore()
		// Ở đây demo: khi inView, trước khi fetch thực hiện onBefore()
		if (inView && hasNextPage && !isFetchingNextPage && userIntentRef.current) {
			onBefore()
			setIoPaused(true)
			fetchNextPage()
				.then(() => {
					const diff = el.scrollHeight - prevHeightRef.current
					el.scrollTop = diff + el.scrollTop // đẩy xuống lại đúng vị trí đang xem
				})
				.finally(() => requestAnimationFrame(() => setIoPaused(false)))
		}
	}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, ioPaused])

	return (
		<div
			ref={scrollBoxRef}
			className='chat-scroll flex-1 space-y-6 overflow-y-auto max-h-[60vh] overflow-x-hidden pr-2'>
			<div className='text-center text-xs font-medium uppercase tracking-wide text-slate-400'>
				Conversation started for “{jobTitle}”
			</div>
			{isFetchingNextPage && <div className='p-2 text-center text-xs opacity-60'>Tải thêm…</div>}
			{!hasNextPage && <div className='p-2 text-center text-xs opacity-40 w-full'>Hết tin nhắn cũ</div>}
			{/* sentinel */}
			{!ioPaused && (
				<div
					ref={node => {
						topRef.current = node
						inViewRef(node)
					}}
				/>
			)}

			{status === 'pending' && <div className='p-4 text-center text-sm opacity-60'>Đang tải tin nhắn…</div>}
			{messages.map(message => {
				const isMessageBelongToCurrentUser = currentUser?.id === message.senderId
				const attachmentImages = (message.attachments || []).filter(att => att.mimeType?.startsWith('image/'))
				const attachmentFiles = (message.attachments || []).filter(
					att => !att.mimeType?.startsWith('image/') && !att.mimeType?.startsWith('video/')
				)

				return (
					<div
						key={message.id}
						className={`flex flex-col gap-2 ${isMessageBelongToCurrentUser ? 'items-end' : 'items-start'}`}>
						<div className='flex items-center gap-2 text-xs text-slate-400'>
							{!isMessageBelongToCurrentUser && (
								<span className='font-semibold text-slate-500'>{message.sender.profile?.firstName}</span>
							)}
							<span>{formatTime(message.sentAt.toString())}</span>
						</div>
						<div
							className={`max-w-xl rounded-3xl border border-white/70 px-5 py-3 text-sm leading-relaxed shadow-sm shadow-primary/5 backdrop-blur ${
								isMessageBelongToCurrentUser
									? 'rounded-br-none bg-primary text-white'
									: 'rounded-bl-none bg-white/80 text-slate-700'
							}`}>
							{message.body && <p>{message.body}</p>}

							{attachmentImages.length > 0 && (
								<div className='mt-3 grid grid-cols-2 gap-3'>
									{attachmentImages.map(image => (
										<figure
											key={image.id}
											className='overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-inner shadow-primary/10'>
											<img src={image.url ?? ''} alt={image.name ?? ''} className='h-32 w-full object-cover' />
											<figcaption
												className={`flex items-center justify-between px-3 py-2 text-xs ${
													isMessageBelongToCurrentUser ? 'text-white/90' : 'text-slate-500'
												}`}>
												<span className='flex items-center gap-1 font-medium'>
													<ImageIcon className='size-3' />
													{image.name}
												</span>
												<span>{image.size}</span>
											</figcaption>
										</figure>
									))}
								</div>
							)}

							{attachmentFiles.length > 0 && (
								<div className='mt-3 space-y-2'>
									{attachmentFiles.map(file => (
										<a
											key={file.id}
											href={file.url ?? ''}
											className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-xs font-medium transition ${
												isMessageBelongToCurrentUser
													? 'border-white/40 bg-white/20 text-white hover:border-white/60 hover:bg-white/30'
													: 'border-white/70 bg-white/90 text-slate-600 hover:border-primary/20 hover:bg-primary/5'
											}`}
											download>
											<span className='flex items-center gap-2'>
												<span className='inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 bg-white/80'>
													<FileText className='size-4 text-primary' />
												</span>
												<span>{file.name}</span>
											</span>
											<span className='text-slate-400'>{file.size}</span>
										</a>
									))}
								</div>
							)}
						</div>
						<div className='flex items-center gap-2 text-xs text-slate-400'>
							<CheckCheck className='size-3' />
							<span>{formatTime(message.sentAt.toString())}</span>
						</div>
					</div>
				)
			})}
		</div>
	)
}
