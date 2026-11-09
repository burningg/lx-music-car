package cn.toside.music.car.speech

import kotlin.math.sqrt

/** Lightweight energy gate, not a neural VAD. Count audio samples, not inference/wall time. */
internal class SpeechEndpoint {
    private var samples = 0
    private var lastVoice = 0
    private var voiced = 0
    private var frameEnergy = 0.0
    private var frameSamples = 0
    private var noise = 0.001
    var heardSpeech = false
        private set

    fun accept(pcm: ShortArray, count: Int) {
        require(count in 0..pcm.size)
        for (i in 0 until count) {
            val value = pcm[i] / 32768.0
            frameEnergy += value * value
            samples++
            if (++frameSamples < 320) continue // 20 ms; independent of AudioRecord read sizes.
            val rms = sqrt(frameEnergy / frameSamples)
            if (rms > maxOf(0.004, noise * 3.0)) {
                voiced += frameSamples
                if (voiced >= 1920) heardSpeech = true // Reject isolated clicks (<120 ms).
                lastVoice = samples
            } else {
                voiced = 0
                noise = noise * 0.95 + minOf(rms, 0.02) * 0.05
            }
            frameEnergy = 0.0
            frameSamples = 0
        }
    }

    fun isEndpoint(): Boolean = samples >= 320000 ||
        (heardSpeech && samples - lastVoice >= 19200) || (!heardSpeech && samples >= 96000)
}
