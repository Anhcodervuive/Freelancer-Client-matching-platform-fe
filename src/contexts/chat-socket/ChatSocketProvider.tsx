import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSelector } from 'react-redux'

import { CHAT_NAMESPACE, ChatClientEvent } from '~/constants/chat'
import { useCredentialedSocket } from '~/hooks/useCredentialedSocket'
import { selectCurrentUser } from '~/redux/user/userSlice'

import { ChatSocketContext } from './chatSocketContext'
import type {
        CHAT_PRESENCE_REPSONSE,
        CHAT_PRESENCE_SYNC_REPSPONSE
} from '~/constants/chat'
import type {
        ChatSocketContextValue,
        ClientToServerEvents,
        ServerToClientEvents,
        ThreadParticipantsMap,
        ThreadPresenceMap
} from './types'

export const ChatSocketProvider = ({ children }: { children: ReactNode }) => {
        const currentUser = useSelector(selectCurrentUser)
        const currentUserId = currentUser?.id
        const [participantOnline, setParticipantOnline] = useState<CHAT_PRESENCE_REPSONSE[]>([])
        const [threadPresenceMap, setThreadPresenceMap] = useState<ThreadPresenceMap>({})
        const [threadParticipantsMap, setThreadParticipantsMap] = useState<ThreadParticipantsMap>({})

        const { socket, isConnected, isConnecting, connect, disconnect } =
                useCredentialedSocket<ServerToClientEvents, ClientToServerEvents>(CHAT_NAMESPACE, {
                        enabled: Boolean(currentUserId),
                        autoConnect: true,
                        maxAuthRetries: 2
                })

        useEffect(() => {
                if (!socket) {
                        return undefined
                }

                const handlePresence = (presence: CHAT_PRESENCE_REPSONSE) => {
                        setParticipantOnline(prev => {
                                const others = prev.filter(
                                        item =>
                                                !(
                                                        item.threadId === presence.threadId &&
                                                        item.userId === presence.userId
                                                )
                                )

                                if (presence.status === 'online') {
                                        return [...others, presence]
                                }

                                return others
                        })

                        setThreadPresenceMap(prev => {
                                const previousPresence = prev[presence.threadId] ?? {}
                                return {
                                        ...prev,
                                        [presence.threadId]: {
                                                ...previousPresence,
                                                [presence.userId]: presence.status === 'online'
                                        }
                                }
                        })
                }

                const handlePresenceSync = (payload: CHAT_PRESENCE_SYNC_REPSPONSE) => {
                        const { thread } = payload
                        const { threadId, presence, participants } = thread

                        setParticipantOnline(prev => {
                                const withoutThread = prev.filter(item => item.threadId !== threadId)
                                const onlineEntries = Object.entries(presence)
                                        .filter(([, isOnline]) => Boolean(isOnline))
                                        .map(([userId]) => ({
                                                threadId,
                                                userId,
                                                status: 'online' as const
                                        }))

                                return [...withoutThread, ...onlineEntries]
                        })

                        setThreadPresenceMap(prev => ({
                                ...prev,
                                [threadId]: presence
                        }))

                        setThreadParticipantsMap(prev => ({
                                ...prev,
                                [threadId]: participants
                        }))
                }

                socket.on(ChatClientEvent.CHAT_PRESENCE, handlePresence)
                socket.on(ChatClientEvent.CHAT_PRESENCE_SYNC, handlePresenceSync)

                return () => {
                        socket.off(ChatClientEvent.CHAT_PRESENCE, handlePresence)
                        socket.off(ChatClientEvent.CHAT_PRESENCE_SYNC, handlePresenceSync)
                }
        }, [socket])

        useEffect(() => {
                if (!currentUserId) {
                        setParticipantOnline([])
                        setThreadPresenceMap({})
                        setThreadParticipantsMap({})
                }
        }, [currentUserId])

        useEffect(() => {
                return () => {
                        disconnect()
                }
        }, [disconnect])

        const value = useMemo<ChatSocketContextValue>(
                () => ({
                        socket,
                        isConnected,
                        isConnecting,
                        participantOnline,
                        threadPresenceMap,
                        threadParticipantsMap,
                        connect,
                        disconnect
                }),
                [
                        socket,
                        isConnected,
                        isConnecting,
                        participantOnline,
                        threadPresenceMap,
                        threadParticipantsMap,
                        connect,
                        disconnect
                ]
        )

        return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>
}
