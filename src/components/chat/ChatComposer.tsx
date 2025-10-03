import { Paperclip, Send, Smile } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import type { ChatThreadParticipantSummary } from '~/contexts/chat-socket/types'
import { UserTypingPanel } from './UserTypingPanel'

type ChatComposerProps = {
	onSendMessage?: () => void
	onTyping: (_isTyping: boolean) => void
	typingUserList: ChatThreadParticipantSummary[]
}

export default function ChatComposer({ onSendMessage, onTyping, typingUserList }: ChatComposerProps) {
        const [message, setMessage] = useState('')

        return (
                <div className='space-y-3'>
                        <UserTypingPanel users={typingUserList} />
                        <div className='rounded-2xl border border-white/60 bg-white/80 p-3 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur'>
                                <div className='flex flex-col gap-3'>
                                        <textarea
                                                value={message}
                                                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                                                        const message = e.target.value
                                                        if (message.trim().length === 1) {
                                                                onTyping(true)
                                                        } else if (message.trim().length === 0) {
                                                                onTyping(false)
                                                        }
                                                        setMessage(message)
                                                }}
                                                id='chat-message'
                                                rows={2}
                                                placeholder='Write an update for your client. Mention deliverables, blockers, or questions.'
                                                className='w-full min-h-[48px] max-h-48 resize-none rounded-2xl border border-white/70 bg-white/90 px-3 py-2 text-sm leading-relaxed text-slate-700 shadow-inner shadow-primary/5 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20'
                                        />
                                        <div className='flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500'>
                                                <div className='flex items-center gap-2'>
                                                        <button
                                                                type='button'
                                                                className='inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/90 px-3 py-2 text-xs font-medium transition hover:border-primary/30 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20'>
                                                                <Paperclip className='size-4' />
                                                                <span>Upload</span>
                                                        </button>
                                                        <button
                                                                type='button'
                                                                className='inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/60 bg-white/90 text-slate-500 transition hover:border-primary/30 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                                                                aria-label='Insert emoji'>
                                                                <Smile className='size-5' />
                                                        </button>
                                                </div>
                                                <button
                                                        type='button'
                                                        onClick={onSendMessage}
                                                        className='inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-white'>
                                                        Send
                                                        <Send className='size-4' />
                                                </button>
                                        </div>
                                </div>
                        </div>
                </div>
        )
}
