import { SignalTransport, SignalChannel, SignalMessageOptions, SignalChannelEvents, SignalDeviceId } from "./types";
import { EventEmitter } from "events";
import TypedEmitter from "typed-emitter";
import { getReceiverDeviceId } from "./utils";

// WARNING: Obviously don't use this in production. Aside from being useless
// for anything else than (manual and automated) testing, it contains
// security issues and memory leaks. Have fun!

type SignalBufferEvents = TypedEmitter<{
    signal : (event : { payload : string, deviceId : SignalDeviceId }) => void
}>

interface SignalBuffer {
    // message: {channelId: number, payload: string} | null
    events : SignalBufferEvents
    messages : {[deviceId in 'first' | 'second'] : string[]}
}

export class MemorySignalTransportManager {
    public channelCount = 0
    private buffers : SignalBuffer[] = []
    
    createTransport() : MemorySignalTransport {
        return new MemorySignalTransport({ manager: this })
    }

    _createBuffer() : { initialMessage : string } {
        this.buffers.push({ events: new EventEmitter() as SignalBufferEvents, messages: { first: [], second: [] } })
        return { initialMessage: `memory:${this.buffers.length - 1}` }
    }

    _getBuffer(options : { initialMessage : string }) : SignalBuffer {
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
        return this.options.manager._createBuffer()
    }

    async openChannel(options : { deviceId : SignalDeviceId, initialMessage? : string }) : Promise<SignalChannel> {
        const buffer = this.options.manager._getBuffer({ initialMessage: options.initialMessage! });
        return new MemorySignalChannel({ buffer, deviceId: options.deviceId })
    }
}

export class MemorySignalChannel implements SignalChannel {
    events = new EventEmitter() as SignalChannelEvents

    constructor(private options : { buffer : SignalBuffer, deviceId : SignalDeviceId }) {
    }

    async connect() {
        for (const message of this.options.buffer.messages[this.options.deviceId]) {
            this.events.emit('signal', { payload: message })
        }

        this.options.buffer.events.on('signal', ({ payload, deviceId: channelId }) => {
            if (channelId !== this.options.deviceId) {
                this.events.emit('signal', { payload })
            }
        })
    }

    async sendMessage(payload : string, options? : SignalMessageOptions) : Promise<void> {
        const { buffer } = this.options
        buffer.messages[getReceiverDeviceId(this.options.deviceId)].push(payload)

        buffer.events.emit('signal', {
            payload,
            deviceId: this.options.deviceId
        })
    }

    async release() : Promise<void> {
        // Leak some memory, please  :)
    }
}
