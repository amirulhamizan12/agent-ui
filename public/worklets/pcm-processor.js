// AudioWorklet for real-time PCM audio streaming
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.audioQueue = [];
    this.isPlaying = false;
    this.currentChunk = null;
    this.chunkIndex = 0;
    this.isStopped = false;

    // Listen for audio data from main thread
    this.port.onmessage = (event) => {
      if (event.data && event.data.audioChunk) {
        if (!this.isStopped) {
          this.audioQueue.push(event.data.audioChunk);
        }
      } else if (event.data && event.data.clear) {
        this.audioQueue = [];
        this.currentChunk = null;
        this.chunkIndex = 0;
        this.isPlaying = false;
        this.isStopped = false;
      } else if (event.data && event.data.stop) {
        this.isStopped = true;
        this.audioQueue = [];
        this.currentChunk = null;
        this.chunkIndex = 0;
        this.isPlaying = false;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0][0];
    if (!output) return true;

    // If stopped, output silence
    if (this.isStopped) {
      for (let i = 0; i < output.length; i++) {
        output[i] = 0;
      }
      return true;
    }

    // Fill output buffer with queued audio data
    for (let i = 0; i < output.length; i++) {
      if (this.currentChunk && this.chunkIndex < this.currentChunk.length) {
        output[i] = this.currentChunk[this.chunkIndex];
        this.chunkIndex++;
      } else {
        // Get next chunk from queue
        this.currentChunk = this.audioQueue.shift();
        this.chunkIndex = 0;

        if (!this.currentChunk) {
          output[i] = 0; // Silence when no data
          this.isPlaying = false;
        } else {
          this.isPlaying = true;
          i--; // Retry this sample with new chunk
        }
      }
    }

    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
