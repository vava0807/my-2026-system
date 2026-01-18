// 使用 LocalStorage 作為數據存儲
// Three.js 3D 場景
let scene, camera, renderer, controls;
let petObjects = [];

// DOM 元素
const diaryContent = document.getElementById('diaryContent');
const saveDiaryBtn = document.getElementById('saveDiaryBtn');
const noteInput = document.getElementById('noteInput');
const addNoteBtn = document.getElementById('addNoteBtn');
const notesList = document.getElementById('notesList');
const petContainer = document.getElementById('petContainer');
const dogCount = document.getElementById('dogCount');
const catCount = document.getElementById('catCount');
const totalDiaries = document.getElementById('totalDiaries');
const totalNotes = document.getElementById('totalNotes');
const diaryHistory = document.getElementById('diaryHistory');
const warningText = document.getElementById('warningText');

// 寵物類型
const PET_TYPES = ['dog', 'cat'];
const PET_EMOJI = { dog: '🐶', cat: '🐱' };

// 應用狀態
let pets = [];
let notes = [];
let diaries = [];
let stats = {
    dogs: 0,
    cats: 0,
    totalDiaries: 0,
    lastEntryDate: null
};

// 初始化 Three.js 3D 場景
function initThreeJS() {
    const container = petContainer;
    const width = container.clientWidth;
    const height = container.clientHeight;

    scene = new THREE.Scene();

    // 相機
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    camera.position.set(150, 200, 250);

    // 渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.id = 'threeCanvas';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // OrbitControls - 3D 滑鼠拖拽
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2.1;
    }

    // 地面 - 圓形草地
    const groundGeometry = new THREE.CircleGeometry(400, 64);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90, transparent: true, opacity: 0.8 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // 光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    scene.add(directionalLight);

    // 裝飾場景：小樹
    for (let i = 0; i < 15; i++) {
        createTree();
    }

    // 動畫循環
    function animate() {
        requestAnimationFrame(animate);
        const time = Date.now() * 0.005;

        if (controls) controls.update();

        petObjects.forEach(petObj => {
            if (petObj.walking) {
                // 移動 (XZ 平面)
                petObj.mesh.position.x += petObj.velocityX;
                petObj.mesh.position.z += petObj.velocityZ;

                // 邊界檢查
                const dist = Math.sqrt(petObj.mesh.position.x ** 2 + petObj.mesh.position.z ** 2);
                if (dist > 350) {
                    petObj.velocityX *= -1;
                    petObj.velocityZ *= -1;
                    updatePetRotation(petObj);
                }

                // 隨機轉向
                if (Math.random() < 0.01) {
                    petObj.velocityX = (Math.random() - 0.5) * 1.0;
                    petObj.velocityZ = (Math.random() - 0.5) * 1.0;
                    updatePetRotation(petObj);
                }

                // 彈跳動畫
                const walkSpeed = 6;
                const bounce = Math.abs(Math.sin(time * walkSpeed)) * 5;
                petObj.mesh.position.y = bounce;

                // 腳跟著動
                petObj.legs.forEach((leg, i) => {
                    const offset = (i === 0 || i === 3) ? 1 : -1;
                    leg.rotation.x = Math.sin(time * walkSpeed) * 0.6 * offset;
                });

                // 尾巴搖擺
                if (petObj.tail) {
                    petObj.tail.rotation.y = Math.sin(time * 12) * 0.8;
                }

                // 舌頭伸縮
                if (petObj.tongue) {
                    petObj.tongue.scale.z = 0.5 + Math.abs(Math.sin(time * 15)) * 1.5;
                }

                // 呼吸縮放
                const s = 1 + Math.sin(time * 3) * 0.03;
                petObj.mesh.scale.set(s, s, s);
            }
        });

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

// 寵物模型設計 - 參考畫風
function createPetModel(type) {
    const group = new THREE.Group();
    const legs = [];
    let tail = null;
    let tongue = null;

    const whiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const orangeMat = new THREE.MeshPhongMaterial({ color: 0xFFA500 });
    const pinkMat = new THREE.MeshBasicMaterial({ color: 0xFF69B4 });
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    if (type === 'dog') {
        // 身體 (圓柱形/膠囊形)
        const body = new THREE.Mesh(new THREE.SphereGeometry(7, 32, 16), whiteMat);
        body.scale.set(1.3, 0.9, 0.9);
        body.position.y = 10;
        group.add(body);

        // 頭
        const head = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 16), whiteMat);
        head.position.set(10, 14, 0);
        group.add(head);

        // 橘色斑點 (一隻眼睛上)
        const spot = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 16), orangeMat);
        spot.scale.set(1, 1, 0.5);
        spot.position.set(13.5, 15, 2);
        group.add(spot);

        // 鼻子
        const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), blackMat);
        nose.position.set(15.5, 14, 0);
        group.add(nose);

        // 舌頭
        tongue = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 3), pinkMat);
        tongue.position.set(14.5, 12, 0);
        group.add(tongue);

        // 下垂的耳朵 (Floppy Ears)
        const earGeom = new THREE.BoxGeometry(1, 6, 4);
        const ear1 = new THREE.Mesh(earGeom, whiteMat);
        ear1.position.set(10, 18, 5);
        ear1.rotation.x = 0.3;
        group.add(ear1);
        const ear2 = new THREE.Mesh(earGeom, whiteMat);
        ear2.position.set(10, 18, -5);
        ear2.rotation.x = -0.3;
        group.add(ear2);

        // 尾巴
        tail = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.5, 12, 8), whiteMat);
        tail.position.set(-10, 15, 0);
        tail.rotation.z = -0.5;
        group.add(tail);

        // 腿
        const legGeom = new THREE.CylinderGeometry(1.5, 1, 8, 16);
        const legPos = [{ x: 6, z: 4 }, { x: 6, z: -4 }, { x: -6, z: 4 }, { x: -6, z: -4 }];
        legPos.forEach(p => {
            const leg = new THREE.Mesh(legGeom, whiteMat);
            leg.position.set(p.x, 4, p.z);
            group.add(leg);
            legs.push(leg);
        });

    } else {
        // 貓咪
        const catBody = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 16), orangeMat);
        catBody.scale.set(1.1, 1, 1);
        catBody.position.y = 10;
        group.add(catBody);

        const catHead = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 16), orangeMat);
        catHead.position.set(6, 15, 0);
        group.add(catHead);

        // 尖耳朵
        const ear1 = new THREE.Mesh(new THREE.ConeGeometry(2, 5, 4), orangeMat);
        ear1.position.set(6, 20, 3);
        group.add(ear1);
        const ear2 = new THREE.Mesh(new THREE.ConeGeometry(2, 5, 4), orangeMat);
        ear2.position.set(6, 20, -3);
        group.add(ear2);

        // 長尾巴
        tail = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.5, 15, 8), orangeMat);
        tail.position.set(-8, 15, 0);
        tail.rotation.z = -0.8;
        group.add(tail);

        const legGeom = new THREE.CylinderGeometry(1.2, 1.2, 9, 16);
        const legPos = [{ x: 4, z: 3 }, { x: 4, z: -3 }, { x: -4, z: 3 }, { x: -4, z: -3 }];
        legPos.forEach(p => {
            const leg = new THREE.Mesh(legGeom, orangeMat);
            leg.position.set(p.x, 4.5, p.z);
            group.add(leg);
            legs.push(leg);
        });
    }

    // 眼睛
    const eyeGeom = new THREE.SphereGeometry(0.6, 16, 16);
    const eye1 = new THREE.Mesh(eyeGeom, blackMat);
    eye1.position.set(type === 'dog' ? 15 : 10, 16, 2.5);
    group.add(eye1);
    const eye2 = new THREE.Mesh(eyeGeom, blackMat);
    eye2.position.set(type === 'dog' ? 15 : 10, 16, -2.5);
    group.add(eye2);

    return { group, legs, tail, tongue };
}

