# 小小丰收

《小小丰收》是面向亲子认知与英文启蒙的静态闪卡网站。页面收录 36 张原创 SVG 果蔬插画，每张卡片都有英文单词、中文名称和英文朗读按钮。

## 运行

前置条件：Python 3、支持 ES 模块的现代浏览器，以及完整的仓库目录。在仓库根目录执行：

```sh
python3 -m http.server 8766
```

打开 `http://localhost:8766/little-harvest/`。如果 8766 端口已被占用，可换一个空闲端口，并同步修改访问地址。页面使用 ES 模块，需要通过 HTTP 服务打开，不能直接用 `file://` 访问。页面不依赖外部图片、字体、脚本或接口。

## 使用

点击“全部”“水果”或“蔬菜”筛选卡片。点击左右箭头、按键盘左右方向键，或在卡片上水平滑动，可以切换到相邻卡片。下方图鉴可以直接选中任意一张卡片。

点击“听发音”后，浏览器使用设备的英文语音合成朗读当前单词。语音音色由浏览器和操作系统决定；设备静音、缺少英文语音或浏览器不支持语音合成时，可能无法听到声音。页面会在朗读失败时给出提示。水果和蔬菜按日常饮食习惯分类，因此番茄、黄瓜等归在蔬菜组。

## 检查

在仓库根目录执行：

```sh
node --test little-harvest/tests/cards.test.mjs
node --check little-harvest/app.mjs
node --check little-harvest/cards.mjs
node --check little-harvest/illustrations.mjs
```

生成过程和素材说明见 [GENERATION.md](GENERATION.md)。
