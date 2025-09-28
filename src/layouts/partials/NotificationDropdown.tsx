import { NotificationStatus } from '~/types/notification'
import { useNotificationGateway } from '~/hooks/useNotificationGateway'

const formatLabel = (value: string | null | undefined) => {
        if (!value) return ''

        return value
                .toString()
                .toLowerCase()
                .split(' ')
                .map(word => (word ? word[0].toUpperCase() + word.slice(1) : ''))
                .join(' ')
}

const formatEnumLabel = (value: string | null | undefined) => {
        if (!value) return ''

        return formatLabel(value.replace(/_/g, ' '))
}

const formatTimestamp = (value: string | null | undefined) => {
        if (!value) return ''

        const date = new Date(value)
        if (Number.isNaN(date.getTime())) {
                return ''
        }

        return date.toLocaleString()
}

export default function NotificationDropdown() {
        const { notifications, unreadCount, markAsRead, isConnected, isConnecting } = useNotificationGateway()

        const statusLabel = isConnected ? 'Live' : isConnecting ? 'Connecting…' : 'Offline'

        const renderTitle = (title?: string | null, event?: string | null, metadataTitle?: string | null) => {
                if (title) return title
                if (metadataTitle) return metadataTitle
                if (!event) return 'Notification'

                return formatEnumLabel(event)
        }

        const renderDescription = (
                description?: string | null,
                resourceType?: string | null,
                metadataDescription?: string | null
        ) => {
                if (description) return description
                if (metadataDescription) return metadataDescription
                if (!resourceType) return ''
                return `Resource: ${formatEnumLabel(resourceType)}`
        }

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
                                <div className='flex items-center justify-between p-3 border-b border-base-200 font-semibold'>
                                        <span>Notifications</span>
                                        <span className='text-xs font-normal text-base-content/60'>{statusLabel}</span>
                                </div>
                                {notifications.length === 0 && <div className='p-4 text-sm text-base-content/60'>No notifications</div>}
                                <ul className='menu menu-sm'>
                                        {notifications.map(notification => (
                                                <li
                                                        key={notification.id}
                                                        className={
                                                                notification.status !== NotificationStatus.READ
                                                                        ? 'bg-base-200/60'
                                                                        : ''
                                                        }
                                                >
                                                        <button
                                                                onClick={() => markAsRead(notification.id)}
                                                                className='flex w-full flex-col gap-1 text-left'
                                                        >
                                                                <div className='flex items-start justify-between gap-2'>
                                                                        <p className='font-medium text-sm'>
                                                                                {renderTitle(
                                                                                        notification.title,
                                                                                        notification.event,
                                                                                        typeof notification.metadata?.title === 'string'
                                                                                                ? notification.metadata.title
                                                                                                : undefined
                                                                                )}
                                                                        </p>
                                                                        <span className='text-[10px] uppercase tracking-wide text-base-content/50'>
                                                                                {notification.status === NotificationStatus.READ
                                                                                        ? 'Read'
                                                                                        : 'New'}
                                                                        </span>
                                                                </div>
                                                                <p className='text-xs text-base-content/70'>
                                                                        {renderDescription(
                                                                                notification.description,
                                                                                notification.resourceType,
                                                                                typeof notification.metadata?.description === 'string'
                                                                                        ? notification.metadata.description
                                                                                        : undefined
                                                                        )}
                                                                </p>
                                                                <span className='text-[10px] text-base-content/50'>
                                                                        {formatTimestamp(notification.createdAt)}
                                                                </span>
                                                        </button>
                                                </li>
                                        ))}
                                </ul>
                        </div>
                </div>
        )
}
