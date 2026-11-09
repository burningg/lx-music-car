# WeType offline speech recognition — provenance and authorization status

## Important: authorization is NOT established

This integration was requested for local evaluation. At the pinned revision below,
VoiceKey has no top-level/code-crate license granting reuse or redistribution; its
README describes learning and personal use. Tencent's downloadable speech resources
also do not provide a redistribution license in the material inspected here.
**Public availability is not a license.** The repository's Apache-2.0 license does NOT
relicense the vendored VoiceKey files, Tencent model or dictionary. Before distributing
an APK or these sources, obtain/confirm the respective rights from their owners.
No assertion of commercial or redistribution permission is made here.

## Model

- Tencent WeType input method offline speech resource, version `20260710220526250`.
- Original source: https://download.z.weixin.qq.com/publish_words/v1/ime_asr_decoder_model/20260710220526250_ime_asr_decoder_model.apk
- Outer package SHA-256: `b3729fbe928b25740cc9cd781537175b1db4a445bd78bf464267c0c4633e0863`.
- XNet original filename: `embed_140m_kld43wh_test_78000_1_merge_4.kv.conv1d.dyQu.onnx.xnet`.
  Renamed to `model.xnet`, otherwise unchanged; despite the embedded `.onnx` string,
  this is an XNet container, not a directly loadable ONNX graph.
- Only that model and `dict.decoder.utf8.txt` are packaged. GBK dictionary, official
  program, CMS/config files, cloud APIs and vendor native libraries are not included.
- All sizes and archive/member SHA-256 values: `scripts/offline-stt-assets.json`.

## Inference source

- Source: https://github.com/J3n5en/voicekey/tree/f9ca4a0af5db3d7a493a6d0ccb4ae7d1a467d869/crates/wtlocal
- Four files from `crates/wtlocal/src` are vendored under
  `android/offline-stt/vendor/wtlocal/`; `UPSTREAM.json` records the unmodified hashes.
- Architecture as implemented there: 40-dimensional features, convolution front-end,
  40 Transformer layers, INT8 matrix operations and greedy CTC decoding.
- Local changes: runtime ARM64 dotprod detection and stable inline assembly (Rust 1.95
  does not stabilize `vdotq_s32`); scalar fallback; two inference threads; cancellation
  checks; early convolution scratch release; fixed model filename; malformed XNet
  length/overflow handling; batch-only FBank cleanup and Rust formatting. Core source attribution remains with VoiceKey's authors.
- New wrapper: bounded 20-second final-only recognition, Kotlin recording/endpoint
  handling, cancellable ID-based JNI handles, no global model cache, no network stack.
- Rust dependencies are version/checksum locked in `android/offline-stt/Cargo.lock`.
  Their notices are retained in `rust-licenses/` and listed in `RUST-DEPENDENCIES.md`.
  Those dependency licenses do not resolve the model/VoiceKey authorization above.

## Test audio only

The Android test APK (not the application APK) includes WAV fixtures from
https://huggingface.co/csukuangfj/k2fsa-zipformer-bilingual-zh-en-t/tree/e2382758de9a0219b4efe682b95af30b399db3b8/test_wavs
The upstream model card declaring Apache-2.0 and the license are preserved under
`test-fixtures/`. Keeping these test recordings does not include the Zipformer model
or sherpa/ONNX runtime in the application.
