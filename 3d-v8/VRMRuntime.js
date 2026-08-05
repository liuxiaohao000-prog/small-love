import * as THREE from './three.module.min.js';

const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();
const _textureLoader = new THREE.TextureLoader();
const _textureCache = new Map();

function canonical(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function remember(runtime, object) {
  if (!object || runtime.rest.has(object)) return;
  runtime.rest.set(object, {
    position: object.position.clone(),
    quaternion: object.quaternion.clone(),
    scale: object.scale.clone()
  });
}

function restore(runtime, object) {
  const rest = runtime.rest.get(object);
  if (!rest || !object) return;
  object.position.copy(rest.position);
  object.quaternion.copy(rest.quaternion);
  object.scale.copy(rest.scale);
}

function setDelta(runtime, boneName, x = 0, y = 0, z = 0, order = 'XYZ') {
  const bone = runtime.bones[boneName];
  const rest = runtime.rest.get(bone);
  if (!bone || !rest) return;
  _euler.set(x, y, z, order);
  _quat.setFromEuler(_euler);
  bone.quaternion.copy(rest.quaternion).multiply(_quat);
}

function addPosition(runtime, boneName, x = 0, y = 0, z = 0) {
  const bone = runtime.bones[boneName];
  const rest = runtime.rest.get(bone);
  if (!bone || !rest) return;
  bone.position.copy(rest.position);
  bone.position.x += x;
  bone.position.y += y;
  bone.position.z += z;
}

function getNodeObject(model, parser, nodeIndex, doc) {
  const nodeName = doc.nodes && doc.nodes[nodeIndex] ? doc.nodes[nodeIndex].name : '';
  if (nodeName) {
    const byName = model.getObjectByName(nodeName);
    if (byName) return byName;
  }
  let found = null;
  model.traverse(object => {
    if (found) return;
    const association = parser && parser.associations ? parser.associations.get(object) : null;
    if (association && association.nodes === nodeIndex) found = object;
  });
  return found;
}

function collectMeshesByIndex(runtime, model, parser) {
  model.traverse(object => {
    if (!object.isMesh) return;
    const association = parser && parser.associations ? parser.associations.get(object) : null;
    if (!association || association.meshes === undefined) return;
    const index = association.meshes;
    if (!runtime.meshes.has(index)) runtime.meshes.set(index, []);
    runtime.meshes.get(index).push(object);
  });
}

function collectExpressions(runtime, extension) {
  const groups = extension && extension.blendShapeMaster
    ? extension.blendShapeMaster.blendShapeGroups || []
    : [];
  groups.forEach(group => {
    const names = [group.name, group.presetName].filter(Boolean).map(canonical);
    names.forEach(name => runtime.expressions.set(name, group));
  });
}

function clearExpressions(runtime) {
  runtime.meshes.forEach(meshes => {
    meshes.forEach(mesh => {
      if (!mesh.morphTargetInfluences) return;
      for (let i = 0; i < mesh.morphTargetInfluences.length; i++) {
        mesh.morphTargetInfluences[i] = 0;
      }
    });
  });
}

function applyExpression(runtime, name, weight) {
  if (!(weight > 0)) return;
  const group = runtime.expressions.get(canonical(name));
  if (!group) return;
  const safeWeight = THREE.MathUtils.clamp(weight, 0, 1);
  (group.binds || []).forEach(bind => {
    const meshes = runtime.meshes.get(bind.mesh) || [];
    meshes.forEach(mesh => {
      if (!mesh.morphTargetInfluences || bind.index >= mesh.morphTargetInfluences.length) return;
      mesh.morphTargetInfluences[bind.index] = Math.max(
        mesh.morphTargetInfluences[bind.index] || 0,
        safeWeight * ((bind.weight == null ? 100 : bind.weight) / 100)
      );
    });
  });
}

function texture(url, srgb, repeat) {
  if (!url) return null;
  const key = `${url}|${srgb ? 's' : 'n'}|${repeat ? repeat.join(',') : ''}`;
  if (_textureCache.has(key)) return _textureCache.get(key);
  const loaded = _textureLoader.load(url);
  if (srgb) loaded.colorSpace = THREE.SRGBColorSpace;
  loaded.wrapS = loaded.wrapT = THREE.RepeatWrapping;
  if (repeat) loaded.repeat.set(repeat[0] || 1, repeat[1] || 1);
  loaded.anisotropy = 8;
  loaded.needsUpdate = true;
  _textureCache.set(key, loaded);
  return loaded;
}

export function upgradeCustomMaterialExtras(gltf) {
  const parser = gltf && gltf.parser;
  const doc = parser && parser.json;
  const model = gltf && (gltf.scene || (gltf.scenes && gltf.scenes[0]));
  if (!doc || !model || !parser.associations) return;
  model.traverse(object => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => {
      const association = parser.associations.get(material);
      if (!association || association.materials === undefined) return;
      const definition = doc.materials && doc.materials[association.materials];
      const extras = definition && definition.extras;
      if (!extras) return;
      if (extras.texture && !material.map) {
        material.map = texture(extras.texture, true, extras.repeat);
      }
      if (extras.normalTexture && !material.normalMap) {
        material.normalMap = texture(extras.normalTexture, false, extras.repeat);
        const strength = Math.min(0.24, extras.normalScale || 0.12);
        material.normalScale = new THREE.Vector2(strength, strength);
      }
      material.needsUpdate = true;
    });
  });
}

