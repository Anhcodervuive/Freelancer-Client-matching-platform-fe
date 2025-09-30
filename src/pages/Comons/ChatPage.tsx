import { useMemo, useState } from 'react'
import { MessageSquare, Plus, Search, Send } from 'lucide-react'

interface ConversationMessage {
        id: string
        sender: 'me' | 'contact'
        content: string
        timestamp: string
}

interface Conversation {
        id: string
        name: string
        title: string
        status: 'online' | 'offline' | 'away'
        lastActivity: string
        lastMessagePreview: string
        unreadCount?: number
        accent: 'primary' | 'secondary' | 'accent'
        messages: ConversationMessage[]
}

const conversations: Conversation[] = [
        {
                id: 'aurora-studio',
                name: 'Aurora Studio',
                title: 'Brand design collective',
                status: 'online',
                lastActivity: '2024-03-18T09:30:00.000Z',
                lastMessagePreview:
                        'We adjusted the moodboard based on your notes and can review the concepts this afternoon.',
                unreadCount: 2,
                accent: 'primary',
                messages: [
                        {
                                id: 'm-aurora-1',
                                sender: 'contact',
                                content:
                                        'Good morning! We refined the brand palette with the warmer neutrals you requested. Free to walk through at 3 PM?',
                                timestamp: '2024-03-18T08:45:00.000Z'
                        },
                        {
                                id: 'm-aurora-2',
                                sender: 'me',
                                content:
                                        'That sounds perfect. Please also export the latest moodboard as a PDF so I can share it internally.',
                                timestamp: '2024-03-18T08:51:00.000Z'
                        },
                        {
                                id: 'm-aurora-3',
                                sender: 'contact',
                                content: 'Absolutely. Uploading the PDF now and will send calendar invite for 3 PM.',
                                timestamp: '2024-03-18T09:02:00.000Z'
                        },
                        {
                                id: 'm-aurora-4',
                                sender: 'me',
                                content: 'Received both—thanks team! Chat at 3 PM.',
                                timestamp: '2024-03-18T09:05:00.000Z'
                        }
                ]
        },
        {
                id: 'pixel-foundry',
                name: 'Pixel Foundry',
                title: 'Frontend engineering duo',
                status: 'away',
                lastActivity: '2024-03-17T14:20:00.000Z',
                lastMessagePreview: 'Pushed the responsive fixes and happy to tackle the dashboard animations next.',
                accent: 'secondary',
                messages: [
                        {
                                id: 'm-pixel-1',
                                sender: 'me',
                                content:
                                        'Loved the tablet breakpoint improvements. When could you look at the account settings modal transitions?',
                                timestamp: '2024-03-17T13:10:00.000Z'
                        },
                        {
                                id: 'm-pixel-2',
                                sender: 'contact',
                                content:
                                        'Thanks! We can slot animations tomorrow morning. I will share a Lottie preview before we commit.',
                                timestamp: '2024-03-17T13:42:00.000Z'
                        },
                        {
                                id: 'm-pixel-3',
                                sender: 'me',
                                content: 'Perfect. Once that is in place we can prepare for the stakeholder review.',
                                timestamp: '2024-03-17T14:04:00.000Z'
                        }
                ]
        },
        {
                id: 'clarity-consulting',
                name: 'Clarity Consulting',
                title: 'Product strategy partner',
                status: 'offline',
                lastActivity: '2024-03-15T17:40:00.000Z',
                lastMessagePreview:
                        'Attached the workshop agenda and the journey map template for next week’s alignment session.',
                accent: 'accent',
                messages: [
                        {
                                id: 'm-clarity-1',
                                sender: 'contact',
                                content:
                                        'Sharing the final workshop agenda. Let us know if there are stakeholders you would like to add to day two.',
                                timestamp: '2024-03-15T16:58:00.000Z'
                        },
                        {
                                id: 'm-clarity-2',
                                sender: 'me',
                                content: 'Agenda looks great. Could you also include a 20-minute block for prototype feedback on Tuesday?',
                                timestamp: '2024-03-15T17:15:00.000Z'
                        },
                        {
                                id: 'm-clarity-3',
                                sender: 'contact',
                                content: 'Done. Updated deck and journey map template are now in the shared folder.',
                                timestamp: '2024-03-15T17:34:00.000Z'
                        }
                ]
        }
]

const statusMeta: Record<Conversation['status'], { label: string; indicator: string }> = {
        online: { label: 'Active now', indicator: 'bg-emerald-500' },
        away: { label: 'Responds in ~2h', indicator: 'bg-amber-500' },
        offline: { label: 'Last active recently', indicator: 'bg-slate-400' }
}

