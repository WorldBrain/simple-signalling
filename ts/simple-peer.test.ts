import expect from 'expect'
const wrtc = require('wrtc')
import Peer from 'simple-peer'
import { MemorySignalTransportManager } from './memory';
import { signalSimplePeer } from './simple-peer';

describe('simple-peer connection initiation', () => {
    it('should be able to establish a simple-peer WebRTC connection using an in-memory signal channel', async () => {
        const transportManager = new MemorySignalTransportManager()
        const tranports = [transportManager.createTransport(), transportManager.createTransport()]
        const { initialMessage } = await tranports[0].allocateChannel()
        const channels = [
            await tranports[0].openChannel({ initialMessage, deviceId: 'device one' }),
            await tranports[1].openChannel({ initialMessage, deviceId: 'device two' }),
        ]
        const peers = [
            new Peer({ initiator: true, wrtc }),
            new Peer({ wrtc }),
        ]
        await Promise.all([
            signalSimplePeer({ signalChannel: channels[0], simplePeer: peers[0] }),
            // signalSimplePeer({ signalChannel: channels[1], simplePeer: peers[1] }),
        ])
        console.log('still alive!')
    })
})