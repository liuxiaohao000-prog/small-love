# v8.0.0 Release Manifest

## Deliverable

- File: `XiaoAi-Manor-3D-Anime-Rebuild-v8.0.0-v2-signed.apk`
- Size: 29,887,767 bytes
- SHA-256: `e8936010300f36ff0d3d43ea4892bfc08d80aad7f28efd3dfd35c25db4b46856`
- Signature: APK Signature Scheme v2; signature, public key and content digest verified

## Primary character asset

- Format: VRM 0.x / glTF 2.0
- License foundation: CC0 VRoid sample model; license notice embedded in the APK
- Nodes: 163
- Skins: 3
- Joints per skin: 158
- Materials: 17
- Textures: 29
- Triangles: 31,211
- Face morph target entries: 41 on the face mesh
- Preset expressions: blink, left/right blink, A/I/U/E/O, joy, fun, sorrow, angry and surprised
- Secondary groups: 17, covering 23 hair/clothing bones

## Offline fallback assets

- Xiaoyu closed fallback GLB: 193,696 triangles, 10 animation clips
- Xiaoai dog GLB: 71,904 triangles, 5 animation clips

## Validation completed

- `game3d.js` and `VRMRuntime.js` passed `node --check`
- All required APK resources present
- ZIP integrity passed with no compressed-data errors
- GLB/VRM headers, chunk lengths, nodes, skins, joints, accessors, buffer views, primitive indices, morph targets and animation references validated
- `classes.dex` and `resources.arsc` stored-data offsets are 4-byte aligned
- APK v2 signature and signing-block content digest verified

## Validation limitation

The build environment cannot replace final OnePlus 12 visual testing. The PR remains a draft until device screenshots confirm face orientation, hair transparency, interaction poses and residual clipping.
