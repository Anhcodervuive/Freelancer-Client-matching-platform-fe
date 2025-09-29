import { CheckCheck, FileText, ImageIcon } from 'lucide-react'
import type { ChatMessage } from './types'

type ChatMessageListProps = {
        messages: ChatMessage[]
        jobTitle: string
}

const statusText: Record<ChatMessage['status'], string> = {
        sent: 'Sent',
        delivered: 'Delivered',
        read: 'Read'
}

function formatTime(date: string) {
        return new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                minute: 'numeric'
        }).format(new Date(date))
}

export default function ChatMessageList({ messages, jobTitle }: ChatMessageListProps) {
        return (
                <div className='flex-1 space-y-6 overflow-y-auto pr-2'>
                        <div className='text-center text-xs font-medium uppercase tracking-wide text-slate-400'>
                                Conversation started for “{jobTitle}”
                        </div>
                        {messages.map(message => {
                                const isSenderFreelancer = message.senderRole === 'freelancer'
                                const attachmentImages = (message.attachments || []).filter(att => att.type === 'image')
                                const attachmentFiles = (message.attachments || []).filter(att => att.type === 'file')

                                return (
                                        <div
                                                key={message.id}
                                                className={`flex flex-col gap-2 ${isSenderFreelancer ? 'items-end' : 'items-start'}`}
                                        >
                                                <div className='flex items-center gap-2 text-xs text-slate-400'>
                                                        {!isSenderFreelancer && (
                                                                <span className='font-semibold text-slate-500'>{message.senderName}</span>
                                                        )}
                                                        <span>{formatTime(message.sentAt)}</span>
                                                </div>
                                                <div
                                                        className={`max-w-xl rounded-3xl border border-white/70 px-5 py-3 text-sm leading-relaxed shadow-sm shadow-primary/5 backdrop-blur ${
                                                                isSenderFreelancer
                                                                        ? 'rounded-br-none bg-primary text-white'
                                                                        : 'rounded-bl-none bg-white/80 text-slate-700'
                                                        }`}
                                                >
                                                        {message.content && <p>{message.content}</p>}

                                                        {attachmentImages.length > 0 && (
                                                                <div className='mt-3 grid grid-cols-2 gap-3'>
                                                                        {attachmentImages.map(image => (
                                                                                <figure
                                                                                        key={image.id}
                                                                                        className='overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-inner shadow-primary/10'
                                                                                >
                                                                                        <img src={image.previewUrl || image.url} alt={image.name} className='h-32 w-full object-cover' />
                                                                                        <figcaption className={`flex items-center justify-between px-3 py-2 text-xs ${
                                                                                                isSenderFreelancer ? 'text-white/90' : 'text-slate-500'
                                                                                        }`}
                                                                                        >
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
                                                                                        href={file.url}
                                                                                        className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-xs font-medium transition ${
                                                                                                isSenderFreelancer
                                                                                                        ? 'border-white/40 bg-white/20 text-white hover:border-white/60 hover:bg-white/30'
                                                                                                        : 'border-white/70 bg-white/90 text-slate-600 hover:border-primary/20 hover:bg-primary/5'
                                                                                        }`}
                                                                                        download
                                                                                >
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
                                                        <span>{statusText[message.status]}</span>
                                                </div>
                                        </div>
                                )
                        })}
                </div>
        )
}
