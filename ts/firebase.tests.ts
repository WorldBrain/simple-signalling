import * as firebase from '@firebase/testing'
import { getSignallingRules } from './firebase';

export async function createSignallingFirebaseTestApp() {
    const collectionName = 'signalling'
    const app = firebase.initializeTestApp({
        databaseName: 'test'
    })
    await firebase.loadDatabaseRules({
        databaseName: 'test',
        rules: JSON.stringify({
            "rules": {
                [collectionName]: getSignallingRules()
            }
        }),
    })
    return { app, collectionName }
}