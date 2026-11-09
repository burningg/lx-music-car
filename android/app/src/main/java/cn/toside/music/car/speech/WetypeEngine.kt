package cn.toside.music.car.speech

import android.content.Context
import android.content.res.AssetManager
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.CancellationException
import java.util.concurrent.atomic.AtomicLong

/** One model per foreground session. The model is mmap'ed from a verified private file. */
internal class WetypeEngine(context: Context, cancelled: () -> Boolean = { false }) {
    companion object {
        const val SAMPLE_RATE = 16000
        const val MAX_SAMPLES = SAMPLE_RATE * 20
        const val MODEL_DIR = "stt/wetype"
        private data class Asset(val name: String, val size: Long, val sha256: String)
        private val modelFiles = arrayOf(
            Asset("model.xnet", 135646496, "0674250a848ce3eb91024b3c0a6eda61b91ea45b2c40e4900130995e89cb9033"),
            Asset("dict.decoder.utf8.txt", 129706, "08a16004cfcf5b9f1668e055f3100de9b8a44f88541819def2bbd56bfd42f484"),
        )

        fun assetsAvailable(assets: AssetManager): Boolean = try {
            modelFiles.all { asset -> assets.open("$MODEL_DIR/${asset.name}").use { it.read() >= 0 } }
        } catch (_: java.io.IOException) { false }

        private fun checkCancelled(cancelled: () -> Boolean) {
            if (cancelled()) throw CancellationException("Voice input cancelled")
        }

        private fun matches(file: File, asset: Asset, cancelled: () -> Boolean): Boolean {
            if (!file.isFile || file.length() != asset.size) return false
            val digest = MessageDigest.getInstance("SHA-256")
            file.inputStream().buffered().use { input ->
                val buffer = ByteArray(65536)
                while (true) {
                    checkCancelled(cancelled)
                    val n = input.read(buffer)
                    if (n < 0) break
                    digest.update(buffer, 0, n)
                }
            }
            return digest.digest().joinToString("") { "%02x".format(it.toInt() and 255) } == asset.sha256
        }

        @Synchronized
        private fun prepare(context: Context, cancelled: () -> Boolean): File {
            // Only this version's files are loaded. No SD card/imported/untrusted models.
            val dir = File(context.noBackupFilesDir, "wetype-20260710")
            if (!dir.isDirectory && !dir.mkdirs()) throw ModelException("Cannot create model directory")
            for (asset in modelFiles) {
                checkCancelled(cancelled)
                val target = File(dir, asset.name)
                if (matches(target, asset, cancelled)) continue
                val temporary = File(dir, "${asset.name}.tmp")
                try {
                    context.assets.open("$MODEL_DIR/${asset.name}").use { input ->
                        temporary.outputStream().buffered().use { output ->
                            val buffer = ByteArray(65536)
                            while (true) {
                                checkCancelled(cancelled)
                                val n = input.read(buffer)
                                if (n < 0) break
                                output.write(buffer, 0, n)
                            }
                        }
                    }
                    if (!matches(temporary, asset, cancelled)) throw ModelException("Corrupt bundled model")
                    if (!temporary.renameTo(target)) throw ModelException("Cannot install model file")
                } finally { temporary.delete() }
            }
            return dir
        }
    }

    private val handle = AtomicLong(0)
    private val pcm = ShortArray(MAX_SAMPLES)
    private var count = 0
    private val endpoint = SpeechEndpoint()

    init {
        try {
            val dir = prepare(context, cancelled)
            checkCancelled(cancelled)
            val nativeHandle = WetypeNative.create(dir.absolutePath)
            if (nativeHandle == 0L) throw ModelException("Native model initialization failed")
            handle.set(nativeHandle)
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            throw ModelException("Cannot load offline model", error)
        }
    }

    fun accept(samples: ShortArray, length: Int) {
        require(length in 0..samples.size && count + length <= MAX_SAMPLES)
        samples.copyInto(pcm, count, 0, length)
        count += length
        endpoint.accept(samples, length)
    }

    fun isEndpoint(): Boolean = endpoint.isEndpoint()

    fun finish(): String {
        val id = handle.get()
        if (id == 0L || !endpoint.heardSpeech) return ""
        return WetypeNative.recognize(id, pcm.copyOf(count)).trim()
    }

    // May run on the main thread while native decode is in progress; never waits for inference.
    fun cancel() { handle.get().takeIf { it != 0L }?.let { WetypeNative.cancel(it) } }

    // Only called by the worker after decode returns, so PCM cannot race the writer.
    fun release() {
        handle.getAndSet(0).takeIf { it != 0L }?.let { WetypeNative.release(it) }
        pcm.fill(0)
    }

    class ModelException(message: String, cause: Throwable? = null) : Exception(message, cause)
}
