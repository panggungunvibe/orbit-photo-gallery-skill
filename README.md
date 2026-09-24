# Orbit Photo Gallery Skill

把一堆旅行照片，整理成一本可以用手势翻看的网页相册。

**分类圆环 → 横向照片长卷 → 完整照片与日记**。米白背景、轻阴影和留白，支持鼠标、触屏、键盘以及浏览器本地手势识别。

A reusable agent skill for curated photo galleries with a CSS 3D category ring,
horizontal photo strips and on-device hand gestures. No AI API key required.

## 能做什么

- 生成联系表，辅助筛选清晰的竖图，比较连拍、表情与构图。
- 给照片分配直观分类，同一张照片只出现在一个类目中。
- 为照片写原创名字与日记，人物心理以文学推测表达。
- 保持原图不变，导出最长边 1800px 的 WebP，校正方向并移除 EXIF。
- 圆环旋转、缩放；长卷滑动、进度记忆；照片完整查看。
- 手掌移动控制圆环/长卷，双掌缩放圆环，食指停留选中与返回。

选片审美由使用 Skill 的视觉模型或人完成，脚本不会把简单清晰度分数当作“最佳表情”。

## 安装 Skill（Codex）

```bash
git clone https://github.com/panggungunvibe/orbit-photo-gallery-skill.git ~/.codex/skills/orbit-photo-gallery
```

重新加载 Skill 后，可以说：

> 使用 $orbit-photo-gallery，把这个文件夹里的旅行照片整理成交互相册。优先竖图，连拍选一张，分类简单一点。

> 使用 $orbit-photo-gallery，为现有相册加入这批照片，跨批次去重，保留原来的日记。

其他支持 `SKILL.md` 的工具可把仓库放入对应的 Skill 目录。网盘连接器不是必须依赖：可以直接用本地照片。网盘素材需使用者自行授权自己的连接工具。

## 先跑示例

需要 Node.js 20+、Python 3.10+。示例使用原创几何 SVG，**不含任何私人照片或参考视频素材**。

```bash
python3 scripts/scaffold.py ./my-album
cd my-album
npm ci
npm run dev
```

查看终端显示的本地地址。鼠标/触屏浏览不需要摄像头或模型。

要使用手势：

```bash
npm run setup:hands
```

这会从 Google 官方下载模型并校验 SHA-256；随后在页面点击「开启手势控制」。需 HTTPS 或 localhost。视频帧在浏览器本地处理，关闭即释放摄像头。

## 换成自己的照片

先在仓库根目录创建 Python 虚拟环境：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python scripts/review_photos.py /path/to/photos /path/to/private-review
```

在 Windows 中使用 `.venv\Scripts\activate`；HEIC 在非 macOS 平台额外安装 `pillow-heif`。

让模型查看联系表和候选原片，按照 [清单格式](references/manifest.md) 编写私人 `selection.json`，再运行：

```bash
python scripts/import_photos.py /path/to/selection.json --project ./my-album
```

每张照片只有一个分类；原图不动。照片、模型、依赖和构建产物默认不进入 Git。不要把含私人路径的清单和审阅图片提交到公开仓库。

## 验证与构建

```bash
python -m unittest discover -s tests
cd assets/template
npm ci
npm test
npm run build
```

开发服务中的 `/evidence/interaction-check.html` 可运行控制器验收。该验收使用合成手部关键点，不等同于真人摄像头识别测试。

生产构建在 `dist/`。默认支持域名根目录部署；GitHub Pages 项目子路径需调整资源、模型和 WASM 路径，详见 [模板维护](references/template.md)。本仓库不会自动公开使用者的相册。

## 目录

```text
SKILL.md                 智能体工作流
agents/openai.yaml       Codex 展示信息
scripts/                 初始化、照片审阅与导入
references/              清单格式与模板维护
assets/template/         可运行的网页模板与原创示例
```

## 开源许可

[MIT](LICENSE)。第三方组件与可选模型见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