// 修改後的更新朝向
function updatePetRotation(petObj) {
    const angle = Math.atan2(-petObj.velocityZ, petObj.velocityX);
    petObj.mesh.rotation.y = angle;
}

// 建立樹
function createTree() {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 15, 8), new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    trunk.position.y = 7.5;
    group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(12, 16, 16), new THREE.MeshLambertMaterial({ color: 0x2E8B57 }));
    leaves.position.y = 25;
    group.add(leaves);

    let r = 80 + Math.random() * 300;
    let theta = Math.random() * Math.PI * 2;
    group.position.set(Math.cos(theta) * r, 0, Math.sin(theta) * r);
    scene.add(group);
}

// 數據管理
function loadData() {
    const savedPets = localStorage.getItem('pets');
    const savedNotes = localStorage.getItem('notes');
    const savedDiaries = localStorage.getItem('diaries');
    const savedStats = localStorage.getItem('stats');

    if (savedPets) pets = JSON.parse(savedPets);
    if (savedNotes) notes = JSON.parse(savedNotes);
    if (savedDiaries) diaries = JSON.parse(savedDiaries);
    if (savedStats) stats = JSON.parse(savedStats);
}

function saveAllData() {
    localStorage.setItem('pets', JSON.stringify(pets));
    localStorage.setItem('notes', JSON.stringify(notes));
    localStorage.setItem('diaries', JSON.stringify(diaries));
    localStorage.setItem('stats', JSON.stringify(stats));
}

