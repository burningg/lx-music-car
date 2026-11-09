package cn.toside.music.car.speech

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import android.util.Log
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Runs the real bundled mixed-quantization graphs on Android, without the mic or a system recognizer. */
@RunWith(AndroidJUnit4::class)
class ZipformerEngineTest {
    private val instrumentation get() = InstrumentationRegistry.getInstrumentation()
    @Test
    fun testBundledChineseEnglishModelDecodesOffline() {
        val started = System.nanoTime()
        val assets = instrumentation.targetContext.assets
        assertTrue("All model files must be in the installed APK", ZipformerEngine.assetsAvailable(assets))
        val engine = ZipformerEngine(assets)
        val stream = engine.createStream()
        try {
            val samples = readPcmWav("stt/0.wav")
            // Same block size and decoder path as AudioRecord, including final context flushing.
            for (offset in samples.indices step 1280) {
                engine.accept(stream, samples.copyOfRange(offset, minOf(offset + 1280, samples.size)))
            }
            val text = engine.finish(stream)
            Log.i("ZipformerTest", "Offline fixture result: $text; total ${(System.nanoTime() - started) / 1e9}s")
            assertTrue("Expected Chinese from the bilingual fixture, got: $text", text.contains("昨天"))
            assertTrue("Expected English from the bilingual fixture, got: $text", text.contains("MONDAY", ignoreCase = true))
            assertTrue("Final Chinese words must not be dropped: $text", text.contains("星期三"))
        } finally {
            stream.release()
            engine.release()
        }
    }

    @Test
    fun testSilenceEndpointAndFreshStreams() {
        val engine = ZipformerEngine(instrumentation.targetContext.assets)
        val stream = engine.createStream()
        try {
            repeat(90) { engine.accept(stream, FloatArray(1280)) }
            assertTrue("No-speech endpoint must stop the session", engine.isEndpoint(stream))
            assertEquals("Silence must not replace the input", "", engine.finish(stream))
        } finally {
            stream.release()
        }
        val fresh = engine.createStream()
        try {
            assertFalse("A new session must not inherit a previous endpoint", engine.isEndpoint(fresh))
            engine.accept(fresh, FloatArray(1280)) { true }
            assertEquals("", engine.finish(fresh))
        } finally {
            fresh.release()
            engine.release()
        }
    }

    private fun readPcmWav(name: String): FloatArray {
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
                return FloatArray(size / 2) { buffer.getShort(offset + 8 + it * 2) / 32768.0f }
            }
            offset += 8 + size + (size % 2)
        }
        error("No PCM data chunk in test WAV")
    }
}
