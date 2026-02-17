const DB_NAME = 'CoupleAlbumDB';
const DB_VERSION = 1;
const STORE_NAME = 'appData';

let db = null;

let appData = {
    names: ['', ''],
    loveDate: '',
    slogan: '',
    avatars: ['', ''],
    photos: [],
    events: [],
    story: '',
    messages: [],
    wishes: [],
    customMusic: '',
    musicPlaying: false,
    travelCount: 0,
    anniversaryDates: []
};

let currentPhotoIndex = 0;
let currentCategory = 'all';
let currentLayout = 'grid';
let countdownInterval = null;

function init() {
    initDB().then(() => {
        loadData();
        initEventListeners();
        updateLoveCounter();
        renderGallery();
        renderTimeline();
        renderMessages();
        renderWishes();
        updateStats();
        updateCountdown();
        initScrollAnimations();
        showToast('欢迎回来！', 'info');
    }).catch(error => {
        console.error('数据库初始化失败:', error);
        showToast('数据库初始化失败，请刷新页面重试', 'error');
    });
}

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('数据库打开失败');
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('数据库打开成功');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                objectStore.createIndex('id', 'id', { unique: true });
                console.log('数据库创建成功');
            }
        };
    });
}

function loadData() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.get('main');
        
        request.onsuccess = () => {
            if (request.result) {
                appData = { ...appData, ...request.result };
                console.log('数据加载成功');
            }
            
            document.getElementById('name1').value = appData.names[0];
            document.getElementById('name2').value = appData.names[1];
            document.getElementById('loveDate').value = appData.loveDate;
            document.getElementById('slogan').value = appData.slogan;
            document.getElementById('ourStory').value = appData.story;
            
            if (appData.avatars[0]) {
                document.getElementById('avatar1').src = appData.avatars[0];
            }
            if (appData.avatars[1]) {
                document.getElementById('avatar2').src = appData.avatars[1];
            }
            
            if (appData.customMusic) {
                const music = document.getElementById('bgMusic');
                music.src = appData.customMusic;
            }
            
            if (appData.musicPlaying) {
                document.getElementById('musicControl').classList.add('playing');
                document.getElementById('musicControl').setAttribute('aria-pressed', 'true');
            }
            
            resolve();
        };
        
        request.onerror = () => {
            console.error('数据加载失败:', request.error);
            showToast('数据加载失败，将使用默认设置', 'error');
            reject(request.error);
        };
    });
}

function saveData() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        
        appData.names[0] = document.getElementById('name1').value;
        appData.names[1] = document.getElementById('name2').value;
        appData.loveDate = document.getElementById('loveDate').value;
        appData.slogan = document.getElementById('slogan').value;
        appData.story = document.getElementById('ourStory').value;
        
        const data = {
            id: 'main',
            ...appData
        };
        
        const request = objectStore.put(data);
        
        request.onsuccess = () => {
            console.log('数据保存成功');
            resolve();
        };
        
        request.onerror = () => {
            console.error('数据保存失败:', request.error);
            showToast('数据保存失败: ' + request.error.message, 'error');
            reject(request.error);
        };
    });
}

