import type { ChatThreadParticipantSummary } from '~/contexts/chat-socket/types'

export function UserTypingPanel({ users }: { users: ChatThreadParticipantSummary[] }) {
	if (!users.length) return null

	const top = users.slice(0, 3)
	const extra = users.length - top.length

	const names = users.map(u => u?.profile.firstName)
	const label =
		names.length === 1
			? `${names[0]} đang nhập…`
			: names.length === 2
			? `${names[0]} và ${names[1]} đang nhập…`
			: `${names[0]}, ${names[1]} và ${users.length - 2} người khác đang nhập…`

	return (
		<div className='chat chat-start'>
			{/* Nhóm avatar */}
			<div className='chat-image avatar'>
				<div className='avatar-group -space-x-3'>
					{top.map(u => (
						<div key={u?.id} className='avatar'>
							<div className='w-7 rounded-full ring ring-base-100'>
								<img src={'https://i.pravatar.cc/64'} alt={u?.profile.firstName ?? ''} />
							</div>
						</div>
					))}
					{extra > 0 && (
						<div className='avatar placeholder'>
							<div className='w-7 rounded-full bg-base-300 text-xs flex items-center justify-center'>+{extra}</div>
						</div>
					)}
				</div>
			</div>

			<div className='chat-header text-xs opacity-70'>{label}</div>

			<div className='chat-bubble bg-base-200 min-w-28 flex items-center gap-2' role='status' aria-label={label}>
				<span className='loading loading-dots loading-sm' />
				<span className='sr-only'>{label}</span>
			</div>

			<div className='chat-footer opacity-50 text-xs'>đang nhập…</div>
		</div>
	)
}
