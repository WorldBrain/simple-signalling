import { SignalTransport, SignalChannel, SignalMessageOptions } from "./types";
import { EventEmitter } from "events";
import { MessageQueue } from "./utils";

// WARNING: Obviously don't use this in production. Aside from being useless
// for anything else than (manual and automated) testing, it contains
// security issues and memory leaks. Have fun!

interface SignalBuffer {
    messageQueue: MessageQueue<{channelId: number, payload: string}>
    events : EventEmitter
}

export class MemorySignalTransportManager {
    public channelCount = 0
    private buffers : SignalBuffer[] = []
    
    createTransport() : MemorySignalTransport {
        return new MemorySignalTransport({ manager: this })
    }

    _createBuffer() : { initialMessage : string } {
        this.buffers.push({ messageQueue: new MessageQueue(), events: new EventEmitter() })
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

    async openChannel(options : { deviceId : string, initialMessage? : string }) : Promise<SignalChannel> {
        const buffer = this.options.manager._getBuffer({ initialMessage: options.initialMessage! });
        return new MemorySignalChannel({ buffer, id: ++this.options.manager.channelCount })
    }
}

export class MemorySignalChannel implements SignalChannel {
    constructor(private options : { buffer : SignalBuffer, id : number }) {
    }

    async sendMessage(payload : string, options? : SignalMessageOptions) : Promise<void> {
        console.log('send message')
        const { buffer } = this.options

        const confirmation = options && options.confirmReception ? new Promise(resolve => {
            buffer.events.once('received', () => resolve())
        }) : Promise.resolve()
        console.log('got confirmation');
        

        buffer.messageQueue.pushMessage({ channelId: this.options.id, payload})
        buffer.events.emit('message')

        await confirmation
    }

    async receiveMessage() : Promise<{ payload : string }> {
        const { buffer } = this.options
        while (true) {
            console.log('recv iter');
            
            await buffer.messageQueue.waitForMessage()
            const message = buffer.messageQueue.peekMessage()!;
            if (!message) {
                continue
            }
            if (message.channelId === this.options.id) {
                await buffer.messageQueue.waitForPop()
                continue
            }
            buffer.messageQueue.popMessage()
            console.log('sending confirmation')
            buffer.events.emit('received')

            console.log('recv return');
            
            return { payload: message.payload }
        }
    }

    async release() : Promise<void> {
        // Leak some memory, please  :)
    }
}
