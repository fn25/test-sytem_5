const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : `${window.location.origin}/api`;
let token = localStorage.getItem('token');
let currentUser = null;
let currentQuizId = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let timerInterval = null;
const socket = io();

function hideAllSections() {
    document.querySelectorAll('main > div').forEach(section => {
        section.style.display = 'none';
    });
}

function showHome() {
    hideAllSections();
    document.getElementById('homeSection').style.display = 'block';
}

function showRegister() {
    hideAllSections();
    document.getElementById('registerSection').style.display = 'block';
}

function showLogin() {
    hideAllSections();
    document.getElementById('loginSection').style.display = 'block';
}

function showJoinQuiz() {
    hideAllSections();
    document.getElementById('joinQuizSection').style.display = 'block';
}

function showCreateQuiz() {
    hideAllSections();
    document.getElementById('createQuizSection').style.display = 'block';
}

async function showMyQuizzes() {
    hideAllSections();
    document.getElementById('myQuizzesSection').style.display = 'block';
    
    try {
        const response = await fetch(`${API_URL}/quizzes/my-quizzes`, {
            headers: {
                'x-auth-token': token
            }
        });
        const quizzes = await response.json();
        
        const quizzesList = document.getElementById('quizzesList');
        quizzesList.innerHTML = '';
        
        quizzes.forEach(quiz => {
            const quizCard = document.createElement('div');
            quizCard.className = 'quiz-card';
            
            let actionButtons = '';
            if (quiz.status === 'pending' || quiz.status === 'finished') {
                actionButtons = `
                    <button onclick="makeQuizLive(${quiz.id})">Go Live</button>
                    <button onclick="openPresentation(${quiz.id}, '${quiz.title}', '${quiz.code}')">📺 Katta ekran</button>
                    <button onclick="editQuiz(${quiz.id})">Edit</button>
                    <button onclick="viewLeaderboard(${quiz.id})">View Results</button>
                `;
            } else if (quiz.status === 'live') {
                actionButtons = `
                    <button onclick="stopQuizLive(${quiz.id})" style="background: #f44336;">Stop Live</button>
                    <button onclick="openPresentation(${quiz.id}, '${quiz.title}', '${quiz.code}')">📺 Katta ekran</button>
                    <button onclick="viewLeaderboard(${quiz.id})">View Results</button>
                `;
            }
            
            quizCard.innerHTML = `
                <div>
                    <h3>${quiz.title}</h3>
                    <p>Code: <span class="quiz-code">${quiz.code}</span></p>
                </div>
                <div>
                    <span class="status ${quiz.status}">${quiz.status}</span>
                    ${actionButtons}
                </div>
            `;
            quizzesList.appendChild(quizCard);
        });
    } catch (error) {
        console.error('Error fetching quizzes:', error);
    }
}

