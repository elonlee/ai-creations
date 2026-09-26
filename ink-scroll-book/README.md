# 山水有归处

一部可在浏览器阅读的水墨长卷电子书。正文依次为入卷、听雨、过桥、寻山、归舟、跋。右侧卷目可以跳转，顶部或左侧的朱红细线显示阅读进度；窄屏时卷目移到底部。左下角可以播放、暂停或切换两段古琴演奏。音乐默认关闭，只有点击“开启音乐”后才播放。

用户提示词、图片生成提示词、模型与素材制作过程见 [GENERATION.md](GENERATION.md)。

## 本地阅读

前置条件：安装 Python 3，使用支持 ES Modules 和 MP3 音频的现代浏览器。阅读正文不依赖音频接口。

在仓库根目录运行：

```sh
python3 -m http.server 8765
```

打开 `http://localhost:8765/ink-scroll-book/`。预期会看到《山水有归处》卷首，向下滚动可读完六段，点击卷目可直接跳转。图片和录音均保存在本地，阅读时不需要联网。

验证阅读逻辑：

```sh
node --test ink-scroll-book/tests/*.test.mjs
```

画面素材是为本作品生成的原创水墨插画，存放在 `assets/`。正文及排版均由本项目提供。

## 配乐来源与授权

配乐为 Charlie Huang 演奏的古琴实录：[《阳关三叠》](https://commons.wikimedia.org/wiki/File:Guqin-Yangguan_Sandie.ogg)和[《醉渔唱晚》](https://commons.wikimedia.org/wiki/File:Guqin-Zuiyu_Changwan.ogg)。两段录音来自维基共享资源，按 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) 授权。项目将原始 Ogg 录音转码为 `assets/audio/` 中的 MP3，未剪辑或改编内容。两份 MP3 音频文件继续按 CC BY-SA 3.0 提供；本项目的正文、代码和插画不因此改用该授权。