export function configureCharacterMaterials(model, isVrm) {
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = false;
    object.receiveShadow = false;
    object.frustumCulled = false;
    const materials = object.material
      ? (Array.isArray(object.material) ? object.material : [object.material])
      : [];
    let maxOrder = 0;
    materials.forEach(material => {
      const name = String(material.name || object.name || '');
      if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
        material.map.anisotropy = 8;
      }
      material.depthTest = true;
      if (/eyeline|eyelash|brow|highlight|eyeextra/i.test(name)) {
        material.depthWrite = false;
        maxOrder = Math.max(maxOrder, 4);
      } else if (/hair/i.test(name) && material.transparent) {
        material.alphaTest = Math.max(material.alphaTest || 0, 0.055);
        material.depthWrite = true;
        maxOrder = Math.max(maxOrder, 1);
      } else if (material.transparent) {
        material.depthWrite = false;
      } else {
        material.depthWrite = true;
      }
      if (/iris|eyewhite|facemouth|face_00_skin/i.test(name)) maxOrder = Math.max(maxOrder, 2);
      if (!isVrm && material.color && !material.map) {
        const lightness = Math.max(material.color.r, material.color.g, material.color.b);
        if (lightness < 0.028 && !/dark|eye|brow|stocking|shoe|pupil/i.test(name)) {
          material.color.setRGB(0.32, 0.24, 0.30);
        }
      }
      material.needsUpdate = true;
    });
    object.renderOrder = maxOrder;
  });
}

export function initVrmRuntime(state, gltf) {
  const parser = gltf && gltf.parser;
  const doc = parser && parser.json;
  const extension = doc && doc.extensions && doc.extensions.VRM;
  if (!extension || !state || !state.model) return false;

  const runtime = {
    doc,
    extension,
    bones: {},
    rest: new Map(),
    meshes: new Map(),
    expressions: new Map(),
    secondary: [],
    modelScale: Math.max(0.001, state.model.scale.y || 1)
  };

  (extension.humanoid && extension.humanoid.humanBones || []).forEach(entry => {
    const object = getNodeObject(state.model, parser, entry.node, doc);
    if (!object) return;
    runtime.bones[entry.bone] = object;
    remember(runtime, object);
  });

  collectMeshesByIndex(runtime, state.model, parser);
  collectExpressions(runtime, extension);

  const seen = new Set();
  const groups = extension.secondaryAnimation && extension.secondaryAnimation.boneGroups || [];
  groups.forEach(group => {
    (group.bones || []).forEach(nodeIndex => {
      const object = getNodeObject(state.model, parser, nodeIndex, doc);
      if (!object || seen.has(object)) return;
      seen.add(object);
      remember(runtime, object);
      runtime.secondary.push(object);
    });
  });

  state.vrmRuntime = runtime;
  state.isVrm = true;
  return true;
}

