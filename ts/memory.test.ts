import { testSignalTransport } from './index.tests';
import { MemorySignalTransportManager } from './memory';

describe('In-memory signalling', () => {
    testSignalTransport({
        setup: async () => {
            const transportManager = new MemorySignalTransportManager()
            return {
                signalTransportFactory: () => transportManager.createTransport()
            }
        }
    })
})