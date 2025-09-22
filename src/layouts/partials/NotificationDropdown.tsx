import { useState } from 'react'

export type Notification = {
	id: number
	title: string
	description?: string
	isRead?: boolean
}

export default function NotificationDropdown() {
	const [notifications, setNotifications] = useState<Notification[]>([
		{ id: 1, title: 'New project assigned', description: 'You have been assigned a new project', isRead: false },
		{ id: 2, title: 'Payment received', description: 'You received $200 from client', isRead: false },
		{ id: 3, title: 'System update', description: 'Maintenance scheduled tomorrow', isRead: true }
	])

	const markAsRead = (id: number) => {
		setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)))
	}

	const unreadCount = notifications.filter(n => !n.isRead).length

	return (
                <div className='dropdown dropdown-end'>
                        <label
                                tabIndex={0}
                                className='relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-white'
                        >
                                <svg
                                        xmlns='http://www.w3.org/2000/svg'
                                        fill='none'
                                        viewBox='0 0 24 24'
                                        strokeWidth={1.5}
					stroke='currentColor'
					className='w-5 h-5'>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						d='M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.454 1.31m5.715 0a24.255 24.255 0 0 1-5.715 0m5.715 0a3 3 0 1 1-5.715 0'
					/>
				</svg>
                                {unreadCount > 0 && (
                                        <span className='badge badge-xs badge-error absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 rounded-full text-xs'>
                                                {unreadCount}
                                        </span>
                                )}
                        </label>
			<div tabIndex={0} className='mt-2 dropdown-content w-80 bg-base-100 rounded-box shadow max-h-96 overflow-y-auto'>
				<div className='p-3 border-b border-base-200 font-semibold'>Notifications</div>
				{notifications.length === 0 && <div className='p-4 text-sm text-base-content/60'>No notifications</div>}
				<ul className='menu menu-sm'>
					{notifications.map(n => (
						<li key={n.id} className={!n.isRead ? 'bg-base-200/60' : ''}>
							<button onClick={() => markAsRead(n.id)} className='text-left w-full'>
								<p className='font-medium text-sm'>{n.title}</p>
								{n.description && <p className='text-xs text-base-content/70'>{n.description}</p>}
							</button>
						</li>
					))}
				</ul>
			</div>
		</div>
	)
}
