package cn.toside.music.car.speech

import android.content.res.AssetManager
import com.k2fsa.sherpa.onnx.EndpointConfig
import com.k2fsa.sherpa.onnx.EndpointRule
import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OnlineModelConfig
import com.k2fsa.sherpa.onnx.OnlineRecognizer
import com.k2fsa.sherpa.onnx.OnlineRecognizerConfig
import com.k2fsa.sherpa.onnx.OnlineStream
import com.k2fsa.sherpa.onnx.OnlineTransducerModelConfig

/** Owned by a single worker thread. Models are read directly from APK assets (no extra copy). */
class ZipformerEngine(assets: AssetManager) {
    companion object {
        const val SAMPLE_RATE = 16000
        const val MODEL_DIR = "stt/zipformer-small-zh-en-int8"
        val MODEL_FILES = arrayOf(
            "encoder-epoch-99-avg-1.int8.onnx",
            "decoder-epoch-99-avg-1.onnx",
            "joiner-epoch-99-avg-1.int8.onnx",
            "tokens.txt",
        )

        fun assetsAvailable(assets: AssetManager): Boolean = try {
            MODEL_FILES.all { name -> assets.open("$MODEL_DIR/$name").use { it.read() >= 0 } }
        } catch (_: java.io.IOException) {
            false
        }
    }

    private val recognizer = OnlineRecognizer(
        assetManager = assets,
        config = OnlineRecognizerConfig(
            featConfig = FeatureConfig(sampleRate = SAMPLE_RATE, featureDim = 80),
            modelConfig = OnlineModelConfig(
                transducer = OnlineTransducerModelConfig(
                    encoder = "$MODEL_DIR/${MODEL_FILES[0]}",
                    decoder = "$MODEL_DIR/${MODEL_FILES[1]}",
                    joiner = "$MODEL_DIR/${MODEL_FILES[2]}",
                ),
                tokens = "$MODEL_DIR/tokens.txt",
                numThreads = 2,
                provider = "cpu",
                modelType = "zipformer",
            ),
            // Allow time to start speaking; finish a phrase after 1.2 seconds of silence.
            endpointConfig = EndpointConfig(
                rule1 = EndpointRule(false, 6.0f, 0.0f),
                rule2 = EndpointRule(true, 1.2f, 0.0f),
                rule3 = EndpointRule(false, 0.0f, 20.0f),
            ),
            enableEndpoint = true,
            // Upstream INT8 recipe uses an FP32 decoder; encoder and joiner stay quantized.
            decodingMethod = "greedy_search",
        ),
    )

    fun createStream(): OnlineStream = recognizer.createStream()

    fun accept(stream: OnlineStream, samples: FloatArray, cancelled: () -> Boolean = { false }) {
        stream.acceptWaveform(samples, SAMPLE_RATE)
        drain(stream, cancelled)
    }

    private fun drain(stream: OnlineStream, cancelled: () -> Boolean) {
        while (!cancelled() && recognizer.isReady(stream)) recognizer.decode(stream)
    }

    fun isEndpoint(stream: OnlineStream): Boolean = recognizer.isEndpoint(stream)

    fun finish(stream: OnlineStream, cancelled: () -> Boolean = { false }): String {
        // Flush right context so the last word isn't lost at the recording limit.
        accept(stream, FloatArray(SAMPLE_RATE), cancelled)
        stream.inputFinished()
        drain(stream, cancelled)
        return recognizer.getResult(stream).text.trim()
    }

    fun release() = recognizer.release()
}
