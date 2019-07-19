import { Resolvable, default as createResolvable } from '@josephg/resolvable'
import * as firebase from 'firebase'
import { SignalTransport, SignalChannel, SignalMessageOptions } from './types';

export class FirebaseSignalTransport implements SignalTransport {
    constructor(private options : { database : firebase.database.Database, collectionName : string }) {
    }

    async allocateChannel() : Promise<{ initialMessage : string }> {
        const message : FirebaseSignalMessage = {
            type: 'initial',
            deviceId: 'none',
            payload: '',
            confirm: false,
            updated: firebase.database.ServerValue.TIMESTAMP,
        }
        const ref = this.options.database.ref(this.options.collectionName).push(message)
        return { initialMessage: `firebase:channel:${this.options.collectionName}:${ref.key}` }
    }

    async openChannel(options : { deviceId : string, initialMessage? : string }) : Promise<SignalChannel> {
        if (!options.initialMessage) {
            throw new Error(`Opening a channel without an initial message is not supported yet`)
        }

        const [ transportType, objectType, collectionName, key ] = options.initialMessage.split(':')
        if (transportType !== 'firebase' || objectType !== 'channel') {
            throw new Error(`Invalid initialMessage: ${options.initialMessage}`)
        }
        const channelRef = this.options.database.ref(collectionName).child(key)
        return new FirebaseSignalChannel({ channelRef, deviceId: options.deviceId })
    }
}

interface FirebaseSignalMessage {
    type: 'initial' | 'message' | 'confirmation'
    payload: string,
    confirm: boolean,
    updated: any, // Firebase SDK doesn't provide types  :(
    deviceId: string
}
interface FirebaseReceivedMessageInfo {
    payload : string
    confirm : boolean
}

export class FirebaseSignalChannel implements SignalChannel {
    private receivedMessages : Array<Resolvable<FirebaseReceivedMessageInfo>> = []
    private confirmationPromise?: Resolvable<void>

    constructor(private options : { channelRef : firebase.database.Reference, deviceId : string }) {
        options.channelRef.on('value', this._processMessage)
        this._pushNewMessageEntry()
    }

    async sendMessage(payload : string, options : SignalMessageOptions) : Promise<void> {
        const message : FirebaseSignalMessage = {
            type: 'message',
            confirm: !!(options && options.confirmReception),
            payload,
            updated: firebase.database.ServerValue.TIMESTAMP,
            deviceId: this.options.deviceId,
        }
        this.confirmationPromise = createResolvable<void>()
        if (!(options && options.confirmReception)) {
            this.confirmationPromise.resolve()
        }
        await this.options.channelRef.set(message)
        await this.confirmationPromise
    }

    async _sendConfirmation() : Promise<void> {
        const message : FirebaseSignalMessage = {
            type: 'confirmation',
            confirm: false,
            payload: '',
            updated: firebase.database.ServerValue.TIMESTAMP,
            deviceId: this.options.deviceId,
        }
        await this.options.channelRef.set(message)
    }

    async receiveMessage() : Promise<{ payload : string }> {
        const promise = this.receivedMessages[0]!
        const { payload, confirm } = await promise
        this.receivedMessages.shift()
        if (!this.receivedMessages.length) {
            this._pushNewMessageEntry()
        }
        if (confirm) {
            await this._sendConfirmation()
        }
        return { payload }
    }

    async release() {
        this.options.channelRef.off('value', this._processMessage)
    }

    _processMessage = (snapshot : firebase.database.DataSnapshot) => {
        const message : FirebaseSignalMessage = snapshot.val()
        if (message.deviceId === this.options.deviceId) {
            return
        }

        if (message.type === 'message') {
            this.receivedMessages[0].resolve(message)
        } else if (message.type === 'confirmation') {
            if (this.confirmationPromise) {
                this.confirmationPromise.resolve()
            }
        }
    }

    _pushNewMessageEntry() {
        this.receivedMessages.push(createResolvable<FirebaseReceivedMessageInfo>())
    }
}