function initEventListeners() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.querySelector('.nav-menu');
    
    navToggle.addEventListener('click', () => {
        const isActive = navMenu.classList.toggle('active');
        navToggle.classList.toggle('active', isActive);
        navToggle.setAttribute('aria-expanded', isActive);
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
        });
    });

    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
        } else {
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        }
    });

    document.getElementById('avatar1Input').addEventListener('change', (e) => handleAvatarUpload(e, 0));
    document.getElementById('avatar2Input').addEventListener('change', (e) => handleAvatarUpload(e, 1));

    document.getElementById('name1').addEventListener('input', debounce(() => saveData(), 500));
    document.getElementById('name2').addEventListener('input', debounce(() => saveData(), 500));
    document.getElementById('loveDate').addEventListener('change', () => {
        saveData();
        updateLoveCounter();
        updateCountdown();
    });
    document.getElementById('slogan').addEventListener('input', debounce(() => saveData(), 500));
    document.getElementById('ourStory').addEventListener('input', debounce(() => saveData(), 500));

    document.getElementById('gridBtn').addEventListener('click', () => switchLayout('grid'));
    document.getElementById('waterfallBtn').addEventListener('click', () => switchLayout('waterfall'));

    document.getElementById('uploadBtn').addEventListener('click', () => {
        document.getElementById('photoInput').click();
    });

    document.getElementById('photoInput').addEventListener('change', handlePhotoUpload);

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => filterCategory(btn.dataset.category));
    });

    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    document.getElementById('lightboxPrev').addEventListener('click', () => navigatePhoto(-1));
    document.getElementById('lightboxNext').addEventListener('click', () => navigatePhoto(1));

    document.getElementById('addEventBtn').addEventListener('click', () => {
        document.getElementById('eventModal').classList.add('active');
        document.getElementById('eventDate').focus();
    });

    document.getElementById('eventModalClose').addEventListener('click', () => {
        document.getElementById('eventModal').classList.remove('active');
    });

    document.getElementById('submitEvent').addEventListener('click', addEvent);

    document.getElementById('photoModalClose').addEventListener('click', () => {
        document.getElementById('photoModal').classList.remove('active');
    });

    document.getElementById('savePhoto').addEventListener('click', savePhotoEdit);
    document.getElementById('deletePhoto').addEventListener('click', deletePhoto);

    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('addWishBtn').addEventListener('click', addWish);

    document.getElementById('musicControl').addEventListener('click', toggleMusic);
    document.getElementById('musicUploadBtn').addEventListener('click', () => {
        document.getElementById('musicInput').click();
    });
    document.getElementById('musicInput').addEventListener('change', handleMusicUpload);

    document.addEventListener('mousemove', createHeartParticle);
    document.addEventListener('click', (e) => {
        if (e.target.closest('.lightbox') && !e.target.closest('.lightbox-content')) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (document.getElementById('lightbox').classList.contains('active')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') navigatePhoto(-1);
            if (e.key === 'ArrowRight') navigatePhoto(1);
        }
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateLoveCounter() {
    const loveDate = new Date(appData.loveDate);
    const today = new Date();
    
    if (appData.loveDate && !isNaN(loveDate.getTime())) {
        const diffTime = Math.abs(today - loveDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        document.getElementById('loveDays').textContent = diffDays;
        document.getElementById('totalDays').textContent = diffDays;
    }
}

function handleAvatarUpload(event, index) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('图片大小不能超过5MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        appData.avatars[index] = e.target.result;
        document.getElementById(`avatar${index + 1}`).src = e.target.result;
        saveData().then(() => {
            showToast('头像更新成功', 'success');
        });
    };
    reader.onerror = () => {
        showToast('头像上传失败', 'error');
    };
    reader.readAsDataURL(file);
}

function switchLayout(layout) {
    currentLayout = layout;
    const galleryContainer = document.getElementById('galleryContainer');
    galleryContainer.className = `gallery-container ${layout}`;
    
    document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
    document.getElementById(`${layout}Btn`).classList.add('active');
    document.getElementById(`${layout}Btn`).setAttribute('aria-pressed', 'true');
}

function handlePhotoUpload(event) {
    const files = event.target.files;
    if (!files.length) return;
    
    let uploadedCount = 0;
    let failedCount = 0;
    
    Array.from(files).forEach(file => {
        if (file.size > 20 * 1024 * 1024) {
            failedCount++;
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const photo = {
                id: Date.now() + Math.random(),
                src: e.target.result,
                description: '',
                date: new Date().toISOString().split('T')[0],
                location: '',
                category: 'daily'
            };
            appData.photos.unshift(photo);
            uploadedCount++;
            
            if (uploadedCount + failedCount === files.length) {
                saveData().then(() => {
                    renderGallery();
                    updateStats();
                    if (uploadedCount > 0) {
                        showToast(`成功上传${uploadedCount}张照片`, 'success');
                    }
                    if (failedCount > 0) {
                        showToast(`${failedCount}张照片过大（超过20MB）`, 'error');
                    }
                });
            }
        };
        reader.onerror = () => {
            failedCount++;
        };
        reader.readAsDataURL(file);
    });
    event.target.value = '';
}

function filterCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    document.querySelector(`[data-category="${category}"]`).setAttribute('aria-selected', 'true');
    renderGallery();
}

function renderGallery() {
    const container = document.getElementById('galleryContainer');
    const filteredPhotos = currentCategory === 'all' 
        ? appData.photos 
        : appData.photos.filter(p => p.category === currentCategory);
    
    if (filteredPhotos.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #999;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📷</div>
                <p>还没有照片，点击"上传照片"添加第一张吧！</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredPhotos.map((photo, index) => `
        <div class="gallery-item" data-index="${index}" role="listitem" tabindex="0">
            <img src="${photo.src}" alt="${photo.description || '照片'}" loading="lazy">
            <div class="photo-info">
                <h4>${photo.description || '无描述'}</h4>
                <p>${photo.date} ${photo.location ? '· ' + photo.location : ''}</p>
            </div>
            <div class="photo-actions">
                <button onclick="editPhoto(${appData.photos.indexOf(photo)})" aria-label="编辑照片">✏️</button>
            </div>
        </div>
    `).join('');
    
    container.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.photo-actions')) {
                const index = parseInt(item.dataset.index);
                openLightbox(index);
            }
        });
        item.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.target.closest('.photo-actions')) {
                const index = parseInt(item.dataset.index);
                openLightbox(index);
            }
        });
    });
}

