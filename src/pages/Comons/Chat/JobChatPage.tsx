import { useEffect, useMemo, useState } from 'react'
import ChatMessageList from '~/components/chat/ChatMessageList'
import ChatComposer from '~/components/chat/ChatComposer'
import JobChatSidebar from '~/components/chat/JobChatSidebar'
import JobSummaryPanel from '~/components/chat/JobSummaryPanel'
import JobChatHeader from '~/components/chat/JobChatHeader'
import ChatLoadingState from '~/components/chat/ChatLoadingState'
import type { ChatAttachment, ChatMessage, JobMilestone } from '~/components/chat/types'
import useThreadChats from '~/hooks/chat/useThreadChats'
import type { chatThread } from '~/types/chat'

const milestonesByThread: Record<string, JobMilestone[]> = {
	'thread-1': [
		{
			id: 'ms-1',
			title: 'Research & wireframes',
			dueDate: '2024-09-20T17:00:00Z',
			amount: '$900',
			status: 'completed'
		},
		{
			id: 'ms-2',
			title: 'High-fidelity desktop designs',
			dueDate: '2024-09-27T17:00:00Z',
			amount: '$1,400',
			status: 'inReview'
		},
		{
			id: 'ms-3',
			title: 'Mobile responsive screens',
			dueDate: '2024-10-03T17:00:00Z',
			amount: '$900',
			status: 'upcoming'
		}
	],
	'thread-2': [
		{
			id: 'ms-4',
			title: 'Smoke test checklist',
			dueDate: '2024-09-19T09:00:00Z',
			amount: '$250',
			status: 'completed'
		},
		{
			id: 'ms-5',
			title: 'Regression cycle',
			dueDate: '2024-09-25T09:00:00Z',
			amount: '$400',
			status: 'inReview'
		},
		{
			id: 'ms-6',
			title: 'Beta testing report',
			dueDate: '2024-10-02T09:00:00Z',
			amount: '$400',
			status: 'upcoming'
		}
	],
	'thread-3': [
		{
			id: 'ms-7',
			title: 'Analytics audit',
			dueDate: '2024-09-22T12:00:00Z',
			amount: '$250',
			status: 'upcoming'
		},
		{
			id: 'ms-8',
			title: 'Speed optimisation fixes',
			dueDate: '2024-09-29T12:00:00Z',
			amount: '$300',
			status: 'upcoming'
		},
		{
			id: 'ms-9',
			title: 'Conversion improvements',
			dueDate: '2024-10-06T12:00:00Z',
			amount: '$200',
			status: 'upcoming'
		}
	]
}

