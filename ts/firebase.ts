import * as firebase from 'firebase'
import { SignalTransport, SignalChannel } from './types';

export class FirebaseSignalTransport implements SignalTransport {
    constructor(private options : { database : firebase.database.Database, collectionName : string }) {
    }

    async allocateChannel() : Promise<{ initialMessage : string }> {
        const ref = this.options.database.ref(this.options.collectionName).push({
            type: 'initial',
            deviceId: 'none',
            payload: '',
            updated: firebase.database.ServerValue.TIMESTAMP,
        })
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

export class FirebaseSignalChannel implements SignalChannel {
    private receivedMessages : Array<{ promise : Promise<string>, resolve : (payload : string) => void }> = []

    constructor(private options : { channelRef : firebase.database.Reference, deviceId : string }) {
        options.channelRef.on('value', this._processMessage)
        this._pushNewMessageEntry()
    }

    async sendMessage(payload : string) : Promise<void> {
        await this.options.channelRef.set({
            type: 'message',
            payload,
            updated: firebase.database.ServerValue.TIMESTAMP,
            deviceId: this.options.deviceId,
        })
    }

    async receiveMessage() : Promise<{ payload : string }> {
        const promise = this.receivedMessages[0]!.promise
        const payload = await promise
        if (!this.receivedMessages.length) {
            this._pushNewMessageEntry()
        }
        return { payload }
    }

    async release() {
        this.options.channelRef.off('value', this._processMessage)
    }

    _processMessage = (snapshot : firebase.database.DataSnapshot) => {
        const message = snapshot.val()
        if (message.deviceId === this.options.deviceId || message.payload === '') {
            return
        }

        this.receivedMessages[0].resolve(message.payload)
    }

    _createMessageEntry() {
        let resolve! : (payload : string) => void
        const promise : Promise<string> = new Promise(r => {
            resolve = r
        })
        return { promise, resolve }
    }

    _pushNewMessageEntry() {
        this.receivedMessages.push(this._createMessageEntry())
    }
}
