# v8.1.0 Motion and Dog Release Manifest

## Deliverable

- File: `XiaoAi-Manor-3D-Anime-Motion-Dog-v8.1.0-v2-signed.apk`
- Size: 30,356,511 bytes
- SHA-256: `37576d235d1156fc5f26d20ac8bec1e3fcc67e88972b80602039ba5c9bcb0844`
- Signature: APK Signature Scheme v2
- Signing certificate SHA-256: `84aa864d7de4815b5bad128d8c3d4c6b574e6efcc6355bd487201f1d2352599d`

## Human pose correction

- Corrected VRoid T-Pose arm-drop signs: left upper arm uses positive local Z and right upper arm uses negative local Z.
- Replaced direct legacy shoulder Euler mapping with dedicated VRM locomotion and safe task poses.
- Added action-progress envelopes for smooth entry and exit.
- Limited hips, spine, chest, neck and head rotations to conservative ranges.
- Skeleton math check places both idle hands near hip height rather than above the head.

## Xiaoai dog replacement

- Base: Shiba Inu from Quaternius Ultimate Animated Animal Pack.
- License: Creative Commons CC0 1.0 Universal.
- glTF 2.0 / GLB, 48 nodes, one skin, 46 joints and 6 materials.
- 1,950 triangles with a complete canine silhouette.
- 12 clips: Attack, Death, Eating, Run, Gallop_Jump, Idle, Happy, Sit, two HitReact clips, Jump_ToIdle and Walk.
- Pastel cream material pass and a normalized game height of 1.36.

## Validation

- `game3d.js` and `VRMRuntime.js` pass `node --check`.
- GLB header, chunks, nodes, skin, joints, materials, accessors, indices and animation references validated.
- APK ZIP CRC and required resource checks passed.
- Every stored APK entry is 4-byte aligned.
- v2 signature, public key, certificate and APK chunked content digest verified with the same verifier that validates the v8.0 APK.

## Installation note

The v8.0 private signing key was not available in the build environment. v8.1 uses a new certificate, so v8.0 must be uninstalled before v8.1 can be installed. The new v8.1 signing key is retained privately for subsequent v8.1 patch builds in this working session and is not committed to GitHub.
