import expect from 'expect'
import { SignalTransport, SignalChannel } from './types';

export interface SignalTransportTestSetup {
    signalTransportFactory : () => SignalTransport
    cleanup? : () => Promise<void>
}

export interface SignalTransportTestSuiteOptions {
    setup : () => Promise<SignalTransportTestSetup>
}

function makeTestFactory(options : SignalTransportTestSuiteOptions) {
    return (description : string, test : (setup : SignalTransportTestSetup) => Promise<void>) => {
        it(description, async () => {
            const setup = await options.setup()
            try {
                await test(setup)
            } finally {
                if (setup.cleanup) {
                    await setup.cleanup()
                }
            }
        })
    }
}

async function setupChannels(setup : SignalTransportTestSetup) : Promise<[SignalChannel, SignalChannel]> {
    const firstSignalTransport = setup.signalTransportFactory()
    const { initialMessage } = await firstSignalTransport.allocateChannel()
    const firstChannel = await firstSignalTransport.openChannel({ initialMessage, deviceId: 'device one' })

    const secondSignalTransport = setup.signalTransportFactory()
    const secondChannel = await secondSignalTransport.openChannel({ initialMessage, deviceId: 'device two' })

    return [firstChannel, secondChannel]
}

export async function testSignalTransport(options : SignalTransportTestSuiteOptions) {
    const it = makeTestFactory(options)

    it('should open a channel and exchange messages', async (setup : SignalTransportTestSetup) => {
        const [firstChannel,  secondChannel] = await setupChannels(setup)
        
        await secondChannel.sendMessage('first message')
        expect(await firstChannel.receiveMessage()).toEqual({ payload: 'first message' })
        await firstChannel.sendMessage('second message')
        expect(await secondChannel.receiveMessage()).toEqual({ payload: 'second message' })
        
        await firstChannel.release()
        await secondChannel.release()
    })

    it('should wait if listening for messages when there are none yet', async (setup : SignalTransportTestSetup) => {
        const [firstChannel,  secondChannel] = await setupChannels(setup)
        
        const promise = firstChannel.receiveMessage()
        await secondChannel.sendMessage('first message')
        expect(await promise).toEqual({ payload: 'first message' })
        
        await firstChannel.release()
        await secondChannel.release()
    })

    it('should be able to wait for a reception confirmation', async (setup : SignalTransportTestSetup) => {
        const [firstChannel,  secondChannel] = await setupChannels(setup)
        
        const sendPromise = secondChannel.sendMessage('first message', { confirmReception: true })
        const raced : string = await Promise.race([
            sendPromise.then(() => 'sent'),
            new Promise<string>((resolve, reject) => {
                setTimeout(() => resolve('timeout'), 300)
            })
        ])
        expect(raced).toEqual('timeout')
        expect(await firstChannel.receiveMessage()).toEqual({ payload: 'first message' })
        expect(await sendPromise.then(() => 'sent')).toEqual('sent')
        
        await firstChannel.release()
        await secondChannel.release()
    })
}
