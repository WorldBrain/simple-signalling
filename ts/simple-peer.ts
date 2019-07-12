import SimplePeer from 'simple-peer'
import { SignalChannel } from "./types";

export async function signalSimplePeer(options : { signalChannel : SignalChannel, simplePeer : SimplePeer.Instance }) : Promise<void> {
    const connectedPromise = new Promise((resolve) => {
        options.simplePeer.on('connect', (data : any) => {
            resolve()
        })
    })

    options.simplePeer.on('signal', (data : any) => {
        options.signalChannel.sendMessage(data)
    })

    while (true) {
        type Next = { type : 'connected' } | { type: 'signal', data : string }
        const next : Next = await Promise.race([
            connectedPromise.then(() : Next => ({ type: 'connected' })),
            options.signalChannel.receiveMessage().then((data) : Next => ({ type: 'signal', data: data.payload }))
        ])

        if (next.type === 'connected') {
            break
        }

        options.simplePeer.signal(next.data)
    }
}