const accentClassMap: Record<Conversation['accent'], string> = {
        primary: 'from-primary/85 to-secondary/80',
        secondary: 'from-secondary/80 to-primary/75',
        accent: 'from-emerald-500/80 to-primary/70'
}

const formatRelativeActivity = (value: string) => {
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) {
                return ''
        }
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const oneDay = 1000 * 60 * 60 * 24
        if (diff < oneDay && date.getDate() === now.getDate()) {
                return new Intl.DateTimeFormat('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                }).format(date)
        }
        if (diff < oneDay * 2) {
                return 'Yesterday'
        }
        return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric'
        }).format(date)
}

const formatMessageTimestamp = (value: string) => {
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) {
                return ''
        }
        return new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                minute: '2-digit'
        }).format(date)
}

const getInitials = (name: string) =>
        name
                .split(' ')
                .filter(Boolean)
                .map(part => part[0]?.toUpperCase())
                .join('')
                .slice(0, 2)

const emptyPlaceholder = (
        <div className='flex h-full min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-white/70 bg-white/85 text-center shadow-[0_30px_120px_rgba(15,23,42,0.08)]'>
                <div className='flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner shadow-primary/5'>
                        <MessageSquare className='size-10' />
                </div>
                <h2 className='mt-6 text-2xl font-semibold text-slate-900'>Select a conversation</h2>
                <p className='mt-3 max-w-md px-6 text-sm text-slate-500'>
                        Choose a conversation from the left panel to continue collaborating, or start a new chat to brief someone new on
                        your project.
                </p>
                <button
                        type='button'
                        className='mt-6 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-white/90 px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-white'
                >
                        <Plus className='size-4' /> Start new chat
                </button>
        </div>
)

