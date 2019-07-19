import * as firebase from '@firebase/testing'
import { FirebaseSignalTransport } from './firebase';
import { testSignalTransport } from './index.tests';

describe('Firebase signalling', () => {
    testSignalTransport({
        setup: async () => {
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
                                ".validate": "newData.child('payload').isString() && newData.child('deviceId').isString() && newData.child('type').val().matches(/^initial|message|confirmation$/) && newData.child('confirm').isBoolean() && newData.child('updated').val() === now",
                                ".indexOn": ["updated"]
                            }
                        }
                    }
                }`,
            })

            return {
                signalTransportFactory: () => new FirebaseSignalTransport({ database: app.database(), collectionName: 'signalling' }),
                cleanup: async () => {
                    await app.delete()
                }
            }
        }
    })
})