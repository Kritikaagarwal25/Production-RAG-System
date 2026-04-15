/* ─────────────────────────────────────────────
   DocuQuery AI  ·  script.js
   ───────────────────────────────────────────── */

const API_BASE = 'http://127.0.0.1:8000';

/* ── DOM refs ── */
const sidebar            = document.getElementById('sidebar');
const toggleSidebar      = document.getElementById('toggle-sidebar');
const topbarToggle       = document.getElementById('topbar-toggle-sidebar');
const newChatBtn         = document.getElementById('new-chat-btn');
const navChat            = document.getElementById('nav-chat');
const navDocs            = document.getElementById('nav-docs');
const sidebarDocsPanel   = document.getElementById('sidebar-docs-panel');

const dropZone           = document.getElementById('drop-zone');
const fileInput          = document.getElementById('file-input');
const fileList           = document.getElementById('file-list');
const uploadBtn          = document.getElementById('upload-btn');
const uploadBtnText      = document.getElementById('upload-btn-text');
const uploadSpinner      = document.getElementById('upload-spinner');
const uploadStatus       = document.getElementById('upload-status');
const metadataList       = document.getElementById('metadata-list');

const chatArea           = document.getElementById('chat-area');
const welcomeScreen      = document.getElementById('welcome-screen');
const chatMessages       = document.getElementById('chat-messages');
const queryInput         = document.getElementById('query-input');
const sendBtn            = document.getElementById('send-btn');
const attachBtn          = document.getElementById('attach-btn');
const attachFileInput    = document.getElementById('attach-file-input');
const topbarDocsBtn      = document.getElementById('topbar-docs-btn');

const MAX_FILES = 10;
let selectedFiles = [];
let isStreaming   = false;
let sidebarDocsVisible = false;

/* ══════════════════════════════════════════════
   SIDEBAR TOGGLE
   ══════════════════════════════════════════════ */
function toggleSidebarFn() {
    sidebar.classList.toggle('collapsed');
}
toggleSidebar.addEventListener('click', toggleSidebarFn);
topbarToggle.addEventListener('click', toggleSidebarFn);

/* ── New chat ── */
newChatBtn.addEventListener('click', () => {
    chatMessages.innerHTML = '';
    welcomeScreen.style.display = '';
    queryInput.value = '';
    autoResizeTextarea();
    updateSendBtn();
});

/* ── Nav tabs ── */
navChat.addEventListener('click', () => {
    navChat.classList.add('active');
    navDocs.classList.remove('active');
    sidebarDocsPanel.style.display = 'none';
});
navDocs.addEventListener('click', () => {
    navDocs.classList.add('active');
    navChat.classList.remove('active');
    sidebarDocsPanel.style.display = '';
});

/* ── Topbar docs button ── */
topbarDocsBtn.addEventListener('click', () => {
    sidebarDocsVisible = !sidebarDocsVisible;
    if (sidebarDocsVisible) {
        sidebar.classList.remove('collapsed');
        navDocs.click();
        topbarDocsBtn.classList.add('active');
    } else {
        navChat.click();
        topbarDocsBtn.classList.remove('active');
    }
});

/* ──────────────────────────────────────────────
   ATTACH button (quick file pick from main area)
   ────────────────────────────────────────────── */
attachBtn.addEventListener('click', () => {
    attachFileInput.click();
});
attachFileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    // switch to docs panel so user sees the files
    navDocs.click();
    if (sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
    }
});

/* ══════════════════════════════════════════════
   FILE UPLOAD
   ══════════════════════════════════════════════ */
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(files) {
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf');
    if (pdfs.length === 0) return;

    const combined = [...selectedFiles, ...pdfs];

    if (combined.length > MAX_FILES) {
        setUploadStatus(`❌ Maximum ${MAX_FILES} documents allowed. Remove some before adding more.`, 'error');
        // Still add up to the limit
        selectedFiles = combined.slice(0, MAX_FILES);
    } else {
        selectedFiles = combined;
        uploadStatus.textContent = '';
        uploadStatus.className = 'upload-status';
    }

    renderFileList();
}

function renderFileList() {
    // Show count badge
    const overLimit = selectedFiles.length >= MAX_FILES;
    fileList.innerHTML = `<div class="file-count-badge${overLimit ? ' at-limit' : ''}">${selectedFiles.length} / ${MAX_FILES} files</div>` +
    selectedFiles.map((f, i) => `
        <div class="file-item" data-idx="${i}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;">${f.name}</span>
        </div>
    `).join('');
    uploadBtn.disabled = selectedFiles.length === 0;
}

uploadBtn.addEventListener('click', uploadFiles);

