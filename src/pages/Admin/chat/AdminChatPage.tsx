import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ChatMessageList from '~/components/chat/ChatMessageList'
import ChatComposer from '~/components/chat/ChatComposer'
import JobChatSidebar from '~/components/chat/JobChatSidebar'
import JobChatHeader from '~/components/chat/JobChatHeader'
import ChatLoadingState from '~/components/chat/ChatLoadingState'
import useThreadChats from '~/hooks/chat/useThreadChats'
import type { chatThread } from '~/types/chat'
import { uploadDirect } from '~/utils/directUploader'

const shimmerBaseClass =
        "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:content-[''] before:pointer-events-none before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent"

const renderMessagePlaceholder = (items: number) =>
        Array.from({ length: items }).map((_, index) => (
                <div key={`admin-message-skeleton-${index}`} className='flex flex-col gap-3'>
                        <div className={`w-fit max-w-[80%] rounded-3xl bg-white/85 px-6 py-4 shadow ${shimmerBaseClass}`}>
                                <div className='flex flex-col gap-2'>
                                        <div className='h-3.5 w-32 rounded-full bg-slate-200/70'></div>
                                        <div className='h-3 w-40 rounded-full bg-slate-200/60'></div>
                                        <div className='h-3 w-28 rounded-full bg-slate-200/50'></div>
                                </div>
                        </div>
                </div>
        ))

export default function AdminChatPage() {
        const {
                threadChats: threadChatsRes,
                isLoadingThreadChats,
                threadChatError,
                participantOnlineIds,
                joinChat,
                typingMessage,
                joinThreadRes,
                typingUserList,
                sendMessage,
                isSendingMessage,
                messageListQuery
        } = useThreadChats({
                limit: 10,
                page: 1,
                search: undefined,
                includeLastMessage: true,
                includeParticipants: true
        })
        const [searchParams, setSearchParams] = useSearchParams()
        const threadIdParam = searchParams.get('threadId') ?? undefined
        const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(threadIdParam ?? undefined)
        const [searchTerm, setSearchTerm] = useState('')

        const activeThread = useMemo<chatThread | undefined>(() => {
                const active = threadChatsRes?.data.find(thread => thread.id === selectedThreadId)

                if (active) {
                        return active
                }

                return undefined
        }, [selectedThreadId, threadChatsRes?.data])

        useEffect(() => {
                const threads = threadChatsRes?.data ?? []

                if (!threads.length) {
                        setSelectedThreadId(undefined)
                        return
                }

                if (threadIdParam && threads.some(thread => thread.id === threadIdParam)) {
                        setSelectedThreadId(prev => (prev === threadIdParam ? prev : threadIdParam))
                        return
                }

                setSelectedThreadId(prev => {
                        if (prev && threads.some(thread => thread.id === prev)) {
                                return prev
                        }
                        return threads[0]?.id
                })
        }, [threadChatsRes?.data, threadIdParam])

        useEffect(() => {
                if (!selectedThreadId) {
                        if (threadIdParam) {
                                setSearchParams(prev => {
                                        const next = new URLSearchParams(prev)
                                        next.delete('threadId')
                                        return next
                                }, { replace: true })
                        }
                        return
                }

                if (threadIdParam === selectedThreadId) {
                        return
                }

                setSearchParams(prev => {
                        const next = new URLSearchParams(prev)
                        next.set('threadId', selectedThreadId)
                        return next
                }, { replace: true })
        }, [selectedThreadId, threadIdParam, setSearchParams])

        useEffect(() => {
                if (!selectedThreadId) return
                joinChat({ threadId: selectedThreadId })
        }, [joinChat, selectedThreadId])

        const handleTypingMessage = (isTyping: boolean) => {
                typingMessage({ isTyping, threadId: joinThreadRes?.data?.thread.id ?? '' })
        }

        const handleSendMessage = async (message: string, files: File[]) => {
                if (!joinThreadRes?.data?.thread.id) return
                if (files.length > 0) {
                        const uploadPromise = files.map(file => uploadDirect(file, joinThreadRes?.data?.thread.id ?? ''))
                        const result = await Promise.all(uploadPromise)
                        sendMessage(message, result)
                } else {
                        sendMessage(message, [])
                }
        }

        if (isLoadingThreadChats) {
                return (
                        <div className='rounded-3xl border border-base-200 bg-base-100/80 p-6 shadow-lg'>
                                <ChatLoadingState />
                        </div>
                )
        }

        if (threadChatError) {
                return <h1>Chat error</h1>
        }

        if (!activeThread) {
                return (
                        <div className='rounded-3xl border border-base-200 bg-base-100 p-10 text-center text-base-content/70 shadow-lg'>
                                <p>No conversations available. Select a thread from the sidebar to begin monitoring.</p>
                        </div>
                )
        }

        return (
                <div className='grid gap-4 lg:grid-cols-[280px_minmax(0,_1fr)] 2xl:grid-cols-[320px_minmax(0,_1fr)]'>
                        <aside className='rounded-3xl border border-base-200 bg-base-100 shadow-lg'>
                                <JobChatSidebar
                                        threads={threadChatsRes?.data}
                                        selectedThreadId={activeThread.id}
                                        participantOnlineIds={participantOnlineIds}
                                        onSelectThread={(id: string) => {
                                                setSelectedThreadId(id)
                                        }}
                                        searchTerm={searchTerm}
                                        onSearchTermChange={setSearchTerm}
                                />
                        </aside>

                        <section className='flex min-h-[600px] flex-col gap-4 rounded-3xl border border-base-200 bg-base-100 p-4 shadow-lg'>
                                <div className='flex flex-col gap-2 rounded-2xl border border-base-200 bg-base-100/80 p-4 shadow-inner'>
                                        <div className='flex items-center justify-between gap-3'>
                                                <h2 className='text-lg font-semibold text-base-content'>Admin conversation oversight</h2>
                                                <span className='text-xs font-medium uppercase tracking-wide text-primary'>beta</span>
                                        </div>
                                        <p className='text-sm text-base-content/70'>
                                                This workspace reuses the freelancer-client chat tools so you can observe and join discussions.
                                        </p>
                                </div>
                                <JobChatHeader thread={activeThread} />
                                {!joinThreadRes || messageListQuery.isError || messageListQuery.isLoading || !messageListQuery.data ? (
                                        <div className='flex flex-1 min-h-0 flex-col overflow-hidden rounded-3xl border border-base-200 bg-base-100/80 p-4 shadow-inner'>
                                                {renderMessagePlaceholder(4)}
                                        </div>
                                ) : joinThreadRes.success ? (
                                        <div className='flex flex-1 min-h-0 flex-col overflow-hidden rounded-3xl border border-base-200 bg-base-100/80 p-4 shadow-inner'>
                                                <ChatMessageList
                                                        hasNextPage={messageListQuery.data.hasMore}
                                                        isFetchingNextPage={messageListQuery.isFetchingNextPage}
                                                        fetchNextPage={messageListQuery.fetchNextPage}
                                                        messages={messageListQuery?.data?.items ?? []}
                                                        jobTitle={activeThread.jobPost?.title ?? ''}
                                                />
                                                <ChatComposer
                                                        onTyping={handleTypingMessage}
                                                        typingUserList={typingUserList}
                                                        onSendMessage={handleSendMessage}
                                                        isSendingMessage={isSendingMessage}
                                                />
                                        </div>
                                ) : (
                                        <div className='rounded-3xl border border-error/30 bg-error/10 p-6 text-sm text-error'>Có lỗi xảy ra</div>
                                )}
                        </section>
                </div>
        )
}
