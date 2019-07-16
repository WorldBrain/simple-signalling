export interface SignalTransport {
    allocateChannel() : Promise<{ initialMessage : string }>
    openChannel(options : { deviceId : string, initialMessage? : string }) : Promise<SignalChannel>
}

export interface SignalChannel {
    sendMessage(payload : string, options? : SignalMessageOptions) : Promise<void>
    receiveMessage() : Promise<{ payload : string }>
    release() : Promise<void>
}

export interface SignalMessageOptions {
    confirmReception : boolean
}