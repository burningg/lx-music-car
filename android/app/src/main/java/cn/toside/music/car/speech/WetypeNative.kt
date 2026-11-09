package cn.toside.music.car.speech

/** Offline-only JNI; intentionally does not include VoiceKey's cloud or accessibility modules. */
internal object WetypeNative {
    init { System.loadLibrary("lx_wetype") }
    @JvmStatic external fun create(directory: String): Long
    @JvmStatic external fun recognize(handle: Long, pcm: ShortArray): String
    @JvmStatic external fun cancel(handle: Long)
    @JvmStatic external fun release(handle: Long)
}
