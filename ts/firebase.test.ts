import expect from 'expect'
import * as firebase from '@firebase/testing'
import { FirebaseSignalTransport } from './firebase';

describe('Firebase signalling', () => {
    it('should open a channel and exchange messages', async () => {
        const app = firebase.initializeTestApp({
            databaseName: 'test'
        })
        await firebase.loadDatabaseRules({
            databaseName: 'test',
            rules: `{
                "rules": {
                    "signalling": {
                        "$id": {
                            ".read": true,
                            ".write": true,
                            ".validate": "newData.child('payload').isString() && newData.child('deviceId').isString() && newData.child('updated').val() === now"
                        }
                    }
                }
            }`,
        })

        const firstSignalTransport = new FirebaseSignalTransport({ database: app.database(), collectionName: 'signalling' })
        const { initialMessage } = await firstSignalTransport.allocateChannel()
        const firstChannel = await firstSignalTransport.openChannel({ initialMessage, deviceId: 'device one' })
        
        const secondSignalTransport = new FirebaseSignalTransport({ database: app.database(), collectionName: 'signalling' })
        const secondChannel = await secondSignalTransport.openChannel({ initialMessage, deviceId: 'device two' })
        await secondChannel.sendMessage('first message')
        expect(await firstChannel.receiveMessage()).toEqual({ payload: 'first message' })
        await firstChannel.sendMessage('second message')
        expect(await secondChannel.receiveMessage()).toEqual({ payload: 'second message' })
        await firstChannel.release()
        await secondChannel.release()
    })
})