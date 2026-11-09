package cn.toside.music.car.speech

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import android.util.Log
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.CancellationException

/** Real bundled XNet inference through the production Kotlin/JNI path, no microphone or network. */
@RunWith(AndroidJUnit4::class)
class OfflineSttEngineTest {
    private val instrumentation get() = InstrumentationRegistry.getInstrumentation()

    @Test
    fun testBundledChineseEnglishModelDecodesOffline() {
        val started = System.nanoTime()
        assertTrue(OfflineSttEngine.assetsAvailable(instrumentation.targetContext.assets))
        val engine = OfflineSttEngine(instrumentation.targetContext)
        try {
            val samples = readPcmWav("stt/0.wav")
            for (offset in samples.indices step 1280) {
                val block = samples.copyOfRange(offset, minOf(offset + 1280, samples.size))
                engine.accept(block, block.size)
            }
            val decodeStarted = System.nanoTime()
            val text = engine.finish()
            Log.i("OfflineSttTest", "Offline fixture: $text; decode ${(System.nanoTime() - decodeStarted) / 1e9}s; total ${(System.nanoTime() - started) / 1e9}s")
            assertTrue("Expected Chinese, got: $text", text.contains("昨天"))
            assertTrue("Expected English, got: $text", text.contains("monday", ignoreCase = true))
            assertTrue("Final words must not be dropped: $text", text.contains("星期三"))
            assertFalse(text.endsWith("。"))
        } finally { engine.release() }
    }

    @Test
    fun testSilenceDoesNotHallucinate() {
        val engine = OfflineSttEngine(instrumentation.targetContext)
        try {
            repeat(75) { engine.accept(ShortArray(1280), 1280) }
            assertTrue(engine.isEndpoint())
            assertEquals("", engine.finish())
            engine.cancel()
        } finally { engine.release(); engine.release() }
    }

    @Test
    fun testCancelledSessionNeverReturnsText() {
        val engine = OfflineSttEngine(instrumentation.targetContext)
        try {
            val pcm = readPcmWav("stt/0.wav")
            engine.accept(pcm, pcm.size)
            engine.cancel()
            assertEquals("", engine.finish())
        } finally { engine.release() }
        try {
            OfflineSttEngine(instrumentation.targetContext) { true }
            fail("Cancelled initialization must not create a native handle")
        } catch (_: CancellationException) { }
    }

    @Test
    fun testEndpointAndRecordingLimit() {
        val silence = SpeechEndpoint()
        repeat(74) { silence.accept(ShortArray(1280), 1280) }
        assertFalse(silence.isEndpoint())
        silence.accept(ShortArray(1280), 1280)
        assertTrue(silence.isEndpoint())
        assertFalse(silence.heardSpeech)

        val speech = SpeechEndpoint()
        repeat(4) { speech.accept(ShortArray(1280) { 3000 }, 1280) }
        assertTrue(speech.heardSpeech)
        repeat(14) { speech.accept(ShortArray(1280), 1280) }
        assertFalse(speech.isEndpoint())
        speech.accept(ShortArray(1280), 1280)
        assertTrue(speech.isEndpoint())

        val sustained = SpeechEndpoint()
        repeat(249) { sustained.accept(ShortArray(1280) { 3000 }, 1280) }
        assertFalse(sustained.isEndpoint())
        sustained.accept(ShortArray(1280) { 3000 }, 1280)
        assertTrue(sustained.isEndpoint())
        assertFalse(SpeechEndpoint().isEndpoint())
    }

    @Test
    fun testCorruptPrivateModelIsRepaired() {
        val dir = java.io.File(instrumentation.targetContext.noBackupFilesDir, "offline-stt-20260710")
        dir.mkdirs()
        val vocab = java.io.File(dir, "dict.decoder.utf8.txt")
        // Same length: verification must check SHA-256, not just file length/existence.
        vocab.writeBytes(ByteArray(129706))
        val engine = OfflineSttEngine(instrumentation.targetContext)
        engine.release()
        assertFalse(vocab.readBytes().all { it == 0.toByte() })
    }

    private fun readPcmWav(name: String): ShortArray {
        val bytes = instrumentation.context.assets.open(name).use { it.readBytes() }
        val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        assertEquals("RIFF", String(bytes, 0, 4, Charsets.US_ASCII))
        assertEquals("WAVE", String(bytes, 8, 4, Charsets.US_ASCII))
        var offset = 12
        var validated = false
        while (offset + 8 <= bytes.size) {
            val id = String(bytes, offset, 4, Charsets.US_ASCII)
            val size = buffer.getInt(offset + 4)
            assertTrue(size >= 0 && offset + 8 + size <= bytes.size)
            if (id == "fmt ") {
                assertEquals(1, buffer.getShort(offset + 8).toInt())
                assertEquals(1, buffer.getShort(offset + 10).toInt())
                assertEquals(16000, buffer.getInt(offset + 12))
                assertEquals(16, buffer.getShort(offset + 22).toInt())
                validated = true
            } else if (id == "data") {
                assertTrue(validated)
                return ShortArray(size / 2) { buffer.getShort(offset + 8 + it * 2) }
            }
            offset += 8 + size + (size % 2)
        }
        error("No PCM data chunk in test WAV")
    }
}
