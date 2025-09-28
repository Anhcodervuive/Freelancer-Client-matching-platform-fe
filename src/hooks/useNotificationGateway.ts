import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useSelector } from 'react-redux'
import env from '~/config/environment'
import { selectCurrentUser } from '~/redux/user/userSlice'
import type { Notification } from '~/types/notification'
import { NotificationStatus } from '~/types/notification'
import {
        NOTIFICATION_NAMESPACE,
        NotificationClientEvent,
        NotificationServerEvent
} from '~/constants/notification'

type ServerToClientEvents = {
        [NotificationServerEvent.RECENT]: (_notifications: Notification[]) => void
        [NotificationServerEvent.CREATED]: (_notification: Notification) => void
}

type ClientToServerEvents = {
        [NotificationClientEvent.MARK_AS_READ]: (_payload: { notificationId: string }) => void
}

type NotificationSocket = Socket<ServerToClientEvents, ClientToServerEvents>

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

const ACCESS_TOKEN_COOKIE = 'accessToken'

const getCookie = (name: string) => {
        if (typeof document === 'undefined') {
                return undefined
        }

        const parts = document.cookie.split(';')
        for (const part of parts) {
                const [rawKey, ...rawValue] = part.split('=')
                if (!rawKey || rawValue.length === 0) {
                        continue
                }

                const key = rawKey.trim()
                if (key === name) {
                        return decodeURIComponent(rawValue.join('=').trim())
                }
        }

        return undefined
}

export const useNotificationGateway = () => {
        const currentUser = useSelector(selectCurrentUser)
        const currentUserId = currentUser?.id
        const [notifications, setNotifications] = useState<Notification[]>([])
        const [isConnected, setIsConnected] = useState(false)
        const [isConnecting, setIsConnecting] = useState(false)
        const socketRef = useRef<NotificationSocket | null>(null)

        const disconnect = useCallback(() => {
                const socket = socketRef.current
                if (socket) {
                        socket.removeAllListeners?.()
                        socket.disconnect()
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

                if (typeof window === 'undefined') {
                        return undefined
                }

                const socketUrl = `${env.SOCKET_URL}${NOTIFICATION_NAMESPACE}`
                setIsConnecting(true)

                const accessToken = getCookie(ACCESS_TOKEN_COOKIE)

                const socket = io(socketUrl, {
                        withCredentials: true,
                        transports: ['websocket'],
                        autoConnect: true,
                        auth: accessToken ? { token: accessToken } : undefined
                }) as NotificationSocket

                socketRef.current = socket

                const handleReconnectAttempt = () => {
                        const nextToken = getCookie(ACCESS_TOKEN_COOKIE)
                        if (nextToken) {
                                socket.auth = { token: nextToken }
                        }
                }

                const handleRecent = (items: Notification[]) => {
                        setNotifications(prev => mergeNotifications(prev, items))
                        setIsConnecting(false)
                }

                const handleCreated = (notification: Notification) => {
                        if (notification) {
                                setNotifications(prev => mergeNotifications(prev, [notification]))
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

                socket.on('reconnect_attempt', handleReconnectAttempt)
                socket.on('connect', handleConnect)
                socket.on('disconnect', handleDisconnect)
                socket.on('connect_error', handleConnectError)
                socket.on(NotificationServerEvent.RECENT, handleRecent)
                socket.on(NotificationServerEvent.CREATED, handleCreated)

                return () => {
                        socket.off('reconnect_attempt', handleReconnectAttempt)
                        socket.off('connect', handleConnect)
                        socket.off('disconnect', handleDisconnect)
                        socket.off('connect_error', handleConnectError)
                        socket.off(NotificationServerEvent.RECENT, handleRecent)
                        socket.off(NotificationServerEvent.CREATED, handleCreated)
                        if (socketRef.current === socket) {
                                disconnect()
                        } else {
                                socket.removeAllListeners?.()
                                socket.disconnect()
                        }
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

        const markAllAsRead = useCallback(() => {
                const unreadIds: string[] = []

                setNotifications(prev =>
                        prev.map(notification => {
                                if (notification.status === NotificationStatus.READ) {
                                        return notification
                                }

                                unreadIds.push(notification.id)

                                return {
                                        ...notification,
                                        status: NotificationStatus.READ,
                                        readAt: new Date().toISOString()
                                }
                        })
                )

                for (const id of unreadIds) {
                        emitMarkAsRead(id)
                }
        }, [emitMarkAsRead])

        const unreadCount = useMemo(() => {
                return notifications.filter(notification => notification.status !== NotificationStatus.READ).length
        }, [notifications])

        return {
                notifications,
                unreadCount,
                markAsRead,
                markAllAsRead,
                emitMarkAsRead,
                emit,
                isConnected,
                isConnecting
        }
}

export default useNotificationGateway
