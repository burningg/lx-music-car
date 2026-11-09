# 搜索页离线语音输入：Zipformer

## 使用与交互

- 搜索页来源选择器右侧的麦克风按钮遵循 `design/lx-music-car-claude.pen`：64 × 64 圆形、`accent` 底色、26px `lucide-mic`、`on-primary` 图标色，适配白天/夜间主题。
- 首次点击申请麦克风权限。先显示「正在加载离线模型…」，出现「请说出歌名或歌手…」后开始说话。
- 中文和英文由同一个模型识别，不依赖应用语言切换，不需要 Google 服务、系统中文包或联网。中文输出以模型的简体字词表为准，不承诺繁体转换或粤语识别。
- 停顿约 1.2 秒后结束有语音的句子；没有说话约 6 秒结束；录音最长 20 秒，整个会话有 35 秒看门狗。
- 最终文字替换搜索框内容并更新建议，**不自动提交搜索、不写入搜索历史**。随后可以编辑、选择建议或通过键盘搜索。
- 再次点击按钮、按返回键、切换页面、开始手动编辑或进入后台会取消识别。取消、无结果、拒绝权限、失败时保留原输入；迟到回调不会覆盖新输入。
- 识别全程不写音频文件、不上传音频。搜索建议和之后的音乐搜索仍使用原来的在线音乐接口。

## 模型及引擎

模型：**Zipformer Small 中英双语，2023-02-16，32-frame chunk**，采用官方 INT8 示例中的混合配置：编码器/联合网络 INT8，解码器 FP32。

| APK 内必需文件 | 字节数 |
| --- | ---: |
| encoder-epoch-99-avg-1.int8.onnx | 42,980,793 |
| decoder-epoch-99-avg-1.onnx | 13,877,276 |
| joiner-epoch-99-avg-1.int8.onnx | 3,228,485 |
| tokens.txt | 56,317 |
| 合计 | **60,142,871（约 57.36 MiB / 60.14 MB）** |

不打包浮点编码器/联合网络、INT8 解码器、其他 chunk 大小、BPE 训练文件或测试录音。

初始全 INT8 配置约 47.45 MiB，但在自编译 Android 引擎验证中出现句尾漏字；采用官方示例的 FP32 解码器后，中英混合测试通过。模型因此增加约 9.91 MiB，这是验证后的配置调整，不是额外打包一整套模型。模型通过 AssetManager 直接从 APK 读取，不需要首次启动解压一份副本。

运行时：sherpa-onnx **1.12.15** 的 JNI API + ONNX Runtime **1.17.1**，CPU 推理，2 个推理线程。Android `AudioRecord` 采集 16 kHz、单声道、PCM16，以 80 ms 分块交给后台识别线程。每次会话结束释放 recorder、stream 和模型，避免播放器空闲时长期占用模型内存。

**不用官方通用 sherpa AAR**：该包附带本项目不需要的 TTS 及 espeak-ng 等依赖。这里从固定源码构建识别 JNI，关闭 TTS、说话人分离等；Eigen 限定 MPL2 代码。模型卡、许可证、第三方说明见 `third_party/zipformer/`，也随 APK 打包。

## 构建

需要项目现有的 Node 18+、JDK 17、Android SDK / NDK 26.1.10909125，以及 SDK CMake **3.22.1**、`tar`。JDK 的 `jar` 用来解压 ONNX Runtime ZIP。没有 CMake 时通过 Android Studio 的 SDK Tools 安装。

```sh
# 可提前下载。后续 Gradle 构建也会自动执行，已有正确文件不重复下载。
npm run prepare:stt

# 构建含内置模型的 ARM64 独立 APK，无需 Metro
node scripts/gradle.cjs assembleStandalone -PreactNativeArchitectures=arm64-v8a

# 检查下载缓存的字节数和 SHA-256，不联网
node scripts/prepare-offline-stt.cjs --verify
```

- 固定版本、下载地址、大小、SHA-256 位于 `scripts/offline-stt-assets.json`。
- 模型和源码归档保存在 `android/.stt/`，不提交大二进制到 Git。
- 首次**构建**需要下载模型、运行时和编译源码；安装好的应用无需下载任何语音资源。
- 所有传递源码也由 Node 脚本预下载并校验，CMake 使用本地源码，不依赖构建过程中额外的 CMake 网络下载。
- 若下载损坏会重试并校验，失败则中止构建，不生成缺失模型的 APK。
- 默认支持 armeabi-v7a、arm64-v8a、x86、x86_64。使用 `reactNativeArchitectures` 可限制目标，减少构建时间及包体积。
- 新增原生模块/内置模型后必须重建并安装 APK，不能只靠 Metro 热更新。

## 验证

```sh
node --test scripts/*.test.cjs

# 构建应用和带测试录音的独立测试 APK
node scripts/gradle.cjs :app:assembleStandalone :app:assembleDebugAndroidTest -PreactNativeArchitectures=arm64-v8a
adb install -r android/app/build/outputs/apk/standalone/lx-music-mobile-v1.9.2-arm64-v8a-standalone.apk
adb install -r android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell am instrument -w -e class cn.toside.music.mobile.speech.ZipformerEngineTest cn.toside.music.mobile.test/androidx.test.runner.AndroidJUnitRunner
```

JS 测试覆盖设计尺寸、回填不提交、权限、前台恢复、取消、重复点击、迟到回调和 loading/listening 状态。资源测试覆盖锁定版本、损坏校验、包内模型范围及关闭 TTS 的构建配置。

Android 仪器测试运行**真实的内置混合量化模型**，不是 mock：识别上游中英混合 WAV，检查「昨天 / MONDAY / 星期三」；同时验证静音终点、空结果及新 stream 隔离。测试录音仅在测试 APK 中。

目标平板/车机仍需实测：真实麦克风下的歌名/歌手准确率、背景音乐及噪声影响、低配设备的延迟和内存。参考音频通过不等于所有音乐名称都能准确识别。

## 本次验收记录（2026-11-07）

- Node 测试 **139 项通过**；修改文件 ESLint、`git diff --check` 通过。
- ARM64 standalone、AndroidTest APK 构建，以及 `:app:minifyReleaseWithR8` 通过。
- API 34 模拟器上真实模型测试 **2 项通过**：中英混合音频、完整句尾、静音终点和新 stream 隔离。
- 模拟器实际 UI 已验证首次授权后进入录音、返回键取消、静音自动结束；已有输入 `Jay` 在无语音后保持不变。
- 最终 ARM64 APK **86,282,377 字节（82.29 MiB）**；模型 **60,142,871 字节（57.36 MiB）**。
- 已逐项校验 APK 内四个模型文件的 SHA-256；确认仅 ARM64 架构、仅两个 STT 原生库，无旧 INT8 解码器、测试 WAV、TTS/espeak JNI 符号，并包含许可说明。
- 全仓 TypeScript 仍有 5 处既有错误（播放器计时器、歌单 SourceSelector 泛型及播放列表类型），此次变更没有新增错误。
- 尚需在目标车机/平板上实测真实麦克风、背景音乐、噪声和冷门歌名；模型文件测试通过不等同于这些场景的识别率保证。
