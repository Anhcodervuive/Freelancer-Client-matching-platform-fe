import { AlertCircle, Bell, CheckCheck, Loader2, MailOpen, Radio } from 'lucide-react'
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
        const {
                notifications,
                unreadCount,
                markAsRead,
                markAllAsRead,
                isConnected,
                isConnecting,
                error,
                reconnect
        } = useNotificationGateway()

        const connectionError = !isConnecting && error ? error : null

        const errorMessage = (() => {
                if (!connectionError) return ''

                const tokenMessage =
                        typeof (connectionError as { data?: { message?: unknown } }).data?.message === 'string'
                                ? (connectionError as { data: { message: string } }).data.message
                                : undefined

                if (tokenMessage === 'Token is not validated') {
                        return 'Phiên đăng nhập đã hết hạn. Vui lòng thử lại.'
                }

                if (typeof tokenMessage === 'string' && tokenMessage.trim().length > 0) {
                        return tokenMessage
                }

                const message = typeof (connectionError as { message?: unknown }).message === 'string'
                        ? (connectionError as { message: string }).message
                        : undefined

                if (typeof message === 'string' && message.trim().length > 0) {
                        return message
                }

                return 'Không thể kết nối tới máy chủ thông báo.'
        })()

        const statusLabel = connectionError
                ? 'Kết nối gặp sự cố'
                : isConnected
                  ? 'Đang trực tuyến'
                  : isConnecting
                    ? 'Đang kết nối…'
                    : 'Ngoại tuyến'

        const statusAccent = connectionError
                ? 'bg-error'
                : isConnected
                  ? 'bg-success'
                  : isConnecting
                    ? 'bg-warning'
                    : 'bg-base-300'

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
                                <Bell className='h-5 w-5' aria-hidden='true' />
                                {unreadCount > 0 && (
                                        <span className='badge badge-xs badge-error absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 rounded-full text-xs'>
                                                {unreadCount}
                                        </span>
                                )}
                        </label>
                        <div
                                tabIndex={0}
                                className='dropdown-content mt-2 w-96 max-w-[min(24rem,90vw)] overflow-hidden rounded-2xl border border-base-200 bg-base-100 shadow-xl'
                        >
                                <div className='flex items-center justify-between gap-3 border-b border-base-200 px-4 py-3'>
                                        <div>
                                                <p className='font-semibold text-base-content'>Thông báo</p>
                                                <div className='flex items-center gap-2 text-xs text-base-content/60'>
                                                        <span className={`inline-flex h-2 w-2 rounded-full ${statusAccent}`} aria-hidden='true' />
                                                        <span className='flex items-center gap-1'>
                                                                <Radio className='h-3.5 w-3.5' aria-hidden='true' />
                                                                {statusLabel}
                                                        </span>
                                                </div>
                                        </div>
                                        <button
                                                type='button'
                                                disabled={unreadCount === 0}
                                                onClick={() => markAllAsRead()}
                                                className='btn btn-ghost btn-sm gap-2 text-xs font-medium disabled:opacity-50'
                                        >
                                                <CheckCheck className='h-4 w-4' aria-hidden='true' />
                                                Đánh dấu đã đọc
                                        </button>
                                </div>
                                {notifications.length === 0 ? (
                                        <div className='flex flex-col items-center justify-center gap-3 px-6 py-10 text-center text-sm text-base-content/60'>
                                                <MailOpen className='h-10 w-10 text-base-content/40' aria-hidden='true' />
                                                <div>
                                                        <p className='font-medium text-base-content'>Chưa có thông báo mới</p>
                                                        <p>Hãy quay lại sau khi có hoạt động trên tài khoản của bạn.</p>
                                                </div>
                                        </div>
                                ) : (
                                        <ul className='divide-y divide-base-200 max-h-96 overflow-y-auto'>
                                                {notifications.map(notification => {
                                                        const isUnread = notification.status !== NotificationStatus.READ

                                                        return (
                                                                <li key={notification.id} className='group'>
                                                                        <button
                                                                                type='button'
                                                                                onClick={() => markAsRead(notification.id)}
                                                                                className='flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-base-200/70 focus:bg-base-200/70 focus:outline-none'
                                                                        >
                                                                                <span
                                                                                        className={`mt-1 h-2 w-2 rounded-full ${
                                                                                                isUnread
                                                                                                        ? 'bg-primary ring-2 ring-primary/20'
                                                                                                        : 'bg-base-300'
                                                                                        }`}
                                                                                        aria-hidden='true'
                                                                                />
                                                                                <span className='flex min-w-0 flex-1 flex-col gap-1'>
                                                                                        <span className='flex items-center justify-between gap-3'>
                                                                                                <p className='truncate font-medium text-sm text-base-content'>
                                                                                                        {renderTitle(
                                                                                                                notification.title,
                                                                                                                notification.event,
                                                                                                                typeof notification.metadata?.title === 'string'
                                                                                                                        ? notification.metadata.title
                                                                                                                        : undefined
                                                                                                        )}
                                                                                                </p>
                                                                                                <span className='shrink-0 text-[10px] uppercase tracking-wide text-base-content/50'>
                                                                                                        {isUnread ? 'Mới' : 'Đã đọc'}
                                                                                                </span>
                                                                                        </span>
                                                                                        <p className='line-clamp-2 text-xs text-base-content/70'>
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
                                                                                </span>
                                                                        </button>
                                                                </li>
                                                        )
                                                })}
                                        </ul>
                                )}
                                {isConnecting && (
                                        <div className='flex items-center gap-2 border-t border-base-200 px-4 py-2 text-xs text-base-content/60'>
                                                <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden='true' />
                                                <span>Đang đồng bộ thông báo…</span>
                                        </div>
                                )}
                                {connectionError && (
                                        <div className='flex items-start gap-3 border-t border-base-200 px-4 py-3 text-xs text-error'>
                                                <AlertCircle className='h-4 w-4 shrink-0' aria-hidden='true' />
                                                <div className='flex flex-1 flex-col gap-2'>
                                                        <p>{errorMessage}</p>
                                                        <button
                                                                type='button'
                                                                onClick={() => reconnect()}
                                                                className='btn btn-ghost btn-xs w-fit gap-2 text-error hover:bg-error/10'
                                                        >
                                                                Thử kết nối lại
                                                        </button>
                                                </div>
                                        </div>
                                )}
                        </div>
                </div>
        )
}
