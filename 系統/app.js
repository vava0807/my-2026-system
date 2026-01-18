// 等待 Firebase 初始化
if (typeof window.db === 'undefined') {
    console.error('Firebase 尚未初始化');
}

// Firestore 引用
const { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    deleteDoc, 
    doc, 
    updateDoc, 
    setDoc, 
    getDoc,
    where,
    limit
} = window.firestoreFunctions;

const db = window.db;

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
const PET_TYPES = ['🐶', '🐱'];

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

// 初始化應用
async function initApp() {
    await loadStats();
    await loadPets();
    await loadNotes();
    await loadDiaries();
    checkMissedDays();
    updateUI();
}

// 載入統計數據
async function loadStats() {
    try {
        const statsDoc = await getDoc(doc(db, 'stats', 'global'));
        if (statsDoc.exists()) {
            stats = statsDoc.data();
            // 轉換 Firestore Timestamp 為 Date
            if (stats.lastEntryDate && stats.lastEntryDate.toDate) {
                stats.lastEntryDate = stats.lastEntryDate.toDate();
            }
        } else {
            await setDoc(doc(db, 'stats', 'global'), stats);
        }
    } catch (error) {
        console.error('載入統計數據失敗:', error);
    }
}

// 儲存統計數據
async function saveStats() {
    try {
        await setDoc(doc(db, 'stats', 'global'), stats);
    } catch (error) {
        console.error('儲存統計數據失敗:', error);
    }
}

