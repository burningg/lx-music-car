# Offline speech recognition components

This feature embeds the **Zipformer Small Chinese/English streaming transducer (2023-02-16)**,
using its INT8 encoder/joiner, FP32 decoder and tokens (the upstream INT8 recipe). No Google speech service or Google language
pack is included. Microphone audio is processed on-device.

## Model

- Upstream model: https://huggingface.co/csukuangfj/k2fsa-zipformer-bilingual-zh-en-t
- Pinned revision: `e2382758de9a0219b4efe682b95af30b399db3b8`
- The upstream model card declares `apache-2.0`; the source card is preserved in `MODEL-CARD.md`.
- Original model contributor linked by that card: https://huggingface.co/pfluo/k2fsa-zipformer-chinese-english-mixed
- sherpa-onnx model documentation: https://k2-fsa.github.io/sherpa/onnx/pretrained_models/online-transducer/zipformer-transducer-models.html
- We select the 32-frame chunk encoder/joiner INT8 files and the FP32 decoder. No weight modifications or fine-tuning are performed.
- Native Android test WAVs come from the same repository revision and are only included in the test APK.

## Runtime

- **sherpa-onnx v1.12.15**, Apache-2.0: https://github.com/k2-fsa/sherpa-onnx/tree/v1.12.15
- **ONNX Runtime 1.17.1**, MIT: https://github.com/microsoft/onnxruntime/tree/v1.17.1
- ONNX Runtime Android binaries: https://github.com/csukuangfj/onnxruntime-libs/releases/tag/v1.17.1
- Runtime license and third-party notices are retained alongside this file.

sherpa-onnx is built from pinned source with TTS, speaker diarization, C API, executables,
Python, GPU, PortAudio and WebSocket support disabled. **The general-purpose prebuilt
sherpa AAR is not distributed**: it includes unused TTS dependencies such as espeak-ng.
The app links only the ASR JNI library and ONNX Runtime.

Four Kotlin JNI API source files are vendored under `android/app/src/main/java/com/k2fsa/sherpa/onnx/`
from the same sherpa tag. `OnlineRecognizer.kt` omits the upstream sample model-selection helpers;
the API/configuration declarations are unchanged. The other three files only add a provenance comment.

Binary/archive versions and SHA-256 checksums are locked in `scripts/offline-stt-assets.json`.
These notices are packaged under `assets/zipformer/` in the app.

## ASR build dependencies

All are unmodified upstream sources, with pinned download URLs/hashes in the asset manifest.
License texts are preserved in `licenses/`:

- kaldi-native-fbank 1.22.3 — Apache-2.0.
- kissfft commit febd4caeed32e33ad8b2e0bb5ea77542c40f18ec — BSD-3-Clause (see its COPYING).
- kaldi-decoder 0.2.10 — Apache-2.0.
- kaldifst 1.7.16 — Apache-2.0.
- OpenFst sherpa-onnx-2024-06-19 — Apache-2.0.
- simple-sentencepiece 0.7 — Apache-2.0.
- Eigen 3.4.0 — primarily MPL-2.0; other upstream license texts are preserved as distributed.
  This build defines `EIGEN_MPL2_ONLY`. Unmodified corresponding source is available at
  https://gitlab.com/libeigen/eigen/-/archive/3.4.0/eigen-3.4.0.tar.gz
  and its exact checksum is recorded in the manifest.