const ChatPage = () => {
        const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

        const selectedConversation = useMemo(
                () => conversations.find(conversation => conversation.id === selectedConversationId) ?? null,
                [selectedConversationId]
        )

        return (
                <div className='grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]'>
                        <aside className='flex h-full min-h-[520px] flex-col rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_30px_120px_rgba(15,23,42,0.08)]'>
                                <div className='flex items-start justify-between gap-3'>
                                        <div>
                                                <p className='text-xs font-semibold uppercase tracking-[0.28em] text-primary/70'>Inbox</p>
                                                <h1 className='mt-1 text-xl font-semibold text-slate-900'>Project messages</h1>
                                        </div>
                                        <button
                                                type='button'
                                                className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-white/90 text-primary shadow-sm transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20'
                                                aria-label='Start new chat'
                                        >
                                                <Plus className='size-4' />
                                        </button>
                                </div>

                                <div className='mt-5'>
                                        <label className='sr-only' htmlFor='chat-search'>
                                                Search conversations
                                        </label>
                                        <div className='relative'>
                                                <Search className='pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400' />
                                                <input
                                                        id='chat-search'
                                                        type='search'
                                                        placeholder='Search by project or collaborator'
                                                        className='w-full rounded-full border border-white/70 bg-white/90 px-12 py-2 text-sm text-slate-700 shadow-inner shadow-primary/5 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15'
                                                />
                                        </div>
                                </div>

                                <div className='mt-4 flex-1 overflow-hidden'>
                                        <div className='flex h-full flex-col gap-2 overflow-y-auto pr-1'>
                                                {conversations.map(conversation => {
                                                        const isSelected = conversation.id === selectedConversationId
                                                        const status = statusMeta[conversation.status]
                                                        return (
                                                                <button
                                                                        key={conversation.id}
                                                                        type='button'
                                                                        onClick={() => setSelectedConversationId(conversation.id)}
                                                                        className={`group rounded-[22px] border px-4 py-3 text-left transition ${
                                                                                isSelected
                                                                                        ? 'border-primary/40 bg-primary/5 shadow-inner shadow-primary/10'
                                                                                        : 'border-transparent bg-white/60 hover:border-primary/20 hover:bg-primary/5'
                                                                        }`}
                                                                >
                                                                        <div className='flex items-start gap-3'>
                                                                                <div className='relative'>
                                                                                        <div
                                                                                                className={`flex size-11 items-center justify-center rounded-full bg-gradient-to-br ${accentClassMap[conversation.accent]} text-sm font-semibold text-white shadow-lg shadow-primary/20`}
                                                                                        >
                                                                                                {getInitials(conversation.name)}
                                                                                        </div>
                                                                                        <span
                                                                                                className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border border-white/80 ${status.indicator}`}
                                                                                                aria-hidden
                                                                                        ></span>
                                                                                </div>
                                                                                <div className='min-w-0 flex-1'>
                                                                                        <div className='flex items-start justify-between gap-2'>
                                                                                                <p className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-slate-900'}`}>
                                                                                                        {conversation.name}
                                                                                                </p>
                                                                                                <span className='text-xs text-slate-400'>
                                                                                                        {formatRelativeActivity(conversation.lastActivity)}
                                                                                                </span>
                                                                                        </div>
                                                                                        <p className='mt-1 text-xs text-slate-500'>
                                                                                                {conversation.lastMessagePreview}
                                                                                        </p>
                                                                                        <div className='mt-2 flex items-center gap-2 text-[11px] text-slate-400'>
                                                                                                <span className='inline-flex items-center gap-1'>
                                                                                                        <span
                                                                                                                className={`inline-block size-1.5 rounded-full ${status.indicator}`}
                                                                                                        ></span>
                                                                                                        {status.label}
                                                                                                </span>
                                                                                                {conversation.unreadCount ? (
                                                                                                        <span className='inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary'>
                                                                                                                {conversation.unreadCount} new
                                                                                                        </span>
                                                                                                ) : null}
                                                                                        </div>
                                                                                </div>
                                                                        </div>
                                                                </button>
                                                        )
                                                })}
                                        </div>
                                </div>
                        </aside>

                        <section className='flex min-h-[520px] flex-col rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.08)]'>
                                {selectedConversation ? (
                                        <div className='flex h-full flex-col'>
                                                <header className='flex flex-wrap items-center justify-between gap-4 border-b border-white/70 pb-4'>
                                                        <div className='flex items-center gap-3'>
                                                                <div
                                                                        className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${accentClassMap[selectedConversation.accent]} text-base font-semibold text-white shadow-lg shadow-primary/20`}
                                                                >
                                                                        {getInitials(selectedConversation.name)}
                                                                </div>
                                                                <div>
                                                                        <h2 className='text-lg font-semibold text-slate-900'>{selectedConversation.name}</h2>
                                                                        <p className='text-xs text-slate-500'>{selectedConversation.title}</p>
                                                                        <div className='mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-600'>
                                                                                <span
                                                                                        className={`inline-block size-2 rounded-full ${statusMeta[selectedConversation.status].indicator}`}
                                                                                ></span>
                                                                                {statusMeta[selectedConversation.status].label}
                                                                        </div>
                                                                </div>
                                                        </div>
                                                        <button
                                                                type='button'
                                                                className='inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-primary/30 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/15'
                                                        >
                                                                View project brief
                                                        </button>
                                                </header>

                                                <div className='mt-6 flex-1 space-y-4 overflow-y-auto pr-2'>
                                                        {selectedConversation.messages.map(message => {
                                                                const isMine = message.sender === 'me'
                                                                return (
                                                                        <div
                                                                                key={message.id}
                                                                                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                                                                        >
                                                                                <div
                                                                                        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                                                                                isMine
                                                                                                        ? 'bg-gradient-to-br from-primary via-secondary to-primary text-white shadow-primary/20'
                                                                                                        : 'border border-white/70 bg-white/90 text-slate-700'
                                                                                        }`}
                                                                                >
                                                                                        <p>{message.content}</p>
                                                                                        <span
                                                                                                className={`mt-2 block text-xs ${
                                                                                                        isMine ? 'text-white/70' : 'text-slate-400'
                                                                                                }`}
                                                                                        >
                                                                                                {formatMessageTimestamp(message.timestamp)}
                                                                                        </span>
                                                                                </div>
                                                                        </div>
                                                                )
                                                        })}
                                                </div>

                                                <form className='mt-6 space-y-3'>
                                                        <div className='flex items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 py-2 shadow-inner shadow-primary/5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15'>
                                                                <label className='sr-only' htmlFor='chat-message-input'>
                                                                        Write a message
                                                                </label>
                                                                <input
                                                                        id='chat-message-input'
                                                                        type='text'
                                                                        placeholder='Write a message to keep things moving forward'
                                                                        className='flex-1 border-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none'
                                                                />
                                                                <button
                                                                        type='button'
                                                                        className='inline-flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary via-secondary to-primary text-white shadow-lg shadow-primary/30 transition hover:shadow-primary/40'
                                                                        aria-label='Send message'
                                                                >
                                                                        <Send className='size-4' />
                                                                </button>
                                                        </div>
                                                        <p className='text-xs text-slate-400'>Press Enter to send. Messages are shared with everyone on this project thread.</p>
                                                </form>
                                        </div>
                                ) : (
                                        emptyPlaceholder
                                )}
                        </section>
                </div>
        )
}

export default ChatPage
