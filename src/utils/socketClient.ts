export type SocketListener = (..._args: unknown[]) => void

export type SocketOptions = {
        withCredentials?: boolean
        transports?: string[]
        autoConnect?: boolean
        auth?: Record<string, unknown>
        extraHeaders?: Record<string, string>
}

export interface SocketLike {
        on(_event: string, _listener: SocketListener): this
        off(_event?: string, _listener?: SocketListener): this
        emit(_event: string, ..._args: unknown[]): this
        connect(): this
        disconnect(): this
        removeAllListeners?(): this
}

export type SocketFactory = (_uri: string, _options?: SocketOptions) => SocketLike

type WindowWithIo = Window & { io?: SocketFactory }

const SOCKET_SCRIPT_PATH = '/socket.io/socket.io.js'

const loadedFactories = new Map<string, Promise<SocketFactory>>()

const loadScript = (url: string): Promise<void> => {
        return new Promise((resolve, reject) => {
                const script = document.createElement('script')
                script.async = true
                script.src = url
                script.onload = () => resolve()
                script.onerror = () => reject(new Error(`Failed to load socket.io client script from ${url}`))
                document.head.appendChild(script)
        })
}

export const loadSocketFactory = (baseUrl: string): Promise<SocketFactory> => {
        if (typeof window === 'undefined') {
                return Promise.reject(new Error('Socket.io client can only be initialised in the browser'))
        }

        const normalizedBase = baseUrl.replace(/\/$/, '')
        const scriptUrl = `${normalizedBase}${SOCKET_SCRIPT_PATH}`

        if (loadedFactories.has(scriptUrl)) {
                return loadedFactories.get(scriptUrl) as Promise<SocketFactory>
        }

        const promise = new Promise<SocketFactory>((resolve, reject) => {
                const win = window as WindowWithIo

                if (win.io) {
                        resolve(win.io)
                        return
                }

                loadScript(scriptUrl)
                        .then(() => {
                                if (win.io) {
                                        resolve(win.io)
                                } else {
                                        reject(new Error('Socket.io client script loaded but no global io was found'))
                                }
                        })
                        .catch(error => {
                                reject(error as Error)
                        })
        }).catch(error => {
                loadedFactories.delete(scriptUrl)
                throw error
        })

        loadedFactories.set(scriptUrl, promise)
        return promise
}
