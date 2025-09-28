import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type ManagerOptions, type Socket, type SocketOptions } from 'socket.io-client'

import { refreshTokenAPI } from '~/apis/auth.api'
import env from '~/config/environment'

const TOKEN_INVALID_MESSAGE = 'Token is not validated'

const buildSocketUrl = (namespace: string) => `${env.SOCKET_URL}${namespace}`

const isTokenInvalidError = (error: unknown) => {
        if (!error || typeof error !== 'object') {
                return false
        }

        const tokenMessage = (() => {
                const dataMessage =
                        typeof (error as { data?: { message?: unknown } }).data?.message === 'string'
                                ? ((error as { data?: { message?: string } }).data!.message as string)
                                : undefined

                if (typeof dataMessage === 'string' && dataMessage.trim().length > 0) {
                        return dataMessage
                }

                const message = typeof (error as { message?: unknown }).message === 'string'
                        ? ((error as { message?: string }).message as string)
                        : undefined

                return message
        })()

        return tokenMessage === TOKEN_INVALID_MESSAGE
}

let refreshPromise: Promise<void> | null = null

const requestRefreshToken = () => {
        if (!refreshPromise) {
                refreshPromise = refreshTokenAPI()
                        .then(() => undefined)
                        .finally(() => {
                                refreshPromise = null
                        })
        }

        return refreshPromise
}

export type CredentialedSocketOptions = {
        enabled?: boolean
        autoConnect?: boolean
        socketOptions?: Partial<ManagerOptions & SocketOptions>
        maxAuthRetries?: number
}

export type CredentialedSocketResult<ServerToClientEvents, ClientToServerEvents> = {
        socket: Socket<ServerToClientEvents, ClientToServerEvents> | null
        isConnected: boolean
        isConnecting: boolean
        lastError: unknown
        connect: () => void
        disconnect: () => void
}

export const useCredentialedSocket = <ServerToClientEvents, ClientToServerEvents>(
        namespace: string,
        options: CredentialedSocketOptions = {}
): CredentialedSocketResult<ServerToClientEvents, ClientToServerEvents> => {
        const { enabled = true, autoConnect = true, socketOptions, maxAuthRetries = 1 } = options

        const [isConnected, setIsConnected] = useState(false)
        const [isConnecting, setIsConnecting] = useState(false)
        const [lastError, setLastError] = useState<unknown>(null)

        const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
        const tokenRetryRef = useRef(0)
        const isMountedRef = useRef(false)

        const connectionOptions = useMemo<Partial<ManagerOptions & SocketOptions>>(() => {
                return {
                        transports: ['websocket'],
                        withCredentials: true,
                        autoConnect: false,
                        reconnection: true,
                        ...socketOptions
                }
        }, [socketOptions])

        const disconnect = useCallback(() => {
                const socket = socketRef.current

                if (socket) {
                        socket.removeAllListeners?.()
                        socket.disconnect()
                        socketRef.current = null
                }

                setIsConnected(false)
                setIsConnecting(false)
                setLastError(null)
                tokenRetryRef.current = 0
        }, [])

        const connect = useCallback(() => {
                if (!enabled) {
                        return
                }

                tokenRetryRef.current = 0

                const socket = socketRef.current

                if (!socket) {
                        return
                }

                if (socket.connected) {
                        return
                }

                setIsConnecting(true)
                socket.connect()
        }, [enabled])

        useEffect(() => {
                isMountedRef.current = true

                return () => {
                        isMountedRef.current = false
                }
        }, [])

        useEffect(() => {
                if (!enabled) {
                        disconnect()
                        return
                }

                const socketUrl = buildSocketUrl(namespace)
                tokenRetryRef.current = 0
                const socket = io(socketUrl, connectionOptions) as Socket<ServerToClientEvents, ClientToServerEvents>

                socketRef.current = socket
                setIsConnecting(true)

                const handleConnect = () => {
                        tokenRetryRef.current = 0
                        setIsConnected(true)
                        setIsConnecting(false)
                        setLastError(null)
                }

                const handleDisconnect = () => {
                        setIsConnected(false)
                }

                const handleConnectError = async (error: unknown) => {
                        setLastError(error)
                        setIsConnecting(false)

                        if (!enabled) {
                                return
                        }

                        if (!isTokenInvalidError(error)) {
                                return
                        }

                        if (tokenRetryRef.current >= maxAuthRetries) {
                                return
                        }

                        tokenRetryRef.current += 1

                        try {
                                await requestRefreshToken()
                        } catch (refreshError) {
                                setLastError(refreshError)
                                return
                        }

                        if (!isMountedRef.current) {
                                return
                        }

                        setIsConnecting(true)
                        socket.connect()
                }

                socket.on('connect', handleConnect)
                socket.on('disconnect', handleDisconnect)
                socket.on('connect_error', handleConnectError)

                if (autoConnect) {
                        socket.connect()
                }

                return () => {
                        socket.off('connect', handleConnect)
                        socket.off('disconnect', handleDisconnect)
                        socket.off('connect_error', handleConnectError)

                        if (socketRef.current === socket) {
                                disconnect()
                        } else {
                                socket.removeAllListeners?.()
                                socket.disconnect()
                        }
                }
        }, [autoConnect, connectionOptions, disconnect, enabled, maxAuthRetries, namespace])

        return {
                socket: socketRef.current,
                isConnected,
                isConnecting,
                lastError,
                connect,
                disconnect
        }
}

