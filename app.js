// 使用 LocalStorage 作為數據存儲
// Three.js 3D 場景
let scene, camera, renderer, controls;
let petObjects = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let grabbedPet = null;
let dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // 地面平面 用於計算拖拽位置

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

// 寵物類型與品種
const PET_BREEDS = {
    dog: ['shiba', 'corgi'],
    cat: ['munchkin']
};
const PET_EMOJI = { dog: '🐶', cat: '🐱', shiba: '🐕', corgi: '🦊', munchkin: '🐈' };
const BREED_NAMES = {
    shiba: '柴犬',
    corgi: '柯基',
    munchkin: '短腿貓'
};

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

    // 互動事件：滑鼠按下 (抓取)
    renderer.domElement.addEventListener('mousedown', (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // 檢查是否點到寵物 (我們檢查 petObj.mesh)
        const meshes = petObjects.map(p => p.mesh);
        const intersects = raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
            // 找到點擊到的頂層 Group
            let object = intersects[0].object;
            while (object.parent && !petObjects.find(p => p.mesh === object)) {
                object = object.parent;
            }

            grabbedPet = petObjects.find(p => p.mesh === object);
            if (grabbedPet) {
                grabbedPet.walking = false;
                if (controls) controls.enabled = false; // 抓取時禁用相機旋轉
                document.body.style.cursor = 'grabbing';
            }
        }
    });

    // 互動事件：滑鼠移動 (拖拽)
    renderer.domElement.addEventListener('mousemove', (e) => {
        if (!grabbedPet) {
            // 沒抓取時，Hover 效果
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(petObjects.map(p => p.mesh), true);
            renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
            return;
        }

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // 計算鼠標在地面平面上的交點
        let intersects = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(dragPlane, intersects)) {
            grabbedPet.mesh.position.x = intersects.x;
            grabbedPet.mesh.position.z = intersects.z;
            grabbedPet.mesh.position.y = 20; // 抓起來的高度
        }
    });

    // 互動事件：滑鼠放開 (放下)
    window.addEventListener('mouseup', () => {
        if (grabbedPet) {
            grabbedPet.walking = true;
            grabbedPet.mesh.position.y = 0; // 放回地面
            grabbedPet = null;
            if (controls) controls.enabled = true;
            document.body.style.cursor = 'default';
        }
    });

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

