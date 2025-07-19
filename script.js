let files = [];
let tags = [];
let selectedTags = [];

document.addEventListener('DOMContentLoaded', function() {
    loadFiles();
    loadTags();
    initUploadArea();
});

async function loadFiles() {
    try {
        const response = await fetch('/api/files');
        files = await response.json();
        renderFiles();
    } catch (error) {
        console.error('加载文件失败:', error);
    }
}

async function loadTags() {
    try {
        const response = await fetch('/api/tags');
        tags = await response.json();
        renderTagFilter();
    } catch (error) {
        console.error('加载标签失败:', error);
    }
}

function renderFiles() {
    const grid = document.getElementById('fileGrid');
    grid.innerHTML = '';

    files.forEach(file => {
        const fileItem = createFileItem(file);
        grid.appendChild(fileItem);
    });
}

function renderTagFilter() {
    const tagFilter = document.getElementById('tagFilter');
    if (!tagFilter) return;
    
    tagFilter.innerHTML = `
        <div class="tag-filter-container">
            <div class="selected-tags">
                ${selectedTags.map(tag => `
                    <span class="selected-tag">
                        ${tag} 
                        <button onclick="removeSelectedTag('${tag}')" class="remove-selected">×</button>
                    </span>
                `).join('')}
                ${selectedTags.length === 0 ? '<span class="filter-placeholder">点击下方标签进行筛选</span>' : ''}
            </div>
            <div class="available-filter-tags">
                ${tags.filter(tag => !selectedTags.includes(tag)).map(tag => `
                    <span class="filter-tag" onclick="addSelectedTag('${tag}')">
                        ${tag}
                    </span>
                `).join('')}
            </div>
            ${selectedTags.length > 0 ? `
                <button class="clear-filter" onclick="clearSelectedTags()">清除筛选</button>
            ` : ''}
        </div>
    `;
}

function createFileItem(file) {
    const div = document.createElement('div');
    div.className = `file-item ${file.pinned ? 'pinned' : ''}`;

    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
    const isVideo = /\.(mp4|webm|ogg)$/i.test(file.name);

    let preview = '';
    if (isImage) {
        preview = `<img src="/stickers/${file.name}" class="file-preview" onclick="openModal('${file.name}', 'image')" alt="${file.name}">`;
    } else if (isVideo) {
        preview = `<video class="file-preview" onclick="openModal('${file.name}', 'video')" muted>
                     <source src="/stickers/${file.name}" type="video/mp4">
                   </video>`;
    } else {
        preview = `<div class="file-preview" style="background:#eee;display:flex;align-items:center;justify-content:center;">
                     <span>📄</span>
                   </div>`;
    }

    // 显示文件标签
    const fileTags = file.tags || [];
    const tagsHtml = fileTags.map(tag => `<span class="file-tag">${tag}</span>`).join('');

    // 置顶标识
    const pinnedBadge = file.pinned ? '<div class="pinned-badge">📌</div>' : '';

    div.innerHTML = `
        ${pinnedBadge}
        ${preview}
        <div class="file-name">${file.name}</div>
        <div class="file-size">${formatFileSize(file.size)}</div>
        <div class="file-tags">${tagsHtml}</div>
        <div class="file-actions">
            <button class="copy-btn" onclick="copyFileToClipboard('${file.name}')">复制</button>
            <button class="tag-btn" onclick="showTagModal('${file.name}')">标签</button>
            <button class="pin-btn ${file.pinned ? 'pinned' : ''}" onclick="togglePin('${file.name}')">
                ${file.pinned ? '取消置顶' : '置顶'}
            </button>
            <button class="delete-btn" onclick="deleteFile('${file.name}')">删除</button>
        </div>
    `;

    return div;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function openModal(filename, type) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');

    if (type === 'image') {
        modalBody.innerHTML = `<img src="/stickers/${filename}" alt="${filename}">`;
    } else if (type === 'video') {
        modalBody.innerHTML = `<video controls autoplay>
                                 <source src="/stickers/${filename}" type="video/mp4">
                               </video>`;
    }

    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function initUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    // 点击上传区域选择文件
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // 文件选择变化时上传
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadFiles(Array.from(e.target.files));
        }
    });
    
    // 防止默认拖拽行为
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // 拖拽高亮
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    // 处理文件拖拽
    uploadArea.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    document.getElementById('uploadArea').classList.add('drag-over');
}

function unhighlight(e) {
    document.getElementById('uploadArea').classList.remove('drag-over');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);
    
    if (files.length > 0) {
        uploadFiles(files);
    }
}

async function uploadFiles(files) {
    if (files.length === 0) {
        showToast('请选择文件', 'warning');
        return;
    }

    const formData = new FormData();
    for (let file of files) {
        formData.append('files', file);
    }

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            showToast(`成功上传 ${files.length} 个文件`, 'success');
            document.getElementById('fileInput').value = '';
            await loadFiles();
        } else {
            const error = await response.json();
            showToast(error.detail || '上传失败', 'error');
        }
    } catch (error) {
        console.error('上传错误:', error);
        showToast('上传失败', 'error');
    }
}