function resetPose(runtime) {
  Object.values(runtime.bones).forEach(object => restore(runtime, object));
  runtime.secondary.forEach(object => restore(runtime, object));
}

function clampAngle(value, limit) {
  return THREE.MathUtils.clamp(Number(value) || 0, -limit, limit);
}

function actionEnvelope(progress) {
  const p = THREE.MathUtils.clamp(Number(progress) || 0, 0, 1);
  const enter = THREE.MathUtils.smoothstep(p, 0.04, 0.22);
  const leave = 1 - THREE.MathUtils.smoothstep(p, 0.80, 0.98);
  return Math.min(enter, leave);
}

function setNaturalArms(runtime, leftSwing = 0, rightSwing = 0, leftBend = 0.10, rightBend = 0.10) {
  // The VRoid source is a T-pose. Positive Z lowers the left arm; negative Z
  // lowers the right arm. v8.0 used the opposite signs and raised both hands.
  const drop = 1.36;
  setDelta(runtime, 'leftShoulder', 0, 0, -0.035);
  setDelta(runtime, 'rightShoulder', 0, 0, 0.035);
  setDelta(runtime, 'leftUpperArm', 0, leftSwing, drop);
  setDelta(runtime, 'rightUpperArm', 0, rightSwing, -drop);
  setDelta(runtime, 'leftLowerArm', 0, Math.abs(leftBend), -0.025);
  setDelta(runtime, 'rightLowerArm', 0, -Math.abs(rightBend), 0.025);
  setDelta(runtime, 'leftHand', 0, 0, 0.025);
  setDelta(runtime, 'rightHand', 0, 0, -0.025);
}

function poseSafeInteraction(runtime, token, progress, elapsed) {
  const weight = actionEnvelope(progress);
  if (!(weight > 0.001)) return false;
  const wave = Math.sin(elapsed * 4.4) * weight;

  if (token.includes('pet')) {
    setDelta(runtime, 'spine', -0.14 * weight, 0, 0);
    setDelta(runtime, 'chest', -0.18 * weight, 0.025 * weight, 0);
    setDelta(runtime, 'upperChest', -0.08 * weight, 0.015 * weight, 0);
    setDelta(runtime, 'neck', 0.08 * weight, -0.05 * weight, 0);
    setDelta(runtime, 'head', 0.16 * weight, -0.08 * weight, 0.035 * weight);
    setDelta(runtime, 'leftUpperLeg', -0.18 * weight, 0, 0);
    setDelta(runtime, 'rightUpperLeg', -0.18 * weight, 0, 0);
    setDelta(runtime, 'leftLowerLeg', 0.32 * weight, 0, 0);
    setDelta(runtime, 'rightLowerLeg', 0.32 * weight, 0, 0);
    setNaturalArms(runtime, -0.12 * weight, 0.78 * weight + wave * 0.035, 0.18, 0.58);
    setDelta(runtime, 'rightUpperArm', 0.05 * weight, 0.78 * weight + wave * 0.035, -1.20);
    setDelta(runtime, 'rightLowerArm', 0.08 * weight, -0.60 * weight - wave * 0.05, 0.04);
    setDelta(runtime, 'rightHand', -0.10 * weight, 0.06 * wave, -0.08 * weight);
    setDelta(runtime, 'leftUpperArm', 0, -0.08 * weight, 1.28);
    setDelta(runtime, 'leftLowerArm', 0, 0.20 * weight, -0.02);
    return true;
  }

  if (token.includes('photo')) {
    setDelta(runtime, 'spine', -0.035 * weight, 0, 0);
    setDelta(runtime, 'chest', -0.03 * weight, 0.04 * weight, 0);
    setNaturalArms(runtime, -0.60 * weight, 0.60 * weight, 0.72, 0.72);
    setDelta(runtime, 'leftUpperArm', 0.08 * weight, -0.60 * weight, 1.02);
    setDelta(runtime, 'rightUpperArm', 0.08 * weight, 0.60 * weight, -1.02);
    setDelta(runtime, 'leftLowerArm', 0, 0.72 * weight, 0);
    setDelta(runtime, 'rightLowerArm', 0, -0.72 * weight, 0);
    return true;
  }

  if (token.includes('fishing')) {
    setDelta(runtime, 'spine', -0.06 * weight, 0.03 * weight, 0);
    setNaturalArms(runtime, -0.38 * weight, 0.42 * weight, 0.48, 0.56);
    return true;
  }

  if (token.includes('coffee') || token.includes('cafe')) {
    setDelta(runtime, 'chest', -0.025 * weight, 0.035 * weight, 0);
    setNaturalArms(runtime, -0.22 * weight, 0.40 * weight, 0.24, 0.46);
    return true;
  }

  if (token.includes('farm') || token.includes('water') || token.includes('dig')) {
    setDelta(runtime, 'spine', -0.09 * weight, 0, 0);
    setNaturalArms(runtime, -0.30 * weight, 0.52 * weight, 0.32, 0.52);
    return true;
  }

  if (token.includes('delivery')) {
    setNaturalArms(runtime, -0.20 * weight, 0.20 * weight, 0.38, 0.38);
    setDelta(runtime, 'leftUpperArm', 0, -0.20 * weight, 1.20);
    setDelta(runtime, 'rightUpperArm', 0, 0.20 * weight, -1.20);
    return true;
  }
  return false;
}

