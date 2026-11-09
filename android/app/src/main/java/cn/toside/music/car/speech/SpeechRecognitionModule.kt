package cn.toside.music.car.speech

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.common.LifecycleState
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/** Foreground-only, on-device STT. Audio is never written to disk or sent over the network. */
class SpeechRecognitionModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context), LifecycleEventListener {
    private val main = Handler(Looper.getMainLooper())
    private val worker = Executors.newSingleThreadExecutor()
    // Accessed on the main thread only, except explicitly atomic Session fields.
    private var pending: Session? = null
    private var invalidated = false
    // Worker-thread-owned; released after each session to avoid retaining model RAM in the player.
    private class Session(val promise: Promise) {
        val cancelled = AtomicBoolean(false)
        @Volatile var engine: WetypeEngine? = null
        var recorder: AudioRecord? = null // Guarded by synchronized(session).
        var watchdog: Runnable? = null
    }

    init { context.addLifecycleEventListener(this) }
    override fun getName() = "SpeechRecognitionModule"

    @ReactMethod
    fun isAvailable(promise: Promise) {
        main.post { promise.resolve(!invalidated && WetypeEngine.assetsAvailable(context.assets)) }
    }

    // Required by NativeEventEmitter; no upstream subscription exists outside a recording session.
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    @ReactMethod
    fun start(language: String, promise: Promise) {
        main.post {
            if (invalidated || currentActivity == null || context.lifecycleState != LifecycleState.RESUMED) {
                promise.reject("E_CANCELLED", "Voice input requires a foreground activity")
            } else if (pending != null) {
                promise.reject("E_BUSY", "Voice input is already running")
            } else if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                promise.reject("E_PERMISSION", "Microphone permission is required")
            } else if (!WetypeEngine.assetsAvailable(context.assets)) {
                promise.reject("E_UNAVAILABLE", "Bundled WeType model is missing")
            } else {
                // The bundled model auto-detects Chinese/English; the app locale does not select a server.
                val session = Session(promise)
                pending = session
                emitState(session, "loading")
                val watchdog = Runnable {
                    if (pending === session) cancelPending("E_TIMEOUT", "Offline speech recognition timed out")
                }
                session.watchdog = watchdog
                main.postDelayed(watchdog, 35000)
                worker.execute { recognize(session) }
            }
        }
    }

    private fun emitState(session: Session, state: String) {
        main.post {
            if (pending === session && !session.cancelled.get() && context.hasActiveReactInstance()) {
                val event = Arguments.createMap().apply { putString("state", state) }
                context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("speech-recognition-state", event)
            }
        }
    }

    private fun recognize(session: Session) {
        var engine: WetypeEngine? = null
        var text = ""
        var errorCode: String? = null
        try {
            if (session.cancelled.get()) return
            engine = WetypeEngine(context, session.cancelled::get)
            session.engine = engine
            if (session.cancelled.get()) return
            val minBuffer = AudioRecord.getMinBufferSize(
                WetypeEngine.SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT,
            )
            if (minBuffer <= 0) throw AudioException()
            synchronized(session) {
                if (session.cancelled.get()) return
                val recorder = AudioRecord(
                    MediaRecorder.AudioSource.VOICE_RECOGNITION, WetypeEngine.SAMPLE_RATE,
                    AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT,
                    maxOf(minBuffer * 2, WetypeEngine.SAMPLE_RATE * 2),
                )
                session.recorder = recorder
                if (recorder.state != AudioRecord.STATE_INITIALIZED) throw AudioException()
                recorder.startRecording()
                if (recorder.recordingState != AudioRecord.RECORDSTATE_RECORDING) throw AudioException()
            }
            emitState(session, "listening")
            val recorder = session.recorder!!
            val pcm = ShortArray(1280) // 80 ms of mono 16 kHz PCM, compatible with Android 5+.
            val started = SystemClock.elapsedRealtime()
            var samplesRead = 0
            while (!session.cancelled.get() && samplesRead < WetypeEngine.SAMPLE_RATE * 20 &&
                SystemClock.elapsedRealtime() - started < 20000) {
                val count = recorder.read(pcm, 0, minOf(pcm.size, WetypeEngine.MAX_SAMPLES - samplesRead))
                if (session.cancelled.get()) break
                if (count < 0) throw AudioException()
                if (count == 0) { Thread.sleep(10); continue }
                samplesRead += count
                engine.accept(pcm, count)
                if (engine.isEndpoint()) break
            }
            stopRecorder(session)
            if (!session.cancelled.get()) {
                emitState(session, "processing")
                text = engine.finish()
                if (text.isBlank()) errorCode = "E_NO_MATCH"
            }
        } catch (_: WetypeEngine.ModelException) {
            errorCode = "E_MODEL"
        } catch (_: SecurityException) {
            errorCode = "E_PERMISSION"
        } catch (_: AudioException) {
            errorCode = "E_AUDIO"
        } catch (_: LinkageError) {
            errorCode = "E_UNAVAILABLE"
        } catch (_: OutOfMemoryError) {
            errorCode = "E_MODEL"
        } catch (_: Exception) {
            errorCode = "E_RECOGNITION"
        } finally {
            synchronized(session) {
                stopRecorder(session)
                session.recorder?.release()
                session.recorder = null
            }
            session.engine = null
            engine?.release()
            main.post {
                if (pending === session) {
                    pending = null
                    session.watchdog?.let { main.removeCallbacks(it) }
                    if (session.cancelled.get()) session.promise.reject("E_CANCELLED", "Voice input cancelled")
                    else if (errorCode != null) session.promise.reject(errorCode, "Offline speech recognition failed")
                    else session.promise.resolve(text)
                }
            }
        }
    }

    // stop() unblocks a pending AudioRecord.read; only the worker releases the recording object.
    private fun stopRecorder(session: Session) = synchronized(session) {
        try {
            if (session.recorder?.recordingState == AudioRecord.RECORDSTATE_RECORDING) session.recorder?.stop()
        } catch (_: IllegalStateException) { }
    }

    @ReactMethod fun cancel() { main.post { cancelPending("E_CANCELLED", "Voice input cancelled") } }

    private fun cancelPending(code: String, message: String) {
        val session = pending ?: return
        pending = null
        session.cancelled.set(true)
        session.engine?.cancel()
        session.watchdog?.let { main.removeCallbacks(it) }
        stopRecorder(session)
        session.promise.reject(code, message)
    }

    override fun onHostResume() {}
    override fun onHostPause() { cancel() }
    override fun onHostDestroy() { cancel() }

    override fun invalidate() {
        context.removeLifecycleEventListener(this)
        main.post {
            invalidated = true
            cancelPending("E_CANCELLED", "React context destroyed")
            worker.shutdown() // Allows already-enqueued cleanup to finish; no model/native handle leaks.
        }
        super.invalidate()
    }

    private class AudioException : Exception()
}
