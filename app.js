// 使用 LocalStorage 作為數據存儲

// Three.js 3D 場景
let scene, camera, renderer;
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
const diaryHistory = document.getElementById('diaryHistory');
const warningText = document.getElementById('warningText');
const daysSinceLastEntry = document.getElementById('daysSinceLastEntry');

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
    // 移除 scene.background 讓 CSS 背景透出來
    // scene.background = new THREE.Color(0x87CEEB);
    // scene.fog = new THREE.Fog(0x87CEEB, 1000, 10);

    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 100; // 稍微退後一點，確保看到更多寵物

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // 開啟 alpha 讓背景透明
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.id = 'threeCanvas'; // 設定 ID 以套用 CSS
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 地面
    const groundGeometry = new THREE.PlaneGeometry(200, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.z = -50;
    scene.add(ground);

    // 光源 - 增加強度和陰影感
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(50, 100, 50);
    scene.add(directionalLight);

    // 裝飾場景：增加一些小樹
    for (let i = 0; i < 15; i++) {
        createTree();
    }

    function animate() {
        requestAnimationFrame(animate);
        const time = Date.now() * 0.005;

        petObjects.forEach(petObj => {
            if (petObj.walking) {
                // 移動位置
                petObj.mesh.position.x += petObj.velocityX;
                petObj.mesh.position.y += petObj.velocityY;

                // 邊界檢查與轉向
                if (Math.abs(petObj.mesh.position.x) > 150) {
                    petObj.velocityX *= -1;
                    updatePetRotation(petObj);
                }
                if (Math.abs(petObj.mesh.position.y) > 80) {
                    petObj.velocityY *= -1;
                    updatePetRotation(petObj);
                }

                // 隨機轉向
                if (Math.random() < 0.01) {
                    petObj.velocityX = (Math.random() - 0.5) * 0.6;
                    petObj.velocityY = (Math.random() - 0.5) * 0.6;
                    updatePetRotation(petObj);
                }

                // 走路動畫：腳擺動 + 身體上下跳動
                const walkSpeed = 5;
                const swing = Math.sin(time * walkSpeed) * 0.5;

                petObj.legs.forEach((leg, index) => {
                    // 對角線的腳同步
                    const offset = (index === 0 || index === 3) ? 1 : -1;
                    leg.rotation.x = swing * offset;
                });

                // 身體上下輕微跳動
                petObj.mesh.position.z = Math.abs(Math.sin(time * walkSpeed)) * 2;
            }
        });

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    });
}

// 更新寵物朝向
function updatePetRotation(petObj) {
    const angle = Math.atan2(petObj.velocityY, petObj.velocityX);
    // Three.js 預設朝向是 X 軸，我們需要旋轉使其符合移動方向
    petObj.mesh.rotation.z = angle;
    petObj.mesh.rotation.x = Math.PI / 2; // 站立，而不是趴在地面
}

// 建立裝飾用的樹
function createTree() {
    const group = new THREE.Group();

    // 樹幹
    const trunkGeom = new THREE.CylinderGeometry(2, 2, 8, 8);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.rotation.x = Math.PI / 2;
    group.add(trunk);

    // 樹冠
    const leavesGeom = new THREE.ConeGeometry(8, 16, 8);
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeom, leavesMat);
    leaves.position.y = 8;
    leaves.rotation.x = Math.PI / 2;
    group.add(leaves);

    group.position.x = (Math.random() - 0.5) * 300;
    group.position.y = (Math.random() - 0.5) * 200;
    group.position.z = -5;

    scene.add(group);
}

// 建立 3D 寵物模型
function createPetModel(type) {
    const group = new THREE.Group();
    const legs = [];

    const bodyMat = new THREE.MeshPhongMaterial({ color: type === 'dog' ? 0xD2691E : 0xFF8C42 });

    // 身體
    const bodyGeom = new THREE.BoxGeometry(12, 8, 8);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.z = 6;
    group.add(body);

    // 頭部
    const headGeom = new THREE.BoxGeometry(7, 7, 7);
    const head = new THREE.Mesh(headGeom, bodyMat);
    head.position.set(8, 0, 10);
    group.add(head);

    // 眼睛
    const eyeGeom = new THREE.SphereGeometry(0.8, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eye1 = new THREE.Mesh(eyeGeom, eyeMat);
    eye1.position.set(11, 2, 11);
    group.add(eye1);
    const eye2 = new THREE.Mesh(eyeGeom, eyeMat);
    eye2.position.set(11, -2, 11);
    group.add(eye2);

    // 腿部
    const legGeom = new THREE.BoxGeometry(2, 2, 6);
    const legPositions = [
        { x: 4, y: 3 }, { x: 4, y: -3 },
        { x: -4, y: 3 }, { x: -4, y: -3 }
    ];

    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeom, bodyMat);
        leg.position.set(pos.x, pos.y, 2);
        group.add(leg);
        legs.push(leg);
    });

    return { group, legs };
}

