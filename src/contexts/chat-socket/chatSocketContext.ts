import { createContext } from 'react'

import type { ChatSocketContextValue } from './types'

export const ChatSocketContext = createContext<ChatSocketContextValue | undefined>(undefined)
