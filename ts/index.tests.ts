import expect from 'expect'
import { SignalTransport, SignalChannel } from './types';
import { MessageQueue } from './utils';

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
    const firstChannel = await firstSignalTransport.openChannel({ initialMessage, deviceId: 'first' })
    
    const secondSignalTransport = setup.signalTransportFactory()
    const secondChannel = await secondSignalTransport.openChannel({ initialMessage, deviceId: 'second' })

    return [firstChannel, secondChannel]
}

function createChannelBuffer(channel : SignalChannel) {
    const messages = new MessageQueue()
    channel.events.on('signal', ({ payload }) => {
        messages.pushMessage(payload)
    })
    return { messages }
}

export async function testSignalTransport(options : SignalTransportTestSuiteOptions) {
    const it = makeTestFactory(options)

    it('should open a channel and exchange messages', async (setup : SignalTransportTestSetup) => {
        const [firstChannel,  secondChannel] = await setupChannels(setup)
        const [firstChannelBuffer, secondChannelBuffer] = [createChannelBuffer(firstChannel), createChannelBuffer(secondChannel)]
        await firstChannel.connect()
        await secondChannel.connect()

        await secondChannel.sendMessage('first message')
        expect(await firstChannelBuffer.messages.eventuallyPopMessage()).toEqual('first message')
        await firstChannel.sendMessage('second message')
        expect(await secondChannelBuffer.messages.eventuallyPopMessage()).toEqual('second message')
        
        await firstChannel.release()
        await secondChannel.release()
    })

    it('should wait if listening for messages when there are none yet', async (setup : SignalTransportTestSetup) => {
        const [firstChannel,  secondChannel] = await setupChannels(setup)
        const [firstChannelBuffer, secondChannelBuffer] = [createChannelBuffer(firstChannel), createChannelBuffer(secondChannel)]
        await firstChannel.connect()
        await secondChannel.connect()
        
        await secondChannel.sendMessage('first message')
        expect(await firstChannelBuffer.messages.eventuallyPopMessage()).toEqual('first message')
        
        await firstChannel.release()
        await secondChannel.release()
    })

    it('should not deliver messages back to its own channel', async (setup : SignalTransportTestSetup) => {
        const [firstChannel,  secondChannel] = await setupChannels(setup)
        const [firstChannelBuffer, secondChannelBuffer] = [createChannelBuffer(firstChannel), createChannelBuffer(secondChannel)]
        await firstChannel.connect()
        await secondChannel.connect()
        
        const promise = firstChannelBuffer.messages.eventuallyPopMessage()
        await firstChannel.sendMessage('first message')
        expect(await Promise.race([
            promise,
            new Promise(resolve => setTimeout(() => resolve('timeout'), 500)),
        ])).toEqual('timeout')
        
        await firstChannel.release()
        await secondChannel.release()
    })

    it('should not emit signals before we connect', async (setup : SignalTransportTestSetup) => {
        const [firstChannel,  secondChannel] = await setupChannels(setup)
        const [firstChannelBuffer, secondChannelBuffer] = [createChannelBuffer(firstChannel), createChannelBuffer(secondChannel)]
        
        const promise = secondChannelBuffer.messages.eventuallyPopMessage()
        await firstChannel.sendMessage('first message')
        expect(await Promise.race([
            promise,
            new Promise(resolve => setTimeout(() => resolve('timeout'), 500)),
        ])).toEqual('timeout')
        
        await firstChannel.release()
        await secondChannel.release()
    })

    it('should buffer signals before we connect', async (setup : SignalTransportTestSetup) => {
        const [firstChannel,  secondChannel] = await setupChannels(setup)
        const [firstChannelBuffer, secondChannelBuffer] = [createChannelBuffer(firstChannel), createChannelBuffer(secondChannel)]
        
        const promise = secondChannelBuffer.messages.eventuallyPopMessage()
        await firstChannel.sendMessage('first message')
        
        await firstChannel.connect()
        await secondChannel.connect()
        expect(await promise).toEqual('first message')
        
        await firstChannel.release()
        await secondChannel.release()
    })
}