async function register(event) {
    event.preventDefault();
    
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showLogin();
        } else {
            console.error('Registration failed:', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function login(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUser = payload.user;
            
            updateUIForLoggedInUser();
            showHome();
        } else {
            console.error('Login failed:', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function updateUIForLoggedInUser() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('userSection').style.display = 'block';
    
    if (currentUser.role === 'admin') {
        document.getElementById('createQuizBtn').style.display = 'inline-block';
        document.getElementById('myQuizzesBtn').style.display = 'inline-block';
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('userSection').style.display = 'none';
    document.getElementById('createQuizBtn').style.display = 'none';
    document.getElementById('myQuizzesBtn').style.display = 'none';
    
    showHome();
}

function addQuestion() {
    const container = document.getElementById('questionsContainer');
    const questionNum = container.children.length + 1;
    
    const questionBlock = document.createElement('div');
    questionBlock.className = 'question-block';
    questionBlock.innerHTML = `
        <h3>Question ${questionNum}</h3>
        <div class="form-group">
            <label>Question Text</label>
            <input type="text" class="questionText" placeholder="Enter your question" required>
        </div>
        
        <div class="media-upload-section">
            <label>Add Images/Videos:</label>
            <div>
                <input type="radio" name="media-type-${questionNum-1}" value="url" checked onchange="toggleMediaInput(this)"> URL
                <input type="radio" name="media-type-${questionNum-1}" value="file" onchange="toggleMediaInput(this)"> Upload File
            </div>
            <div class="media-inputs-container">
                <div class="media-input-group">
                    <input type="text" class="mediaUrl" placeholder="Enter image/video URL" style="display:block;">
                    <input type="file" class="mediaFile" accept="image/*,video/*" style="display:none;">
                </div>
            </div>
            <button type="button" class="add-media-btn" onclick="addMediaInput(this)">+ Add Another Media</button>
            <div class="media-preview"></div>
        </div>
        
        <div class="form-group">
            <label>Time Limit (seconds)</label>
            <input type="number" class="timeLimit" placeholder="30" value="30" required>
        </div>
        
        <label>Answer Variants:</label>
        <div class="variants-container">
            <div class="variant-row">
                <input type="text" class="variantText" placeholder="Variant 1" required>
                <input type="checkbox" class="isCorrect" id="var-${questionNum-1}-1">
                <label for="var-${questionNum-1}-1">Correct</label>
            </div>
            <div class="variant-row">
                <input type="text" class="variantText" placeholder="Variant 2" required>
                <input type="checkbox" class="isCorrect" id="var-${questionNum-1}-2">
                <label for="var-${questionNum-1}-2">Correct</label>
            </div>
        </div>
        <button type="button" onclick="addVariant(this)">Add Variant</button>
    `;
    
    container.appendChild(questionBlock);
}

function toggleMediaInput(radio) {
    const mediaSection = radio.closest('.media-upload-section');
    const mediaInputGroups = mediaSection.querySelectorAll('.media-input-group');
    const preview = mediaSection.querySelector('.media-preview');
    
    if (radio.value === 'url') {
        mediaInputGroups.forEach(group => {
            const urlInput = group.querySelector('.mediaUrl');
            const fileInput = group.querySelector('.mediaFile');
            urlInput.style.display = 'block';
            fileInput.style.display = 'none';
            fileInput.value = '';
        });
        preview.innerHTML = '';
    } else {
        mediaInputGroups.forEach(group => {
            const urlInput = group.querySelector('.mediaUrl');
            const fileInput = group.querySelector('.mediaFile');
            urlInput.style.display = 'none';
            fileInput.style.display = 'block';
            urlInput.value = '';
            
            fileInput.onchange = function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const fileType = file.type.split('/')[0];
                        const previewItem = document.createElement('div');
                        previewItem.style.cssText = 'position: relative; display: inline-block; margin: 5px;';
                        
                        if (fileType === 'image') {
                            const img = document.createElement('img');
                            img.src = event.target.result;
                            previewItem.appendChild(img);
                        } else if (fileType === 'video') {
                            const video = document.createElement('video');
                            video.src = event.target.result;
                            video.controls = true;
                            video.style.maxWidth = '200px';
                            video.style.maxHeight = '200px';
                            previewItem.appendChild(video);
                        }
                        preview.appendChild(previewItem);
                    };
                    reader.readAsDataURL(file);
                }
            };
        });
    }
}

function addMediaInput(button) {
    const mediaSection = button.closest('.media-upload-section');
    const container = mediaSection.querySelector('.media-inputs-container');
    const questionBlock = button.closest('.question-block');
    const questionIndex = Array.from(document.querySelectorAll('.question-block')).indexOf(questionBlock);
    const mediaCount = container.querySelectorAll('.media-input-group').length;
    const currentMediaType = mediaSection.querySelector('input[type="radio"]:checked').value;
    
    const newGroup = document.createElement('div');
    newGroup.className = 'media-input-group';
    
    if (currentMediaType === 'url') {
        newGroup.innerHTML = `
            <input type="text" class="mediaUrl" placeholder="Enter image/video URL" style="display:block;">
            <input type="file" class="mediaFile" accept="image/*,video/*" style="display:none;">
            <button type="button" class="remove-media-btn" onclick="removeMediaInput(this)">Remove</button>
        `;
    } else {
        newGroup.innerHTML = `
            <input type="text" class="mediaUrl" placeholder="Enter image/video URL" style="display:none;">
            <input type="file" class="mediaFile" accept="image/*,video/*" style="display:block;">
            <button type="button" class="remove-media-btn" onclick="removeMediaInput(this)">Remove</button>
        `;
        
        const fileInput = newGroup.querySelector('.mediaFile');
        fileInput.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const preview = mediaSection.querySelector('.media-preview');
                const reader = new FileReader();
                reader.onload = function(event) {
                    const fileType = file.type.split('/')[0];
                    if (fileType === 'image') {
                        const img = document.createElement('img');
                        img.src = event.target.result;
                        preview.appendChild(img);
                    } else if (fileType === 'video') {
                        const video = document.createElement('video');
                        video.src = event.target.result;
                        video.controls = true;
                        preview.appendChild(video);
                    }
                };
                reader.readAsDataURL(file);
            }
        };
    }
    
    container.appendChild(newGroup);
}

function removeMediaInput(button) {
    const mediaGroup = button.closest('.media-input-group');
    mediaGroup.remove();
}

function addVariant(button) {
    const variantsContainer = button.previousElementSibling;
    const questionBlock = button.closest('.question-block');
    const questionIndex = Array.from(document.querySelectorAll('.question-block')).indexOf(questionBlock);
    const variantNum = variantsContainer.querySelectorAll('.variantText').length + 1;
    const uniqueId = `var-${questionIndex}-${variantNum}`;
    
    const variantRow = document.createElement('div');
    variantRow.className = 'variant-row';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'variantText';
    input.placeholder = `Variant ${variantNum}`;
    input.required = true;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'isCorrect';
    checkbox.id = uniqueId;
    
    const label = document.createElement('label');
    label.setAttribute('for', uniqueId);
    label.textContent = 'Correct';
    
    variantRow.appendChild(input);
    variantRow.appendChild(checkbox);
    variantRow.appendChild(label);
    
    variantsContainer.appendChild(variantRow);
}

