import { Paperclip, Send, Smile } from 'lucide-react'

type ChatComposerProps = {
        onSendMessage?: () => void
}

export default function ChatComposer({ onSendMessage }: ChatComposerProps) {
        return (
                <div className='mt-4 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur'>
                        <div className='flex flex-col gap-3'>
                                <label className='text-sm font-medium text-slate-600' htmlFor='chat-message'>Message</label>
                                <textarea
                                        id='chat-message'
                                        rows={3}
                                        placeholder='Write an update for your client. Mention deliverables, blockers, or questions.'
                                        className='w-full resize-none rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-inner shadow-primary/5 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20'
                                />
                        </div>
                        <div className='mt-3 flex flex-wrap items-center justify-between gap-3'>
                                <div className='flex items-center gap-2'>
                                        <button
                                                type='button'
                                                className='inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/90 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-primary/30 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                                        >
                                                <Paperclip className='size-4' />
                                                <span>Upload files</span>
                                        </button>
                                        <button
                                                type='button'
                                                className='inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/60 bg-white/90 text-slate-500 transition hover:border-primary/30 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                                                aria-label='Insert emoji'
                                        >
                                                <Smile className='size-5' />
                                        </button>
                                </div>
                                <button
                                        type='button'
                                        onClick={onSendMessage}
                                        className='inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:translate-y-0.5 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-white'
                                >
                                        Send message
                                        <Send className='size-4' />
                                </button>
                        </div>
                </div>
        )
}