// 寵物模型設計 - 詳細品種版
function createPetModel(breed) {
    const group = new THREE.Group();
    const legs = [];
    let tail = null;
    let tongue = null;

    const whiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const orangeMat = new THREE.MeshPhongMaterial({ color: 0xFFA500 }); // 橘色/赤色
    const shibaMat = new THREE.MeshPhongMaterial({ color: 0xD2691E }); // 柴犬赤色
    const pinkMat = new THREE.MeshBasicMaterial({ color: 0xFF69B4 });
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    if (breed === 'shiba') {
        // --- 柴犬 ---
        // 身體
        const body = new THREE.Mesh(new THREE.SphereGeometry(7, 32, 16), shibaMat);
        body.scale.set(1.2, 0.9, 0.9);
        body.position.y = 10;
        group.add(body);

        // 裏白 (白色肚皮)
        const belly = new THREE.Mesh(new THREE.SphereGeometry(6.5, 32, 16), whiteMat);
        belly.scale.set(1.1, 0.5, 0.8);
        belly.position.y = 7;
        group.add(belly);

        // 頭
        const head = new THREE.Mesh(new THREE.SphereGeometry(5.5, 32, 16), shibaMat);
        head.position.set(8, 14, 0);
        group.add(head);

        // 裏白 (臉部白色)
        const snout = new THREE.Mesh(new THREE.SphereGeometry(3.5, 32, 16), whiteMat);
        snout.scale.set(1.1, 0.8, 1);
        snout.position.set(10, 13, 0);
        group.add(snout);

        // 眼睛
        const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), blackMat);
        eye1.position.set(12, 15, 2);
        group.add(eye1);
        const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), blackMat);
        eye2.position.set(12, 15, -2);
        group.add(eye2);

        // 鼻子
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 16), blackMat);
        nose.position.set(13.5, 14, 0);
        group.add(nose);

        // 尖耳朵
        const ear1 = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 4), shibaMat);
        ear1.position.set(8, 19, 2.5);
        group.add(ear1);
        const ear2 = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 4), shibaMat);
        ear2.position.set(8, 19, -2.5);
        group.add(ear2);

        // 捲捲尾巴 (柴犬特色)
        tail = new THREE.Group();
        const tailMesh = new THREE.Mesh(new THREE.TorusGeometry(3, 1.5, 16, 32, Math.PI * 1.5), shibaMat);
        tailMesh.rotation.y = Math.PI / 2;
        tail.add(tailMesh);
        tail.position.set(-8, 14, 0);
        group.add(tail);

        // 腿
        const legGeom = new THREE.CylinderGeometry(1.2, 1, 8, 16);
        const legPos = [{ x: 5, z: 4 }, { x: 5, z: -4 }, { x: -5, z: 4 }, { x: -5, z: -4 }];
        legPos.forEach(p => {
            const leg = new THREE.Mesh(legGeom, whiteMat);
            leg.position.set(p.x, 4, p.z);
            group.add(leg);
            legs.push(leg);
        });

    } else if (breed === 'corgi') {
        // --- 柯基 ---
        // 長身體
        const body = new THREE.Mesh(new THREE.SphereGeometry(7, 32, 16), orangeMat);
        body.scale.set(1.5, 0.8, 0.8);
        body.position.y = 8;
        group.add(body);

        // 白色圍巾/肚皮
        const neck = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 16), whiteMat);
        neck.scale.set(0.6, 0.9, 0.9);
        neck.position.set(5, 8, 0);
        group.add(neck);

        // 頭
        const head = new THREE.Mesh(new THREE.SphereGeometry(5.5, 32, 16), orangeMat);
        head.position.set(10, 12, 0);
        group.add(head);

        // 白色面帶
        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 16), whiteMat);
        muzzle.position.set(12.5, 11, 0);
        group.add(muzzle);

        // 眼睛
        const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), blackMat);
        eye1.position.set(14, 13, 2);
        group.add(eye1);
        const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), blackMat);
        eye2.position.set(14, 13, -2);
        group.add(eye2);

        // 大耳朵
        const ear1 = new THREE.Mesh(new THREE.BoxGeometry(1, 6, 4), orangeMat);
        ear1.position.set(10, 16, 3.5);
        ear1.rotation.z = -0.2;
        group.add(ear1);
        const ear2 = new THREE.Mesh(new THREE.BoxGeometry(1, 6, 4), orangeMat);
        ear2.position.set(10, 16, -3.5);
        ear2.rotation.z = -0.2;
        group.add(ear2);

        // 舌頭
        tongue = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 3), pinkMat);
        tongue.position.set(14, 10, 0);
        group.add(tongue);

        // 短短白腿
        const legGeom = new THREE.CylinderGeometry(1.5, 1.2, 5, 16);
        const legPos = [{ x: 6, z: 4 }, { x: 6, z: -4 }, { x: -7, z: 4 }, { x: -7, z: -4 }];
        legPos.forEach(p => {
            const leg = new THREE.Mesh(legGeom, whiteMat);
            leg.position.set(p.x, 2.5, p.z);
            group.add(leg);
            legs.push(leg);
        });

        // 屁股 (柯基特有的圓屁股)
        const butt = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 16), orangeMat);
        butt.position.set(-8, 8, 0);
        group.add(butt);

    } else if (breed === 'munchkin') {
        // --- 短腿貓 ---
        // 身體 (修長一些)
        const body = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 16), orangeMat);
        body.scale.set(1.3, 0.8, 0.8);
        body.position.y = 8;
        group.add(body);

        // 頭
        const head = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 16), orangeMat);
        head.position.set(7, 12, 0);
        group.add(head);

        // 貓耳
        const ear1 = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4, 4), orangeMat);
        ear1.position.set(7, 16, 2.5);
        group.add(ear1);
        const ear2 = new THREE.Mesh(earGeom = new THREE.ConeGeometry(1.5, 4, 4), orangeMat);
        ear2.position.set(7, 16, -2.5);
        group.add(ear2);

        // 眼睛
        const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), blackMat);
        eye1.position.set(11, 13, 2);
        group.add(eye1);
        const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), blackMat);
        eye2.position.set(11, 13, -2);
        group.add(eye2);

        // 極短腿 (短腿貓特色)
        const legGeom = new THREE.CylinderGeometry(1, 1, 4, 16);
        const legPos = [{ x: 4, z: 3 }, { x: 4, z: -3 }, { x: -4, z: 3 }, { x: -4, z: -3 }];
        legPos.forEach(p => {
            const leg = new THREE.Mesh(legGeom, orangeMat);
            leg.position.set(p.x, 2, p.z);
            group.add(leg);
            legs.push(leg);
        });

        // 長尾巴
        tail = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.5, 15, 8), orangeMat);
        tail.position.set(-8, 12, 0);
        tail.rotation.z = -0.5;
        group.add(tail);
    }

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

    // 關鍵修正：確保 stats 的數量與實際陣列一致，避免顯示錯誤
    stats.dogs = pets.filter(p => p.type === 'dog').length;
    stats.cats = pets.filter(p => p.type === 'cat').length;
    stats.totalDiaries = diaries.length;
}

