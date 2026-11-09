# 搜索页离线语音输入：微信离线（WeType）

## 状态与授权

已从 Zipformer/sherpa-onnx 切换为微信输入法 XNet 模型 + VoiceKey 衍生的精简 Rust 推理。
此次为本地集成验证；VoiceKey 相关源码及腾讯模型的使用、分发许可尚未确认。
**本项目的 Apache-2.0 不能为这些第三方组件补充授权；对外发布前必须确认许可。**
来源、改动与依赖说明见 `third_party/wetype/NOTICE.md`。

## 使用与交互

- 搜索页麦克风按钮不变：点击申请麦克风权限；先显示「正在加载离线模型…」，出现「请说出歌名或歌手…」后说话。
- 停顿后停止录音，显示「正在识别，请稍候…」，后台进行一次整句解码。不反复计算中间文字，以减少播放器 CPU 竞争。
- 最终文字替换搜索框并更新建议，**不自动提交、不写入搜索历史**；首尾句子标点会去掉。
- 支持普通话及英文词的本地识别；不承诺繁体、粤语或其他方言，应用语言不切换模型。
- 再点按钮、返回、切换页面、手动编辑、进入后台都会取消；错误或迟到回调不覆盖输入。原生计算在卷积阶段之间、Transformer 层之间检查取消。
- 麦克风采集 16 kHz、单声道 PCM16，80 ms 读取；20 ms 能量门限判断语音，约 1.2 秒静音结束，约 6 秒未说话结束，录音最多 20 秒，会话看门狗 35 秒。
- 能量检测**不是神经 VAD**：持续路噪、空调和车内音乐可能影响停顿判断，必须在目标车机验证。
- 音频仅驻留内存，不写音频文件、不上传；安装完成后首次语音使用也无需网络。音乐搜索和建议仍使用原来的在线接口。

## 模型、运行时与空间

| 项目 | 内容 |
| --- | --- |
| 模型包版本 | `20260710220526250`，腾讯 CDN |
| 构建时下载包 | 102,920,639 字节（约 98.15 MiB） |
| APK 模型 `model.xnet` | 135,646,496 字节 |
| APK 词表 `dict.decoder.utf8.txt` | 129,706 字节 |
| 模型文件合计 | **135,776,202 字节（约 129.49 MiB / 135.78 MB）** |
| 推理 | 40 层 Transformer、INT8、CTC，最多 2 个 CPU 推理线程 |
| 原生库 | 自编译 `liblx_wetype.so`；不含 sherpa、ONNX Runtime 或 VoiceKey 云端引擎 |

XNet 按原始权重使用，未训练或改量化。模型首次使用复制到应用 `noBackupFilesDir/wetype-20260710/` 以供 mmap，后续每次加载校验 SHA-256；损坏时从 APK 修复。
因此除 APK 本身外还需约 **136 MB 私有存储**，修复模型时另需临时文件空间。模型、音频和原生句柄每次会话结束释放，两个计算线程可保留，但不缓存模型。

ARM64 先检查 `dotprod` 再运行 SDOT，不支持时走通用回退；x86_64 先检查 AVX2。保留 Android API 21 和四种 ABI 的构建目标，不照搬 VoiceKey 的 API 26/ARM64 限制。旧芯片回退后的速度尚需实测。

## 构建

需要 Node 18+、JDK 17、Android SDK / NDK **26.1.10909125**、Rust（已用 **1.95.0** 验证）。JDK 的 `jar` 负责解出模型，不需要 Python 或 cargo-ndk。

```sh
# 已安装 Rust 后，安装需要的目标；只构建 ARM64 可以只装第一个。
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android

# 构建前下载、解包并检查模型（Gradle 也会自动运行）
npm run prepare:stt

# ARM64 独立 APK，不依赖 Metro
node scripts/gradle.cjs assembleStandalone -PreactNativeArchitectures=arm64-v8a

# 四种 ABI + universal
npm run pack:android:standalone

# 仅验证已有模型，不联网
node scripts/prepare-offline-stt.cjs --verify
```

- 模型、构建产物位于 `android/.stt/wetype/`，不提交二进制。旧 `android/.stt/` 中的 Zipformer 缓存不会进入新 APK，可自行清理旧缓存。
- 推理源码在 `android/offline-stt/`；Cargo.lock 固定依赖，构建使用 `--locked`，NDK 以 API 21 链接并设置 16 KiB ELF 页对齐。
- 构建时仅解出两个白名单模型文件，包和文件均 SHA-256 校验；失败则终止构建。
- 新原生库与模型必须重建安装 APK，不能仅 Metro 热更新。
- Rust/Gradle 首次构建需要联网拉依赖；安装后的语音识别不需要网络。

## 验证

```sh
node --test scripts/*.test.cjs
cargo test --manifest-path android/offline-stt/Cargo.toml --target-dir android/.stt/wetype/target

# 真实模型的主机推理、静音、超长拒绝、解码中取消
node scripts/prepare-offline-stt.cjs --tests
cargo test --release --manifest-path android/offline-stt/Cargo.toml --target-dir android/.stt/wetype/target --test model -- --ignored --nocapture

# Android 原生集成测试（包含测试音频，不使用麦克风）
node scripts/gradle.cjs :app:assembleStandalone :app:assembleDebugAndroidTest -PreactNativeArchitectures=arm64-v8a
adb install -r android/app/build/outputs/apk/standalone/lx-music-car-v1.9.2-arm64-v8a-standalone.apk
adb install -r android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell am instrument -w -e class cn.toside.music.car.speech.WetypeEngineTest cn.toside.music.car.test/androidx.test.runner.AndroidJUnitRunner
```

测试覆盖真实模型中英混合文字、句尾、静音、取消、能量端点、20 秒录音限制、缓存损坏修复、加载/录音/解码 UI 状态，以及现有搜索交互回归。
测试录音保留自旧模型仓库，仅进入测试 APK，不代表生产包仍包含旧模型。

目前的样本断言只验证基本识别链路，并非准确率评测。应使用目标车机实录的歌名、歌手名、英文、中英混合和路噪音频，验证准确率、峰值内存、录音后等待时间及播放是否卡顿；不能由主机或模拟器速度推断真实车机表现。
