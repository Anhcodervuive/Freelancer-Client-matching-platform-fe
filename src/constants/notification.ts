export const NOTIFICATION_NAMESPACE = '/notifications'

export const NotificationServerEvent = {
        RECENT: 'notification:recent',
        CREATED: 'notification:created'
} as const

export const NotificationClientEvent = {
        MARK_AS_READ: 'notification:read'
} as const

export type NotificationServerEventKey = (typeof NotificationServerEvent)[keyof typeof NotificationServerEvent]
export type NotificationClientEventKey = (typeof NotificationClientEvent)[keyof typeof NotificationClientEvent]
