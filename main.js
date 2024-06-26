import * as THREE from 'three';
import Page from './page.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

// Magazine constants
const nPages = 19;
const pageWidth = 20;
const pageHeight = 30;
const pageDepth = 0.02;
const k = 0.4;

const scene = new THREE.Scene();
// scene.background = new THREE.Color(0x444444);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 20, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.shadowMap.enabled = true;

const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 2.5);
directionalLight.position.set(10, 100, 10);
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = - 20;
directionalLight.shadow.camera.left = - 20;
directionalLight.shadow.camera.right = 20;
scene.add(directionalLight);
directionalLight.castShadow = true;

const envMap = new RGBELoader()
  .load("images/textures/hotel_room_4k.hdr", (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    scene.environment = texture;
  });

const loader = new THREE.TextureLoader();

const tableGeometry = new THREE.BoxGeometry(80, 2, 60);
const tableTexture = loader.load("images/textures/oak_veneer_01_diff_1k.jpg");
const tableMaterial = new THREE.MeshPhongMaterial({
  map: tableTexture,
  bumpMap: tableTexture,
  bumpScale: 0.2,
  envMap: envMap,
  reflectivity: 0.02,
});
const table = new THREE.Mesh(tableGeometry, tableMaterial);
scene.add(table);
table.position.y = -pageDepth * nPages / 2 - 1;
table.receiveShadow = true;

const clock = new THREE.Clock();
const controls = new OrbitControls(camera, renderer.domElement);

let currPage = 0;
const pages = [];

const magazine = new THREE.Object3D();
scene.add(magazine);

magazine.rotation.x = -Math.PI / 2;
magazine.position.x = -pageWidth / 2;

// Add pages
for (let i = 1; i <= nPages; i++) {
  const frontImg = `images/pages/${i * 2 - 1}.jpg`;
  const backImg = `images/pages/${i * 2}.jpg`;

  const page = new Page(pageWidth, pageHeight, pageDepth, frontImg, backImg);
  pages.push(page);
  magazine.add(page.mesh);

  const vertPositions = page.mesh.geometry.getAttribute('position');

  for (let j = 0; j < vertPositions.count; j++) {
    const pageCurve =
      vertPositions.getX(j) > pageWidth * k
      ? -(((vertPositions.getX(j) - pageWidth * k) / (pageWidth / 2 - pageWidth * k)) ** 2) + 1 // Curve down towards 
      : 1; // Straight

    vertPositions.setZ(j, page.startZ[j] - pageDepth * pageCurve * (i - nPages / 2 - 0.5));
  }
}

function rotateAroundPoint(obj, point, axis, theta) {
  obj.position.sub(point);
  obj.position.applyAxisAngle(axis, theta); // Rotate the position around a point
  obj.position.add(point);
  obj.rotateOnAxis(axis, theta); // Rotate the object around its center
}

function easeInOutSine(x) {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

function animate() {
  pages.forEach((page, i) => {
    const vertPositions = page.mesh.geometry.getAttribute('position');

    vertPositions.needsUpdate = true;

    if (page.flipping) {
      const elapsedTime = clock.getElapsedTime() - page.startTime;

      let flipProgress = elapsedTime / page.flipTime;
      // let moveProgress = easeInOutSine(elapsedTime / page.moveTime);

      if (elapsedTime >= page.flipTime) {
        page.flipping = false;
        flipProgress = 1;
      }

      // if (elapsedTime >= page.moveTime) moveProgress = 1;
      
      // Center magazine
      // if (i == 0 && page.flipDirection == "left")
      //   magazine.position.x = -pageWidth / 2 + moveProgress * pageWidth / 2;
      // else if (i == 0 && page.flipDirection == "right")
      //   magazine.position.x = -moveProgress * pageWidth / 2;
      // else if (i == pages.length - 1 && page.flipDirection == "left")
      //   magazine.position.x = -pageWidth / 2 + moveProgress * pageWidth / 2 - pageWidth / 2;
      // else if (i == pages.length - 1 && page.flipDirection == "right")
      //   magazine.position.x = -moveProgress * pageWidth / 2 - pageWidth / 2;

      // Funky conversion from euler angles to radian angle around y-axis
      const angleY = page.mesh.rotation.x == 0 ? page.mesh.rotation.y : Math.PI - page.mesh.rotation.y;

      let theta; // Rotation angle
      let delta; // Curviness

      if (page.flipDirection == "right") {
        theta = (Math.PI * flipProgress) - angleY;
        delta = 0.25 * Math.sin(flipProgress * Math.PI);
      } else if (page.flipDirection == "left") {
        theta = -(Math.PI * flipProgress) - Math.PI - angleY;
        delta = -0.25 * Math.sin(flipProgress * Math.PI);
      }

      const point = new THREE.Vector3(pageWidth / 2, 0, 0); // Half of page width
      const axis = new THREE.Vector3(0, 1, 0);

      rotateAroundPoint(page.mesh, point, axis, theta);

      // Curve page
      for (let j = 0; j < vertPositions.count; j++) {
        const pageBend = pageWidth * (1 - (1 / (pageWidth / 2) * vertPositions.getX(j)) ** 2); // Curve function

        const pageCurve =
          vertPositions.getX(j) > pageWidth * k
          ? -(((vertPositions.getX(j) - pageWidth * k) / (pageWidth / 2 - pageWidth * k)) ** 2) + 1 // Curve down towards 
          : 1; // Straight
        
        vertPositions.setZ(j, page.startZ[j] + delta * pageBend - pageDepth * pageCurve * ((i + 1) - nPages / 2 - 0.5));
      }
    }
  });

  controls.update();

	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}

animate();

// Event listeners

document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowRight":
      if (currPage < nPages && !pages[currPage].flipping) {
        pages[currPage].startTime = clock.getElapsedTime();
        pages[currPage].flipping = true;
        pages[currPage].flipDirection = "right";
        currPage++;
      }
      break;
    case "ArrowLeft":
      if (currPage > 0 && !pages[currPage - 1].flipping) {
        pages[currPage - 1].startTime = clock.getElapsedTime();
        pages[currPage - 1].flipping = true;
        pages[currPage - 1].flipDirection = "left";
        currPage--;
      }
      break;
    default:
      break;
  }
});

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
