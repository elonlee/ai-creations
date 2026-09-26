# 太阳系交互观测网站

这是一个纯静态 Three.js 网站。入口是 `index.html`，所有脚本、字体和运行时贴图都在当前目录内。打开页面后，月面像素开场会停留，直到用户点击“开始探索”。

## 本地运行

前置条件：本机有 Python 3，或者任何能正确提供静态文件的 HTTP 服务器。

在本目录执行：

```sh
python3 -m http.server 8765
```

然后在浏览器打开 `http://localhost:8765/`。浏览器对 `file://` 下的 ES 模块有限制，因此应使用本地 HTTP 服务。部署时把本目录全部复制到静态托管根目录，无需构建和后端。不要只上传 `index.html`。

## 操作

- 点击目录、画布中的天体，或使用底部箭头切换目标。拖动画布可接管镜头；滚轮可缩放。
- `←/→` 切换，`↑/↓` 推拉，空格暂停，`1–0` 直达十个天体，`O` 总览，`D` 详情，`S` 设置，`H` 快捷键，`Esc` 关闭。
- 设置面板可以分别切换地球表面、云层、大气和夜间灯光。云层贴合地表同步自转；关闭“自转”时两层一起停止，不会出现云纹在地表上滑动。画质档位按需加载当前聚焦的天体；其他天体保持标准档，以免同时解码多张 8K 贴图。高档素材失败时逐级回退。天王星、海王星只有 2K 原图，因此始终使用标准档。金星云层最高为 4K。

## 素材和数据

| 素材 | 实际来源与处理 | 授权与链接 |
| --- | --- | --- |
| 地球日面 | NASA Visible Earth / Earth Observatory 的 Blue Marble: Next Generation 2004 年 1 月全球图，与 Solar System Scope 蓝色海洋图合成。NASA 基图的深海区域接近黑色，因此以同一投影的蓝色海洋替换。之后从真实高分辨率源图缩放为 2K、4K、8K。 | [NASA 原图](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/)；[Solar System Scope](https://www.solarsystemscope.com/textures/)，CC BY 4.0 |
| 月球 | NASA Scientific Visualization Studio 的 LRO/LROC 全球彩色图。标准档用官方 2K JPG；4K、8K 从官方 8K TIFF 转为网页可加载的 JPG。未人为着色。 | [NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/) |
| 太阳、其他行星、地球夜面与云层、土星环 | Solar System Scope 的行星贴图。2K 为标准档；官方 8K 原图经缩放生成 4K。金星云层用官方 4K 作高清档；天王星、海王星没有可用的官方高档源图。素材保留真实颜色。 | [Solar System Scope 贴图库](https://www.solarsystemscope.com/textures/)，CC BY 4.0 |
| 字体 | Press Start 2P，来自 Fontsource，本地 WOFF2；中文正文使用系统字形。 | OFL 1.1，见 `licenses/press-start-2p-OFL.txt` |
| Three.js | 0.186.1 的 ESM 核心与 OrbitControls，本地 importmap 引用。 | MIT，见 `licenses/three-MIT.txt` |

行星直径、距日距离与周期是供观测用的近似值。场景的半径、轨道距离和运行速度经过展示性调整，不用于天体位置推算。地球、月球等天体的颜色来自影像或影像衍生图；黑白像素处理仅用于界面和开场。太阳系天体资料可从详情面板中的 NASA 链接继续核对。
