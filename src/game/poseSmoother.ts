/**
 * pose smoothing for AR marker tracking (MindAR, AR.js style).
 * applies exponential moving average to reduce jitter from camera noise.
 * refs: AR.js smooth-controls, 8th Wall forum, MindAR issue #556
 */

import * as THREE from "three"

/** alpha 0–1: lower = smoother, more lag. 0.15 = strong smoothing. */
export function createPoseSmoother(alphaPos = 0.2, alphaRot = 0.2, alphaScale = 0.06) {
  const smoothPos = new THREE.Vector3()
  const smoothQuat = new THREE.Quaternion()
  const smoothScale = new THREE.Vector3()
  let initialized = false

  return {
    update(
      pos: THREE.Vector3,
      quat: THREE.Quaternion,
      scale: THREE.Vector3
    ): { pos: THREE.Vector3; quat: THREE.Quaternion; scale: THREE.Vector3 } {
      if (!initialized) {
        smoothPos.copy(pos)
        smoothQuat.copy(quat)
        smoothScale.copy(scale)
        initialized = true
        return { pos: smoothPos, quat: smoothQuat, scale: smoothScale }
      }
      smoothPos.lerp(pos, alphaPos)
      smoothQuat.slerp(quat, alphaRot)
      smoothScale.lerp(scale, alphaScale)
      return { pos: smoothPos, quat: smoothQuat, scale: smoothScale }
    },
    reset() {
      initialized = false
    },
  }
}