function syncHumanPose(runtime, legacy, elapsed, intent, moveIntensity, moving, actorActionName, actorActionProgress) {
  if (!legacy) return;
  const intensity = THREE.MathUtils.clamp(moveIntensity || 0, 0, 1);
  const run = canonical(intent).includes('run');
  const cycle = elapsed * (run ? 10.8 : 7.6);
  const stride = moving ? Math.sin(cycle) * intensity : 0;
  const step = moving ? Math.abs(Math.sin(cycle)) * intensity : 0;
  const breathing = Math.sin(elapsed * 1.35);
  const sway = moving ? Math.sin(cycle) * 0.024 * intensity : Math.sin(elapsed * 0.85) * 0.006;
  const token = canonical(`${intent || ''} ${actorActionName || ''}`);

  // Do not reuse the old procedural model's shoulder angles. Its bone axes are
  // incompatible with this VRM and were the source of the twisted interactions.
  setDelta(runtime, 'hips', clampAngle(legacy.hips.rotation.x, 0.10), clampAngle(legacy.hips.rotation.y, 0.12), clampAngle(legacy.hips.rotation.z, 0.08) + sway);
  setDelta(runtime, 'spine', clampAngle(legacy.torso.rotation.x, 0.12) + breathing * 0.006, clampAngle(legacy.torso.rotation.y, 0.10), clampAngle(legacy.torso.rotation.z, 0.06) - sway * 0.45);
  setDelta(runtime, 'chest', clampAngle(legacy.chest.rotation.x, 0.10) + breathing * 0.008, clampAngle(legacy.chest.rotation.y, 0.10), clampAngle(legacy.chest.rotation.z, 0.06) + sway * 0.22);
  setDelta(runtime, 'upperChest', breathing * 0.006, clampAngle(legacy.chest.rotation.y, 0.06), clampAngle(legacy.chest.rotation.z, 0.035));
  setDelta(runtime, 'neck', clampAngle(legacy.head.rotation.x, 0.12) * 0.35, clampAngle(legacy.head.rotation.y, 0.16) * 0.35, clampAngle(legacy.head.rotation.z, 0.10) * 0.28);
  setDelta(runtime, 'head', clampAngle(legacy.head.rotation.x, 0.20) - step * 0.010, clampAngle(legacy.head.rotation.y, 0.24), clampAngle(legacy.head.rotation.z, 0.14) - sway * 0.18);

  if (!poseSafeInteraction(runtime, token, actorActionProgress, elapsed)) {
    const armSwing = moving ? stride * (run ? 0.46 : 0.30) : 0;
    const elbow = moving ? 0.13 + step * (run ? 0.22 : 0.10) : 0.10;
    setNaturalArms(runtime, armSwing, armSwing, elbow, elbow);

    const legSwing = moving ? stride * (run ? 0.62 : 0.42) : 0;
    const kneeL = moving ? Math.max(0, -stride) * (run ? 0.72 : 0.46) : 0;
    const kneeR = moving ? Math.max(0, stride) * (run ? 0.72 : 0.46) : 0;
    setDelta(runtime, 'leftUpperLeg', legSwing, 0, sway * 0.10);
    setDelta(runtime, 'rightUpperLeg', -legSwing, 0, sway * 0.10);
    setDelta(runtime, 'leftLowerLeg', kneeL, 0, 0);
    setDelta(runtime, 'rightLowerLeg', kneeR, 0, 0);
    setDelta(runtime, 'leftFoot', -Math.max(0, stride) * 0.16, 0, 0);
    setDelta(runtime, 'rightFoot', -Math.max(0, -stride) * 0.16, 0, 0);
  }

  const vertical = ((legacy.visual.position.y || 0) + step * (run ? 0.025 : 0.012)) / runtime.modelScale;
  addPosition(runtime, 'hips', sway * 0.020 / runtime.modelScale, vertical, 0);
}

