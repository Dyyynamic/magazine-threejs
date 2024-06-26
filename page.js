import * as THREE from "three";

const loader = new THREE.TextureLoader();

export default class Page {
  flipTime = 0.75;
  // moveTime = 0.25;

  #flipping;
  #flipDirection;
  #startTime;

  constructor(width, height, pageDepth, frontImg, backImg) {
    const geometry = new THREE.BoxGeometry(width, height, pageDepth, 100);
    const frontTex = loader.load(frontImg);
    const backTex = loader.load(backImg);
    const frontMaterial = new THREE.MeshPhongMaterial({ map: frontTex });
    const backMaterial = new THREE.MeshPhongMaterial({ map: backTex });
    const edgeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });

    this.mesh = new THREE.Mesh(geometry, [
      edgeMaterial,
      edgeMaterial,
      edgeMaterial,
      edgeMaterial,
      frontMaterial,
      backMaterial,
    ]);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    const vertPositions = geometry.getAttribute("position");

    this.startZ = [];
    for (let i = 0; i < vertPositions.count; i++) {
      this.startZ[i] = vertPositions.getZ(i);
    }
  }

  get flipping() {
    return this.#flipping;
  }

  get startTime() {
    return this.#startTime;
  }

  get flipDirection() {
    return this.#flipDirection;
  }

  set flipping(flipping) {
    this.#flipping = flipping;
  }

  set startTime(startTime) {
    this.#startTime = startTime;
  }

  set flipDirection(flipDirection) {
    this.#flipDirection = flipDirection;
  }
}
