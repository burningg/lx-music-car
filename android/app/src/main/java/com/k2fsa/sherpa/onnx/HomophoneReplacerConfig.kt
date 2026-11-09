// Vendored from sherpa-onnx v1.12.15 (Apache-2.0). See third_party/zipformer/NOTICE.md.
package com.k2fsa.sherpa.onnx

data class HomophoneReplacerConfig(
    var dictDir: String = "", // unused
    var lexicon: String = "",
    var ruleFsts: String = "",
)
