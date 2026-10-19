# Breakout 音频素材来源

核对日期：2026-10-19。此目录包含 9 个音效和 1 首背景音乐，全部来源页面标注 CC0。可用于本游戏及商业发行；保留来源说明和 Kenney 随包许可证，方便后续核验。

## 音效

- 作者：Kenney Vleugels（Kenney.nl）。
- 资源包：[Digital Audio](https://kenney.nl/assets/digital-audio)。
- 许可：[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)，原文见本目录 `KENNEY-LICENSE.txt`。
- 下载源：`https://kenney.nl/media/pages/assets/digital-audio/216eac4753-1677590265/kenney_digital-audio.zip`。
- 处理：从原始 OGG 中选取，裁剪为短事件音效，结尾淡出，转换为 44.1 kHz、单声道、96 kbps MP3。

| 本地文件 | 原文件 | 游戏事件 |
| --- | --- | --- |
| launch.mp3 | laser2.ogg | 发球 |
| paddle.mp3 | pepSound1.ogg | 挡板反弹 |
| wall.mp3 | tone1.ogg | 撞墙 |
| brick-hit.mp3 | pepSound3.ogg | 命中装甲砖 |
| brick-break.mp3 | zap1.ogg | 碎砖 |
| explode.mp3 | spaceTrash3.ogg | 连锁爆破 |
| life-lost.mp3 | phaserDown2.ogg | 掉球 |
| game-over.mp3 | lowThreeTone.ogg | 游戏结束 |
| win.mp3 | powerUp4.ogg | 过关或通关 |

## 背景音乐

- 曲名：Plains Stage，作者：MintoDog。
- 来源：[OpenGameArt 作者发布页](https://opengameart.org/content/plains-stage)。
- 许可：[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)。作者说明为 8-bit 动作游戏音乐，可循环，提供 MP3 和 OGG。
- 原始 MP3：`https://opengameart.org/sites/default/files/plains_stage_bpm125.mp3`。
- 本地文件：`music.mp3`，约 57.6 秒；保留完整曲目，转为 44.1 kHz、立体声、128 kbps MP3 以减小手机包体。

## 校验与使用

`manifest.json` 记录最终文件时长、字节数、SHA-256 和音效映射。所有 MP3 均已通过 FFmpeg 完整解码检查。

运行时使用相对于游戏入口的 `assets/breakout-audio/*.mp3`，不会访问外部音频网址。发布包必须保留这些文件和许可说明；不能再只上传 HTML。TapTap 使用 `tap.createInnerAudioContext`，短音效的 `useWebAudioImplement` 为 `true`，背景音乐为 `false`；普通浏览器使用 `HTMLAudioElement`。开局预加载短音效，碰撞只播放已就绪的空闲声道。音频性能改动仍需用包含这些资源的新包在 TapTap 中复测。
