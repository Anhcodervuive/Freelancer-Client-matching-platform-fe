import { Send, Smile } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import type { ChatThreadParticipantSummary } from '~/contexts/chat-socket/types'
import { UserTypingPanel } from './UserTypingPanel'
import ChatFileInput from './ChatFileInput'
import { ChatAttachmentPreview } from './ChatattachmentPreivew'

type ChatComposerProps = {
	onSendMessage: (_message: string, _files: File[]) => void
	onTyping: (_isTyping: boolean) => void
	typingUserList: ChatThreadParticipantSummary[]
	isSendingMessage: boolean
}

export default function ChatComposer({ onSendMessage, onTyping, typingUserList, isSendingMessage }: ChatComposerProps) {
	const [message, setMessage] = useState('')
	const [files, setFiles] = useState<File[]>([])

	const onFileChange = (files: File[]) => {
		console.log(files)
		setFiles(files)
	}

	const onRemoveFile = (indexRemove: number) => {
		setFiles(prev =>
			prev.filter((_file: File, index: number) => {
				return index !== indexRemove
			})
		)
	}

	return (
		<div className='space-y-3'>
			<UserTypingPanel users={typingUserList} />
			<ChatAttachmentPreview files={files} onRemove={onRemoveFile} />
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
                                                className='w-full min-h-[96px] max-h-[220px] resize-none rounded-2xl border border-white/70 bg-white/90 px-3 py-2 text-sm leading-relaxed text-slate-700 shadow-inner shadow-primary/5 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20'
                                        />
					<div className='flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500'>
						<div className='flex items-center gap-2'>
							<ChatFileInput multiple onFiles={onFileChange} />
							<button
								type='button'
								className='inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/60 bg-white/90 text-slate-500 transition hover:border-primary/30 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
								aria-label='Insert emoji'>
								<Smile className='size-5' />
							</button>
						</div>
						<button
							type='button'
							onClick={() => {
								onSendMessage(message, files)
							}}
							className='inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-white'>
							{isSendingMessage ? (
								<span className='loading loading-ring loading-md'></span>
							) : (
								<>
									Send
									<Send className='size-4' />
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
