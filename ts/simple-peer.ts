import createResolvable from '@josephg/resolvable'
import SimplePeer from 'simple-peer'
import { SignalChannel } from "./types";
import { MessageQueue } from './utils';

let called = 0

export async function signalSimplePeer(options : { signalChannel : SignalChannel, simplePeer : SimplePeer.Instance }) : Promise<void> {
    const processId = ++called
    const incomingSignalListener = createIncomingSignalListener(options.signalChannel)
    const outgoingSignalQueue = new MessageQueue<string>()

    const connectedPromise = new Promise((resolve) => {
        options.simplePeer.on('connect', () => {
            resolve()
        })
    })

    const simplePeerSignalHandler = (data : any) => {
        outgoingSignalQueue.pushMessage(JSON.stringify(data))
    }

    options.simplePeer.on('signal', simplePeerSignalHandler)
    try {
        while (true) {
            type Next = { type : 'connected' } | { type: 'incomingSignal', data : string } | { type: 'outgoingSignal' }
            const next : Next = await Promise.race([
                connectedPromise.then(() : Next => ({ type: 'connected' })),
                outgoingSignalQueue.waitForMessage().then(() : Next => ({ type: 'outgoingSignal' })),
                incomingSignalListener.messageQueue.waitForMessage().then(() : Next => {
                    return { type: 'incomingSignal', data: incomingSignalListener.messageQueue.popMessage()! }
                }),
            ])

            if (next.type === 'connected') {
                console.log('connected')
                break
            }
            
            if (next.type === 'incomingSignal') {
                console.log(`received signal in process ${processId}:`, next.data.substr(0, 50), '...')
                options.simplePeer.signal(JSON.parse(next.data))
            } else if (next.type === 'outgoingSignal') {
                const signal = outgoingSignalQueue.popMessage()
                if (signal) {
                    console.log(`sending signal from process ${processId}:`, signal.substr(0, 50), '...')
                    await options.signalChannel.sendMessage(signal, { confirmReception: true })
                }
            }
        }
    } finally {
        options.simplePeer.removeListener('signal', simplePeerSignalHandler)
    }
}

const createIncomingSignalListener = (signalChannel : SignalChannel) => {
    const messageQueue = new MessageQueue<string>()

    let running = true
    const stopPromise = createResolvable()
    const stop = () => {
        running = false
        stopPromise.resolve()
    };

    (async () => {
        while (running) {
            await Promise.race([
                signalChannel.receiveMessage().then(message => {
                    messageQueue.pushMessage(message.payload)
                }),
                stopPromise
            ])
        }
    })();

    return { stop, messageQueue }
}
