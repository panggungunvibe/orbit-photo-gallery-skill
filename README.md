# Orbit Photo Gallery Skill

**装好夸克网盘 Skill，再安装这个 Skill。说出一个相册名称，让 AI 直接为你做出旅行记忆网站。**

> 帮我把夸克网盘里的「云南旅行」相册整理成旅行记忆。

智能体会读取这个相册，筛选照片、去重分类、写日记，确认能自然分出 5–10 类（优先 6–8 类）后，直接编写并运行网站，给你一个能打开的预览。你不需要先手动下载照片、填写选片清单，也不需要会写代码。

**分类圆环 → 横向照片长卷 → 完整照片与日记**。暖米白、海蓝与夕阳色光晕、轨道线、轻阴影和留白，支持鼠标、触屏、键盘以及浏览器本地手势识别。

Install and authorize the Quark Drive skill, then install this skill. Name an
album and ask your coding agent to turn it into a travel-memory website. The
agent retrieves the photos, curates them, writes the site and starts a preview.

## 能做什么

- 生成联系表，辅助筛选清晰的竖图，比较连拍、表情与构图。
- 给照片分配直观分类，同一张照片只出现在一个类目中。
- 为照片写原创名字与日记，人物心理以文学推测表达。
- 保持原图不变，导出最长边 1800px 的 WebP，校正方向并移除 EXIF。
- 圆环旋转、缩放；长卷滑动、进度记忆；照片完整查看。
- 张掌左右滑动控制圆环／长卷，手停即停；单食指伸出再弯回点击；双手 X 返回。
- 五指张开，靠近镜头放大、远离缩小；页面显示实时识别提示。
- 照片居中放大，展示日记；收藏夹支持本浏览器保存、取消与批量下载。
- 桌面按分类下载全部照片 ZIP 或收藏 ZIP，另有单张保存；下载为精选网站版 JPG。
- 手机保留完整立体圆环、原生横向滑动长卷、收藏和大图，隐藏手势开关；支持系统保存菜单或长按图片保存。

默认排除横图和方图；近似连拍择优保留一张，模糊与失败表情排除，每张照片只归一类。脚本检查 5–10 类、方向和精确重复，最佳表情、近似去重与分类语义由视觉审阅判断，不能靠脚本计数凑类。

手机网页不能静默写入系统相册。准备照片后，在支持的设备上由用户从系统菜单选择保存；不支持批量保存时可长按单张图片。手势已做合成关键点测试，真人摄像头识别仍受光线、遮挡和设备影响。

## 安装与使用

### 1. 安装并授权夸克网盘 Skill

先在支持 Skill、代码执行和看图能力的智能体环境中安装 [夸克网盘官方 Skill](https://pdds.quark.cn/download/stfile/uu66xuuuuuvyuw8wx/quarkclouddrive-1.0.20.zip)，按它的引导完成自己的账号授权。已经安装并授权的用户不需要重复操作。

### 2. 安装 Orbit 旅行记忆

把这个仓库链接发给你的智能体，让它安装为 Skill：

> 请安装这个 Skill：https://github.com/panggungunvibe/orbit-photo-gallery-skill

Codex 用户也可以手动安装：

```bash
git clone https://github.com/panggungunvibe/orbit-photo-gallery-skill.git ~/.codex/skills/orbit-photo-gallery
```

### 3. 说出你想制作的相册

重新加载 Skill 后，直接说：

> 帮我把夸克网盘里的「云南旅行」相册整理成旅行记忆。

或者明确指定 Skill：

> 使用 $orbit-photo-gallery，把夸克网盘里的「毕业旅行」做成旅行记忆网站。

之后新增照片，可以继续说：

> 这个相册又更新了，帮我更新旅行记忆，重复照片只留一张。

智能体会完成下载、看图、选片、分类、文案、coding、测试和启动预览。若筛选后不足五类，会说明现有类目并请你补充照片；不硬拆类别、不重复用图凑数，也不先生成效果不完整的网站。超过 10 类时合并相近主题，新增照片优先丰富长卷，不直接丢弃多出的类目或照片。相册重名、范围不明或授权缺失时，也会补问必要信息。不会修改网盘原片，也不会自动公开你的照片。

本 Skill 提供工作流、工具脚本和网站模板；需要由能读取 Skill、调用夸克能力、查看图片和执行代码的智能体运行，不是夸克网盘客户端内的按钮或独立手机 App。运行环境需 Node.js 20+、Python 3.10+；工程初始化与依赖准备交给智能体处理。明确提供本地照片时也可使用，但无需为正常的夸克流程手动下载照片。

## 给开发者：运行示例

以下命令用于手动体验或二次开发，正常用户只需要上面的自然语言请求。

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

## 给开发者：手动导入本地照片

先在仓库根目录创建 Python 虚拟环境：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python scripts/review_photos.py /path/to/photos /path/to/private-review
```

在 Windows 中使用 `.venv\Scripts\activate`；HEIC 在非 macOS 平台额外安装 `pillow-heif`。

让模型查看联系表和候选原片，先筛选为 5–10 个自然、非空的分类（优先 6–8 类），按照 [清单格式](references/manifest.md) 编写私人 `selection.json`，再运行：

```bash
python scripts/import_photos.py /path/to/selection.json --check
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
