import expect from 'expect'
import { MessageQueue } from './utils';

describe('MessageQueue', () => {
    it('should pop a message when one is queued', async () => {
        const messageQueue = new MessageQueue<string>()
        messageQueue.pushMessage('test')
        const popPromise = messageQueue.eventuallyPopMessage();
        expect(await popPromise).toEqual('test')
    })

    it('should wait to pop a message until one is queued', async () => {
        const messageQueue = new MessageQueue<string>()
        const popPromise = messageQueue.eventuallyPopMessage();
        messageQueue.pushMessage('test')
        expect(await popPromise).toEqual('test')
    })

    it('should eventually pop only one message at a time', async () => {
        const messageQueue = new MessageQueue<string>()
        const popPromise = messageQueue.eventuallyPopMessage();
        const popPromise2 = messageQueue.eventuallyPopMessage();
        messageQueue.pushMessage('test')
        messageQueue.pushMessage('test 2')
        expect(await popPromise).toEqual('test')
        expect(await popPromise2).toEqual('test 2')
    })

    it('should pop only one message at a time', async () => {
        const messageQueue = new MessageQueue<string>()

        messageQueue.pushMessage('test')
        const popPromise = messageQueue.eventuallyPopMessage();
        expect(await popPromise).toEqual('test')

        messageQueue.pushMessage('test 2')
        const popPromise2 = messageQueue.eventuallyPopMessage();
        expect(await popPromise2).toEqual('test 2')
    })
})