function addPet(forcedType = null) {
    const petType = forcedType || PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
    const newPet = {
        id: Date.now().toString(),
        type: petType,
        addedAt: new Date().toISOString()
    };
    pets.push(newPet);
    if (petType === 'dog') stats.dogs++;
    else stats.cats++;

    add3DPet(petType);
    saveAllData();
    updateUI();
}

function add3DPet(petType) {
    const { group, legs, tail, tongue } = createPetModel(petType);
    let r = Math.random() * 200;
    let theta = Math.random() * Math.PI * 2;
    group.position.set(Math.cos(theta) * r, 0, Math.sin(theta) * r);

    scene.add(group);

    const petObj = {
        mesh: group,
        legs: legs,
        tail: tail,
        tongue: tongue,
        type: petType,
        walking: true,
        velocityX: (Math.random() - 0.5) * 1.0,
        velocityZ: (Math.random() - 0.5) * 1.0
    };

    updatePetRotation(petObj);
    petObjects.push(petObj);
}

function saveDiary() {
    const content = diaryContent.value.trim();
    if (!content) { alert('請輸入內容'); return; }

    const petType = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
    diaries.unshift({
        id: Date.now().toString(),
        content: content,
        createdAt: new Date().toISOString(),
        petReward: petType
    });

    stats.totalDiaries++;
    addPet(petType);
    diaryContent.value = '';
    saveAllData();
    updateUI();
}

function deleteDiary(id) {
    if (!confirm('確定刪除？')) return;
    diaries = diaries.filter(d => d.id !== id);
    stats.totalDiaries = diaries.length;
    saveAllData();
    updateUI();
}

function addNote() {
    const content = noteInput.value.trim();
    if (!content) return;
    notes.push({ id: Date.now().toString(), content });
    noteInput.value = '';
    saveAllData();
    updateUI();
}

function deleteNote(id) {
    notes = notes.filter(n => n.id !== id);
    saveAllData();
    updateUI();
}

function completeNote(id) {
    notes = notes.filter(n => n.id !== id);
    addPet('cat');
    saveAllData();
    updateUI();
    alert('獎勵一隻貓咪！');
}

function updateUI() {
    dogCount.textContent = stats.dogs;
    catCount.textContent = stats.cats;
    totalNotes.textContent = notes.length;
    totalDiaries.textContent = stats.totalDiaries;

    notesList.innerHTML = '';
    notes.forEach(n => {
        const li = document.createElement('li');
        li.className = 'note-item';
        li.innerHTML = `<span>${n.content}</span><div class="note-btns"><button class="btn-complete" onclick="completeNote('${n.id}')">✅</button><button class="btn-delete" onclick="deleteNote('${n.id}')">🗑️</button></div>`;
        notesList.appendChild(li);
    });

    diaryHistory.innerHTML = '';
    diaries.forEach(d => {
        const div = document.createElement('div');
        div.className = 'diary-entry';
        div.innerHTML = `<div class="diary-entry-date">📅 ${new Date(d.createdAt).toLocaleDateString()}<button class="btn-delete-small" onclick="deleteDiary('${d.id}')">🗑️</button></div><div class="diary-entry-content">${d.content}</div>`;
        diaryHistory.appendChild(div);
    });
}

function initApp() {
    loadData();
    initThreeJS();
    pets.forEach(p => add3DPet(p.type));
    updateUI();

    saveDiaryBtn.addEventListener('click', saveDiary);
    addNoteBtn.addEventListener('click', addNote);
    noteInput.addEventListener('keypress', e => e.key === 'Enter' && addNote());
}

window.deleteNote = deleteNote;
window.completeNote = completeNote;
window.deleteDiary = deleteDiary;
document.addEventListener('DOMContentLoaded', initApp);
