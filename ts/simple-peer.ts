import createResolvable from '@josephg/resolvable'
import SimplePeer from 'simple-peer'
import { SignalChannel } from "./types";

export interface SimplePeerSignallingEvents {
    start: {},
    receivedIncomingSignal: { signal: any },
    processingIncomingSignal: { signal: any },
    queuingOutgoingSignal: { signal: any },
    sendingOutgoingSignal: { signal: any },
    connected: {},
}

export type SimplePeerSignallingReporter =
    <EventName extends keyof SimplePeerSignallingEvents>
        (eventName: EventName, event: SimplePeerSignallingEvents[EventName]) => void

export async function signalSimplePeer(options: {
    signalChannel: SignalChannel, simplePeer: SimplePeer.Instance,
    reporter?: SimplePeerSignallingReporter
}): Promise<void> {
    const reporter = options.reporter || (() => { })
    reporter('start', {})

    const waitUntilConnected = createResolvable<unknown>()
    options.simplePeer.on('signal', (data: any) => {
        reporter('sendingOutgoingSignal', { signal: data })
        options.signalChannel.sendMessage(JSON.stringify(data))
    })
    options.simplePeer.on('connect', () => {
        reporter('connected', {})
        waitUntilConnected.resolve(null)
    })
    options.simplePeer.on('error', (err) => {
        waitUntilConnected.reject(err)
    })
    options.signalChannel.events.on('signal', ({ payload }) => {
        const signal = JSON.parse(payload)
        reporter('receivedIncomingSignal', { signal })
        reporter('processingIncomingSignal', { signal })
        options.simplePeer.signal(signal)
    })

    await waitUntilConnected
    options.signalChannel.events.removeAllListeners('signal')
    options.simplePeer.removeAllListeners('signal')

    // const incomingSignalListener = createIncomingSignalListener(options.signalChannel, { reporter })
    // const outgoingSignalQueue = new MessageQueue<string>()

    // const connectedPromise = new Promise((resolve) => {
    //     options.simplePeer.on('connect', () => {
    //         resolve()
    //     })
    // })

    // const simplePeerSignalHandler = (data : any) => {
    //     const signal = JSON.stringify(data)
    //     reporter('queuingOutgoingSignal', { signal })
    //     outgoingSignalQueue.pushMessage(signal)
    // }

    // options.simplePeer.on('signal', simplePeerSignalHandler)
    // try {
    //     while (true) {
    //         type Next = { type : 'connected' } | { type: 'incomingSignal' } | { type: 'outgoingSignal' }
    //         const next : Next = await Promise.race([
    //             connectedPromise.then(() : Next => ({ type: 'connected' })),
    //             outgoingSignalQueue.waitForMessage().then(() : Next => ({ type: 'outgoingSignal' })),
    //             incomingSignalListener.messageQueue.waitForMessage().then(() : Next => {
    //                 return { type: 'incomingSignal' }
    //             }),
    //         ])

    //         if (next.type === 'connected') {
    //             // console.log('connected')
    //             break
    //         }

    //         if (next.type === 'incomingSignal') {
    //             const signal = incomingSignalListener.messageQueue.popMessage()!
    //             reporter('processingIncomingSignal', { signal })
    //             options.simplePeer.signal(JSON.parse(signal))
    //         } else if (next.type === 'outgoingSignal') {
    //             const signal = outgoingSignalQueue.popMessage()
    //             if (signal) {
    //                 reporter('sendingOutgoingSignal', { signal })
    //                 await options.signalChannel.sendMessage(signal, { confirmReception: true })
    //             }
    //         }
    //     }
    // } finally {
    //     options.simplePeer.removeListener('signal', simplePeerSignalHandler)
    //     incomingSignalListener.stop()
    // }
}

// const createIncomingSignalListener = (signalChannel : SignalChannel, options : { reporter : SimplePeerSignallingReporter }) => {
//     const messageQueue = new MessageQueue<string>()

//     let running = true
//     const stopPromise = createResolvable()
//     const stop = () => {
//         running = false
//         stopPromise.resolve()
//     };

//     (async () => {
//         // while (running) {
//             // await Promise.race([
//             //     signalChannel.receiveMessage().then(message => {
//             //         options.reporter('receivedIncomingSignal', { signal: message.payload })
//             //         messageQueue.pushMessage(message.payload)
//             //     }),
//             //     stopPromise
//             // ])
//         // }
//     })();

//     return { stop, messageQueue }
// }