function showTagModal(filename) {
    const file = files.find(f => f.name === filename);
    const fileTags = file ? file.tags || [] : [];
    
    const modal = document.createElement('div');
    modal.className = 'tag-modal';
    modal.innerHTML = `
        <div class="tag-modal-content">
            <div class="tag-modal-header">
                <h3>管理标签 - ${filename}</h3>
                <button class="close-btn" onclick="closeTagModal()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            
            <div class="tag-section">
                <h4>当前标签</h4>
                <div class="current-tags">
                    ${fileTags.length > 0 ? 
                        fileTags.map(tag => `
                            <span class="tag-item current">
                                ${tag} 
                                <button type="button" onclick="removeFileTag('${filename}', '${tag}')" class="remove-tag">×</button>
                            </span>
                        `).join('') : 
                        '<span class="no-tags">暂无标签</span>'
                    }
                </div>
            </div>
            
            <div class="tag-section">
                <h4>所有标签 <span class="tag-hint">（点击添加）</span></h4>
                <div class="all-tags">
                    ${tags.length > 0 ? 
                        tags.map(tag => `
                            <span class="tag-item ${fileTags.includes(tag) ? 'disabled' : 'available'}" 
                                  ${!fileTags.includes(tag) ? `onclick="addTagToFile('${filename}', '${tag}')"` : ''}>
                                ${tag}
                                ${fileTags.includes(tag) ? '<span class="check-mark">✓</span>' : ''}
                            </span>
                        `).join('') : 
                        '<span class="no-tags">暂无标签</span>'
                    }
                </div>
            </div>
            
            <div class="tag-section">
                <h4>创建新标签</h4>
                <div class="new-tag-form">
                    <input type="text" id="newTagName" placeholder="输入新标签名称" maxlength="20">
                    <button type="button" onclick="addNewTag('${filename}')" class="create-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        创建并添加
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 点击背景关闭
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeTagModal();
        }
    };
    
    // 聚焦到输入框
    setTimeout(() => {
        const input = document.getElementById('newTagName');
        if (input) {
            input.focus();
            // 回车键创建标签
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addNewTag(filename);
                }
            });
        }
    }, 100);
}

async function addNewTag(filename) {
    const input = document.getElementById('newTagName');
    const tag = input.value.trim();
    if (!tag) {
        alert('请输入标签名称');
        return;
    }
    
    if (tag.length > 20) {
        alert('标签名称不能超过20个字符');
        return;
    }
    
    await addTagToFile(filename, tag);
    input.value = ''; // 清空输入框
}

async function addTagToFile(filename, tag) {
    try {
        const response = await fetch('/api/files/tag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, tag })
        });
        
        if (response.ok) {
            await loadFiles();
            await loadTags();
            closeTagModal();
            showTagModal(filename); // 重新打开标签窗口
        } else {
            const error = await response.json();
            alert(error.detail || '添加标签失败');
        }
    } catch (error) {
        console.error('添加标签错误:', error);
        alert('添加标签失败');
    }
}

async function removeFileTag(filename, tag) {
    try {
        const response = await fetch('/api/files/tag', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, tag })
        });
        
        if (response.ok) {
            await loadFiles();
            await loadTags();
            closeTagModal();
            showTagModal(filename); // 重新打开标签窗口
        } else {
            const error = await response.json();
            alert(error.detail || '删除标签失败');
        }
    } catch (error) {
        console.error('删除标签错误:', error);
        alert('删除标签失败');
    }
}

function closeTagModal() {
    const modal = document.querySelector('.tag-modal');
    if (modal) {
        modal.remove();
    }
}

function addSelectedTag(tag) {
    if (!selectedTags.includes(tag)) {
        selectedTags.push(tag);
        renderTagFilter();
        filterByTags();
    }
}

function removeSelectedTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    renderTagFilter();
    filterByTags();
}

function clearSelectedTags() {
    selectedTags = [];
    renderTagFilter();
    filterByTags();
}

function filterByTags() {
    let filteredFiles = files;
    
    if (selectedTags.length > 0) {
        filteredFiles = files.filter(file => {
            const fileTags = file.tags || [];
            // 文件必须包含所有选中的标签
            return selectedTags.every(tag => fileTags.includes(tag));
        });
    }
    
    const grid = document.getElementById('fileGrid');
    grid.innerHTML = '';
    
    if (filteredFiles.length === 0) {
        grid.innerHTML = '<div class="no-files">没有找到匹配的文件</div>';
        return;
    }
    
    filteredFiles.forEach(file => {
        const fileItem = createFileItem(file);
        grid.appendChild(fileItem);
    });
}

async function deleteFile(filename) {
    const password = prompt('请输入删除密码:');
    if (!password) return;
    
    if (!confirm(`确定要删除 ${filename} 吗？`)) {
        return;
    }

    try {
        const response = await fetch(`/api/delete/${encodeURIComponent(filename)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            alert('删除成功');
            loadFiles();
        } else {
            const error = await response.json();
            alert(error.detail || '删除失败');
        }
    } catch (error) {
        console.error('删除错误:', error);
        alert('删除失败');
    }
}

