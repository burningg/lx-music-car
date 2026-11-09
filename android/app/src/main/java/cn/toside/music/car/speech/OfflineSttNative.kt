package cn.toside.music.car.speech

/** Offline-only JNI; intentionally excludes cloud and accessibility modules. */
internal object OfflineSttNative {
    init { System.loadLibrary("lx_offline_stt") }
    @JvmStatic external fun create(directory: String): Long
    @JvmStatic external fun recognize(handle: Long, pcm: ShortArray): String
    @JvmStatic external fun cancel(handle: Long)
    @JvmStatic external fun release(handle: Long)
}
