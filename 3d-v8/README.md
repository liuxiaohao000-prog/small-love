# v8 国漫角色重做版

v8 不再把程序拼装角色作为首选。主角优先加载标准 VRM 动漫角色，保留闭合高密度 GLB 作为加载失败时的离线回退；小爱继续使用带完整动作片段的闭合 GLB。

## 已实现

- VRM Humanoid 蒙皮与完整手指骨骼；
- 41 个面部 Morph Target，以及眨眼、A/I/U/E/O、开心、悲伤、生气和惊讶等表情；
- 头发和服装辅助骨骼的低幅错相次级动作；
- Walk/Run 的骨盆移重、脊柱反摆、膝盖缓冲和脚掌滚动；
- Pet、摄影、钓鱼、咖啡、农田和快递任务动作映射；
- 透明头发深度排序、眼线/睫毛渲染顺序和黑色反向壳移除；
- 小爱 Walk/Run/Happy/Sit 动作，以及耳朵、尾巴、下颌和舌头表演；
- OnePlus 12 目标运行内存约 350–700MB，上限 1000MB。

## 目录

- `V8_REDESIGN_PLAN.md`：完整改造与验收方案；
- `V8_ART_REVIEW.md`：美术、动作和穿模审查记录；
- `VRMRuntime.js`：骨骼、表情、材质和次级动作运行时；
- `inspect_vrm.py`：VRM 元数据与结构检查；
- `patches/*.gz.b64`：相对 v7 的游戏与 UI 源码补丁；
- `apply-v8-assets.sh`：将补丁、VRM 和 Three.js 官方加载器应用到解包工程；
- `RELEASE_MANIFEST.md`：v8.0.0 APK 的摘要和验证结果。

## 资产与运行时流水线

GitHub Actions 会分别检查明确的 CC0 VRM 候选模型，并下载、修补 Three.js r184 官方 `GLTFLoader`、`BufferGeometryUtils` 和 `SkeletonUtils`，形成完全离线的 WebView 运行时。没有把许可证含糊的模型纳入发行包。

## 当前交付

发行 APK 使用与 v5–v7 相同的签名证书，并经过 ZIP、glTF/VRM 结构、JavaScript 和 APK Signature Scheme v2 验证。PR 保持草稿状态，等待 OnePlus 12 真机截图完成最终视觉验收。
