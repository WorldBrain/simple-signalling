import { default as createResolvable, Resolvable } from '@josephg/resolvable'

export class MessageQueue<MessageType> {
    private messages : MessageType[] = []
    private pushResolvable = createResolvable()
    private popResolvable = createResolvable()

    async waitForMessage() : Promise<void> {
        if (!this.messages.length) {
            await this.pushResolvable
        }
    }

    async waitForPop() {
        await this.popResolvable
    }
    
    pushMessage(message : MessageType) : void {
        this.messages.push(message)
        this.pushResolvable.resolve()
        this.pushResolvable = createResolvable()
    }
    
    popMessage() : MessageType | undefined {
        const message = this.messages.shift()
        if (message) {
            this.popResolvable.resolve()
            this.popResolvable = createResolvable()
        }
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
