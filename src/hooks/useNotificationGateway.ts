import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { markNotificationAsReadAPI } from '~/apis/notification.api'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '~/redux/user/userSlice'
import type { Notification } from '~/types/notification'
import { NotificationStatus } from '~/types/notification'
import { NOTIFICATION_NAMESPACE, NotificationClientEvent, NotificationServerEvent } from '~/constants/notification'
import { useCredentialedSocket } from './useCredentialedSocket'

type ServerToClientEvents = {
	[NotificationServerEvent.RECENT]: (_notifications: Notification[]) => void
	[NotificationServerEvent.CREATED]: (_notification: Notification) => void
}

type ClientToServerEvents = {
	[NotificationClientEvent.MARK_AS_READ]: (_payload: { notificationId: string }) => void
}

const sortNotifications = (items: Notification[]) => {
	return [...items].sort((a, b) => {
		const first = a.createdAt ? new Date(a.createdAt).getTime() : 0
		const second = b.createdAt ? new Date(b.createdAt).getTime() : 0
		return second - first
	})
}

const mergeNotifications = (current: Notification[], incoming: Notification[]) => {
	const map = new Map<string, Notification>()

	for (const item of current) {
		map.set(item.id, item)
	}

	for (const item of incoming) {
		map.set(item.id, item)
	}

	return sortNotifications(Array.from(map.values()))
}

export const useNotificationGateway = () => {
	const currentUser = useSelector(selectCurrentUser)
	const currentUserId = currentUser?.id
	const [notifications, setNotifications] = useState<Notification[]>([])
	const previousUserIdRef = useRef<string | undefined>(undefined)

	const { socket, isConnected, isConnecting, lastError, connect } = useCredentialedSocket<
		ServerToClientEvents,
		ClientToServerEvents
	>(NOTIFICATION_NAMESPACE, {
		enabled: Boolean(currentUserId),
		autoConnect: Boolean(currentUserId),
		maxAuthRetries: 2
	})

	useEffect(() => {
		if (previousUserIdRef.current !== currentUserId) {
			setNotifications([])
			previousUserIdRef.current = currentUserId
		}
	}, [currentUserId])

	useEffect(() => {
		if (!socket) {
			return undefined
		}

		const handleRecent = (items: Notification[]) => {
			setNotifications(prev => mergeNotifications(prev, items))
		}

		const handleCreated = (notification: Notification) => {
			if (notification) {
				setNotifications(prev => mergeNotifications(prev, [notification]))
			}
		}

		socket.on(NotificationServerEvent.RECENT, handleRecent)
		socket.on(NotificationServerEvent.CREATED, handleCreated)

		return () => {
			socket.off(NotificationServerEvent.RECENT, handleRecent)
			socket.off(NotificationServerEvent.CREATED, handleCreated)
		}
	}, [socket])

	const emitMarkAsRead = useCallback(
		(notificationId: string) => {
			socket?.emit(NotificationClientEvent.MARK_AS_READ, { notificationId })
		},
		[socket]
	)

	const emit = useCallback(
		(event: string, payload?: unknown) => {
			socket?.emit(event, payload)
		},
		[socket]
	)

        const markAsRead = useCallback(
                async (notificationId: string, options: { emit?: boolean } = { emit: true }) => {
                        const currentNotification = notifications.find(
                                notification => notification.id === notificationId
                        )

                        if (!currentNotification || currentNotification.status === NotificationStatus.READ) {
                                if (options.emit !== false) {
                                        emitMarkAsRead(notificationId)
                                }

                                return
                        }

                        setNotifications(prev =>
                                prev.map(notification =>
                                        notification.id === notificationId
                                                ? {
                                                                ...notification,
                                                                status: NotificationStatus.READ,
                                                                readAt: new Date().toISOString()
                                                  }
                                                : notification
                                )
                        )

                        try {
                                await markNotificationAsReadAPI(notificationId)

                                if (options.emit !== false) {
                                        emitMarkAsRead(notificationId)
                                }
                        } catch (error) {
                                setNotifications(prev =>
                                        prev.map(notification =>
                                                notification.id === notificationId
                                                        ? currentNotification
                                                        : notification
                                        )
                                )

                                throw error
                        }
                },
                [emitMarkAsRead, notifications]
        )

        const markAllAsRead = useCallback(async () => {
                const unreadNotifications = notifications.filter(
                        notification => notification.status !== NotificationStatus.READ
                )

                if (unreadNotifications.length === 0) {
                        return
                }

                const previousById = new Map<string, Notification>(
                        unreadNotifications.map(notification => [notification.id, notification])
                )

                const timestamp = new Date().toISOString()

                setNotifications(prev =>
                        prev.map(notification =>
                                previousById.has(notification.id)
                                        ? {
                                                ...notification,
                                                status: NotificationStatus.READ,
                                                readAt: timestamp
                                          }
                                        : notification
                        )
                )

                try {
                        await Promise.all(
                                unreadNotifications.map(notification =>
                                        markNotificationAsReadAPI(notification.id)
                                )
                        )

                        for (const notification of unreadNotifications) {
                                emitMarkAsRead(notification.id)
                        }
                } catch (error) {
                        setNotifications(prev =>
                                prev.map(notification =>
                                        previousById.get(notification.id) ?? notification
                                )
                        )

                        throw error
                }
        }, [emitMarkAsRead, notifications])

	const unreadCount = useMemo(() => {
		return notifications.filter(notification => notification.status !== NotificationStatus.READ).length
	}, [notifications])

	const removeNotification = useCallback((notificationId: string) => {
		setNotifications(prev => prev.filter(notification => notification.id !== notificationId))
	}, [])

	return {
		notifications,
		unreadCount,
		markAsRead,
		markAllAsRead,
		emitMarkAsRead,
		emit,
		isConnected,
		isConnecting,
		error: lastError,
		reconnect: connect,
		removeNotification
	}
}

export default useNotificationGateway
