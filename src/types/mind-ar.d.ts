declare module "mind-ar/dist/mindar-image-three.prod.js" {
  import type { WebGLRenderer, Scene, PerspectiveCamera, Group } from "three"

  interface MindARThreeOptions {
    container: HTMLElement
    imageTargetSrc: string
    maxTrack?: number
    uiLoading?: string
    uiScanning?: string
    uiError?: string
    filterMinCF?: number
    filterBeta?: number
    missTolerance?: number
    warmupTolerance?: number
  }

  interface Anchor {
    group: Group
    onTargetFound?: () => void
    onTargetLost?: () => void
    onTargetUpdate?: () => void
  }

  export class MindARThree {
    constructor(options: MindARThreeOptions)
    renderer: WebGLRenderer
    scene: Scene
    camera: PerspectiveCamera
    addAnchor(targetIndex: number): Anchor
    start(): Promise<void>
    stop(): void
  }
}
