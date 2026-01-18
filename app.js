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
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 1000, 10);

    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 80;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 地面
    const groundGeometry = new THREE.PlaneGeometry(200, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.z = -50;
    scene.add(ground);

    // 光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(100, 100, 50);
    scene.add(directionalLight);

    function animate() {
        requestAnimationFrame(animate);

        petObjects.forEach(petObj => {
            if (petObj.walking) {
                petObj.mesh.position.x += petObj.velocityX;
                petObj.mesh.position.y += petObj.velocityY;

                if (Math.abs(petObj.mesh.position.x) > 90) petObj.velocityX *= -1;
                if (Math.abs(petObj.mesh.position.y) > 40) petObj.velocityY *= -1;

                if (Math.random() < 0.01) {
                    petObj.velocityX = (Math.random() - 0.5) * 0.5;
                    petObj.velocityY = (Math.random() - 0.5) * 0.5;
                }

                petObj.mesh.rotation.x += 0.01;
                petObj.mesh.rotation.y += 0.02;
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

// 建立 3D 寵物模型
function createPetModel(type) {
    let group = new THREE.Group();

    if (type === 'dog') {
        const bodyGeometry = new THREE.BoxGeometry(20, 15, 20);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xD2691E });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);

        const headGeometry = new THREE.BoxGeometry(12, 12, 12);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(12, 5, 0);
        group.add(head);

        const earGeometry = new THREE.BoxGeometry(5, 10, 5);
        const ear1 = new THREE.Mesh(earGeometry, bodyMaterial);
        ear1.position.set(8, 15, -5);
        group.add(ear1);
        const ear2 = new THREE.Mesh(earGeometry, bodyMaterial);
        ear2.position.set(8, 15, 5);
        group.add(ear2);

        const legGeometry = new THREE.BoxGeometry(5, 12, 5);
        for (let i = -1; i <= 1; i += 2) {
            for (let j = -1; j <= 1; j += 2) {
                const leg = new THREE.Mesh(legGeometry, bodyMaterial);
                leg.position.set(i * 6, -10, j * 8);
                group.add(leg);
            }
        }
    } else {
        const bodyGeometry = new THREE.BoxGeometry(16, 12, 18);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xFF8C42 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);

        const headGeometry = new THREE.BoxGeometry(10, 10, 10);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(10, 4, 0);
        group.add(head);

        const earGeometry = new THREE.ConeGeometry(4, 8, 4);
        const ear1 = new THREE.Mesh(earGeometry, bodyMaterial);
        ear1.position.set(6, 12, -4);
        group.add(ear1);
        const ear2 = new THREE.Mesh(earGeometry, bodyMaterial);
        ear2.position.set(6, 12, 4);
        group.add(ear2);

        const tailGeometry = new THREE.BoxGeometry(3, 3, 15);
        const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        tail.position.set(-10, 0, 10);
        tail.rotation.z = 0.3;
        group.add(tail);

        const legGeometry = new THREE.BoxGeometry(4, 10, 4);
        for (let i = -1; i <= 1; i += 2) {
            for (let j = -1; j <= 1; j += 2) {
                const leg = new THREE.Mesh(legGeometry, bodyMaterial);
                leg.position.set(i * 5, -9, j * 7);
                group.add(leg);
            }
        }
    }

    return group;
}

function add3DPet(petType) {
    const mesh = createPetModel(petType);
    mesh.position.x = (Math.random() - 0.5) * 150;
    mesh.position.y = (Math.random() - 0.5) * 60;
    mesh.position.z = 0;

    scene.add(mesh);

    const petObj = {
        mesh: mesh,
        type: petType,
        walking: true,
        velocityX: (Math.random() - 0.5) * 0.5,
        velocityY: (Math.random() - 0.5) * 0.5
    };

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
