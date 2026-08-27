// Global Variables
let currentUser = null;
let currentChatUser = null;
let currentUserPhone = null;
let allUsers = {};

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
});

// Check Authentication State
function checkAuthState() {
    auth.onAuthStateChanged(function(user) {
        if (user) {
            currentUser = user;
            currentUserPhone = user.phoneNumber;
            loadChatApp();
        } else {
            showAuthContainer();
        }
    });
}

// Show Auth Container
function showAuthContainer() {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('chatContainer').classList.add('hidden');
}

// Show Chat Container
function showChatContainer() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('chatContainer').classList.remove('hidden');
}

// Toggle Between Login and Signup Forms
function toggleAuthForm() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    loginForm.classList.toggle('hidden');
    signupForm.classList.toggle('hidden');
    
    // Clear error messages
    document.getElementById('authError').classList.add('hidden');
}

// Show Error Message
function showError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

// Show Loading Spinner
function showLoading(show = true) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('hidden');
    } else {
        spinner.classList.add('hidden');
    }
}

// Signup User with Phone Number and Password
function signupUser() {
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const name = document.getElementById('signupName').value.trim();
    
    if (!phone || !password || !name) {
        showError('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
    if (!phone.startsWith('+')) {
        showError('Phone number must start with +');
        return;
    }
    
    showLoading(true);
    
    // Create user with email (using phone as base for email)
    const tempEmail = phone.replace(/\D/g, '') + '@chatapp.com';
    
    auth.createUserWithEmailAndPassword(tempEmail, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Save user data to database
            const userData = {
                phone: phone,
                name: name,
                email: tempEmail,
                createdAt: new Date().toISOString()
            };
            
            database.ref('users/' + user.uid).set(userData)
                .then(() => {
                    // Update auth user with phone number custom claim
                    return database.ref('users/' + user.uid + '/uid').set(user.uid);
                })
                .then(() => {
                    showLoading(false);
                    // Clear form
                    document.getElementById('signupPhone').value = '';
                    document.getElementById('signupPassword').value = '';
                    document.getElementById('signupName').value = '';
                    
                    // Auto login
                    loginUser();
                })
                .catch((error) => {
                    showLoading(false);
                    showError('Error saving user data: ' + error.message);
                });
        })
        .catch((error) => {
            showLoading(false);
            showError('Signup Error: ' + error.message);
        });
}

// Login User
function loginUser() {
    const phone = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!phone || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    showLoading(true);
    
    // Create temp email from phone
    const tempEmail = phone.replace(/\D/g, '') + '@chatapp.com';
    
    auth.signInWithEmailAndPassword(tempEmail, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            currentUserPhone = phone;
            
            // Clear form
            document.getElementById('loginPhone').value = '';
            document.getElementById('loginPassword').value = '';
            
            showLoading(false);
            loadChatApp();
        })
        .catch((error) => {
            showLoading(false);
            showError('Login Error: ' + error.message);
        });
}

// Load Chat App
function loadChatApp() {
    showChatContainer();
    
    // Get current user info
    database.ref('users/' + currentUser.uid).once('value', function(snapshot) {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            document.getElementById('userName').textContent = userData.name || 'User';
        }
    });
    
    // Load all users
    loadAllUsers();
    
    // Listen for new users in real-time
    database.ref('users').on('child_added', function(snapshot) {
        const userId = snapshot.key;
        const userData = snapshot.val();
        
        if (userId !== currentUser.uid) {
            allUsers[userId] = {
                uid: userId,
                ...userData
            };
            updateUsersList();
        }
    });
    
    // Listen for user updates
    database.ref('users').on('child_changed', function(snapshot) {
        const userId = snapshot.key;
        const userData = snapshot.val();
        
        if (userId !== currentUser.uid) {
            allUsers[userId] = {
                uid: userId,
                ...userData
            };
            updateUsersList();
        }
    });
}

// Load All Users
function loadAllUsers() {
    database.ref('users').once('value', function(snapshot) {
        allUsers = {};
        snapshot.forEach(function(childSnapshot) {
            const userId = childSnapshot.key;
            const userData = childSnapshot.val();
            
            if (userId !== currentUser.uid) {
                allUsers[userId] = {
                    uid: userId,
                    ...userData
                };
            }
        });
        updateUsersList();
    });
}