async function createQuiz(event) {
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn.disabled) {
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    
    const title = document.getElementById('quizTitle').value;
    const mode = document.getElementById('quizMode').value;
    const questionBlocks = document.querySelectorAll('.question-block');
    
    const questions = [];
    
    for (const block of questionBlocks) {
        const questionText = block.querySelector('.questionText').value;
        const timeLimit = block.querySelector('.timeLimit').value;
        
        const mediaSection = block.querySelector('.media-upload-section');
        const mediaType = mediaSection.querySelector('input[type="radio"]:checked').value;
        const mediaUrls = [];
        
        if (mediaType === 'url') {
            const urlInputs = block.querySelectorAll('.mediaUrl');
            urlInputs.forEach((input, idx) => {
                if (input.value && input.style.display !== 'none') {
                    mediaUrls.push(input.value);
                }
            });
        } else {
            const fileInputs = block.querySelectorAll('.mediaFile');
            
            for (let i = 0; i < fileInputs.length; i++) {
                const fileInput = fileInputs[i];
                
                if (fileInput.files.length > 0 && fileInput.style.display !== 'none') {
                    const file = fileInput.files[0];
                    
                    try {
                        const uploadedUrl = await uploadFile(file);
                        mediaUrls.push(uploadedUrl);
                    } catch (error) {
                        console.error('File upload error:', error);
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Create Quiz';
                        return;
                    }
                }
            }
        }
        
        const variantTexts = block.querySelectorAll('.variantText');
        const isCorrects = block.querySelectorAll('.isCorrect');
        
        const variants = [];
        variantTexts.forEach((variantText, index) => {
            variants.push({
                variant_text: variantText.value,
                is_correct: isCorrects[index].checked
            });
        });
        
        questions.push({
            question_text: questionText,
            media_url: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null,
            time_limit: parseInt(timeLimit),
            variants
        });
    }
    
    try {
        const response = await fetch(`${API_URL}/quizzes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ title, mode, questions })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('createQuizForm').reset();
            document.getElementById('questionsContainer').innerHTML = '';
            addQuestion();
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Quiz';
            
            alert('✅ Test muvaffaqiyatli yaratildi!');
            showMyQuizzes();
        } else {
            console.error('Failed to create quiz:', data.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Quiz';
        }
    } catch (error) {
        console.error('Error:', error);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Quiz';
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${API_URL}/quizzes/upload`, {
            method: 'POST',
            headers: {
                'x-auth-token': token
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok && data.url) {
            return data.url;
        } else {
            throw new Error(data.message || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

async function makeQuizLive(quizId) {
    try {
        const response = await fetch(`${API_URL}/quizzes/${quizId}/live`, {
            method: 'PATCH',
            headers: {
                'x-auth-token': token
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMyQuizzes();
        } else {
            console.error('Failed to make quiz live:', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function stopQuizLive(quizId) {
    try {
        const response = await fetch(`${API_URL}/quizzes/${quizId}/stop`, {
            method: 'PATCH',
            headers: {
                'x-auth-token': token
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMyQuizzes();
        } else {
            console.error('Failed to stop quiz:', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function viewLeaderboard(quizId) {
    try {
        const response = await fetch(`${API_URL}/quizzes/${quizId}/leaderboard`);
        const leaderboard = await response.json();
        
        hideAllSections();
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.style.display = 'block';
        
        const leaderboardList = resultsSection.querySelector('#leaderboard');
        leaderboardList.innerHTML = '<h3>Leaderboard</h3>';
        
        leaderboard.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            item.innerHTML = `
                <span>${index + 1}. ${entry.username}</span>
                <span>${entry.score} points</span>
            `;
            leaderboardList.appendChild(item);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function editQuiz(quizId) {
    try {
        const response = await fetch(`${API_URL}/quizzes/${quizId}/details`, {
            headers: {
                'x-auth-token': token
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Failed to load quiz:', data.message);
            return;
        }
        
        hideAllSections();
        document.getElementById('createQuizSection').style.display = 'block';
        
        document.getElementById('quizTitle').value = data.quiz.title;
        
        const questionsContainer = document.getElementById('questionsContainer');
        questionsContainer.innerHTML = '';
        
        data.questions.forEach((question, qIndex) => {
            addQuestion();
            
            const questionBlock = questionsContainer.lastElementChild;
            questionBlock.querySelector('.questionText').value = question.question_text;
            questionBlock.querySelector('.timeLimit').value = question.time_limit;
            
            if (question.media_url) {
                let mediaUrls = [];
                try {
                    mediaUrls = JSON.parse(question.media_url);
                } catch (e) {
                    mediaUrls = [question.media_url];
                }
                
                if (mediaUrls.length > 0) {
                    const mediaSection = questionBlock.querySelector('.media-upload-section');
                    const urlRadio = mediaSection.querySelector('input[value="url"]');
                    urlRadio.checked = true;
                    toggleMediaInput(urlRadio);
                    
                    mediaUrls.forEach((url, index) => {
                        if (index > 0) {
                            const addBtn = mediaSection.querySelector('.add-media-btn');
                            addMediaInput(addBtn);
                        }
                        const urlInputs = mediaSection.querySelectorAll('.mediaUrl');
                        urlInputs[index].value = url;
                    });
                }
            }
            
            const variantsContainer = questionBlock.querySelector('.variants-container');
            variantsContainer.innerHTML = '';
            
            question.variants.forEach((variant, vIndex) => {
                const variantRow = document.createElement('div');
                variantRow.className = 'variant-row';
                
                const uniqueId = `edit-var-${qIndex}-${vIndex}`;
                
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'variantText';
                input.value = variant.variant_text;
                input.placeholder = `Variant ${vIndex + 1}`;
                input.required = true;
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'isCorrect';
                checkbox.id = uniqueId;
                checkbox.checked = variant.is_correct;
                
                const label = document.createElement('label');
                label.setAttribute('for', uniqueId);
                label.textContent = 'Correct';
                
                variantRow.appendChild(input);
                variantRow.appendChild(checkbox);
                variantRow.appendChild(label);
                
                variantsContainer.appendChild(variantRow);
            });
        });
        
        const createBtn = document.querySelector('#createQuizSection button[type="submit"]');
        createBtn.textContent = 'Update Quiz';
        createBtn.onclick = async (e) => {
            e.preventDefault();
            await updateQuiz(quizId);
        };
        
    } catch (error) {
        console.error('Error:', error);
    }
}

async function updateQuiz(quizId) {
    const title = document.getElementById('quizTitle').value;
    const questionBlocks = document.querySelectorAll('.question-block');
    
    const questions = [];
    
    for (const block of questionBlocks) {
        const questionText = block.querySelector('.questionText').value;
        const timeLimit = block.querySelector('.timeLimit').value;
        
        const mediaSection = block.querySelector('.media-upload-section');
        const mediaType = mediaSection.querySelector('input[type="radio"]:checked').value;
        const mediaUrls = [];
        
        if (mediaType === 'url') {
            const urlInputs = block.querySelectorAll('.mediaUrl');
            urlInputs.forEach(input => {
                if (input.value && input.style.display !== 'none') {
                    mediaUrls.push(input.value);
                }
            });
        } else {
            const fileInputs = block.querySelectorAll('.mediaFile');
            for (const fileInput of fileInputs) {
                if (fileInput.files.length > 0 && fileInput.style.display !== 'none') {
                    try {
                        const uploadedUrl = await uploadFile(fileInput.files[0]);
                        mediaUrls.push(uploadedUrl);
                    } catch (error) {
                        console.error('File upload error:', error);
                        return;
                    }
                }
            }
        }
        
        const variantTexts = block.querySelectorAll('.variantText');
        const isCorrects = block.querySelectorAll('.isCorrect');
        
        const variants = [];
        variantTexts.forEach((variantText, index) => {
            variants.push({
                variant_text: variantText.value,
                is_correct: isCorrects[index].checked
            });
        });
        
        questions.push({
            question_text: questionText,
            media_url: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null,
            time_limit: parseInt(timeLimit),
            variants
        });
    }
    
    try {
        const response = await fetch(`${API_URL}/quizzes/${quizId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ title, questions })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const createBtn = document.querySelector('#createQuizSection button[type="submit"]');
            createBtn.textContent = 'Create Quiz';
            createBtn.onclick = createQuiz;
            
            document.getElementById('createQuizForm').reset();
            document.getElementById('questionsContainer').innerHTML = '';
            addQuestion();
            
            showMyQuizzes();
        } else {
            console.error('Failed to update quiz:', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function editQuiz_OLD(quizId) {
    alert('Edit functionality coming soon!');
}

async function joinQuiz(event) {
    event.preventDefault();
    
    const code = document.getElementById('quizCode').value;
    const username = document.getElementById('guestUsername').value;
    
    try {
        const response = await fetch(`${API_URL}/quizzes/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, username })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentQuizId = data.quizId;
            window.currentQuizMode = data.mode;
            localStorage.setItem('currentUsername', username);
            
            socket.emit('join-room', { code, username });
            
            if (data.mode === 'synchronized') {
                setupSynchronizedQuiz(data.quizId, username);
            } else {
                await startQuiz(data.quizId, username);
            }
        } else {
            console.error('Failed to join quiz:', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function startQuiz(quizId, username) {
    try {
        const headers = {};
        if (token) {
            headers['x-auth-token'] = token;
        }
        
        const response = await fetch(`${API_URL}/quizzes/${quizId}/questions`, {
            headers: headers
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to load quiz questions:', errorData.message);
            return;
        }
        
        const questions = await response.json();
        currentQuestions = questions;
        currentQuestionIndex = 0;
        score = 0;
        
        showQuizPlay();
    } catch (error) {
        console.error('Error:', error);
    }
}

function showQuizPlay() {
    hideAllSections();
    document.getElementById('quizPlaySection').style.display = 'block';
    document.getElementById('questionContainer').style.display = 'block';
    document.getElementById('resultsContainer').style.display = 'none';
    
    showQuestion();
}

function showQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        finishQuiz();
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    
    if (!question || !question.variants || question.variants.length === 0) {
        console.error('Invalid question data:', question);
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestions.length) {
            showQuestion();
        } else {
            finishQuiz();
        }
        return;
    }
    
    document.getElementById('questionText').textContent = question.question_text;
    
    const mediaContainer = document.getElementById('questionMedia').parentElement;
    mediaContainer.innerHTML = '<div id="mediaContainer" style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center; margin: 20px 0;"></div>';
    const newMediaContainer = document.getElementById('mediaContainer');
    
    if (question.media_url && question.media_url !== 'null' && question.media_url !== null) {
        let mediaUrls = [];
        try {
            mediaUrls = JSON.parse(question.media_url);
        } catch (e) {
            mediaUrls = [question.media_url];
        }
        
        if (!Array.isArray(mediaUrls)) {
            mediaUrls = [mediaUrls];
        }
        
        mediaUrls.forEach((url, index) => {
            if (!url || url === 'null' || url === null || url.trim() === '') {
                return;
            }
            
            url = url.trim();
            
            const urlLower = url.toLowerCase();
            
            let fileExtension = '';
            try {
                const urlPath = url.split('?')[0];
                const parts = urlPath.split('.');
                if (parts.length > 1) {
                    fileExtension = parts[parts.length - 1].toLowerCase();
                }
            } catch (e) {
                console.error('Error parsing URL:', e);
            }
            
            const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'm4v', 'wmv'];
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'];
            
            const isYouTube = urlLower.includes('youtube.com') || urlLower.includes('youtu.be');
            const isVimeo = urlLower.includes('vimeo.com');
            const hasVideoInPath = urlLower.includes('/video/') || urlLower.includes('/videos/');
            
            const isVideoExtension = videoExtensions.includes(fileExtension);
            const isImageExtension = imageExtensions.includes(fileExtension);
            const isImageKitUrl = url.includes('ik.imagekit.io');
            
            let isVideo = false;
            let isImage = false;
            
            if (isVideoExtension) {
                isVideo = true;
            } else if (isImageExtension) {
                isImage = true;
            } else if (isImageKitUrl) {
                const urlParts = url.split('/');
                const fileName = urlParts[urlParts.length - 1].split('?')[0].toLowerCase();
                if (videoExtensions.some(ext => fileName.endsWith('.' + ext))) {
                    isVideo = true;
                } else if (imageExtensions.some(ext => fileName.endsWith('.' + ext))) {
                    isImage = true;
                } else {
                    isImage = true;
                }
            } else if (isYouTube || isVimeo || hasVideoInPath) {
                isVideo = true;
            } else {
                isImage = true;
            }
            
            if (isVideo) {
                if (isYouTube) {
                    let videoId = '';
                    if (url.includes('youtube.com/watch?v=')) {
                        videoId = url.split('v=')[1].split('&')[0];
                    } else if (url.includes('youtu.be/')) {
                        videoId = url.split('youtu.be/')[1].split('?')[0];
                    } else if (url.includes('youtube.com/embed/')) {
                        videoId = url.split('embed/')[1].split('?')[0];
                    }
                    
                    if (videoId) {
                        const iframe = document.createElement('iframe');
                        iframe.src = `https://www.youtube.com/embed/${videoId}`;
                        iframe.width = '600';
                        iframe.height = '400';
                        iframe.frameBorder = '0';
                        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                        iframe.allowFullscreen = true;
                        iframe.style.cssText = 'border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 10px;';
                        newMediaContainer.appendChild(iframe);
                    } else {
                        console.error('Could not extract YouTube video ID from:', url);
                    }
                } else if (isVimeo) {
                    let videoId = '';
                    if (url.includes('vimeo.com/')) {
                        videoId = url.split('vimeo.com/')[1].split('/')[0].split('?')[0];
                    }
                    
                    if (videoId) {
                        const iframe = document.createElement('iframe');
                        iframe.src = `https://player.vimeo.com/video/${videoId}`;
                        iframe.width = '600';
                        iframe.height = '400';
                        iframe.frameBorder = '0';
                        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
                        iframe.allowFullscreen = true;
                        iframe.style.cssText = 'border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 10px;';
                        newMediaContainer.appendChild(iframe);
                    }
                } else {
                    // Regular video file
                    const videoWrapper = document.createElement('div');
                    videoWrapper.style.cssText = 'position: relative; display: inline-block; margin: 10px;';
                    
                    const video = document.createElement('video');
                    video.src = url;
                    video.controls = true;
                    video.controlsList = 'nodownload';
                    video.preload = 'metadata';
                    video.crossOrigin = 'anonymous';
                    video.style.cssText = 'max-width: 600px; max-height: 450px; width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); background: #000; display: block;';
                    
                    video.onerror = function(e) {
                        console.error('VIDEO LOAD ERROR:', {
                            url: url,
                            error: e,
                            videoError: video.error ? {
                                code: video.error.code,
                                message: video.error.message
                            } : 'No error object'
                        });
                        
                        videoWrapper.innerHTML = `<div style="padding: 30px; background: #ffebee; border-radius: 8px; color: #c62828; max-width: 500px; text-align: center;">
                            <p style="font-size: 18px; margin-bottom: 10px;">⚠️ Video yuklanmadi</p>
                            <p style="font-size: 14px; margin-bottom: 10px;">Error code: ${video.error ? video.error.code : 'unknown'}</p>
                            <small style="word-break: break-all; display: block; background: white; padding: 10px; border-radius: 4px; margin-top: 10px;">${url}</small>
                        </div>`;
                    };
                    
                    video.onloadstart = function() {
                        console.log('Video loading started:', url);
                    };
                    
                    video.onloadedmetadata = function() {
                        console.log('✓ Video metadata loaded:', {
                            url: url,
                            duration: video.duration,
                            videoWidth: video.videoWidth,
                            videoHeight: video.videoHeight
                        });
                    };
                    
                    video.oncanplay = function() {
                        console.log('✓ Video can play:', url);
                    };
                    
                    videoWrapper.appendChild(video);
                    newMediaContainer.appendChild(videoWrapper);
                }
            } else if (isImage) {
                console.log('Creating IMAGE element for:', url);
                const img = document.createElement('img');
                img.src = url;
                img.alt = 'Question media';
                img.style.cssText = 'max-width: 600px; max-height: 450px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: block; margin: 10px;';
                img.onerror = function(e) {
                    console.error('IMAGE LOAD ERROR:', url, e);
                    img.style.display = 'none';
                };
                img.onload = function() {
                    console.log('✓ Image loaded successfully:', url);
                };
                newMediaContainer.appendChild(img);
            }
        });
    } else {
        console.log('No media URL found for this question');
    }
    
    const variantsContainer = document.getElementById('variantsContainer');
    variantsContainer.innerHTML = '';
    variantsContainer.style.pointerEvents = 'auto';
    
    if (!question.variants || question.variants.length === 0) {
        console.error('No variants for question:', question);
        return;
    }
    
    question.variants.forEach((variant, index) => {
        const variantDiv = document.createElement('div');
        variantDiv.className = 'variant-option';
        variantDiv.dataset.variantId = variant.id;
        variantDiv.innerHTML = `
            <span class="variant-letter">${String.fromCharCode(65 + index)}</span>
            <span>${variant.variant_text}</span>
        `;
        variantDiv.onclick = () => selectVariant(variant.id, variantDiv);
        variantsContainer.appendChild(variantDiv);
    });
    
    const controlButtonsDiv = document.createElement('div');
    controlButtonsDiv.style.cssText = 'display: flex; gap: 10px; margin-top: 20px; justify-content: center;';
    
    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn btn-secondary';
    skipBtn.textContent = "O'tkazib yuborish";
    skipBtn.style.cssText = 'padding: 12px 30px; font-size: 16px; background: #6c757d; border: none; border-radius: 8px; color: white; cursor: pointer;';
    skipBtn.onclick = skipQuestion;
    
    const finishBtn = document.createElement('button');
    finishBtn.className = 'btn btn-danger';
    finishBtn.textContent = 'Testni yakunlash';
    finishBtn.style.cssText = 'padding: 12px 30px; font-size: 16px; background: #dc3545; border: none; border-radius: 8px; color: white; cursor: pointer;';
    finishBtn.onclick = finishQuizEarly;
    
    controlButtonsDiv.appendChild(skipBtn);
    controlButtonsDiv.appendChild(finishBtn);
    variantsContainer.appendChild(controlButtonsDiv);
    
    if (question.media_url && question.media_url !== 'null' && question.media_url !== null) {
        console.log('Waiting for media to load before starting timer...');
        let mediaLoaded = false;
        let loadTimeout;
        
        loadTimeout = setTimeout(() => {
            if (!mediaLoaded) {
                console.log('Media load timeout, starting timer anyway...');
                startTimer(question.time_limit);
            }
        }, 5000);
        
        const images = newMediaContainer.querySelectorAll('img');
        const videos = newMediaContainer.querySelectorAll('video');
        const iframes = newMediaContainer.querySelectorAll('iframe');
        
        let totalMedia = images.length + videos.length + iframes.length;
        let loadedMedia = 0;
        
        console.log(`Total media elements: ${totalMedia}`);
        
        const checkAllLoaded = () => {
            loadedMedia++;
            console.log(`Media loaded: ${loadedMedia}/${totalMedia}`);
            if (loadedMedia >= totalMedia && !mediaLoaded) {
                mediaLoaded = true;
                clearTimeout(loadTimeout);
                console.log('All media loaded, starting timer');
                startTimer(question.time_limit);
            }
        };
        
        if (totalMedia === 0) {
            clearTimeout(loadTimeout);
            startTimer(question.time_limit);
        } else {
            images.forEach(img => {
                if (img.complete) {
                    checkAllLoaded();
                } else {
                    img.addEventListener('load', checkAllLoaded, { once: true });
                    img.addEventListener('error', checkAllLoaded, { once: true });
                }
            });
            
            videos.forEach(video => {
                if (video.readyState >= 2) { // HAVE_CURRENT_DATA
                    checkAllLoaded();
                } else {
                    video.addEventListener('loadeddata', checkAllLoaded, { once: true });
                    video.addEventListener('error', checkAllLoaded, { once: true });
                }
            });
            
            iframes.forEach(() => {
                checkAllLoaded();
            });
        }
    } else {
        console.log('No media, starting timer immediately');
        startTimer(question.time_limit);
    }
}

function startTimer(timeLimit) {
    let timeLeft = timeLimit;
    document.getElementById('timeLeft').textContent = timeLeft;
    
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timeLeft').textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            nextQuestion();
        }
    }, 1000);
}

async function selectVariant(variantId, variantDiv) {
    console.log('SELECT VARIANT CALLED - ID:', variantId);
    clearInterval(timerInterval);
    
    document.querySelectorAll('.variant-option').forEach(div => {
        div.style.pointerEvents = 'none';
    });
    
    const controlButtons = document.querySelectorAll('#variantsContainer button');
    controlButtons.forEach(btn => btn.disabled = true);
    
    try {
        const response = await fetch(`${API_URL}/quizzes/submit-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quizId: currentQuizId,
                questionId: currentQuestions[currentQuestionIndex].id,
                variantId: variantId,
                username: localStorage.getItem('currentUsername'),
                userId: currentUser?.id
            })
        });
        
        const data = await response.json();
        console.log('ANSWER RESPONSE:', data);
        
        if (data.isCorrect) {
            score++;
            variantDiv.classList.add('correct');
        } else {
            variantDiv.classList.add('incorrect');
        }
        
        console.log('CALLING NEXT QUESTION IN 2 SECONDS...');
        setTimeout(() => {
            console.log('TIMEOUT FIRED - CALLING nextQuestion()');
            nextQuestion();
        }, 2000);
    } catch (error) {
        console.error('Error submitting answer:', error);
        console.log('ERROR - CALLING NEXT QUESTION IN 1 SECOND...');
        setTimeout(() => {
            nextQuestion();
        }, 1000);
    }
}

function skipQuestion() {
    console.log('SKIP QUESTION CALLED');
    clearInterval(timerInterval);
    
    const controlButtons = document.querySelectorAll('#variantsContainer button');
    controlButtons.forEach(btn => btn.disabled = true);
    
    console.log('CALLING nextQuestion() IMMEDIATELY');
    nextQuestion();
}

function finishQuizEarly() {
    console.log('FINISH QUIZ EARLY CALLED');
    clearInterval(timerInterval);
    
    const controlButtons = document.querySelectorAll('#variantsContainer button');
    controlButtons.forEach(btn => btn.disabled = true);
    
    console.log('CALLING finishQuiz()');
    finishQuiz();
}

function nextQuestion() {
    console.log('NEXT QUESTION CALLED - Current index:', currentQuestionIndex);
    currentQuestionIndex++;
    console.log('NEW index:', currentQuestionIndex, 'Total:', currentQuestions.length);
    
    if (currentQuestionIndex >= currentQuestions.length) {
        console.log('NO MORE QUESTIONS - FINISHING QUIZ');
        finishQuiz();
    } else {
        console.log('SHOWING NEXT QUESTION');
        showQuestion();
    }
}

async function finishQuiz() {
    document.getElementById('questionContainer').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'block';
    document.getElementById('finalScore').textContent = `${score}/${currentQuestions.length}`;
    
    try {
        await fetch(`${API_URL}/quizzes/save-result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quizId: currentQuizId,
                score: score,
                username: localStorage.getItem('currentUsername'),
                userId: currentUser?.id
            })
        });
        
        const response = await fetch(`${API_URL}/quizzes/${currentQuizId}/leaderboard`);
        const leaderboard = await response.json();
        
        const leaderboardContainer = document.getElementById('leaderboardContainer');
        leaderboardContainer.innerHTML = '';
        
        leaderboard.forEach((entry, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'leaderboard-item';
            entryDiv.innerHTML = `
                <span>${index + 1}. ${entry.username}</span>
                <span>${entry.score} points</span>
            `;
            leaderboardContainer.appendChild(entryDiv);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function openPresentation(quizId, quizTitle, quizCode) {
    console.log('=== OPENING PRESENTATION MODE ===');
    console.log('Quiz ID:', quizId, 'Title:', quizTitle, 'Code:', quizCode);
    
    window.currentPresentationQuizId = quizId;
    window.currentPresentationCode = quizCode;
    
    try {
        const response = await fetch(`${API_URL}/quizzes/code/${quizCode}`);
        const quiz = await response.json();
        
        hideAllSections();
        document.getElementById('presentationSection').style.display = 'block';
        
        document.getElementById('presentationQuizTitle').textContent = quizTitle;
        document.getElementById('presentationCode').textContent = quizCode;
        document.getElementById('presentationUrl').textContent = window.location.origin;
        document.getElementById('questionsCount').textContent = quiz.questions?.length || 0;
        
        if (quiz.mode === 'synchronized') {
            document.getElementById('adminControls').style.display = 'block';
        }
        
        const qrcodeDiv = document.getElementById('qrcodeCanvas');
        qrcodeDiv.innerHTML = '';
        
        const joinUrl = `${window.location.origin}/?code=${quizCode}`;
        new QRCode(qrcodeDiv, {
            text: joinUrl,
            width: 256,
            height: 256,
            colorDark: "#667eea",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        
        const presentationSection = document.getElementById('presentationSection');
        if (presentationSection.requestFullscreen) {
            await presentationSection.requestFullscreen();
        } else if (presentationSection.webkitRequestFullscreen) {
            await presentationSection.webkitRequestFullscreen();
        } else if (presentationSection.msRequestFullscreen) {
            await presentationSection.msRequestFullscreen();
        }
        
        socket.emit('join-room', { code: quizCode, username: 'Admin' });
        
        socket.on('user-joined', (data) => {
            console.log('User joined:', data);
            loadParticipants();
        });
        
        socket.on('participant-count', (count) => {
            document.getElementById('participantsCount').textContent = count;
        });
        
        loadParticipants();
        updateParticipantCount();
        
    } catch (error) {
        console.error('Error opening presentation:', error);
    }
}

function updateParticipantCount() {
    socket.emit('get-participants', window.currentPresentationCode);
}

async function loadParticipants() {
    if (!window.currentPresentationQuizId) return;
    
    try {
        const response = await fetch(`${API_URL}/quizzes/${window.currentPresentationQuizId}/participants`);
        const participants = await response.json();
        
        const namesDiv = document.getElementById('participantsNames');
        namesDiv.innerHTML = participants.map(p => 
            `<div style="background: rgba(255,255,255,0.2); padding: 8px; border-radius: 5px;">${p.username}</div>`
        ).join('');
        
        document.getElementById('participantsCount').textContent = participants.length;
    } catch (error) {
        console.error('Error loading participants:', error);
    }
}

async function startSyncQuiz() {
    document.getElementById('pauseBtn').style.display = 'inline-block';
    document.getElementById('nextBtn').style.display = 'inline-block';
    socket.emit('admin-next-question', { code: window.currentPresentationCode, questionIndex: 0 });
    
    try {
        await fetch(`${API_URL}/quizzes/${window.currentPresentationQuizId}/next`, {
            method: 'POST',
            headers: { 'x-auth-token': token }
        });
    } catch (error) {
        console.error('Error starting quiz:', error);
    }
}

async function pauseSyncQuiz() {
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('resumeBtn').style.display = 'inline-block';
    socket.emit('admin-pause', { code: window.currentPresentationCode });
    
    try {
        await fetch(`${API_URL}/quizzes/${window.currentPresentationQuizId}/pause`, {
            method: 'POST',
            headers: { 'x-auth-token': token }
        });
    } catch (error) {
        console.error('Error pausing quiz:', error);
    }
}

async function resumeSyncQuiz() {
    document.getElementById('resumeBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-block';
    socket.emit('admin-resume', { code: window.currentPresentationCode });
    
    try {
        await fetch(`${API_URL}/quizzes/${window.currentPresentationQuizId}/resume`, {
            method: 'POST',
            headers: { 'x-auth-token': token }
        });
    } catch (error) {
        console.error('Error resuming quiz:', error);
    }
}

async function nextSyncQuestion() {
    try {
        const response = await fetch(`${API_URL}/quizzes/${window.currentPresentationQuizId}/next`, {
            method: 'POST',
            headers: { 'x-auth-token': token }
        });
        const data = await response.json();
        socket.emit('admin-next-question', { code: window.currentPresentationCode, questionIndex: data.questionIndex });
    } catch (error) {
        console.error('Error advancing question:', error);
    }
}

socket.on('participant-count', (count) => {
    document.getElementById('participantsCount').textContent = count;
});

function exitPresentation() {
    console.log('=== EXITING PRESENTATION MODE ===');
    
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
    
    showMyQuizzes();
}

async function setupSynchronizedQuiz(quizId, username) {
    try {
        const headers = {};
        if (token) {
            headers['x-auth-token'] = token;
        }
        
        const response = await fetch(`${API_URL}/quizzes/${quizId}/questions`, {
            headers: headers
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to load quiz questions:', errorData.message);
            return;
        }
        
        const questions = await response.json();
        currentQuestions = questions;
        currentQuestionIndex = -1;
        score = 0;
        
        showQuizPlay();
        
        document.getElementById('questionContainer').innerHTML = '<div style="text-align:center; padding:50px; font-size:24px;">Kutib turing... Admin test boshlaydi</div>';
        
        socket.on('show-question', (data) => {
            currentQuestionIndex = data.questionIndex;
            showQuestion();
        });
        
        socket.on('quiz-paused', () => {
            clearInterval(timerInterval);
            document.getElementById('questionContainer').innerHTML += '<div style="color:orange; text-align:center; margin-top:20px; font-size:20px;">⏸️ PAUZA</div>';
        });
        
        socket.on('quiz-resumed', () => {
            showQuestion();
        });
        
        socket.on('show-correct-answer', (data) => {
            document.querySelectorAll('.variant-option').forEach(div => {
                const variantId = parseInt(div.dataset.variantId);
                if (variantId === data.correctVariantId) {
                    div.style.background = '#4CAF50';
                }
            });
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
}

if (token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUser = payload.user;
        updateUIForLoggedInUser();
    } catch (error) {
        console.error('Invalid token');
        localStorage.removeItem('token');
    }
}
