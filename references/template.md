# 模板维护

- `src/artworks.js`：照片数组。`id,title,description,group,category,image,width,height,alt,cover` 为核心字段。
- `src/categories.js`：分组、封面和顺序。每张入选照片必须出现在且只出现在一个类目中。
- `src/gallery.js` / `geometry.js`：CSS 3D 圆环、拖动惯性、缩放、键盘。
- `src/collection.js`：横向长卷与各类滚动位置。拖动达到阈值后取消点击，手势明确激活时解除此状态。
- `src/main.js`：圆环、长卷、详情路由及手势适配器。隐藏圆环时不要让圆环键盘处理器继续工作。
- `src/gesture-engine.js`：关键点分类与停留选中；`hands.js`：摄像头生命周期、MediaPipe 与 DOM 命中。
- `data-hand-action`：手势可选元素，包括分类、照片和返回按钮。详情展开时只有关闭目标可响应底层命中。
- `src/style.css`：视觉与响应式。增加类目后要检查底部分类文字能否换行、不压住卡片或页脚。

在复制出的项目里运行：

```bash
npm ci
npm run setup:hands  # 仅手势需要；下载模型到本项目
npm run dev
npm test
npm run build
npm run preview
```

`evidence/interaction-check.html` 在开发服务器下可运行交互验收；测试面板使用合成手部关键点，并覆盖拒绝/取消摄像头的清理路径。实际摄像头识别的光线、距离和人体差异仍需要用户使用时验证。模板默认不上传画面；不要添加远端分析、埋点或上传而不向用户说明。

更新数据后用生产预览复验，避免只看开发热更新。生产资源使用根路径，部署时放在域名根目录；若使用 GitHub Pages 仓库子路径，必须同时调整 Vite base、照片路径和 MediaPipe 模型/WASM 路径，不能仅更改 Vite base。
