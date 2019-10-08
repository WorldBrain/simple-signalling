import { FirebaseSignalTransport } from './firebase';
import { testSignalTransport } from './index.tests';
import { createSignallingFirebaseTestApp } from './firebase.tests';

if (process.env.RUN_FIREBASE_TESTS === 'true') {
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
}