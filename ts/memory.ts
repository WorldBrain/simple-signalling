import { SignalTransport, SignalChannel, SignalMessageOptions } from "./types";
import { EventEmitter } from "events";

// WARNING: Obviously don't use this in production. Aside from being useless
// for anything else than (manual and automated) testing, it contains
// security issues and memory leaks. Have fun!

interface SignalBuffer {
    messages: string[]
    events : EventEmitter
}

export class MemorySignalTransportManager {
    private buffers : SignalBuffer[] = []

    createTransport() : MemorySignalTransport {
        return new MemorySignalTransport({ manager: this })
    }

    createBuffer() : { initialMessage : string } {
        this.buffers.push({ messages: [], events: new EventEmitter() })
        return { initialMessage: `memory:${this.buffers.length - 1}` }
    }

    getBuffer(options : { initialMessage : string }) : SignalBuffer {
        const [type, channelIndex] = options.initialMessage.split(':')
        if (type !== 'memory') {
            throw new Error(`Tried to open a MemorySignalChannel with faulty initialMessage: ${options.initialMessage}`)
        }

        return this.buffers[parseInt(channelIndex)]
    }
}

export class MemorySignalTransport implements SignalTransport {
    constructor(private options : { manager : MemorySignalTransportManager }) {
    }

    async allocateChannel() : Promise<{ initialMessage : string }> {
        return this.options.manager.createBuffer()
    }

    async openChannel(options : { deviceId : string, initialMessage? : string }) : Promise<SignalChannel> {
        const buffer = this.options.manager.getBuffer({ initialMessage: options.initialMessage! });
        return new MemorySignalChannel({ buffer })
    }
}

export class MemorySignalChannel implements SignalChannel {
    constructor(private options : { buffer : SignalBuffer }) {
    }

    async sendMessage(payload : string, options? : SignalMessageOptions) : Promise<void> {
        const { buffer } = this.options

        const confirmation = options && options.confirmReception ? new Promise(resolve => {
            buffer.events.once('received', () => resolve())
        }) : Promise.resolve()

        buffer.messages.push(payload)
        buffer.events.emit('message')

        await confirmation
    }

    async receiveMessage() : Promise<{ payload : string }> {
        const { buffer } = this.options
        const popMessage = () => {
            const message = buffer.messages.shift()!
            buffer.events.emit('received')
            return message
        }

        if (buffer.messages.length) {
            return { payload: popMessage() }
        }

        return new Promise<{ payload: string }>((resolve, reject) => {
            buffer.events.once('message', () => {
                resolve({ payload: popMessage() })
            })
        })
    }

    async release() : Promise<void> {
        // Leak some memory, please  :)
    }
}
