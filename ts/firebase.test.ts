import { FirebaseSignalTransport } from './firebase';
import { testSignalTransport } from './index.tests';
import { createSignallingFirebaseTestApp } from './firebase.tests';

describe('Firebase signalling', () => {
    testSignalTransport({
        setup: async () => {
            const { app, collectionName } = await createSignallingFirebaseTestApp()

            return {
                signalTransportFactory: () => {
                    return new FirebaseSignalTransport({ database: app.database(), collectionName })
                },
                cleanup: async () => {
                    // await app.auth().signOut()
                    await app.delete()
                }
            }
        }
    })
})