function editPhoto(index) {
    const photo = appData.photos[index];
    currentPhotoIndex = index;
    
    document.getElementById('photoDescription').value = photo.description;
    document.getElementById('photoDate').value = photo.date;
    document.getElementById('photoLocation').value = photo.location;
    document.getElementById('photoCategory').value = photo.category;
    
    document.getElementById('photoModal').classList.add('active');
}

function savePhotoEdit() {
    const photo = appData.photos[currentPhotoIndex];
    photo.description = document.getElementById('photoDescription').value;
    photo.date = document.getElementById('photoDate').value;
    photo.location = document.getElementById('photoLocation').value;
    photo.category = document.getElementById('photoCategory').value;
    
    saveData().then(() => {
        renderGallery();
        updateStats();
        document.getElementById('photoModal').classList.remove('active');
        showToast('照片信息已更新', 'success');
    });
}

function deletePhoto() {
    if (confirm('确定要删除这张照片吗？此操作无法撤销。')) {
        appData.photos.splice(currentPhotoIndex, 1);
        saveData().then(() => {
            renderGallery();
            updateStats();
            document.getElementById('photoModal').classList.remove('active');
            showToast('照片已删除', 'info');
        });
    }
}

function openLightbox(index) {
    const filteredPhotos = currentCategory === 'all' 
        ? appData.photos 
        : appData.photos.filter(p => p.category === currentCategory);
    
    currentPhotoIndex = index;
    const photo = filteredPhotos[index];
    
    document.getElementById('lightboxImg').src = photo.src;
    document.getElementById('lightboxDescription').textContent = photo.description || '';
    document.getElementById('lightboxMeta').textContent = `${photo.date} ${photo.location ? '· ' + photo.location : ''}`;
    
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = '';
}

function navigatePhoto(direction) {
    const filteredPhotos = currentCategory === 'all' 
        ? appData.photos 
        : appData.photos.filter(p => p.category === currentCategory);
    
    currentPhotoIndex = (currentPhotoIndex + direction + filteredPhotos.length) % filteredPhotos.length;
    const photo = filteredPhotos[currentPhotoIndex];
    
    document.getElementById('lightboxImg').src = photo.src;
    document.getElementById('lightboxDescription').textContent = photo.description || '';
    document.getElementById('lightboxMeta').textContent = `${photo.date} ${photo.location ? '· ' + photo.location : ''}`;
}

