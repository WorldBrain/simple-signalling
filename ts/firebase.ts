import { EventEmitter } from 'events';
import * as firebase from 'firebase'
import { SignalTransport, SignalChannel, SignalMessageOptions, SignalChannelEvents, SignalDeviceId } from './types';
import { getReceiverDeviceId } from './utils';

type FirebaseSignalMessage = string
interface FirebaseSignalChannelData {
    created : typeof firebase.database.ServerValue.TIMESTAMP,
    firstQueue? : FirebaseSignalMessage[] // cannot overwrite messages, just push
    secondQueue? : FirebaseSignalMessage[]
}

export class FirebaseSignalTransport implements SignalTransport {
    constructor(private options : {
        database : firebase.database.Database, collectionName : string,
    }) {
    }

    async allocateChannel() : Promise<{ initialMessage : string }> {
        const channelData : FirebaseSignalChannelData = {
            created: firebase.database.ServerValue.TIMESTAMP,
        }
        const ref = this.options.database.ref(this.options.collectionName).push(channelData)
        return { initialMessage: [ref.key].join(':') }
    }

    async openChannel(options : { deviceId : SignalDeviceId, initialMessage? : string }) : Promise<SignalChannel> {
        if (!options.initialMessage) {
            throw new Error(`Opening a channel without an initial message is not supported yet`)
        }

        const [ key ] = options.initialMessage.split(':')
        const channelRef = this.options.database.ref(this.options.collectionName).child(key)
        await channelRef.child('created').set(firebase.database.ServerValue.TIMESTAMP)
        return new FirebaseSignalChannel({ channelRef, deviceId: options.deviceId })
    }
}

export class FirebaseSignalChannel implements SignalChannel {
    events = new EventEmitter() as SignalChannelEvents
    private receiverQueueRef : firebase.database.Reference

    constructor(private options : { channelRef : firebase.database.Reference, deviceId : SignalDeviceId }) {
        this.receiverQueueRef = options.channelRef.child(`${getReceiverDeviceId(options.deviceId)}Queue`)
    }

    async connect() {
        this.options.channelRef.child(`${this.options.deviceId}Queue`).on('child_added', this._processMessage)
    }

    async sendMessage(payload : string, options : SignalMessageOptions) : Promise<void> {
        // await this.options.channelRef.child('created').set(firebase.database.ServerValue.TIMESTAMP)
        await this._pushToReceiverQueue(payload)
    }

    async _pushToReceiverQueue(message : FirebaseSignalMessage) {
        await this.receiverQueueRef.push(message)
    }

    async release() {
        this.options.channelRef.off('value', this._processMessage)
        await this.options.channelRef.remove()
    }

    _processMessage = (snapshot : firebase.database.DataSnapshot) => {
        const message : FirebaseSignalMessage = snapshot.val()
        this.events.emit('signal', { payload: message })

    }
}

export function getSignallingRules() {
    const queueRules = {
        "$message": {
            ".validate": "data.val() == null && newData.isString() && newData.val().length < 10240"
        },
    }

    return {
        "$id": {
            ".read": true,
            ".write": true,
            ".indexOn": ["created"],
            ".validate": "data.child('created').val() != null || newData.child('created').val() == now",

            "firstQueue": queueRules,
            "secondQueue": queueRules,

            // ".validate": "newData.child('payload').isString() && newData.child('deviceId').isString() && newData.child('type').val().matches(/^initial|message|confirmation$/) && newData.child('confirm').isBoolean() && newData.child('created').val() === now",
        }
    }
}