const messagesByThread: Record<string, ChatMessage[]> = {
	'thread-1': [
		{
			id: 'msg-1',
			senderRole: 'client',
			senderName: 'Linh Tran',
			content:
				'Morning Tuấn! We loved the hero exploration from last round. Can you also explore how the pricing block handles 3 plans?',
			sentAt: '2024-09-18T08:15:00Z',
			status: 'read'
		},
		{
			id: 'msg-2',
			senderRole: 'freelancer',
			senderName: 'Tuấn Nguyễn',
			content:
				"Absolutely. I've prepared two alternatives for the pricing section and polished the onboarding walkthrough.",
			sentAt: '2024-09-18T09:02:00Z',
			status: 'read',
			attachments: [
				{
					id: 'att-1',
					type: 'image',
					name: 'onboarding-step-01.png',
					url: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=640&q=80',
					previewUrl: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=640&q=80',
					size: '1.2 MB',
					uploadedAt: '2024-09-18T09:01:00Z'
				},
				{
					id: 'att-2',
					type: 'image',
					name: 'pricing-variant-a.png',
					url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=640&q=80',
					previewUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=640&q=80',
					size: '980 KB',
					uploadedAt: '2024-09-18T09:01:30Z'
				}
			]
		},
		{
			id: 'msg-3',
			senderRole: 'client',
			senderName: 'Linh Tran',
			content:
				'Variant A feels closer to what we need. Could you also include a testimonial slider below the plans? We have copy ready.',
			sentAt: '2024-09-18T11:24:00Z',
			status: 'delivered'
		},
		{
			id: 'msg-4',
			senderRole: 'freelancer',
			senderName: 'Tuấn Nguyễn',
			content: 'Sure thing! Sharing the updated layout and a checklist of pending tasks before Friday.',
			sentAt: '2024-09-18T12:05:00Z',
			status: 'sent',
			attachments: [
				{
					id: 'att-3',
					type: 'file',
					name: 'worklog-week-09.pdf',
					url: '#',
					size: '340 KB',
					uploadedAt: '2024-09-18T12:04:30Z'
				},
				{
					id: 'att-4',
					type: 'file',
					name: 'qa-checklist.xlsx',
					url: '#',
					size: '210 KB',
					uploadedAt: '2024-09-18T12:04:45Z'
				}
			]
		}
	],
	'thread-2': [
		{
			id: 'msg-5',
			senderRole: 'client',
			senderName: 'Hoàng Phạm',
			content: 'Sprint 12 build is uploaded. Focus this round on push notifications and offline mode.',
			sentAt: '2024-09-17T06:50:00Z',
			status: 'read'
		},
		{
			id: 'msg-6',
			senderRole: 'freelancer',
			senderName: 'Lan Phương',
			content: 'Got it. Smoke tests are done. Uploading the regression deck + annotated sheet for bug priorities.',
			sentAt: '2024-09-17T07:30:00Z',
			status: 'read',
			attachments: [
				{
					id: 'att-5',
					type: 'file',
					name: 'regression-cycle-12.pdf',
					url: '#',
					size: '1.8 MB',
					uploadedAt: '2024-09-17T07:25:00Z'
				},
				{
					id: 'att-6',
					type: 'file',
					name: 'bugs-priority.xlsx',
					url: '#',
					size: '620 KB',
					uploadedAt: '2024-09-17T07:26:00Z'
				}
			]
		}
	],
	'thread-3': [
		{
			id: 'msg-7',
			senderRole: 'freelancer',
			senderName: 'Minh Châu',
			content:
				'Here is the proposal outlining the audit scope. Let me know if the milestone split aligns with your plan.',
			sentAt: '2024-09-15T08:10:00Z',
			status: 'sent',
			attachments: [
				{
					id: 'att-7',
					type: 'file',
					name: 'shopify-audit-proposal.pdf',
					url: '#',
					size: '540 KB',
					uploadedAt: '2024-09-15T08:08:00Z'
				}
			]
		}
	]
}

const shimmerBaseClass =
	"relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:content-[''] before:pointer-events-none before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent"

const renderMessagePlaceholder = (items: number) =>
	Array.from({ length: items }).map((_, index) => (
		<div key={`message-skeleton-${index}`} className='flex flex-col gap-3'>
			<div className={`w-fit max-w-[80%] rounded-3xl bg-white/85 px-6 py-4 shadow ${shimmerBaseClass}`}>
				<div className='flex flex-col gap-2'>
					<div className='h-3.5 w-32 rounded-full bg-slate-200/70'></div>
					<div className='h-3 w-40 rounded-full bg-slate-200/60'></div>
					<div className='h-3 w-28 rounded-full bg-slate-200/50'></div>
				</div>
			</div>
		</div>
	))

