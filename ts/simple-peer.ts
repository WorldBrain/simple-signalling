import createResolvable from '@josephg/resolvable'
import SimplePeer from 'simple-peer'
import { SignalChannel } from "./types";
import { MessageQueue } from './utils';

// let called = 0

export async function signalSimplePeer(options : { signalChannel : SignalChannel, simplePeer : SimplePeer.Instance }) : Promise<void> {
    // const processId = ++called
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
            type Next = { type : 'connected' } | { type: 'incomingSignal' } | { type: 'outgoingSignal' }
            const next : Next = await Promise.race([
                connectedPromise.then(() : Next => ({ type: 'connected' })),
                outgoingSignalQueue.waitForMessage().then(() : Next => ({ type: 'outgoingSignal' })),
                incomingSignalListener.messageQueue.waitForMessage().then(() : Next => {
                    return { type: 'incomingSignal' }
                }),
            ])

            if (next.type === 'connected') {
                // console.log('connected')
                break
            }
            
            if (next.type === 'incomingSignal') {
                const signal = incomingSignalListener.messageQueue.popMessage()!
                // console.log(`processing signal in process ${processId}:`, signal && signal.substr(0, 50), '...')
                options.simplePeer.signal(JSON.parse(signal))
            } else if (next.type === 'outgoingSignal') {
                const signal = outgoingSignalQueue.popMessage()
                if (signal) {
                    // console.log(`sending signal from process ${processId}:`, signal.substr(0, 50), '...')
                    await options.signalChannel.sendMessage(signal, { confirmReception: true })
                }
            }
        }
    } finally {
        options.simplePeer.removeListener('signal', simplePeerSignalHandler)
        incomingSignalListener.stop()
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
                    // console.log('listener received message', message.payload && message.payload.substr(0, 50), '...')
                    messageQueue.pushMessage(message.payload)
                }),
                stopPromise
            ])
        }
    })();

    return { stop, messageQueue }
}
