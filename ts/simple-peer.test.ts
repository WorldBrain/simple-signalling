import expect from 'expect'
const wrtc = require('wrtc')
import Peer from 'simple-peer'
import * as firebase from 'firebase'
import { MemorySignalTransportManager } from './memory';
import { signalSimplePeer } from './simple-peer';
import { SignalTransport } from './types';
import { createSignallingFirebaseTestApp } from './firebase.tests';
import { FirebaseSignalTransport } from './firebase';

async function runSimplePeerTest(options : { transports : [SignalTransport, SignalTransport] }) {
    const { transports } = options
    const { initialMessage } = await transports[0].allocateChannel()
    const channels = [
        await transports[0].openChannel({ initialMessage, deviceId: 'first' }),
        await transports[1].openChannel({ initialMessage, deviceId: 'second' }),
    ]
    await Promise.all(channels.map(channel => channel.connect()))

    const peers = [
        new Peer({ initiator: true, wrtc }),
        new Peer({ wrtc }),
    ]
    await Promise.all([
        signalSimplePeer({ signalChannel: channels[0], simplePeer: peers[0] }),
        signalSimplePeer({ signalChannel: channels[1], simplePeer: peers[1] }),
    ])
    
    const peerOneData = new Promise<any>(resolve => {
        peers[0].once('data', data => {
            resolve(data)
        })
    })
    peers[1].send('some data')
    expect((await peerOneData).toString()).toEqual('some data')
}

describe('simple-peer connection initiation', () => {
    it('should be able to establish a simple-peer WebRTC connection using an in-memory signal channel', async () => {
        const transportManager = new MemorySignalTransportManager()
        const transports : [SignalTransport, SignalTransport] = [transportManager.createTransport(), transportManager.createTransport()]
        await runSimplePeerTest({ transports })
    })
    
    it('should be able to establish a simple-peer WebRTC connection using an emulated Firebase channel', async () => {
        const { app: firebaseApp, collectionName } = await createSignallingFirebaseTestApp()
        try {
            const createTransport = () => new FirebaseSignalTransport({ database: firebaseApp.database(), collectionName })
            const transports : [SignalTransport, SignalTransport] = [
                createTransport(),
                createTransport(),
            ]
            await runSimplePeerTest({ transports })
        } finally {
            await firebaseApp.delete()
        }
    })

    // it('should be able to establish a simple-peer WebRTC connection using a real Firebase channel', async () => {
    //     firebase.initializeApp({
    //         apiKey: "AIzaSyBt3A84YbnFjQnSppOJhgl5ybaKRNOVCpY",
    //         authDomain: "storex-89b19.firebaseapp.com",
    //         databaseURL: "https://storex-89b19.firebaseio.com",
    //         projectId: "storex-89b19",
    //         storageBucket: "storex-89b19.appspot.com",
    //         messagingSenderId: "432461674343",
    //     })
    //     const createTransport = () => new FirebaseSignalTransport({ database: firebase.database(), collectionName: 'signalling' })
    //     const transports : [SignalTransport, SignalTransport] = [
    //         createTransport(),
    //         createTransport(),
    //     ]
    //     await runSimplePeerTest({ transports })
    // })
})