// 載入寵物
async function loadPets() {
    try {
        const petsQuery = query(collection(db, 'pets'), orderBy('createdAt', 'asc'));
        const querySnapshot = await getDocs(petsQuery);
        pets = [];
        querySnapshot.forEach((doc) => {
            pets.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error('載入寵物失敗:', error);
    }
}

// 新增寵物
async function addPet() {
    try {
        const petType = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
        const newPet = {
            type: petType,
            createdAt: new Date()
        };
        
        const docRef = await addDoc(collection(db, 'pets'), newPet);
        pets.push({ id: docRef.id, ...newPet });
        
        // 更新統計
        if (petType === '🐶') {
            stats.dogs++;
        } else {
            stats.cats++;
        }
        
        await saveStats();
        updateUI();
        
        // 顯示獲得寵物的動畫
        showPetReward(petType);
    } catch (error) {
        console.error('新增寵物失敗:', error);
        alert('新增寵物失敗，請重試！');
    }
}

// 移除寵物（懲罰機制）
async function removePet() {
    if (pets.length === 0) return;
    
    try {
        // 隨機移除一隻寵物
        const randomIndex = Math.floor(Math.random() * pets.length);
        const petToRemove = pets[randomIndex];
        
        await deleteDoc(doc(db, 'pets', petToRemove.id));
        
        // 更新統計
        if (petToRemove.type === '🐶') {
            stats.dogs = Math.max(0, stats.dogs - 1);
        } else {
            stats.cats = Math.max(0, stats.cats - 1);
        }
        
        pets.splice(randomIndex, 1);
        await saveStats();
        updateUI();
        
        alert(`😢 因為太久沒寫日記，${petToRemove.type} 離開了農場...`);
    } catch (error) {
        console.error('移除寵物失敗:', error);
    }
}

// 載入筆記
async function loadNotes() {
    try {
        const notesQuery = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(notesQuery);
        notes = [];
        querySnapshot.forEach((doc) => {
            notes.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error('載入筆記失敗:', error);
    }
}

// 新增筆記
async function addNote() {
    const content = noteInput.value.trim();
    if (!content) {
        alert('請輸入筆記內容！');
        return;
    }
    
    try {
        const newNote = {
            content: content,
            createdAt: new Date()
        };
        
        const docRef = await addDoc(collection(db, 'notes'), newNote);
        notes.unshift({ id: docRef.id, ...newNote });
        
        noteInput.value = '';
        updateUI();
    } catch (error) {
        console.error('新增筆記失敗:', error);
        alert('新增筆記失敗，請重試！');
    }
}

// 刪除筆記
async function deleteNote(noteId) {
    try {
        await deleteDoc(doc(db, 'notes', noteId));
        notes = notes.filter(note => note.id !== noteId);
        updateUI();
    } catch (error) {
        console.error('刪除筆記失敗:', error);
        alert('刪除筆記失敗，請重試！');
    }
}

// 載入日記
async function loadDiaries() {
    try {
        const diariesQuery = query(collection(db, 'diaries'), orderBy('createdAt', 'desc'), limit(20));
        const querySnapshot = await getDocs(diariesQuery);
        diaries = [];
        querySnapshot.forEach((doc) => {
            diaries.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error('載入日記失敗:', error);
    }
}

// 儲存日記
async function saveDiary() {
    const content = diaryContent.value.trim();
    if (!content) {
        alert('請輸入日記內容！');
        return;
    }
    
    // 檢查今天是否已經寫過日記
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayDiary = diaries.find(diary => {
        const diaryDate = diary.createdAt.toDate ? diary.createdAt.toDate() : diary.createdAt;
        const diaryDay = new Date(diaryDate);
        diaryDay.setHours(0, 0, 0, 0);
        return diaryDay.getTime() === today.getTime();
    });
    
    if (todayDiary) {
        alert('今天已經寫過日記囉！明天再來吧 😊');
        return;
    }
    
    try {
        const petType = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
        
        const newDiary = {
            content: content,
            createdAt: new Date(),
            petReward: petType
        };
        
        const docRef = await addDoc(collection(db, 'diaries'), newDiary);
        diaries.unshift({ id: docRef.id, ...newDiary });
        
        // 更新統計
        stats.totalDiaries++;
        stats.lastEntryDate = new Date();
        await saveStats();
        
        // 新增寵物
        await addPet();
        
        diaryContent.value = '';
        updateUI();
        
        alert(`🎉 日記儲存成功！你獲得了一隻 ${petType}！`);
    } catch (error) {
        console.error('儲存日記失敗:', error);
        alert('儲存日記失敗，請重試！');
    }
}

// 檢查是否連續3天沒寫日記
function checkMissedDays() {
    if (!stats.lastEntryDate) return;
    
    const now = new Date();
    const lastEntry = stats.lastEntryDate instanceof Date ? stats.lastEntryDate : new Date(stats.lastEntryDate);
    const daysDiff = Math.floor((now - lastEntry) / (1000 * 60 * 60 * 24));
    
    if (daysDiff >= 3 && pets.length > 0) {
        // 每超過3天就移除一隻寵物
        const petsToRemove = Math.floor(daysDiff / 3);
        for (let i = 0; i < petsToRemove && pets.length > 0; i++) {
            removePet();
        }
    }
    
    // 顯示警告
    if (daysDiff >= 1 && daysDiff < 3) {
        warningText.style.display = 'block';
        daysSinceLastEntry.textContent = daysDiff;
    } else {
        warningText.style.display = 'none';
    }
}

// 更新UI
function updateUI() {
    // 更新統計數字
    dogCount.textContent = stats.dogs;
    catCount.textContent = stats.cats;
    totalDiaries.textContent = stats.totalDiaries;
    
    // 更新寵物容器
    petContainer.innerHTML = '';
    if (pets.length === 0) {
        petContainer.innerHTML = '<div class="empty-state"><p>🌱</p><p>還沒有寵物，快寫日記來獲得吧！</p></div>';
    } else {
        pets.forEach((pet, index) => {
            const petElement = document.createElement('div');
            petElement.className = 'pet';
            petElement.textContent = pet.type;
            petElement.style.animationDelay = `${index * 0.1}s`;
            petElement.title = `可愛的${pet.type === '🐶' ? '狗狗' : '貓咪'}`;
            petContainer.appendChild(petElement);
        });
    }
    
    // 更新筆記列表
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
    
    // 更新日記歷史
    diaryHistory.innerHTML = '';
    if (diaries.length === 0) {
        diaryHistory.innerHTML = '<div class="empty-state"><p>📖</p><p>還沒有日記，開始寫第一篇吧！</p></div>';
    } else {
        diaries.forEach(diary => {
            const diaryEntry = document.createElement('div');
            diaryEntry.className = 'diary-entry';
            
            const date = diary.createdAt.toDate ? diary.createdAt.toDate() : new Date(diary.createdAt);
            const dateStr = date.toLocaleDateString('zh-TW', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
            });
            
            diaryEntry.innerHTML = `
                <div class="diary-entry-date">
                    <span>📅 ${dateStr}</span>
                    <span class="pet-reward">獲得: ${diary.petReward}</span>
                </div>
                <div class="diary-entry-content">${diary.content}</div>
            `;
            diaryHistory.appendChild(diaryEntry);
        });
    }
}

// 顯示寵物獎勵動畫
function showPetReward(petType) {
    const reward = document.createElement('div');
    reward.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 5em;
        z-index: 1000;
        animation: rewardPop 1s ease-out forwards;
    `;
    reward.textContent = petType;
    document.body.appendChild(reward);
    
    // 添加動畫樣式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes rewardPop {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.2);
                opacity: 1;
            }
            100% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
        reward.remove();
        style.remove();
    }, 1000);
}

// 事件監聽器
saveDiaryBtn.addEventListener('click', saveDiary);
addNoteBtn.addEventListener('click', addNote);

noteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addNote();
    }
});

// 將 deleteNote 暴露到全域作用域
window.deleteNote = deleteNote;

// 初始化應用
initApp();