export default function JobChatPage() {
	const {
		threadChats: threadChatsRes,
		isLoadingThreadChats,
		threadChatError,
		participantOnlineIds,
		joinChat,
		typingMessage,
		joinThreadRes,
		typingUserList,
		messageListQuery
	} = useThreadChats({
		limit: 10,
		page: 1,
		search: undefined,
		includeLastMessage: true,
		includeParticipants: true
	})
	const [selectedThreadId, setSelectedThreadId] = useState(threadChatsRes?.data?.[0].id)
	const [searchTerm, setSearchTerm] = useState('')
	const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false)

	const activeThread = useMemo<chatThread | undefined>(() => {
		const active = threadChatsRes?.data.find(thread => thread.id === selectedThreadId)

		if (active) {
			return active
		}

		return undefined
	}, [selectedThreadId, threadChatsRes?.data])

	useEffect(() => {
		if (threadChatsRes && threadChatsRes?.data?.length > 0 && !selectedThreadId) {
			setSelectedThreadId(threadChatsRes?.data?.[0].id)
			console.log('threadChatsRes', threadChatsRes)
			joinChat({ threadId: threadChatsRes?.data[0].id })
		}
	}, [joinChat, selectedThreadId, threadChatsRes])

	const messages = useMemo<ChatMessage[]>(() => {
		if (!activeThread) {
			return []
		}
		return [...(messagesByThread[activeThread.id] ?? [])].sort(
			(a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
		)
	}, [activeThread])

	const sharedAttachments = useMemo<ChatAttachment[]>(() => {
		return messages.flatMap(message => message.attachments ?? [])
	}, [messages])

	const handleTypingMessage = (isTyping: boolean) => {
		typingMessage({ isTyping, threadId: joinThreadRes?.data?.thread.id ?? '' })
	}

	const milestones = useMemo<JobMilestone[]>(() => {
		if (!activeThread) {
			return []
		}
		return milestonesByThread[activeThread.id] ?? []
	}, [activeThread])

	if (isLoadingThreadChats) {
		return <ChatLoadingState showSummaryPanel />
	}

	if (threadChatError) {
		return <h1>Chat error</h1>
	}

	if (!activeThread) {
		return (
			<div className='rounded-3xl border border-white/60 bg-white/80 p-10 text-center text-slate-500 shadow-[0_20px_60px_rgba(15,23,42,0.08)]'>
				<p>No job conversations yet. Once you have an active contract, it will appear here.</p>
			</div>
		)
	}

	const gridClassName = `grid h-full min-h-0 w-full gap-6 lg:grid-cols-[260px_minmax(0,_1fr)] ${
		isSummaryCollapsed
			? 'xl:grid-cols-[260px_minmax(0,_1.4fr)_88px] 2xl:grid-cols-[280px_minmax(0,_1.6fr)_96px]'
			: 'xl:grid-cols-[260px_minmax(0,_1.6fr)_300px] 2xl:grid-cols-[280px_minmax(0,_1.9fr)_340px]'
	}`

	return (
		<div className={gridClassName}>
			<JobChatSidebar
				threads={threadChatsRes?.data}
				selectedThreadId={activeThread.id}
				participantOnlineIds={participantOnlineIds}
				onSelectThread={(selectedThreadId: string) => {
					setSelectedThreadId(selectedThreadId)
					joinChat({
						threadId: selectedThreadId
					})
				}}
				searchTerm={searchTerm}
				onSearchTermChange={setSearchTerm}
			/>

			<section className='flex h-full min-h-0 flex-col gap-4 rounded-3xl border border-white/60 bg-white/75 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur'>
				<JobChatHeader thread={activeThread} />
				{!joinThreadRes ||
				messageListQuery.isError ||
				messageListQuery.isLoading ||
				!messageListQuery.data ||
				messageListQuery.data?.items.length === 0 ? (
					renderMessagePlaceholder(4)
				) : joinThreadRes.success ? (
					<div className='flex flex-1 min-h-0 flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-4 shadow-inner shadow-primary/5'>
						<ChatMessageList
							hasNextPage={messageListQuery.data.hasMore}
							isFetchingNextPage={messageListQuery.isFetchingNextPage}
							fetchNextPage={messageListQuery.fetchNextPage}
							messages={messageListQuery?.data?.items ?? []}
							jobTitle={activeThread.jobPost?.title ?? ''}
						/>
						<ChatComposer onTyping={handleTypingMessage} typingUserList={typingUserList} />
					</div>
				) : (
					<div>Có lỗi xảy ra</div>
				)}
			</section>

			<JobSummaryPanel
				thread={activeThread}
				milestones={milestones}
				attachments={sharedAttachments}
				isCollapsed={isSummaryCollapsed}
				onToggleCollapse={() => setIsSummaryCollapsed(previous => !previous)}
			/>
		</div>
	)
}
