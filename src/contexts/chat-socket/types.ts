import type { Socket } from 'socket.io-client'

import type {
        CHAT_PRESENCE_REPSONSE,
        CHAT_PRESENCE_SYNC_REPSPONSE
} from '~/constants/chat'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServerToClientEvents = Record<string, (...args: any[]) => void>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClientToServerEvents = Record<string, (...args: any[]) => void>

export type ThreadPresenceMap = Record<string, Record<string, boolean>>
export type ThreadParticipantsMap = Record<string, CHAT_PRESENCE_SYNC_REPSPONSE['thread']['participants']>

export type ChatSocketContextValue = {
        socket: Socket<ServerToClientEvents, ClientToServerEvents> | null
        isConnected: boolean
        isConnecting: boolean
        participantOnline: CHAT_PRESENCE_REPSONSE[]
        threadPresenceMap: ThreadPresenceMap
        threadParticipantsMap: ThreadParticipantsMap
        disconnect: () => void
        connect: () => void
}
