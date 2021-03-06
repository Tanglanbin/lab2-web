const THREE = require('three');
const GLTFLoader = require('three-gltf-loader');
const io = require('socket.io-client');

//创建场景
const scene = new THREE.Scene();
//添加摄像机
const SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
const VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.3, FAR = 1000;
const camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
camera.position.set(0, 20, 50);
camera.lookAt(new THREE.Vector3(0, 15, 0));
scene.add(camera);
//创建渲染器
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
document.body.appendChild(renderer.domElement);

//添加环境光
const light = new THREE.AmbientLight(0xaaaaaa);
scene.add(light);
//首先创建一个盒子立方体，长宽高设为500
const skyBoxGeometry = new THREE.BoxGeometry(500, 500, 500);
// 接下来创建材质并映射到指定图片，设定为只渲染背面（对立方体来说，从外面看到的是正面，从内部看到的是背面）
const textureLoader = new THREE.TextureLoader();
const skyBoxMaterial = [
    new THREE.MeshBasicMaterial({map: textureLoader.load('../assets/textures/skybox/px.jpg'), side: THREE.BackSide}), // right
    new THREE.MeshBasicMaterial({map: textureLoader.load('../assets/textures/skybox/nx.jpg'), side: THREE.BackSide}), // left
    new THREE.MeshBasicMaterial({map: textureLoader.load('../assets/textures/skybox/py.jpg'), side: THREE.BackSide}), // top
    new THREE.MeshBasicMaterial({map: textureLoader.load('../assets/textures/skybox/ny.jpg'), side: THREE.BackSide}), // bottom
    new THREE.MeshBasicMaterial({map: textureLoader.load('../assets/textures/skybox/pz.jpg'), side: THREE.BackSide}), // back
    new THREE.MeshBasicMaterial({map: textureLoader.load('../assets/textures/skybox/nz.jpg'), side: THREE.BackSide})  // front
];
var skyMaterial = new THREE.MeshFaceMaterial(skyBoxMaterial);
// 创建天空盒子并添加到场景
const skyBox = new THREE.Mesh(skyBoxGeometry, skyMaterial);
scene.add(skyBox);
// 添加地板
textureLoader.load("../assets/textures/floor/FloorsCheckerboard_S_Diffuse.jpg", function (texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    const floorMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide
    });
    const floorGeometry = new THREE.PlaneGeometry(500, 500, 5, 5);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = 0;
    floor.rotation.x = Math.PI / 2;
    scene.add(floor);
});

// W S A D 的keycode
const KEY_W = 87;
const KEY_S = 83;
const KEY_A = 65;
const KEY_D = 68;

//添加控制照相机
class FirstPersonControls {

    constructor(camera, domElement) {
        this.domElement = domElement || document.body;
        this.isLocked = false;
        this.camera = camera;

        // 初始化camera, 将camera放在pitchObject正中央
        camera.rotation.set(0, 0, 0);
        camera.position.set(0, 0, 0);

        // 将camera添加到pitchObject, 使camera沿水平轴做旋转, 并提升pitchObject的相对高度
        this.pitchObject = new THREE.Object3D();
        this.pitchObject.add(camera);
        this.pitchObject.position.y = 10;

        // 将pitObject添加到yawObject, 使camera沿竖直轴旋转
        this.yawObject = new THREE.Object3D();
        this.yawObject.add(this.pitchObject);
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
    }

    onPointerlockChange() {
        console.log(this.domElement);
        this.isLocked = document.pointerLockElement === this.domElement;
    }

    onPointerlockError() {
        console.error('THREE.PointerLockControls: Unable to use Pointer Lock API');
    }

    onMouseMove(event) {
        if (this.isLocked) {
            let movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
            let movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

            this.yawObject.rotation.y -= movementX * 0.002;
            this.pitchObject.rotation.x -= movementY * 0.002;
            // 这一步的目的是什么
            this.pitchObject.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitchObject.rotation.x));
        }
    }

    onKeyDown(event) {
        switch (event.keyCode) {
            case KEY_W:
                this.moveForward = true;
                break;
            case KEY_A:
                this.moveLeft = true;
                break;
            case KEY_S:
                this.moveBackward = true;
                break;
            case KEY_D:
                this.moveRight = true;
                break;
        }
    }

    onKeyUp(event) {
        switch (event.keyCode) {
            case KEY_W:
                this.moveForward = false;
                break;
            case KEY_A:
                this.moveLeft = false;
                break;
            case KEY_S:
                this.moveBackward = false;
                break;
            case KEY_D:
                this.moveRight = false;
                break;
        }
    }

    update(delta) {
        // 移动速度
        const moveSpeed = 100;

        // 确定移动方向
        let direction = new THREE.Vector3();
        direction.x = Number(this.moveRight) - Number(this.moveLeft);
        direction.z = Number(this.moveBackward) - Number(this.moveForward);
        direction.y = 0;

        // 移动方向向量归一化，使得实际移动的速度大小不受方向影响
        if (direction.x !== 0 || direction.z !== 0) {
            direction.normalize();
        }

        // 移动距离等于速度乘上间隔时间delta
        if (this.moveForward || this.moveBackward) {
            this.yawObject.translateZ(moveSpeed * direction.z * delta);
        }
        if (this.moveLeft || this.moveRight) {
            this.yawObject.translateX(moveSpeed * direction.x * delta);
        }
    }


    connect() {
        this.domElement.addEventListener('click', this.domElement.requestPointerLock);
        // 在函数后面添加bind(this)的目的是什么
        document.addEventListener('pointerlockchange', this.onPointerlockChange.bind(this), false);
        document.addEventListener('pointerlockerror', this.onPointerlockError.bind(this), false);
        document.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        document.addEventListener('keydown', this.onKeyDown.bind(this), false);
        document.addEventListener('keyup', this.onKeyUp.bind(this), false);
    }

}

// 修改fpc的构造，传入参数camera
const fpc = new FirstPersonControls(camera);
fpc.connect();
// 向场景添加用于控制相机的Object
scene.add(fpc.yawObject);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", onWindowResize);


// const socket = io('localhost:3000');
const socket = io('http://ec2-34-201-66-41.compute-1.amazonaws.com:3000');


let playerMap = new Map();
socket.on('player', data => {
    if (playerMap.has(data.socketid)) {
        let model = playerMap.get(data.socketid);
        model.position.set(data.position.x, data.position.y, data.position.z);
        model.rotation.set(data.rotation._x, data.rotation._y + Math.PI / 2, data.rotation._z);
    } else {
        const loader = new GLTFLoader();
        loader.load("../assets/models/duck.glb", (mesh) => {
            mesh.scene.scale.set(10, 10, 10);
            scene.add(mesh.scene);
            playerMap.set(data.socketid, mesh.scene);
        });
    }
});
socket.on('offline', data => {
    if (playerMap.has(data.socketid)) {
        scene.remove(playerMap.get(data.socketid));
        playerMap.delete(data.socketid)
    }
});

//回调函数
let clock = new THREE.Clock();

function render() {
    fpc.update(clock.getDelta());
    socket.emit('player', {position: fpc.yawObject.position, rotation: fpc.yawObject.rotation});
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

render();