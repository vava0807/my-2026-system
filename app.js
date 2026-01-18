// 使用 LocalStorage 作為數據存儲

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
function initApp() {
    loadData();
    checkMissedDays();
    updateUI();
    
    // 綁定事件
    saveDiaryBtn.addEventListener('click', saveDiary);
    addNoteBtn.addEventListener('click', addNote);
    noteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addNote();
    });
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

// 保存所有數據到 LocalStorage
function saveAllData() {
    localStorage.setItem('pets', JSON.stringify(pets));
    localStorage.setItem('notes', JSON.stringify(notes));
    localStorage.setItem('diaries', JSON.stringify(diaries));
    localStorage.setItem('stats', JSON.stringify(stats));
}


// 新增寵物
function addPet() {
    const petType = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
    const newPet = {
        id: Date.now().toString(),
        type: petType,
        createdAt: new Date().toISOString()
    };
    
    pets.push(newPet);
    
    // 更新統計
    if (petType === '🐶') {
        stats.dogs++;
    } else {
        stats.cats++;
    }
    
    saveAllData();
    updateUI();
}

// 移除寵物（懲罰機制）
function removePet() {
    if (pets.length === 0) return;
    
    // 隨機移除一隻寵物
    const randomIndex = Math.floor(Math.random() * pets.length);
    const petToRemove = pets[randomIndex];
    
    // 更新統計
    if (petToRemove.type === '🐶') {
        stats.dogs = Math.max(0, stats.dogs - 1);
    } else {
        stats.cats = Math.max(0, stats.cats - 1);
    }
    
    pets.splice(randomIndex, 1);
    saveAllData();
    updateUI();
    
    alert(`😢 因為太久沒寫日記，${petToRemove.type} 離開了農場...`);
}

// 新增筆記
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

// 刪除筆記
function deleteNote(noteId) {
    notes = notes.filter(note => note.id !== noteId);
    saveAllData();
    updateUI();
}

// 儲存日記
function saveDiary() {
    const content = diaryContent.value.trim();
    if (!content) {
        alert('請輸入日記內容！');
        return;
    }
    
    // 檢查今天是否已經寫過日記
    const today = new Date().toDateString();
    
    const todayDiary = diaries.find(diary => {
        const diaryDate = new Date(diary.createdAt).toDateString();
        return diaryDate === today;
    });
    
    if (todayDiary) {
        alert('今天已經寫過日記囉！明天再來吧 😊');
        return;
    }
    
    const petType = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
    
    const newDiary = {
        id: Date.now().toString(),
        content: content,
        createdAt: new Date().toISOString(),
        petReward: petType,
        dateStr: today
    };
    
    diaries.unshift(newDiary);
    
    // 更新統計
    stats.totalDiaries++;
    stats.lastEntryDate = new Date().toISOString();
    
    // 新增寵物
    addPet();
    
    diaryContent.value = '';
    saveAllData();
    updateUI();
    
    alert(`🎉 日記儲存成功！你獲得了一隻 ${petType}！`);
}

// 檢查是否連續3天沒寫日記
function checkMissedDays() {
    if (!stats.lastEntryDate) return;
    
    const now = new Date();
    const lastEntry = new Date(stats.lastEntryDate);
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
                    <span class="pet-reward">獲得: ${diary.petReward}</span>
                </div>
                <div class="diary-entry-content">${diary.content}</div>
            `;
            diaryHistory.appendChild(diaryEntry);
        });
    }
}

// 將 deleteNote 暴露到全域作用域
window.deleteNote = deleteNote;

// 初始化應用
initApp();
