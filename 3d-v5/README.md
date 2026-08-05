# v5 标准角色与方向键版本

本目录保存从 `build/3d-anime-v4` 叠加到 Android 工程的 v5 构建补丁。

- 优先加载 `models/xiaoyu.glb` 与 `models/xiaoai.glb`；
- 使用 `GLTFLoader`、骨骼蒙皮和 `AnimationMixer`；
- GLB 缺失或加载失败时保留 v4 程序化角色作为离线兜底；
- 左侧摇杆替换为上、下、左、右四方向按键；
- 同步修正键盘 A/D/W/S 与方向键映射。