function add3DPet(petType) {
    const { group, legs } = createPetModel(petType);
    group.position.x = (Math.random() - 0.5) * 200;
    group.position.y = (Math.random() - 0.5) * 100;
    group.position.z = 0;

    scene.add(group);

    const petObj = {
        mesh: group,
        legs: legs,
        type: petType,
        walking: true,
        velocityX: (Math.random() - 0.5) * 0.6,
        velocityY: (Math.random() - 0.5) * 0.6
    };

    updatePetRotation(petObj);
    petObjects.push(petObj);
}

// 從 LocalStorage 載入數據
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

function addPet() {
    const petType = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
    const newPet = {
        id: Date.now().toString(),
        type: petType,
        createdAt: new Date().toISOString()
    };

    pets.push(newPet);

    if (petType === 'dog') {
        stats.dogs++;
    } else {
        stats.cats++;
    }

    saveAllData();
    if (scene) add3DPet(petType);
    updateUI();
}

function removePet() {
    if (pets.length === 0) return;

    const randomIndex = Math.floor(Math.random() * pets.length);
    const petToRemove = pets[randomIndex];

    if (petToRemove.type === 'dog') {
        stats.dogs = Math.max(0, stats.dogs - 1);
    } else {
        stats.cats = Math.max(0, stats.cats - 1);
    }

    pets.splice(randomIndex, 1);
    saveAllData();

    if (scene && petObjects.length > randomIndex) {
        scene.remove(petObjects[randomIndex].mesh);
        petObjects.splice(randomIndex, 1);
    }

    updateUI();
    alert(`😢 因為太久沒寫日記，${petToRemove.type === 'dog' ? '🐶' : '🐱'} 離開了農場...`);
}

function addNote() {
    const content = noteInput.value.trim();
    if (!content) {
        alert('請輸入筆記內容！');
        return;
    }

    const newNote = {
        id: Date.now().toString(),
        content: content,
        createdAt: new Date().toISOString()
    };

    notes.unshift(newNote);

    noteInput.value = '';
    saveAllData();
    updateUI();
}

function deleteNote(noteId) {
    notes = notes.filter(note => note.id !== noteId);
    saveAllData();
    updateUI();
}

function saveDiary() {
    const content = diaryContent.value.trim();
    if (!content) {
        alert('請輸入日記內容！');
        return;
    }

    const petType = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];

    const newDiary = {
        id: Date.now().toString(),
        content: content,
        createdAt: new Date().toISOString(),
        petReward: petType,
        dateStr: new Date().toDateString()
    };

    diaries.unshift(newDiary);

    stats.totalDiaries++;
    stats.lastEntryDate = new Date().toISOString();

    addPet();

    diaryContent.value = '';
    saveAllData();
    updateUI();

    alert(`🎉 日記儲存成功！你獲得了一隻 ${PET_EMOJI[petType]}！`);
}

function checkMissedDays() {
    // 移除所有限制，寵物和日記無限制
    if (warningText) {
        warningText.style.display = 'none';
    }
}

function updateUI() {
    dogCount.textContent = stats.dogs;
    catCount.textContent = stats.cats;
    totalDiaries.textContent = stats.totalDiaries;

    notesList.innerHTML = '';
    if (notes.length === 0) {
        notesList.innerHTML = '<div class="empty-state"><p>還沒有筆記</p></div>';
    } else {
        notes.forEach(note => {
            const noteItem = document.createElement('li');
            noteItem.className = 'note-item';
            noteItem.innerHTML = `
                <span>${note.content}</span>
                <button onclick="deleteNote('${note.id}')">🗑️ 刪除</button>
            `;
            notesList.appendChild(noteItem);
        });
    }

    diaryHistory.innerHTML = '';
    if (diaries.length === 0) {
        diaryHistory.innerHTML = '<div class="empty-state"><p>📖</p><p>還沒有日記，開始寫第一篇吧！</p></div>';
    } else {
        diaries.forEach(diary => {
            const diaryEntry = document.createElement('div');
            diaryEntry.className = 'diary-entry';

            const date = new Date(diary.createdAt);
            const dateStr = date.toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
            });

            diaryEntry.innerHTML = `
                <div class="diary-entry-date">
                    <span>📅 ${dateStr}</span>
                    <span class="pet-reward">獲得: ${PET_EMOJI[diary.petReward]}</span>
                </div>
                <div class="diary-entry-content">${diary.content}</div>
            `;
            diaryHistory.appendChild(diaryEntry);
        });
    }
}

window.deleteNote = deleteNote;

function initApp() {
    console.log('Initializing app...');
    loadData();
    checkMissedDays();

    setTimeout(() => {
        if (!petContainer) {
            console.error('petContainer not found!');
            return;
        }
        initThreeJS();
        pets.forEach(pet => {
            add3DPet(pet.type);
        });
        updateUI();
    }, 100);

    if (saveDiaryBtn) {
        saveDiaryBtn.addEventListener('click', () => {
            console.log('Save diary button clicked');
            saveDiary();
        });
    } else {
        console.error('saveDiaryBtn not found!');
    }

    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', addNote);
    }

    if (noteInput) {
        noteInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addNote();
        });
    }
}

document.addEventListener('DOMContentLoaded', initApp);