async function uploadFiles() {
    if (selectedFiles.length === 0) return;

    setUploadLoading(true);

    const formData = new FormData();
    selectedFiles.forEach(f => formData.append('files', f));

    try {
        const res  = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
        const data = await res.json();

        const failed  = data.results.filter(r => r.status === 'error');
        const success = data.results.filter(r => r.status === 'success');

        if (failed.length > 0) {
            setUploadStatus(`❌ ${failed[0].message}`, 'error');
        } else {
            setUploadStatus(`✅ Processed ${success.length} document${success.length > 1 ? 's' : ''}. Chat cleared for new context.`, 'success');

            // ── Clear old chat so only new document's context is used ──
            chatMessages.innerHTML = '';
            welcomeScreen.style.display = '';
            queryInput.value = '';
            queryInput.style.height = 'auto';
            updateSendBtn();
        }

        selectedFiles = [];
        fileList.innerHTML = '';
        uploadBtn.disabled = true;
        fetchMetadata();
    } catch {
        setUploadStatus('❌ Server unreachable. Is backend running?', 'error');
    } finally {
        setUploadLoading(false);
    }
}

function setUploadLoading(on) {
    uploadBtn.disabled      = on;
    uploadBtnText.textContent = on ? 'Processing…' : 'Process Documents';
    uploadSpinner.style.display = on ? 'block' : 'none';
}

function setUploadStatus(msg, type) {
    uploadStatus.textContent = msg;
    uploadStatus.className   = `upload-status ${type}`;
}

/* ══════════════════════════════════════════════
   KNOWLEDGE BASE METADATA
   ══════════════════════════════════════════════ */
async function fetchMetadata() {
    try {
        const res  = await fetch(`${API_BASE}/metadata`);
        const data = await res.json();

        if (data.length === 0) {
            metadataList.innerHTML = '<p class="empty-hint">No documents yet.</p>';
            return;
        }

        metadataList.innerHTML = data.map(doc => `
            <div class="metadata-item" data-id="${doc.id}">
                <div class="metadata-item-top">
                    <strong title="${doc.filename}">${doc.filename}</strong>
                    <button class="delete-doc-btn" data-id="${doc.id}" data-name="${doc.filename}" title="Delete document">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                    </button>
                </div>
                <small>${doc.page_count} pages · ${doc.chunk_count} chunks</small>
            </div>
        `).join('');

        // Attach delete listeners
        document.querySelectorAll('.delete-doc-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteDocument(btn.dataset.id, btn.dataset.name));
        });
    } catch {
        // silently ignore on first load
    }
}

async function deleteDocument(docId, filename) {
    if (!confirm(`Delete "${filename}" from the knowledge base?\n\nThis will also clear the current chat.`)) return;

    try {
        const res = await fetch(`${API_BASE}/document/${docId}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json();
            alert(`❌ Error: ${err.detail}`);
            return;
        }

        // Clear chat after deletion — context has changed
        chatMessages.innerHTML = '';
        welcomeScreen.style.display = '';
        queryInput.value = '';
        queryInput.style.height = 'auto';
        updateSendBtn();

        fetchMetadata();
    } catch {
        alert('❌ Could not reach server. Make sure the backend is running.');
    }
}


/* ══════════════════════════════════════════════
   CHAT
   ══════════════════════════════════════════════ */
queryInput.addEventListener('input', () => {
    autoResizeTextarea();
    updateSendBtn();
});

queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) sendQuery();
    }
});

sendBtn.addEventListener('click', sendQuery);

function autoResizeTextarea() {
    queryInput.style.height = 'auto';
    queryInput.style.height = Math.min(queryInput.scrollHeight, 200) + 'px';
}

function updateSendBtn() {
    sendBtn.disabled = queryInput.value.trim() === '' || isStreaming;
}

async function sendQuery() {
    const query = queryInput.value.trim();
    if (!query || isStreaming) return;

    isStreaming = true;
    updateSendBtn();

    // Hide welcome screen on first message
    welcomeScreen.style.display = 'none';

    // User message
    appendMessage(query, 'user', 'You');

    // Reset input
    queryInput.value = '';
    queryInput.style.height = 'auto';

    // AI placeholder
    const aiContent = appendMessage('', 'ai', 'DocuQuery');
    aiContent.classList.add('typing-cursor');

    let fullText = '';

    try {
        const res = await fetch(`${API_BASE}/query`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ query })
        });

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value, { stream: true });
            aiContent.textContent = fullText;
            chatArea.scrollTop = chatArea.scrollHeight;
        }
    } catch {
        aiContent.textContent = '⚠️ Could not reach the server. Make sure the backend is running.';
    } finally {
        aiContent.classList.remove('typing-cursor');
        isStreaming = false;
        updateSendBtn();
        chatArea.scrollTop = chatArea.scrollHeight;
    }
}

/**
 * Appends a message row and returns the content element.
 */
function appendMessage(text, role, name) {
    const isUser = role === 'user';

    const row   = document.createElement('div');
    row.className = 'message-row';

    const initials = isUser ? 'A' : 'AI';
    const avClass  = isUser ? 'user-av' : 'ai-av';

    row.innerHTML = `
        <div class="message-inner">
            <div class="msg-avatar ${avClass}">${initials}</div>
            <div style="flex:1;min-width:0;">
                <div class="msg-name">${name}</div>
                <div class="msg-content">${escapeHtml(text)}</div>
            </div>
        </div>
    `;

    chatMessages.appendChild(row);
    chatArea.scrollTop = chatArea.scrollHeight;

    return row.querySelector('.msg-content');
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ── Init ── */
// Start with docs panel hidden (chat mode)
sidebarDocsPanel.style.display = 'none';

fetchMetadata();