function animateSecondary(runtime, elapsed, intensity, moving) {
  runtime.secondary.forEach((bone, index) => {
    const rest = runtime.rest.get(bone);
    if (!rest) return;
    const name = String(bone.name || '');
    const phase = elapsed * (moving ? 6.8 : 1.55) - index * 0.19;
    let amount = moving ? 0.025 + 0.075 * intensity : 0.012;
    if (/bust/i.test(name)) amount *= 0.28;
    _euler.set(Math.sin(phase * 0.83) * amount * 0.45, Math.cos(phase * 0.57) * amount * 0.28, Math.sin(phase) * amount, 'XYZ');
    _quat.setFromEuler(_euler);
    bone.quaternion.copy(rest.quaternion).multiply(_quat);
  });
}

function animateExpressions(runtime, elapsed, intent, actorActionName) {
  clearExpressions(runtime);
  const blinkPhase = elapsed % 4.65;
  const blink = blinkPhase < 0.15 ? 1 - Math.abs(blinkPhase - 0.075) / 0.075 : 0;
  applyExpression(runtime, 'blink', blink);

  const token = canonical(intent);
  const action = canonical(actorActionName);
  if (token.includes('pet') || token.includes('happy') || action.includes('pet')) {
    applyExpression(runtime, 'joy', 0.82);
    applyExpression(runtime, 'a', 0.16 + Math.max(0, Math.sin(elapsed * 5.2)) * 0.16);
  } else if (token.includes('photo')) {
    applyExpression(runtime, 'fun', 0.52);
    applyExpression(runtime, 'i', 0.10);
  } else if (token.includes('fishing')) {
    applyExpression(runtime, action.includes('reel') ? 'surprised' : 'fun', action.includes('reel') ? 0.48 : 0.20);
    applyExpression(runtime, 'o', action.includes('reel') ? 0.22 : 0.04);
  } else if (token.includes('coffee') || token.includes('farm') || token.includes('delivery')) {
    applyExpression(runtime, 'fun', 0.24);
    applyExpression(runtime, 'a', Math.max(0, Math.sin(elapsed * 3.4)) * 0.08);
  } else if (Math.floor(elapsed / 5.8) % 4 === 1) {
    applyExpression(runtime, 'fun', 0.10);
  }
}

export function updateVrmRuntime(state, options) {
  const runtime = state && state.vrmRuntime;
  if (!runtime) return;
  resetPose(runtime);
  const legacy = options && options.legacyParts;
  const elapsed = options && options.elapsed || 0;
  const intent = options && options.intent || 'Idle';
  const intensity = options && options.moveIntensity || 0;
  const moving = Boolean(options && options.moving);
  syncHumanPose(runtime, legacy, elapsed, intent, intensity, moving, options && options.actorActionName, options && options.actorActionProgress);
  animateSecondary(runtime, elapsed, intensity, moving);
  animateExpressions(runtime, elapsed, intent, options && options.actorActionName);
  state.model.updateMatrixWorld(false);
}
