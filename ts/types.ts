import TypedEmitter from 'typed-emitter'

export interface SignalTransport {
    allocateChannel() : Promise<{ initialMessage : string }>
    openChannel(options : { deviceId : SignalDeviceId, initialMessage? : string }) : Promise<SignalChannel>
}

export type SignalChannelEvents = TypedEmitter<{
    signal: (event: { payload: string }) => void;
}>

export interface SignalChannel {
    events : SignalChannelEvents
    connect() : Promise<void>
    sendMessage(payload : string, options? : SignalMessageOptions) : Promise<void>
    // receiveMessage() : Promise<{ payload : string }>
    release() : Promise<void>
}

export interface SignalMessageOptions {
    confirmReception : boolean
}

export type SignalDeviceId = 'first' | 'second'