function addEvent() {
    const date = document.getElementById('eventDate').value;
    const title = document.getElementById('eventTitle').value;
    const description = document.getElementById('eventDescription').value;
    const imageInput = document.getElementById('eventImage');
    
    if (!date || !title) {
        showToast('请填写日期和标题', 'error');
        return;
    }
    
    const event = {
        id: Date.now(),
        date,
        title,
        description,
        image: ''
    };
    
    const processEvent = () => {
        appData.events.push(event);
        appData.events.sort((a, b) => new Date(b.date) - new Date(a.date));
        saveData().then(() => {
            renderTimeline();
            updateStats();
            updateCountdown();
            document.getElementById('eventModal').classList.remove('active');
            clearEventForm();
            showToast('时间节点添加成功', 'success');
        });
    };
    
    if (imageInput.files[0]) {
        if (imageInput.files[0].size > 10 * 1024 * 1024) {
            showToast('图片大小不能超过10MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            event.image = e.target.result;
            processEvent();
        };
        reader.onerror = () => {
            showToast('图片上传失败', 'error');
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        processEvent();
    }
}

function clearEventForm() {
    document.getElementById('eventDate').value = '';
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventDescription').value = '';
    document.getElementById('eventImage').value = '';
}

function renderTimeline() {
    const container = document.getElementById('timelineContainer');
    
    if (appData.events.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem; color: #999;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
                <p>还没有时间节点，点击"添加节点"记录你们的美好时刻！</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appData.events.map((event, index) => `
        <div class="timeline-item" style="animation-delay: ${index * 0.1}s">
            <div class="timeline-content">
                <div class="timeline-date">${formatDate(event.date)}</div>
                <div class="timeline-title">${event.title}</div>
                ${event.description ? `<div class="timeline-description">${event.description}</div>` : ''}
                ${event.image ? `<img src="${event.image}" alt="${event.title}" class="timeline-image" loading="lazy">` : ''}
            </div>
        </div>
    `).join('');
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function updateStats() {
    document.getElementById('photoCount').textContent = appData.photos.length;
    document.getElementById('anniversaryCount').textContent = appData.events.length;
    
    const travelPhotos = appData.photos.filter(p => p.category === 'travel');
    const uniqueTravelDates = [...new Set(travelPhotos.map(p => p.date))];
    document.getElementById('travelCount').textContent = uniqueTravelDates.length;
    
    appData.travelCount = uniqueTravelDates.length;
    appData.anniversaryDates = appData.events.map(e => e.date);
    saveData();
}

function sendMessage() {
    const text = document.getElementById('messageText').value.trim();
    if (!text) {
        showToast('请输入留言内容', 'error');
        return;
    }
    
    const message = {
        id: Date.now(),
        text,
        time: new Date().toLocaleString('zh-CN'),
        likes: 0
    };
    
    appData.messages.unshift(message);
    saveData().then(() => {
        renderMessages();
        document.getElementById('messageText').value = '';
        showToast('留言发送成功', 'success');
    });
}

function renderMessages() {
    const container = document.getElementById('messagesContainer');
    
    if (appData.messages.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 2rem; color: #999;">
                <p>还没有留言，写下第一句悄悄话吧！</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appData.messages.map(message => `
        <div class="message-item" role="listitem">
            <div class="message-content">${escapeHtml(message.text)}</div>
            <div class="message-meta">
                <span>${message.time}</span>
                <div class="message-actions">
                    <button onclick="likeMessage(${message.id})" aria-label="点赞">❤️ ${message.likes}</button>
                    <button onclick="deleteMessage(${message.id})" aria-label="删除">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

function likeMessage(id) {
    const message = appData.messages.find(m => m.id === id);
    if (message) {
        message.likes++;
        saveData().then(() => {
            renderMessages();
        });
    }
}

function deleteMessage(id) {
    if (confirm('确定要删除这条留言吗？')) {
        appData.messages = appData.messages.filter(m => m.id !== id);
        saveData().then(() => {
            renderMessages();
            showToast('留言已删除', 'info');
        });
    }
}

function addWish() {
    const text = document.getElementById('wishText').value.trim();
    if (!text) {
        showToast('请输入愿望内容', 'error');
        return;
    }
    
    const wish = {
        id: Date.now(),
        text,
        completed: false
    };
    
    appData.wishes.push(wish);
    saveData().then(() => {
        renderWishes();
        document.getElementById('wishText').value = '';
        showToast('愿望添加成功', 'success');
    });
}

function renderWishes() {
    const container = document.getElementById('wishesContainer');
    
    if (appData.wishes.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 2rem; color: #999;">
                <p>还没有愿望，添加第一个共同愿望吧！</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appData.wishes.map(wish => `
        <div class="wish-item ${wish.completed ? 'completed' : ''}" role="listitem">
            <input type="checkbox" class="wish-checkbox" ${wish.completed ? 'checked' : ''} onchange="toggleWish(${wish.id})" aria-label="标记完成">
            <span class="wish-text">${escapeHtml(wish.text)}</span>
            <button class="wish-delete" onclick="deleteWish(${wish.id})" aria-label="删除愿望">✕</button>
        </div>
    `).join('');
}

function toggleWish(id) {
    const wish = appData.wishes.find(w => w.id === id);
    if (wish) {
        wish.completed = !wish.completed;
        saveData().then(() => {
            renderWishes();
            if (wish.completed) {
                showToast('愿望已完成！🎉', 'success');
            }
        });
    }
}

function deleteWish(id) {
    if (confirm('确定要删除这个愿望吗？')) {
        appData.wishes = appData.wishes.filter(w => w.id !== id);
        saveData().then(() => {
            renderWishes();
            showToast('愿望已删除', 'info');
        });
    }
}

function updateCountdown() {
    const container = document.getElementById('countdownContainer');
    const loveDate = new Date(appData.loveDate);
    
    if (isNaN(loveDate.getTime())) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 2rem; color: #999;">
                <p>请先设置恋爱起始日期</p>
            </div>
        `;
        return;
    }
    
    const today = new Date();
    const nextAnniversary = new Date(loveDate);
    nextAnniversary.setFullYear(today.getFullYear());
    
    if (nextAnniversary < today) {
        nextAnniversary.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = nextAnniversary - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const years = today.getFullYear() - loveDate.getFullYear();
    const months = today.getMonth() - loveDate.getMonth();
    const totalYears = months < 0 ? years - 1 : years;
    
    container.innerHTML = `
        <div class="countdown-item">
            <div class="countdown-title">💕 下一个恋爱周年</div>
            <div class="countdown-timer">${diffDays} 天</div>
            <div class="countdown-date">${formatDate(nextAnniversary.toISOString().split('T')[0])}</div>
        </div>
        <div class="countdown-item">
            <div class="countdown-title">🎊 已相爱</div>
            <div class="countdown-timer">${totalYears} 年</div>
            <div class="countdown-date">从 ${formatDate(appData.loveDate)} 开始</div>
        </div>
    `;
}

function handleMusicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 50 * 1024 * 1024) {
        showToast('音乐文件大小不能超过50MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        appData.customMusic = e.target.result;
        const music = document.getElementById('bgMusic');
        music.src = e.target.result;
        saveData().then(() => {
            showToast('背景音乐已更新', 'success');
            
            if (appData.musicPlaying) {
                music.play().catch(() => {
                    showToast('音乐播放失败，请重试', 'error');
                });
            }
        });
    };
    reader.onerror = () => {
        showToast('音乐上传失败', 'error');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function toggleMusic() {
    const music = document.getElementById('bgMusic');
    const control = document.getElementById('musicControl');
    
    if (appData.musicPlaying) {
        music.pause();
        control.classList.remove('playing');
        control.setAttribute('aria-pressed', 'false');
        appData.musicPlaying = false;
        showToast('音乐已暂停', 'info');
    } else {
        music.play().then(() => {
            control.classList.add('playing');
            control.setAttribute('aria-pressed', 'true');
            appData.musicPlaying = true;
            showToast('音乐开始播放', 'success');
        }).catch(() => {
            showToast('请先与页面交互才能播放音乐', 'error');
        });
    }
    
    saveData();
}

function createHeartParticle(e) {
    if (Math.random() > 0.97) {
        const heart = document.createElement('div');
        heart.className = 'heart-particle';
        heart.innerHTML = ['❤️', '💕', '💖', '💗', '💓'][Math.floor(Math.random() * 5)];
        heart.style.left = e.clientX + 'px';
        heart.style.top = e.clientY + 'px';
        document.body.appendChild(heart);
        
        setTimeout(() => {
            heart.remove();
        }, 2000);
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.timeline-item').forEach(item => {
        observer.observe(item);
    });
    
    const galleryObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.gallery-item').forEach((item, index) => {
        item.style.animationDelay = `${index * 0.05}s`;
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        galleryObserver.observe(item);
    });
}

setInterval(updateLoveCounter, 60000);

document.addEventListener('DOMContentLoaded', init);