// Update Users List
function updateUsersList() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    Object.values(allUsers).forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        if (currentChatUser && currentChatUser.uid === user.uid) {
            userItem.classList.add('active');
        }
        
        userItem.innerHTML = `
            <div>${user.name || 'Unknown'}</div>
            <div class="user-item-phone">${user.phone}</div>
        `;
        
        userItem.onclick = () => selectUser(user);
        usersList.appendChild(userItem);
    });
}

// Select User for Chat
function selectUser(user) {
    currentChatUser = user;
    updateUsersList();
    loadMessages();
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendBtn').disabled = false;
}

// Search User by Phone Number
function searchUser() {
    const searchPhone = document.getElementById('searchPhone').value.trim();
    
    if (!searchPhone) {
        loadAllUsers();
        return;
    }
    
    database.ref('users').once('value', function(snapshot) {
        const filteredUsers = {};
        snapshot.forEach(function(childSnapshot) {
            const userId = childSnapshot.key;
            const userData = childSnapshot.val();
            
            if (userId !== currentUser.uid && userData.phone.includes(searchPhone)) {
                filteredUsers[userId] = {
                    uid: userId,
                    ...userData
                };
            }
        });
        
        allUsers = filteredUsers;
        updateUsersList();
        
        if (Object.keys(filteredUsers).length === 0) {
            showError('No users found with that phone number');
        }
    });
}

// Load Messages from Database
function loadMessages() {
    if (!currentChatUser) return;
    
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = '';
    
    // Create a unique chat room ID
    const chatRoomId = getChatRoomId(currentUser.uid, currentChatUser.uid);
    
    database.ref('messages/' + chatRoomId).on('child_added', function(snapshot) {
        const message = snapshot.val();
        displayMessage(message);
    });
}

// Get Chat Room ID (consistent for both users)
function getChatRoomId(uid1, uid2) {
    return uid1 < uid2 ? uid1 + '_' + uid2 : uid2 + '_' + uid1;
}

// Display Message
function displayMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    
    // Remove "select user" text if exists
    const selectText = messagesContainer.querySelector('.select-user-text');
    if (selectText) {
        selectText.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + (message.senderId === currentUser.uid ? 'sent' : 'received');
    
    const time = new Date(message.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div>
            <div class="message-content">${escapeHtml(message.text)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send Message
function sendMessage() {
    if (!currentChatUser) {
        showError('Please select a user first');
        return;
    }
    
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.value.trim();
    
    if (!text) return;
    
    const chatRoomId = getChatRoomId(currentUser.uid, currentChatUser.uid);
    
    const message = {
        senderId: currentUser.uid,
        senderName: document.getElementById('userName').textContent,
        senderPhone: currentUserPhone,
        receiverId: currentChatUser.uid,
        text: text,
        timestamp: new Date().getTime()
    };
    
    database.ref('messages/' + chatRoomId).push(message)
        .then(() => {
            messageInput.value = '';
            messageInput.focus();
        })
        .catch((error) => {
            showError('Error sending message: ' + error.message);
        });
}

// Logout User
function logoutUser() {
    showLoading(true);
    
    auth.signOut()
        .then(() => {
            currentUser = null;
            currentChatUser = null;
            currentUserPhone = null;
            allUsers = {};
            
            // Clear forms
            document.getElementById('loginPhone').value = '';
            document.getElementById('loginPassword').value = '';
            document.getElementById('signupPhone').value = '';
            document.getElementById('signupPassword').value = '';
            document.getElementById('signupName').value = '';
            document.getElementById('searchPhone').value = '';
            document.getElementById('messageInput').value = '';
            
            // Show login form
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('signupForm').classList.add('hidden');
            
            showLoading(false);
            showAuthContainer();
        })
        .catch((error) => {
            showLoading(false);
            showError('Logout Error: ' + error.message);
        });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Allow sending message with Enter key
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('messageInput').addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
});
