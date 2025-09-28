import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import env from '~/config/environment'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '~/redux/user/userSlice'
import type { Notification } from '~/types/notification'
import { NotificationStatus } from '~/types/notification'
import {
        NOTIFICATION_NAMESPACE,
        NotificationClientEvent,
        NotificationServerEvent
} from '~/constants/notification'
import { loadSocketFactory } from '~/utils/socketClient'
import type { SocketLike } from '~/utils/socketClient'

type NotificationSocket = SocketLike

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
        const [isConnected, setIsConnected] = useState(false)
        const [isConnecting, setIsConnecting] = useState(false)
        const socketRef = useRef<NotificationSocket | null>(null)

        const disconnect = useCallback(() => {
                if (socketRef.current) {
                        socketRef.current.disconnect()
                        socketRef.current = null
                }
                setIsConnected(false)
                setIsConnecting(false)
        }, [])

        useEffect(() => {
                if (!currentUserId) {
                        disconnect()
                        setNotifications([])
                        return
                }

                const socketUrl = `${env.SOCKET_URL}${NOTIFICATION_NAMESPACE}`
                setIsConnecting(true)

                let isActive = true
                let socket: NotificationSocket | null = null
                let cleanupListeners: () => void = () => {}

                const initialiseSocket = async () => {
                        try {
                                const factory = await loadSocketFactory(env.SOCKET_URL)
                                if (!isActive) {
                                        return
                                }

                                socket = factory(socketUrl, {
                                        withCredentials: true,
                                        transports: ['websocket'],
                                        autoConnect: false
                                })

                                socketRef.current = socket

                                const handleRecentListener = (...args: unknown[]) => {
                                        const [items] = args as [Notification[] | undefined]
                                        if (Array.isArray(items)) {
                                                setNotifications(prev => mergeNotifications(prev, items))
                                        }
                                        setIsConnecting(false)
                                }

                                const handleCreatedListener = (...args: unknown[]) => {
                                        const [notification] = args as [Notification | undefined]
                                        if (notification) {
                                                setNotifications(prev => mergeNotifications([notification], prev))
                                        }
                                }

                                const handleConnect = () => {
                                        setIsConnected(true)
                                        setIsConnecting(false)
                                }

                                const handleDisconnect = () => {
                                        setIsConnected(false)
                                }

                                const handleConnectError = (error: unknown) => {
                                        console.error('Socket connection error', error)
                                        setIsConnecting(false)
                                }

                                socket.on('connect', handleConnect)
                                socket.on('disconnect', handleDisconnect)
                                socket.on('connect_error', handleConnectError)
                                socket.on(NotificationServerEvent.RECENT, handleRecentListener)
                                socket.on(NotificationServerEvent.CREATED, handleCreatedListener)

                                socket.connect()

                                cleanupListeners = () => {
                                        socket?.off('connect', handleConnect)
                                        socket?.off('disconnect', handleDisconnect)
                                        socket?.off('connect_error', handleConnectError)
                                        socket?.off(NotificationServerEvent.RECENT, handleRecentListener)
                                        socket?.off(NotificationServerEvent.CREATED, handleCreatedListener)
                                }
                        } catch (error) {
                                console.error('Failed to initialise notification socket', error)
                                if (isActive) {
                                        setIsConnecting(false)
                                }
                        }
                }

                initialiseSocket()

                return () => {
                        isActive = false
                        cleanupListeners()
                        disconnect()
                }
        }, [currentUserId, disconnect])

        const emitMarkAsRead = useCallback((notificationId: string) => {
                socketRef.current?.emit(NotificationClientEvent.MARK_AS_READ, { notificationId })
        }, [])

        const emit = useCallback((event: string, payload?: unknown) => {
                socketRef.current?.emit(event, payload)
        }, [])

        const markAsRead = useCallback(
                (notificationId: string, options: { emit?: boolean } = { emit: true }) => {
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

                        if (options.emit !== false) {
                                emitMarkAsRead(notificationId)
                        }
                },
                [emitMarkAsRead]
        )

        const unreadCount = useMemo(() => {
                return notifications.filter(notification => notification.status !== NotificationStatus.READ).length
        }, [notifications])

        return {
                notifications,
                unreadCount,
                markAsRead,
                emitMarkAsRead,
                emit,
                isConnected,
                isConnecting
        }
}

export default useNotificationGateway
