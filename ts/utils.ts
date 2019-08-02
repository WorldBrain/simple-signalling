import { default as createResolvable, Resolvable } from '@josephg/resolvable'
import { SignalDeviceId } from './types';

export class MessageQueue<MessageType> {
    private messages : MessageType[] = []
    private pushResolvable = createResolvable()
    
    async waitForMessage() : Promise<void> {
        if (!this.messages.length) {
            await this.pushResolvable
        }
    }

    pushMessage(message : MessageType) : void {
        this.messages.push(message)
        this.pushResolvable.resolve()
        this.pushResolvable = createResolvable()
    }
    
    popMessage() : MessageType | undefined {
        const message = this.messages.shift()
        return message
    }

    peekMessage() : MessageType | undefined {
        return this.messages[0]
    }

    async eventuallyPopMessage() {
        await this.waitForMessage()
        return this.popMessage()!
    }
}

export function getReceiverDeviceId(senderDeviceId : SignalDeviceId) : SignalDeviceId {
    return senderDeviceId === 'first' ? 'second' : 'first'
}
