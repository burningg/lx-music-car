# LX Music Car

基于 [lx-music-mobile](https://github.com/lyswhut/lx-music-mobile) 二次修改的 Android 音乐播放器 UI，面向**车机与平板**，为横屏大屏重新设计布局与交互。

- 适配横屏的导航、音乐列表与播放界面，便于大屏触控。
- 提供白天、黑夜主题，适应不同光线环境。
- 保留原项目的音乐搜索、歌单管理、歌词等功能。

## 界面预览

### 白天主题

![LX Music Car 白天主题](docs/images/theme-day.png)

### 黑夜主题

![LX Music Car 黑夜主题](docs/images/theme-night.png)

## 本地运行

安装依赖并连接 Android 设备后，运行 `npm run android`；独立 APK 打包使用 `npm run pack:android:standalone`。微信离线语音构建还需要 Rust 和 Android 编译目标，见 [离线语音输入](docs/Android语音输入.md)。详见 [Android 启动与打包](docs/Android启动与打包.md)。

## 致谢与协议

感谢 [LX Music Mobile](https://github.com/lyswhut/lx-music-mobile) 提供开源基础。本项目遵循 [Apache-2.0](LICENSE) 及[原项目补充协议](docs/使用协议.md)。请尊重音乐版权，支持正版。

**微信离线组件授权提示**：新增的 VoiceKey 推理源码及腾讯模型不因本项目的 Apache-2.0 声明而获得授权。当前接入用于本地验证，对外分发前必须确认代码、模型的使用及分发许可，见 [第三方说明](third_party/wetype/NOTICE.md)。
