# Android 启动与打包：不再依赖 Metro

## 车载版应用标识

- Android 包名：`cn.toside.music.car`
- 桌面显示名称：`LX Music Car`
- 安装包文件名前缀：`lx-music-car`

车载版与旧 mobile 版包名不同，会作为独立应用安装，不会覆盖旧版，
也不会自动继承旧版的数据。需要迁移时，请先在旧版导出列表、设置等数据，
再导入车载版；确认迁移完成前不要卸载旧版。

## 为什么点开 App 会红屏？

`Could not connect to development server` 表示 Android 原生层已经启动，
但 Debug 包无法从电脑上的 Metro 取到 JavaScript，并不是手机需要额外启动一个 RN 服务。

本项目的 `MainApplication.getUseDeveloperSupport()` 返回 `BuildConfig.DEBUG`：

- **debug**：开发支持开启，默认不打包 JS，需要 Metro 和可用的设备连接。
- **standalone**：开发支持关闭，Gradle 自动内置生产 JS/Hermes 字节码和资源，不需要 Metro。
- **release**：同样可独立启动，另使用发布签名和代码压缩，供正式发布。

2026-11-07 的本机检查发现：Metro 的 `/status` 正常，但模拟器的 `adb reverse --list`
为空；已安装应用带有 `DEBUGGABLE` 标记。模拟器重启、ADB 重连后端口转发可能丢失。
设备里的 `localhost:8081` 指向设备自己，不是电脑。

## 日常在模拟器／车机上使用（推荐）

在项目根目录运行，需先安装依赖并连接 Android 设备：

```sh
npm run android
```

这会编译、覆盖安装并启动 **standalone**，只编译已连接设备需要的 CPU 架构，
不启动 Metro。安装后可直接点图标打开，即使电脑上的开发服务器已关闭，
或模拟器重启、USB 断开，也不影响加载应用界面。
在线搜索、封面、音源和在线播放仍然需要网络。

车载版的 debug、standalone、release 使用相同 applicationId。本地独立版使用
仓库的 debug 签名，通常可以覆盖原有的车载版 Debug 安装，
保留列表、设置和自定义源。**不要先卸载，不要清除数据。**
若原安装使用另一份签名，Android 会拒绝覆盖；应先通过原 App 导出数据，
不能靠卸载来“修复”启动问题。

修改 JS/TS、图片或原生代码后，重新运行 `npm run android` 才会更新安装包中的内容；
此模式没有热更新。`npm run dev` 会把它重新覆盖成依赖 Metro 的调试版。

## 生成可拷贝安装的独立 APK

```sh
npm run pack:android:standalone
```

默认生成各 CPU 架构和 universal APK，位于：

```text
android/app/build/outputs/apk/standalone/
  lx-music-car-v<版本>-universal-standalone.apk
  lx-music-car-v<版本>-arm64-v8a-standalone.apk
  ...
```

不知道车机架构时选 `universal-standalone.apk`。它使用本地调试密钥，适合自己测试、
车机试用；正式对外发布请配置自己的 release keystore，再运行 `npm run pack:android`。
`pack:android:debug` 生成的仍是依赖 Metro 的调试包，不适合脱离开发环境日常使用。

以上打包脚本通过 Node 调用当前系统对应的 Gradle Wrapper，可在 macOS、Linux、Windows 使用。

## 开发调试／热更新

需要 Fast Refresh 时，使用 Debug：

```sh
# 终端 1，保持运行
npm start

# 终端 2，安装并启动 Debug；RN CLI 会尝试设置端口转发
npm run dev
```

如果已安装 Debug，仅因重启／重连后红屏，无须重新编译或清缓存：

```sh
adb devices -l
adb reverse tcp:8081 tcp:8081
adb shell am force-stop cn.toside.music.car
adb shell am start -n cn.toside.music.car/.MainActivity
```

多设备时在每条 `adb` 命令后加 `-s <设备序列号>`；自定义 Metro 端口时，相应调整端口。
确认电脑上的 `http://127.0.0.1:8081/status` 返回 `packager-status:running`，
且 `adb reverse --list` 包含 `tcp:8081 tcp:8081`。

只手工执行 `bundle-android` 往 assets 写 JS，并不会关闭 Debug 的开发服务器逻辑，
不能替代独立构建。也不要通过硬编码电脑 IP、自动重试或隐藏红屏掩盖这个依赖。

## 验收方法

1. 安装 standalone；检查 APK 内存在 `assets/index.android.bundle`。
2. 检查安装包／已安装应用不带 `DEBUGGABLE` 标记。
3. 关闭 Metro 或移除设备的 8081 转发，再强制停止并重新启动 App。
4. 确认界面正常加载、列表和自定义源仍在；再次冷启动仍可打开。

端口转发只能临时恢复 Debug；**独立 APK 内置 JS 并关闭开发支持**才是日常启动的根治方案。