function refreshFiles() {
    loadFiles();
}

window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        closeModal();
    }
}

async function copyFileToClipboard(filename) {
    try {
        // 检查浏览器是否支持 Clipboard API
        if (!navigator.clipboard || !navigator.clipboard.write) {
            throw new Error('浏览器不支持剪贴板API');
        }

        const response = await fetch(`/stickers/${filename}`);
        if (!response.ok) {
            throw new Error('获取文件失败');
        }
        
        const blob = await response.blob();
        
        // 检查是否为图片
        if (blob.type.startsWith('image/')) {
            // 剪贴板支持的图片类型（不包括GIF）
            const supportedTypes = ['image/png', 'image/jpeg', 'image/webp'];
            
            if (supportedTypes.includes(blob.type)) {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        [blob.type]: blob
                    })
                ]);
                alert('图片已复制到剪贴板');
            } else {
                // 不支持的格式，复制链接
                throw new Error('不支持的图片格式');
            }
        } else {
            // 非图片文件，复制链接
            const url = `${window.location.origin}/stickers/${filename}`;
            await navigator.clipboard.writeText(url);
            alert('文件链接已复制到剪贴板');
        }
    } catch (err) {
        console.error('复制失败:', err);
        
        // 降级方案：复制链接
        try {
            const url = `${window.location.origin}/stickers/${filename}`;
            await navigator.clipboard.writeText(url);
            alert('复制图片失败，已复制文件链接');
        } catch (linkErr) {
            console.error('复制链接也失败:', linkErr);
            alert('复制失败，请手动下载文件');
        }
    }
}

// 显示GIF复制说明
function showGifCopyInstructions(filename) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 10000; display: flex;
        align-items: center; justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white; padding: 20px; border-radius: 8px;
        max-width: 500px; text-align: center;
    `;
    
    content.innerHTML = `
        <h3>GIF动图复制说明</h3>
        <div style="margin: 20px 0;">
            <img src="/stickers/${filename}" style="max-width: 200px; max-height: 200px; border: 1px solid #ddd;">
        </div>
        <p style="margin: 15px 0; line-height: 1.6; text-align: left;">
            由于浏览器限制，无法直接复制GIF到剪贴板。你可以：<br><br>
            <strong>方法1：拖拽复制</strong><br>
            • 直接拖拽上面的图片到微信、QQ等聊天窗口<br><br>
            <strong>方法2：右键复制</strong><br>
            • 右键点击上面的图片，选择"复制图片"<br>
            • 然后在聊天软件中粘贴<br><br>
            <strong>方法3：下载后发送</strong><br>
            • 点击下载按钮保存到本地<br>
            • 在聊天软件中选择发送文件
        </p>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
            <button onclick="downloadFile('${filename}')" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">下载GIF</button>
            <button onclick="this.closest('div').parentElement.remove()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">关闭</button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // 点击背景关闭
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
}

// 显示复制失败的备选方案
function showCopyFallback(filename) {
    const url = `${window.location.origin}/stickers/${filename}`;
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
    
    const message = isImage 
        ? `复制图片失败。你可以：\n1. 右键点击图片选择"复制图片"\n2. 或复制此链接：${url}`
        : `复制失败。文件链接：${url}`;
    
    // 创建一个模态框显示信息
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 10000; display: flex;
        align-items: center; justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white; padding: 20px; border-radius: 8px;
        max-width: 400px; text-align: center;
    `;
    
    content.innerHTML = `
        <h3>复制失败</h3>
        <p style="margin: 15px 0; line-height: 1.5;">${message.replace(/\n/g, '<br>')}</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button onclick="copyTextToClipboard('${url}')" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">复制链接</button>
            <button onclick="downloadFile('${filename}')" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">下载文件</button>
            <button onclick="this.closest('div').parentElement.remove()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">关闭</button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // 点击背景关闭
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
}

// 复制文本到剪贴板的备用方法
async function copyTextToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        alert('链接已复制到剪贴板');
    } catch (err) {
        // 使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            alert('链接已复制到剪贴板');
        } catch (execErr) {
            alert('复制失败，请手动复制: ' + text);
        }
        
        document.body.removeChild(textArea);
    }
}

function downloadFile(filename) {
    const link = document.createElement('a');
    link.href = `/stickers/${filename}`;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function togglePin(filename) {
    try {
        const response = await fetch('/api/files/pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });
        
        if (response.ok) {
            const result = await response.json();
            await loadFiles(); // 重新加载文件列表
            
            // 显示提示信息
            const message = result.pinned ? '已置顶' : '已取消置顶';
            showToast(message);
        } else {
            const error = await response.json();
            alert(error.detail || '操作失败');
        }
    } catch (error) {
        console.error('置顶操作错误:', error);
        alert('操作失败');
    }
}

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}
