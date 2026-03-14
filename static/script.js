// Tab Navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });

    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');

    // Highlight selected button
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// Text Encryption
function encryptText(event) {
    const text = document.getElementById('plaintext').value;

    if (!text.trim()) {
        showNotification('Please enter text to encrypt', 'error');
        return;
    }

    const btn = event.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Encrypting...';

    fetch('/api/encrypt-text', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('encrypted-text').value = data.encrypted;
            document.getElementById('encrypt-result').classList.remove('hidden');
            updateCharCount('encrypted-text', 'encrypt-char-count');
            showNotification('Text encrypted successfully!', 'success');
        } else {
            showNotification(data.error || 'Encryption failed', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Encryption failed', 'error');
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '🔒 Encrypt';
    });
}

// Text Decryption
function decryptText(event) {
    const encrypted = document.getElementById('encrypted-input').value;

    if (!encrypted.trim()) {
        showNotification('Please paste encrypted text', 'error');
        return;
    }

    const btn = event.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Decrypting...';

    fetch('/api/decrypt-text', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ encrypted: encrypted })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('decrypted-text').value = data.decrypted;
            document.getElementById('decrypt-result').classList.remove('hidden');
            updateCharCount('decrypted-text', 'decrypt-char-count');
            showNotification('Text decrypted successfully!', 'success');
        } else {
            showNotification(data.error || 'Decryption failed', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Decryption failed', 'error');
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '🔓 Decrypt';
    });
}

// File Encryption
function encryptFile(event) {
    const fileInput = document.getElementById('file-to-encrypt');
    const file = fileInput.files[0];

    if (!file) {
        showNotification('Please select a file', 'error');
        return;
    }

    if (file.size > 16 * 1024 * 1024) {
        showNotification('File exceeds the 16MB size limit', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const btn = event.currentTarget;
    const statusDiv = document.getElementById('encrypt-file-status');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Encrypting file...';
    statusDiv.className = 'status processing';
    statusDiv.textContent = 'Encrypting file...';
    statusDiv.classList.remove('hidden');

    fetch('/api/encrypt-file', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.ok) {
            return response.blob().then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${file.name}.enc`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                statusDiv.className = 'status success';
                statusDiv.textContent = '✓ File encrypted and downloaded successfully!';
                showNotification('File encrypted successfully!', 'success');
            });
        } else {
            return response.json().then(data => {
                throw new Error(data.error || 'Encryption failed');
            });
        }
    })
    .catch(error => {
        console.error('Error:', error);
        statusDiv.className = 'status error';
        statusDiv.textContent = '✗ ' + error.message;
        showNotification('File encryption failed', 'error');
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '🔒 Encrypt File';
    });
}

// File Decryption
function decryptFile(event) {
    const fileInput = document.getElementById('file-to-decrypt');
    const file = fileInput.files[0];

    if (!file) {
        showNotification('Please select a file', 'error');
        return;
    }

    if (file.size > 16 * 1024 * 1024) {
        showNotification('File exceeds the 16MB size limit', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const btn = event.currentTarget;
    const statusDiv = document.getElementById('decrypt-file-status');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Decrypting file...';
    statusDiv.className = 'status processing';
    statusDiv.textContent = 'Decrypting file...';
    statusDiv.classList.remove('hidden');

    fetch('/api/decrypt-file', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.ok) {
            return response.blob().then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                
                // Generate filename
                let downloadName = file.name;
                if (downloadName.endsWith('.enc')) {
                    downloadName = downloadName.slice(0, -4);
                } else {
                    downloadName = downloadName + '_decrypted';
                }
                
                a.download = downloadName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                statusDiv.className = 'status success';
                statusDiv.textContent = '✓ File decrypted and downloaded successfully!';
                showNotification('File decrypted successfully!', 'success');
            });
        } else {
            return response.json().then(data => {
                throw new Error(data.error || 'Decryption failed');
            });
        }
    })
    .catch(error => {
        console.error('Error:', error);
        statusDiv.className = 'status error';
        statusDiv.textContent = '✗ ' + error.message;
        showNotification('File decryption failed', 'error');
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '🔓 Decrypt File';
    });
}

// Utility Functions
function updateFileName(inputId, displayId) {
    const fileInput = document.getElementById(inputId);
    const displayElement = document.getElementById(displayId);
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        if (file.size > 16 * 1024 * 1024) {
            displayElement.textContent = `${file.name} (${fileSize} MB) — ⚠️ Exceeds 16MB limit!`;
            displayElement.style.color = '#dc3545';
        } else {
            displayElement.textContent = `${file.name} (${fileSize} MB)`;
            displayElement.style.color = '';
        }
    }
}

function updateCharCount(textareaId, counterId) {
    const textarea = document.getElementById(textareaId);
    const counter = document.getElementById(counterId);
    if (textarea && counter) {
        counter.textContent = `${textarea.value.length.toLocaleString()} characters`;
    }
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.value;

    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        element.select();
        document.execCommand('copy');
        showNotification('Copied to clipboard!', 'success');
    });
}

function downloadEncrypted() {
    const text = document.getElementById('encrypted-text').value;
    if (!text) { showNotification('Nothing to download', 'error'); return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'encrypted.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showNotification('Encrypted text downloaded!', 'success');
}

function downloadDecrypted() {
    const text = document.getElementById('decrypted-text').value;
    if (!text) { showNotification('Nothing to download', 'error'); return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decrypted.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showNotification('Decrypted text downloaded!', 'success');
}

// Key Rotation
function generateNewKey(event) {
    const btn = event.currentTarget;
    if (!confirm('⚠️ Generating a new key will make ALL previously encrypted data unreadable. Are you sure?')) {
        return;
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Generating...';

    fetch('/api/generate-key', { method: 'POST' })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('New encryption key generated!', 'success');
            document.getElementById('key-status').textContent = '✓ New key active as of ' + new Date().toLocaleTimeString();
        } else {
            showNotification(data.error || 'Key generation failed', 'error');
        }
    })
    .catch(() => showNotification('Key generation failed', 'error'))
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '🔑 Generate New Key';
    });
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}
