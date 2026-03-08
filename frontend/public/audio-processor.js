class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096;
        this.buffer = new Int16Array(this.bufferSize);
        this.offset = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const channelData = input[0];

            // Loop through the Float32Array PCM
            for (let i = 0; i < channelData.length; i++) {
                // Convert to Int16 (-1.0 to 1.0 -> -32768 to 32767)
                let s = Math.max(-1, Math.min(1, channelData[i]));
                this.buffer[this.offset] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                this.offset++;

                // If buffer is full, send back to the main thread via postMessage
                if (this.offset >= this.bufferSize) {
                    // Send a copy to prevent mutation
                    this.port.postMessage(this.buffer.slice(0));
                    this.offset = 0;
                }
            }
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
