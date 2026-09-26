# 第二间房

这是一个纯静态的 Three.js 家装网页。73㎡ 两室一厅采用展示用的示意户型，第二间房可切换为居家工作、朋友留宿或留给未来。切换时会重新布置整屋家具。页面包含立体剖视、正交俯视、1.35m 剖切和第一人称漫游。

提示词、模型信息和资产制作过程见 [GENERATION.md](GENERATION.md)。

## 本地运行

前置条件：Python 3 和支持 WebGL 的浏览器。进入仓库根目录执行：

```sh
python3 -m http.server 8765
```

打开 `http://localhost:8765/second-room/`。页面使用本地 ES 模块与 GLB，不能直接用 `file://` 打开。部署时需要保留 `second-room/` 中的全部文件，无需构建服务。

## 操作

- 选择底部三张方案卡，切换家具布局。
- 左侧切换四种视角。俯瞰视角支持拖动旋转和滚轮缩放。
- 第一人称视角用 `WASD` 行走，拖动鼠标转向，点击门扇开合。墙体和主要家具会阻挡移动。按 `Esc` 或点“退出漫游”返回剖视。
- 拖动顶部时间滑杆，查看上午、下午、夜晚的光照。夜晚五个房间的灯会亮起。
- 在非漫游视角点击房间或家具，查看房间面积、示意尺寸和家具清单。

## 素材与实现

32 件家具以低面数 GLB 文件存于 `assets/furniture/`。`generate_assets.py` 先用几何图元建立家具；`blender_finalize.py` 再用 Blender 5.2.2 为边缘加一段倒角，并重新导出最终 GLB。网页加载的是 Blender 导出的文件。

重建资产需要 Python 3 和可导入 `bpy` 的 Blender Python 环境。在仓库根目录依次执行：

```sh
python3 second-room/generate_assets.py
/tmp/second-room-bpy/bin/python second-room/blender_finalize.py
```

上面的第二条命令假设已按 [GENERATION.md](GENERATION.md) 在 `/tmp/second-room-bpy` 安装 `bpy==5.2.2`。第一条命令会覆盖最终 GLB，因此要继续执行第二条命令。`node --test second-room/tests/assets.test.mjs` 会检查 32 件文件的 GLB 结构和 Blender 导出标记。

木纹、布料和石材纹理由浏览器里的 Canvas 程序生成，并应用到家具模型。Three.js 0.186.1、OrbitControls 和 GLTFLoader 以本地副本提供，许可见 `vendor/LICENSE-three.txt`。页面没有外部运行时请求。

房间面积总计 73㎡，尺寸仅用于这个概念场景。它不是施工图，不包含承重墙、真实门窗尺寸与机电条件。当前漫游使用二维矩形碰撞，适合观察和交互演示，不用于精确室内导航。

## 检查

在仓库根目录运行：

```sh
node --test second-room/tests/*.test.mjs
node --check second-room/app.mjs
```
