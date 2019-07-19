import { default as createResolvable, Resolvable } from '@josephg/resolvable'

export class MessageQueue<MessageType> {
    private messages : MessageType[] = []
    private waitForPush = createResolvable()

    async waitForMessage() : Promise<void> {
        if (!this.messages.length) {
            await this.waitForPush
        }
    }
    
    pushMessage(message : MessageType) : void {
        this.messages.push(message)
        this.waitForPush.resolve()
        this.waitForPush = createResolvable()
    }
    
    popMessage() : MessageType | undefined {
        return this.messages.shift()
    }

    async eventuallyPopMessage() {
        await this.waitForMessage()
        return this.popMessage()!
    }
}