// 匯出資料
function exportData() {
    const data = { pets, notes, diaries, stats };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pet_farm_backup_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// 匯入資料
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.pets && data.diaries) {
                    localStorage.setItem('pets', JSON.stringify(data.pets));
                    localStorage.setItem('notes', JSON.stringify(data.notes || []));
                    localStorage.setItem('diaries', JSON.stringify(data.diaries));
                    localStorage.setItem('stats', JSON.stringify(data.stats || stats));
                    alert('匯入成功！網頁即將重新整理...');
                    location.reload();
                } else {
                    alert('檔案格式不正確');
                }
            } catch (err) {
                alert('匯入失敗：' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function saveAllData() {
    localStorage.setItem('pets', JSON.stringify(pets));
    localStorage.setItem('notes', JSON.stringify(notes));
    localStorage.setItem('diaries', JSON.stringify(diaries));
    localStorage.setItem('stats', JSON.stringify(stats));
}

function addPet(forcedType = null) {
    const type = forcedType || ['dog', 'cat'][Math.floor(Math.random() * 2)];
    const breeds = PET_BREEDS[type];
    const breed = breeds[Math.floor(Math.random() * breeds.length)];

    const newPet = {
        id: Date.now().toString(),
        type: type,
        breed: breed,
        addedAt: new Date().toISOString()
    };
    pets.push(newPet);
    if (type === 'dog') stats.dogs++;
    else stats.cats++;

    add3DPet(breed);
    saveAllData();
    updateUI();

    const emoji = PET_EMOJI[breed] || PET_EMOJI[type];
    alert(`🎉 恭喜獲得 ${BREED_NAMES[breed]} ${emoji}！`);
}

function add3DPet(breed) {
    const { group, legs, tail, tongue } = createPetModel(breed);
    let r = Math.random() * 200;
    let theta = Math.random() * Math.PI * 2;
    group.position.set(Math.cos(theta) * r, 0, Math.sin(theta) * r);

    scene.add(group);

    const petObj = {
        mesh: group,
        legs: legs,
        tail: tail,
        tongue: tongue,
        breed: breed,
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

    const type = ['dog', 'cat'][Math.floor(Math.random() * 2)];
    const breeds = PET_BREEDS[type];
    const breed = breeds[Math.floor(Math.random() * breeds.length)];

    diaries.unshift({
        id: Date.now().toString(),
        content: content,
        createdAt: new Date().toISOString(),
        petReward: breed
    });

    stats.totalDiaries++;
    addPet(type); // 這裡會自動選品種
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
    // 兼容舊資料與極致容錯：確保每個寵物都能載入
    pets.forEach(p => {
        const breed = p.breed || p.type || 'shiba';
        // 檢查 breed 是否存在於模型的定義中 (簡單檢查 breed 是否有效)
        const validBreeds = ['shiba', 'corgi', 'munchkin'];
        const finalBreed = validBreeds.includes(breed) ? breed : 'shiba';
        add3DPet(finalBreed);
    });
    updateUI();

    saveDiaryBtn.addEventListener('click', saveDiary);
    addNoteBtn.addEventListener('click', addNote);
    noteInput.addEventListener('keypress', e => e.key === 'Enter' && addNote());

    // 綁定同步按鈕 (假設我們在 index.html 加上了 ID)
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportData);
    if (importBtn) importBtn.addEventListener('click', importData);
}

window.deleteNote = deleteNote;
window.completeNote = completeNote;
window.deleteDiary = deleteDiary;
document.addEventListener('DOMContentLoaded', initApp);
