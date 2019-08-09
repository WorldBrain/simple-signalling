import * as firebase from '@firebase/testing'
import { getSignallingRules } from './firebase';

export async function createSignallingFirebaseTestApp() {
    const collectionName = 'signalling'
    const databaseName = `test-${Date.now()}`
    const app = firebase.initializeTestApp({
        databaseName
    })
    // console.log(JSON.stringify({
    //     "rules": {
    //         [collectionName]: getSignallingRules()
    //     }
    // }, null, 4))
    await firebase.loadDatabaseRules({
        databaseName: 'test',
        rules: JSON.stringify({
            "rules": {
                [collectionName]: getSignallingRules()
            }
        }, null, 4),
    })
    // await firebase.loadDatabaseRules({
    //     databaseName: 'test',
    //     rules: JSON.stringify({
    //         "rules": {
    //             ".read": true,
    //             ".write": true,
    //         }
    //     }, null, 4),
    // })
    return { app, databaseName, collectionName }
}