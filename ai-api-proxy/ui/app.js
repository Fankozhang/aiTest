// 全局状态
let config = null;
let currentPage = 'keys';
let refreshInterval = null;

// 带超时的 fetch
async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (error) {
    clearTimeout(timer);
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查服务器是否已启动');
    }
    throw error;
  }
}

// 获取服务器基础 URL
function getServerUrl() {
  const urlEl = document.getElementById('serverUrl');
  let serverBaseUrl = urlEl ? urlEl.textContent : 'http://localhost:3456';
  if (!serverBaseUrl.startsWith('http')) {
    serverBaseUrl = 'http://' + serverBaseUrl;
  }
  return serverBaseUrl;
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 加载配置
  await loadConfig();
  
  // 加载数据目录路径
  await loadDataDir();
  
  // 设置事件监听
  setupNavigation();
  setupModalHandlers();
  setupSettingsHandlers();
  setupLogHandlers();
  setupKeyHandlers();
  
  // 开始自动刷新
  startAutoRefresh();
});

// 加载配置
async function loadConfig() {
  try {
    config = await window.electronAPI.getConfig();
    updateUI();
  } catch (error) {
    console.error('加载配置失败:', error);
    showToast('加载配置失败', 'error');
  }
}

// 更新UI
function updateUI() {
  if (!config) return;
  
  updateKeyList();
  updateModelsList();
  updateStats();
  updateSettingsForm();
  updateServerStatus();
}

// 页面卸载时清理定时器
window.addEventListener('beforeunload', () => {
  stopStatsAutoRefresh();
});

// 导航切换
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      switchPage(page);
    });
  });
}

function switchPage(page) {
  // 更新导航状态
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  
  // 更新页面显示
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });
  
  currentPage = page;
  
  // 停止统计页面自动刷新
  if (page !== 'usage') {
    stopStatsAutoRefresh();
  }
  
  // 页面特定刷新
  if (page === 'logs') {
    refreshLogs();
  } else if (page === 'usage') {
    refreshStats();
    startStatsAutoRefresh();
  } else if (page === 'keys') {
    // 切换到密钥页面时刷新一次配置
    loadConfig();
  }
}

// ===== 密钥管理 =====

function setupKeyHandlers() {
  document.getElementById('addKeyBtn').addEventListener('click', () => openKeyModal());
}

function updateKeyList() {
  const container = document.getElementById('keyList');
  const keys = config.apiKeys || [];
  
  if (keys.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--text-muted);">
        <p>暂无密钥，点击右上角按钮添加</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = keys.map(key => {
    const statusClass = key.status || 'active';
    const statusText = {
      active: '正常',
      rate_limited: '限流中',
      error: '异常',
      disabled: '已禁用'
    }[statusClass] || statusClass;
    
    const models = key.models || [];
    
    return `
      <div class="key-card">
        <div class="key-header">
          <span class="key-name">${escapeHtml(key.name)}</span>
          <span class="key-status ${statusClass}">${statusText}</span>
        </div>
        <div class="key-value">
          <span class="key-value-text" title="${escapeHtml(key.key || '')}">${escapeHtml(key.key || '')}</span>
          <button class="key-copy-btn" onclick="copyKey('${escapeHtml(key.key || '')}')" title="复制">📋</button>
        </div>
        <div class="key-models">
          ${models.length > 0 
            ? models.map(m => `<span class="model-tag">${escapeHtml(m)}</span>`).join('')
            : '<span class="model-tag">所有模型</span>'
          }
        </div>
        <div class="key-actions">
          <button class="btn btn-sm btn-outline" onclick="editKey('${key.id}')">编辑</button>
          <button class="btn btn-sm btn-outline" onclick="toggleKey('${key.id}')">
            ${key.enabled !== false ? '禁用' : '启用'}
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteKey('${key.id}')">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

async function toggleKey(keyId) {
  const key = (config.apiKeys || []).find(k => k.id === keyId);
  if (!key) return;
  
  try {
    await window.electronAPI.updateApiKey(keyId, { enabled: key.enabled === false });
    await loadConfig();
    showToast('密钥状态已更新');
  } catch (error) {
    console.error('更新密钥失败:', error);
    showToast('更新失败', 'error');
  }
}

async function deleteKey(keyId) {
  if (!confirm('确定要删除此密钥吗？此操作不可恢复。')) return;
  
  try {
    await window.electronAPI.removeApiKey(keyId);
    await loadConfig();
    showToast('密钥已删除');
  } catch (error) {
    console.error('删除密钥失败:', error);
    showToast('删除失败', 'error');
  }
}

// 模态框
function setupModalHandlers() {
  const modal = document.getElementById('keyModal');
  const closeBtn = document.getElementById('modalClose');
  const cancelBtn = document.getElementById('modalCancel');
  const saveBtn = document.getElementById('modalSave');
  
  closeBtn.addEventListener('click', closeKeyModal);
  cancelBtn.addEventListener('click', closeKeyModal);
  
  document.querySelector('.modal-backdrop').addEventListener('click', closeKeyModal);
  
saveBtn.addEventListener('click', saveKey);
}

// 模型检测和选择（添加密钥）
let detectedModels = [];

document.getElementById('detectModelsBtn').addEventListener('click', detectModels);
document.getElementById('addModelBtn').addEventListener('click', addSelectedModel);
document.getElementById('modelSearch').addEventListener('input', filterModelDropdown);
document.getElementById('modelSelect').addEventListener('dblclick', function() {
  if (this.value) addSelectedModel();
});

// 编辑密钥模型检测和选择
let editDetectedModels = [];

document.getElementById('editDetectModelsBtn').addEventListener('click', editDetectModels);
document.getElementById('editAddModelBtn').addEventListener('click', editAddSelectedModel);
document.getElementById('editModelSearch').addEventListener('input', filterEditModelDropdown);
document.getElementById('editModelSelect').addEventListener('dblclick', function() {
  if (this.value) editAddSelectedModel();
});

// 当前选择的模型列表
let selectedModels = [];

function openKeyModal() {
  document.getElementById('modalTitle').textContent = '添加密钥';
  document.getElementById('keyName').value = '';
  document.getElementById('keyValue').value = '';
  document.getElementById('keyBaseUrl').value = '';
  selectedModels = [];
  updateSelectedModelsUI();
  document.getElementById('modelSelect').innerHTML = '<option value="">-- 检测后可选择模型 --</option>';
  document.getElementById('keyModal').classList.add('active');
}

// 检测可用模型
async function detectModels() {
  const baseUrl = document.getElementById('keyBaseUrl').value.trim() || 'https://api.openai.com/v1';
  const apiKey = document.getElementById('keyValue').value.trim();
  
  if (!apiKey) {
    showToast('请先输入 API Key', 'error');
    return;
  }
  
  const detectBtn = document.getElementById('detectModelsBtn');
  const modelSelect = document.getElementById('modelSelect');
  const modelSearch = document.getElementById('modelSearch');
  
  detectBtn.disabled = true;
  detectBtn.innerHTML = '<span class="loading-spinner"></span> 检测中...';
  
  try {
    const url = baseUrl.replace(/\/$/, '') + '/models';
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const models = data.data || data.models || [];
    
    // 存储检测到的模型
    detectedModels = models.map(m => {
      if (typeof m === 'string') return { id: m };
      return { id: m.id, name: m.id };
    }).sort((a, b) => a.id.localeCompare(b.id));
    
    // 切换为多选模式
    modelSelect.multiple = true;
    modelSelect.size = Math.min(8, detectedModels.length + 1);
    updateModelDropdown(modelSelect, detectedModels);
    modelSearch.value = '';
    
    showToast(`检测到 ${detectedModels.length} 个模型，按 Ctrl 可多选`);
  } catch (error) {
    console.error('检测模型失败:', error);
    showToast('检测模型失败: ' + error.message, 'error');
    modelSelect.innerHTML = '<option value="">-- 检测失败 --</option>';
  } finally {
    detectBtn.disabled = false;
    detectBtn.textContent = '检测模型';
  }
}

// 更新下拉框选项
function updateModelDropdown(selectElement, models) {
  if (!models || models.length === 0) {
    selectElement.innerHTML = '<option value="">-- 无可用模型 --</option>';
    return;
  }
  // 多选提示
  selectElement.innerHTML = '<option value="">-- 按 Ctrl 多选 --</option>' + 
    models.map(m => `<option value="${m.id}">${m.id}</option>`).join('');
}

// 搜索过滤模型
function filterModelDropdown() {
  const searchText = document.getElementById('modelSearch').value.toLowerCase().trim();
  const modelSelect = document.getElementById('modelSelect');
  
  if (!detectedModels.length) return;
  
  const filtered = detectedModels.filter(m => 
    m.id.toLowerCase().includes(searchText)
  );
  
  // 保持多选模式
  modelSelect.multiple = true;
  modelSelect.size = Math.min(8, filtered.length + 1);
  updateModelDropdown(modelSelect, filtered);
}

// 添加选中的模型（支持 Ctrl 多选）
function addSelectedModel() {
  const modelSelect = document.getElementById('modelSelect');
  const selectedOptions = Array.from(modelSelect.selectedOptions).filter(opt => opt.value);
  
  if (selectedOptions.length === 0) {
    showToast('请先选择模型', 'error');
    return;
  }
  
  let addedCount = 0;
  selectedOptions.forEach(opt => {
    if (!selectedModels.includes(opt.value)) {
      selectedModels.push(opt.value);
      addedCount++;
    }
  });
  
  if (addedCount > 0) {
    updateSelectedModelsUI();
    // 重置选择（不清除其他已选择的，允许连续添加）
    Array.from(modelSelect.options).forEach(opt => opt.selected = false);
    showToast(`已添加 ${addedCount} 个模型`);
  } else {
    showToast('所有模型已存在', 'error');
  }
}

// 移除已选模型
function removeModel(model) {
  selectedModels = selectedModels.filter(m => m !== model);
  updateSelectedModelsUI();
}

// 更新已选模型显示
function updateSelectedModelsUI() {
  const container = document.getElementById('selectedModels');
  
  if (selectedModels.length === 0) {
    container.innerHTML = '<span class="hint">点击"检测模型"获取可用模型，然后添加</span>';
  } else {
    container.innerHTML = selectedModels.map(m => `
      <span class="selected-model-tag">
        ${escapeHtml(m)}
        <button type="button" onclick="removeModel('${m}')" title="移除">&times;</button>
      </span>
    `).join('');
  }
}

// 全局函数供 onclick 调用
window.removeModel = removeModel;

function closeKeyModal() {
  document.getElementById('keyModal').classList.remove('active');
}

async function saveKey() {
  const name = document.getElementById('keyName').value.trim();
  const key = document.getElementById('keyValue').value.trim();
  const baseUrl = document.getElementById('keyBaseUrl').value.trim();
  
  if (!name || !key) {
    showToast('请填写密钥名称和 API Key', 'error');
    return;
  }
  
  // 使用选中的模型列表
  const models = selectedModels;
  
  try {
    await window.electronAPI.addApiKey({
      name,
      key,
      baseUrl: baseUrl || undefined,
      models,
      enabled: true
    });
    
    closeKeyModal();
    await loadConfig();
    showToast('密钥添加成功');
  } catch (error) {
    console.error('添加密钥失败:', error);
    showToast('添加失败', 'error');
  }
}

// 编辑密钥
let currentEditingKey = null;

function editKey(keyId) {
  const key = (config.apiKeys || []).find(k => k.id === keyId);
  if (!key) return;
  
  currentEditingKey = key;
  
  document.getElementById('editKeyId').value = key.id;
  document.getElementById('editKeyName').value = key.name || '';
  document.getElementById('editKeyValue').value = key.key || '';
  document.getElementById('editKeyBaseUrl').value = key.baseUrl || '';
  
  // 加载已选的模型
  editSelectedModels = [...(key.models || [])];
  updateEditSelectedModelsUI();
  
  // 重置模型检测下拉框
  document.getElementById('editModelSelect').innerHTML = '<option value="">-- 检测后可选择模型 --</option>';
  
  document.getElementById('editKeyModal').classList.add('active');
}

// 编辑模态框事件处理
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('editModalClose').addEventListener('click', closeEditModal);
  document.getElementById('editModalCancel').addEventListener('click', closeEditModal);
  document.querySelector('#editKeyModal .modal-backdrop').addEventListener('click', closeEditModal);
  document.getElementById('editModalSave').addEventListener('click', saveEditKey);
  
  // 编辑模态框的模型检测
  document.getElementById('editDetectModelsBtn').addEventListener('click', editDetectModels);
  document.getElementById('editAddModelBtn').addEventListener('click', editAddSelectedModel);
});

// 编辑模态框的模型选择状态
let editSelectedModels = [];

function closeEditModal() {
  document.getElementById('editKeyModal').classList.remove('active');
  currentEditingKey = null;
  editSelectedModels = [];
}

// 编辑时检测模型
async function editDetectModels() {
  const baseUrl = document.getElementById('editKeyBaseUrl').value.trim() || 'https://api.openai.com/v1';
  const apiKey = currentEditingKey?.key;
  
  if (!apiKey) {
    showToast('无法获取 API Key', 'error');
    return;
  }
  
  const detectBtn = document.getElementById('editDetectModelsBtn');
  const modelSelect = document.getElementById('editModelSelect');
  const modelSearch = document.getElementById('editModelSearch');
  
  detectBtn.disabled = true;
  detectBtn.innerHTML = '<span class="loading-spinner"></span> 检测中...';
  
  try {
    const url = baseUrl.replace(/\/$/, '') + '/models';
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const models = data.data || data.models || [];
    
    // 存储检测到的模型
    editDetectedModels = models.map(m => {
      if (typeof m === 'string') return { id: m };
      return { id: m.id, name: m.id };
    }).sort((a, b) => a.id.localeCompare(b.id));
    
    // 切换为多选模式
    modelSelect.multiple = true;
    modelSelect.size = Math.min(8, editDetectedModels.length + 1);
    updateEditModelDropdown(modelSelect, editDetectedModels);
    modelSearch.value = '';
    
    showToast(`检测到 ${editDetectedModels.length} 个模型，按 Ctrl 可多选`);
  } catch (error) {
    console.error('检测模型失败:', error);
    showToast('检测模型失败: ' + error.message, 'error');
    modelSelect.innerHTML = '<option value="">-- 检测失败 --</option>';
  } finally {
    detectBtn.disabled = false;
    detectBtn.textContent = '检测模型';
  }
}

// 更新编辑页面的下拉框选项
function updateEditModelDropdown(selectElement, models) {
  if (!models || models.length === 0) {
    selectElement.innerHTML = '<option value="">-- 无可用模型 --</option>';
    return;
  }
  // 多选提示
  selectElement.innerHTML = '<option value="">-- 按 Ctrl 多选 --</option>' + 
    models.map(m => `<option value="${m.id}">${m.id}</option>`).join('');
}

// 搜索过滤编辑页面的模型
function filterEditModelDropdown() {
  const searchText = document.getElementById('editModelSearch').value.toLowerCase().trim();
  const modelSelect = document.getElementById('editModelSelect');
  
  if (!editDetectedModels.length) return;
  
  const filtered = editDetectedModels.filter(m => 
    m.id.toLowerCase().includes(searchText)
  );
  
  // 保持多选模式
  modelSelect.multiple = true;
  modelSelect.size = Math.min(8, filtered.length + 1);
  updateEditModelDropdown(modelSelect, filtered);
}

// 编辑时添加模型（支持 Ctrl 多选）
function editAddSelectedModel() {
  const modelSelect = document.getElementById('editModelSelect');
  const selectedOptions = Array.from(modelSelect.selectedOptions).filter(opt => opt.value);
  
  if (selectedOptions.length === 0) {
    showToast('请先选择模型', 'error');
    return;
  }
  
  let addedCount = 0;
  selectedOptions.forEach(opt => {
    if (!editSelectedModels.includes(opt.value)) {
      editSelectedModels.push(opt.value);
      addedCount++;
    }
  });
  
  if (addedCount > 0) {
    updateEditSelectedModelsUI();
    // 重置选择
    Array.from(modelSelect.options).forEach(opt => opt.selected = false);
    showToast(`已添加 ${addedCount} 个模型`);
  } else {
    showToast('所有模型已存在', 'error');
  }
}

// 编辑时移除模型
function editRemoveModel(model) {
  editSelectedModels = editSelectedModels.filter(m => m !== model);
  updateEditSelectedModelsUI();
}

// 更新编辑模态框的已选模型显示
function updateEditSelectedModelsUI() {
  const container = document.getElementById('editSelectedModels');
  
  if (editSelectedModels.length === 0) {
    container.innerHTML = '<span class="hint">点击"检测模型"获取可用模型，然后添加</span>';
  } else {
    container.innerHTML = editSelectedModels.map(m => `
      <span class="selected-model-tag">
        ${escapeHtml(m)}
        <button type="button" onclick="editRemoveModel('${m}')" title="移除">&times;</button>
      </span>
    `).join('');
  }
}

// 全局函数
window.editRemoveModel = editRemoveModel;

async function saveEditKey() {
  if (!currentEditingKey) return;
  
  const keyId = document.getElementById('editKeyId').value;
  const name = document.getElementById('editKeyName').value.trim();
  const baseUrl = document.getElementById('editKeyBaseUrl').value.trim();
  
  if (!name) {
    showToast('请填写密钥名称', 'error');
    return;
  }
  
  // 使用选中的模型列表
  const models = editSelectedModels;
  
  try {
    await window.electronAPI.updateApiKey(keyId, {
      name,
      models,
      baseUrl: baseUrl || ''
    });
    
    closeEditModal();
    await loadConfig();
    showToast('密钥已更新');
  } catch (error) {
    console.error('更新密钥失败:', error);
    showToast('更新失败', 'error');
  }
}

// ===== 模型列表 =====

// 模型测试状态存储
let modelTestStatus = {};
let isTestingAll = false;

function updateModelsList() {
  const modelsList = document.getElementById('modelsList');
  const modelCount = document.getElementById('modelCount');
  const proxyUrl = document.getElementById('proxyUrl');
  const removeBadBtn = document.getElementById('removeBadModelsBtn');
  
  // 使用 getServerUrl() 函数
  proxyUrl.textContent = `${getServerUrl()}/v1`;
   
  // 收集所有可用模型
  const allModels = new Set();
  (config.apiKeys || []).forEach(key => {
    if (key.enabled !== false && key.models) {
      key.models.forEach(model => allModels.add(model));
    }
  });
  
  const models = Array.from(allModels).sort();
  modelCount.textContent = `${models.length} 个模型`;
  
// 检查是否有不可用的模型
  const badModels = models.filter(m => {
    const s = modelTestStatus[m];
    return s && typeof s === 'object' && s.status === 'error';
  });
  removeBadBtn.style.display = badModels.length > 0 ? 'inline-flex' : 'none';
  if (badModels.length > 0) {
    removeBadBtn.textContent = `删除 ${badModels.length} 个不可用模型`;
  }
  
  if (models.length === 0) {
    modelsList.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--text-muted);">
        <p>暂无可用模型，请先添加支持模型的密钥</p>
      </div>
    `;
    return;
  }
  
modelsList.innerHTML = models.map(model => {
    const status = modelTestStatus[model];
    let statusClass = '';
let statusText = '';
    let durationText = '';
    let errorText = '';
    
    if (status && typeof status === 'object') {
      statusClass = status.status;
      statusText = { 'ok': '可用', 'error': '不可用' }[status.status] || '';
      if (status.duration) {
        durationText = `${status.duration}ms`;
      }
      if (status.error) {
        errorText = sanitizeDisplayText(status.error);
      }
    } else {
      statusClass = status || '';
      statusText = { 'ok': '可用', 'error': '不可用', 'testing': '测试中...' }[status] || '';
    }
    const isTesting = status === 'testing' || isTestingAll;
    const statusIcon = (status && typeof status === 'object' && status.status) === 'ok' 
      ? '✓' : (status && typeof status === 'object' && status.status) === 'error' ? '✗' : '🤖';
    
return `
      <div class="model-card ${statusClass}" data-model="${escapeHtml(model)}">
        <div class="model-icon">${statusIcon}</div>
        <div class="model-info">
          <h4>
            <span class="model-name" title="${escapeHtml(model)}">${escapeHtml(model)}</span>
            <button class="btn-icon copy-btn" onclick="copyModelName('${escapeHtml(model)}')" title="复制模型名">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </h4>
          <p><span class="key-count">${countKeysForModel(model)}</span> 个密钥</p>
          <button class="btn btn-sm btn-outline model-test-btn" onclick="testSingleModel('${escapeHtml(model)}')" ${isTesting ? 'disabled' : ''}>测试</button>
          ${status ? `<span class="model-status ${statusClass}">${statusText}</span>` : ''}
          ${durationText ? `<span class="model-duration">${durationText}</span>` : ''}
          ${errorText ? `<span class="model-error" title="${escapeHtml(errorText)}">${escapeHtml(errorText)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function countKeysForModel(model) {
  return (config.apiKeys || []).filter(key => 
    key.enabled !== false && key.models && key.models.includes(model)
  ).length;
}

// 测试单个模型
async function testSingleModel(model) {
  // 如果正在测试所有模型，则禁用单个测试
  if (isTestingAll) {
    showToast('正在测试所有模型，请等待完成', 'error');
    return;
  }
  
  const card = document.querySelector(`.model-card[data-model="${model}"]`);
  if (!card) return;
  
  // 标记为测试中
  modelTestStatus[model] = 'testing';
  updateModelsList();
  
  // 通过代理测试模型
  try {
    // 使用当前页面加载的服务器地址
    const statusEl = document.getElementById('serverUrl');
    let serverUrl = statusEl ? statusEl.textContent : 'http://localhost:3456';
    
    // 确保 URL 格式正确
    if (!serverUrl.startsWith('http')) {
      serverUrl = 'http://' + serverUrl;
    }
    
    console.log('[testSingleModel] 测试模型:', model, 'URL:', serverUrl);
    
    // 首先检查服务器是否可达
    try {
      const healthCheck = await fetchWithTimeout(`${serverUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, 10000);
      console.log('[testSingleModel] 健康检查状态:', healthCheck.status);
      if (!healthCheck.ok) {
        showToast('服务器不可达，请检查服务是否启动', 'error');
        modelTestStatus[model] = { status: 'error', duration: 0 };
        updateModelsList();
        return;
      }
    } catch (healthErr) {
      console.error('[testSingleModel] 健康检查失败:', healthErr.message);
      showToast('无法连接到服务器: ' + healthErr.message, 'error');
      modelTestStatus[model] = { status: 'error', duration: 0 };
      updateModelsList();
      return;
    }
    
    // 检查是否有配置该模型的 API Key
    const keyCount = countKeysForModel(model);
    if (keyCount === 0) {
      showToast('没有配置该模型的 API Key', 'error');
      modelTestStatus[model] = { status: 'error', duration: 0, error: 'No API key for model' };
      updateModelsList();
      return;
    }
    
    // 根据模型类型选择测试接口
    let endpoint = '/v1/chat/completions';
    let body = {
      model: model,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5
    };

    // 检测模型类型并选择对应接口
    if (model.startsWith('claude') || model.startsWith('anthropic')) {
      // Claude/Anthropic 模型使用 messages 接口
      endpoint = '/v1/messages';
      body = {
        model: model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5
      };
    } else if (model.startsWith('img/') || model.includes('image') || model.includes('dall-e')) {
      endpoint = '/v1/images/generations';
      body = {
        model: model,
        prompt: 'A small cat'
      };
    } else if (model.includes('embedding')) {
      endpoint = '/v1/embeddings';
      body = {
        model: model,
        input: 'Hi'
      };
    }
    
const startTime = Date.now();
    const response = await fetchWithTimeout(`${serverUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }, 30000);
    const duration = Date.now() - startTime;
    
    // 先检查 HTTP 状态码
    let isOk = response.ok && response.status >= 200 && response.status < 300;
    let errorMsg = '';
    
    // 如果 HTTP 状态码成功，解析响应体检查是否有 error 字段
    if (isOk) {
      try {
        const data = await response.clone().json();
        if (data.error) {
          isOk = false;
          errorMsg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
        }
      } catch (e) {
        // 非 JSON 响应，忽略
      }
    }
    
    if (isOk) {
      modelTestStatus[model] = { status: 'ok', duration };
      showToast(`模型 ${model} 可用，耗时 ${duration}ms`);
    } else {
      const errText = errorMsg || `HTTP ${response.status}`;
      modelTestStatus[model] = { status: 'error', duration, error: errText };
      showToast(`模型 ${model} 不可用: ${errText}`, 'error');
    }
  } catch (error) {
    modelTestStatus[model] = { status: 'error', duration: 0 };
    showToast(`模型 ${model} 测试失败: ${error.message}`, 'error');
  }
  
  updateModelsList();
}

// 测试所有模型
async function testAllModels() {
  // 禁用刷新按钮
  document.getElementById('refreshModelsBtn').disabled = true;
  
  const models = Array.from(new Set((config.apiKeys || []).flatMap(key => 
    key.enabled !== false && key.models ? key.models : []
  )));
  
  if (models.length === 0) {
    showToast('没有可测试的模型', 'error');
    document.getElementById('refreshModelsBtn').disabled = false;
    return;
  }
  
  isTestingAll = true;
  document.getElementById('testAllModelsBtn').disabled = true;
  document.getElementById('testAllModelsBtn').innerHTML = '<span class="loading-spinner"></span> 测试中...';
  
for (const model of models) {
    modelTestStatus[model] = 'testing';
    updateModelsList();
    
    try {
      const serverUrl = config.server?.host 
        ? `http://${config.server.host}:${config.server.port || 3456}`
        : 'http://localhost:3456';
      
      // 根据模型类型选择测试接口
      let endpoint = '/v1/chat/completions';
      let body = {
        model: model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5
      };

      if (model.startsWith('claude') || model.startsWith('anthropic')) {
        endpoint = '/v1/messages';
        body = {
          model: model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        };
      } else if (model.startsWith('img/') || model.includes('image') || model.includes('dall-e')) {
        endpoint = '/v1/images/generations';
        body = {
          model: model,
          prompt: 'A small cat'
        };
      } else if (model.includes('embedding')) {
        endpoint = '/v1/embeddings';
        body = {
          model: model,
          input: 'Hi'
        };
      }
      
      const startTime = Date.now();
      const response = await fetchWithTimeout(`${serverUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }, 30000);
      
      const duration = Date.now() - startTime;
      
      // 检查 HTTP 状态码和响应体错误
      let isOk = response.ok && response.status >= 200 && response.status < 300;
      let errorMsg = '';
      
      if (isOk) {
        try {
          const data = await response.json();
          if (data.error) {
            isOk = false;
            errorMsg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
          }
        } catch (e) {}
      }
      
      modelTestStatus[model] = isOk 
        ? { status: 'ok', duration } 
        : { status: 'error', duration, error: errorMsg || `HTTP ${response.status}` };
    } catch (error) {
      modelTestStatus[model] = { status: 'error', duration: 0 };
    }
    
    updateModelsList();
    await new Promise(r => setTimeout(r, 500));
  }
  
  isTestingAll = false;
  document.getElementById('testAllModelsBtn').disabled = false;
  document.getElementById('testAllModelsBtn').textContent = '测试所有模型';
  document.getElementById('refreshModelsBtn').disabled = false;
  
  const okCount = models.filter(m => {
    const s = modelTestStatus[m];
    return s && typeof s === 'object' && s.status === 'ok';
  }).length;
  const errCount = models.filter(m => {
    const s = modelTestStatus[m];
    return s && typeof s === 'object' && s.status === 'error';
  }).length;
  showToast(`测试完成：${okCount} 个可用，${errCount} 个不可用`);
}

// 刷新模型列表（清除测试状态）
function refreshModelsList() {
  if (isTestingAll) {
    showToast('正在测试所有模型，请等待完成', 'error');
    return;
  }
  
  modelTestStatus = {};
  updateModelsList();
  showToast('已刷新模型列表');
}

// 删除不可用模型
async function removeBadModels() {
  const badModels = Object.entries(modelTestStatus)
    .filter(([_, status]) => {
      return status && typeof status === 'object' && status.status === 'error';
    })
    .map(([model, _]) => model);
  
  if (badModels.length === 0) return;
  
  if (!confirm(`确定要删除这 ${badModels.length} 个不可用模型吗？`)) return;
  
  // 遍历所有密钥，移除不可用的模型
  for (const key of config.apiKeys || []) {
    if (key.models) {
      key.models = key.models.filter(m => !badModels.includes(m));
    }
  }
  
  // 保存配置
  try {
    await window.electronAPI.saveConfig({ apiKeys: config.apiKeys });
    await loadConfig();
    
    // 清除已删除模型的状态
    badModels.forEach(m => delete modelTestStatus[m]);
    
    updateModelsList();
    showToast(`已删除 ${badModels.length} 个不可用模型`);
  } catch (error) {
    showToast('删除失败', 'error');
  }
}

// 绑定模型页面按钮事件
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('testAllModelsBtn').addEventListener('click', testAllModels);
  document.getElementById('removeBadModelsBtn').addEventListener('click', removeBadModels);
  document.getElementById('refreshModelsBtn').addEventListener('click', refreshModelsList);
});

// 暴露给全局
window.testSingleModel = testSingleModel;

// ===== 统计信息 =====

function updateStats() {
  // 初始显示，详细数据通过API获取
}

async function refreshStats() {
  try {
    const [stats, status] = await Promise.all([
      window.electronAPI.getStats(),
      window.electronAPI.getServerStatus()
    ]);
    
    // 总计
    document.getElementById('statTotal').textContent = stats.total?.requests || 0;
    document.getElementById('statSuccess').textContent = stats.total?.success || 0;
    document.getElementById('statFailed').textContent = stats.total?.failed || 0;
    document.getElementById('statRateLimited').textContent = stats.total?.rateLimit || 0;
    
    // 今日统计
    const today = stats.today || {};
    document.getElementById('statTodayTotal').textContent = today.requests || 0;
    document.getElementById('statTodaySuccess').textContent = today.success || 0;
    document.getElementById('statTodayFailed').textContent = today.failed || 0;
    document.getElementById('statTodayRateLimited').textContent = today.rateLimit || 0;
    
    // 本月统计
    const thisMonth = stats.thisMonth || {};
    document.getElementById('statMonthTotal').textContent = thisMonth.requests || 0;
    document.getElementById('statMonthSuccess').textContent = thisMonth.success || 0;
    document.getElementById('statMonthFailed').textContent = thisMonth.failed || 0;
    document.getElementById('statMonthRateLimited').textContent = thisMonth.rateLimit || 0;
    
    // 今年统计
    const thisYear = stats.thisYear || {};
    document.getElementById('statYearTotal').textContent = thisYear.requests || 0;
    document.getElementById('statYearSuccess').textContent = thisYear.success || 0;
    document.getElementById('statYearFailed').textContent = thisYear.failed || 0;
    document.getElementById('statYearRateLimited').textContent = thisYear.rateLimit || 0;
    
    // 更新图表
    updateUsageChart(status.keys || []);
  } catch (error) {
    console.error('刷新统计失败:', error);
  }
}

let statsRefreshInterval = null;

function startStatsAutoRefresh() {
  // 防止重复创建定时器
  if (statsRefreshInterval) {
    return;
  }
  statsRefreshInterval = setInterval(() => {
    if (currentPage === 'usage') {
      refreshStats();
    } else {
      // 页面已切换，停止定时器
      stopStatsAutoRefresh();
    }
  }, 10000);
}

function stopStatsAutoRefresh() {
  if (statsRefreshInterval) {
    clearInterval(statsRefreshInterval);
    statsRefreshInterval = null;
  }
}

function updateUsageChart(keys) {
  const chart = document.getElementById('keyUsageChart');
  
  if (keys.length === 0) {
    chart.innerHTML = '<p style="text-align: center; color: var(--text-muted);">暂无数据</p>';
    return;
  }
  
  // 计算最大值用于比例
  const maxReqs = Math.max(...keys.map(k => k.stats?.totalRequests || 0), 1);
  
  chart.innerHTML = keys.map(key => {
    const requests = key.stats?.totalRequests || 0;
    const percentage = (requests / maxReqs * 100).toFixed(1);
    
    return `
      <div class="usage-bar">
        <span class="usage-bar-label">${escapeHtml(key.name)}</span>
        <div class="usage-bar-track">
          <div class="usage-bar-fill" style="width: ${percentage}%">
            <span class="usage-bar-value">${requests}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== 日志 =====

function setupLogHandlers() {
  document.getElementById('refreshLogs').addEventListener('click', refreshLogs);
  document.getElementById('clearLogs').addEventListener('click', clearLogs);
  document.getElementById('refreshStatsBtn').addEventListener('click', () => {
    refreshStats();
  });
}

async function refreshLogs() {
  try {
    const response = await fetch(`http://${config.server?.host || 'localhost'}:${config.server?.port || 3456}/admin/logs?limit=100`);
    const data = await response.json();
    
    renderLogs(data.entries || []);
  } catch (error) {
    console.error('获取日志失败:', error);
    document.getElementById('logsTableBody').innerHTML = `
      <tr><td colspan="7" style="text-align: center; color: var(--text-muted);">无法连接到服务器</td></tr>
    `;
  }
}

function renderLogs(entries) {
  const tbody = document.getElementById('logsTableBody');
  const emptyEl = document.getElementById('logsEmpty');
  
  if (entries.length === 0) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  
  emptyEl.style.display = 'none';
  
  // 仅在数据确实无效时过滤
  const filteredEntries = entries.filter(entry => entry && entry.timestamp);
  
  tbody.innerHTML = filteredEntries.map(entry => {
    const time = new Date(entry.timestamp).toLocaleString('zh-CN');
    const isRateLimit = entry.status === 429;
    const isError = entry.status >= 400 || entry.error;
    let statusClass = 'success';
    if (isRateLimit) statusClass = 'rate-limit';
    else if (isError) statusClass = 'error';
    
    let errorText = '-';
    let errorDetails = '';
    if (entry.error) {
      let msg = '';
      if (typeof entry.error === 'string') {
        msg = entry.error;
      } else if (entry.error.message) {
        msg = typeof entry.error.message === 'string' ? entry.error.message : JSON.stringify(entry.error.message);
      } else if (entry.error.error) {
        msg = typeof entry.error.error === 'string' ? entry.error.error : JSON.stringify(entry.error.error);
      } else {
        msg = JSON.stringify(entry.error);
      }
      msg = msg || 'Unknown error';
      errorText = sanitizeDisplayText(msg);
      errorDetails = errorText;
      
      if (entry.error.type) {
        errorDetails += `\n类型: ${entry.error.type}`;
      }
    }
    
    if (isRateLimit && entry.responseHeaders) {
      const remaining = entry.responseHeaders['x-ratelimit-remaining'];
      const reset = entry.responseHeaders['x-ratelimit-reset'];
      if (remaining !== undefined) {
        errorDetails += `\n剩余次数: ${remaining}`;
      }
      if (reset !== undefined) {
        errorDetails += `\n重置时间: ${new Date(reset * 1000).toLocaleString('zh-CN')}`;
      }
    }
    
    const rowClass = isRateLimit ? 'log-row-rate-limit' : (isError ? 'log-row-error' : '');
    
    return `
      <tr class="${rowClass}">
        <td>${time}</td>
        <td>${entry.method}</td>
        <td>${escapeHtml(entry.model || '-')}</td>
        <td>${escapeHtml(entry.keyName || '-')}</td>
        <td><span class="log-status ${statusClass}">${entry.status}</span></td>
        <td>${entry.duration}ms</td>
        <td title="${escapeHtml(errorDetails)}">${escapeHtml(errorText)}</td>
      </tr>
    `;
  }).join('');
}

async function clearLogs() {
  if (!confirm('确定要清空所有日志吗？此操作不可恢复。')) return;
  
  try {
    const response = await fetch(`http://${config.server?.host || 'localhost'}:${config.server?.port || 3456}/admin/logs`, {
      method: 'DELETE'
    });
    const result = await response.json();
    
    if (result.success) {
      showToast('日志已清空');
      renderLogs([]); // 立即清空当前显示
    } else {
      showToast('清空失败: ' + result.message, 'error');
    }
  } catch (error) {
    console.error('清空日志失败:', error);
    showToast('清空失败，请检查服务器连接', 'error');
  }
}

// ===== 设置 =====

function setupSettingsHandlers() {
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('resetSettings').addEventListener('click', async () => {
    if (confirm('恢复默认设置？')) {
      // 先将表单设为默认值
      document.getElementById('serverPort').value = 3456;
      document.getElementById('serverHost').value = 'localhost';
      document.getElementById('maxConcurrent').value = 5;
      document.getElementById('circuitBreakerThreshold').value = 3;
      document.getElementById('retryAfterSeconds').value = 60;
      document.getElementById('circuitBreakerResetSeconds').value = 60;
      document.getElementById('logEnabled').checked = true;
      document.getElementById('logRequestHeaders').checked = true;
      document.getElementById('logResponseHeaders').checked = true;
      
      // 调用保存设置
      await saveSettings();
    }
  });
}

async function loadDataDir() {
  try {
    const dataDir = await window.electronAPI.getDataDir();
    const el = document.getElementById('dataDirPath');
    if (el) {
      el.textContent = dataDir || '未知路径';
    }
  } catch (error) {
    console.error('加载数据目录失败:', error);
    const el = document.getElementById('dataDirPath');
    if (el) {
      el.textContent = '加载失败';
    }
  }
}

function updateSettingsForm() {
  if (!config) return;
  
  document.getElementById('serverPort').value = config.server?.port ?? 3456;
  document.getElementById('serverHost').value = config.server?.host || 'localhost';
  document.getElementById('maxConcurrent').value = config.rateLimit?.maxConcurrentPerKey ?? 5;
  document.getElementById('circuitBreakerThreshold').value = config.rateLimit?.circuitBreakerThreshold ?? 3;
  document.getElementById('retryAfterSeconds').value = config.rateLimit?.retryAfterSeconds ?? 60;
  document.getElementById('circuitBreakerResetSeconds').value = config.rateLimit?.circuitBreakerResetSeconds ?? 60;
  document.getElementById('maxRetries').value = config.rateLimit?.maxRetries ?? 5;
  document.getElementById('retryDelayMs').value = config.rateLimit?.retryDelayMs ?? 300;
  document.getElementById('logEnabled').checked = config.logging?.enabled !== false;
  document.getElementById('logRequestHeaders').checked = config.logging?.logRequestHeaders !== false;
  document.getElementById('logResponseHeaders').checked = config.logging?.logResponseHeaders !== false;
}

async function saveSettings() {
  const parseNum = (id, def) => {
    const val = parseInt(document.getElementById(id).value);
    return isNaN(val) ? def : val;
  };

  const newConfig = {
    server: {
      port: parseNum('serverPort', 3456),
      host: document.getElementById('serverHost').value || 'localhost'
    },
    rateLimit: {
      maxConcurrentPerKey: parseNum('maxConcurrent', 5),
      circuitBreakerThreshold: parseNum('circuitBreakerThreshold', 3),
      retryAfterSeconds: parseNum('retryAfterSeconds', 60),
      circuitBreakerResetSeconds: parseNum('circuitBreakerResetSeconds', 60),
      maxRetries: parseNum('maxRetries', 5),
      retryDelayMs: parseNum('retryDelayMs', 300)
    },
    logging: {
      enabled: document.getElementById('logEnabled').checked,
      logRequestHeaders: document.getElementById('logRequestHeaders').checked,
      logResponseHeaders: document.getElementById('logResponseHeaders').checked
    }
  };
  
  try {
    const result = await window.electronAPI.saveConfig(newConfig);
    if (result.success) {
      // 重新加载配置，确保 apiKeys 不丢失
      config = await window.electronAPI.getConfig();
      updateUI();
      updateServerStatus();
      showToast('设置已保存，服务器将重启');
    } else {
      showToast('保存失败', 'error');
    }
  } catch (error) {
    console.error('保存设置失败:', error);
    showToast('保存失败', 'error');
  }
}

// ===== 服务器状态 =====

function updateServerStatus() {
  const statusEl = document.getElementById('serverStatus');
  const urlEl = document.getElementById('serverUrl');
  
  const url = config.server 
    ? `http://${config.server.host || 'localhost'}:${config.server.port || 3456}`
    : 'http://localhost:3456';
  
  urlEl.textContent = url;
}

// ===== 辅助功能 =====

let lastStatsHash = '';

function startAutoRefresh() {
  // 只在统计页面刷新统计数据，不刷新密钥列表
  // 密钥列表只有用户主动操作时才需要刷新
  refreshInterval = setInterval(() => {
    if (currentPage === 'usage') {
      refreshStats();
    }
    // 密钥页面不再自动刷新，避免闪烁
  }, 5000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 检测是否为 HTML 内容
function isHtmlContent(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim().toLowerCase();
  return trimmed.startsWith('<!doctype html') || 
         trimmed.startsWith('<html') || 
         (trimmed.includes('<body') && trimmed.includes('</body>'));
}

// 清洗显示文本
function sanitizeDisplayText(text) {
  if (!text) return '';
  if (isHtmlContent(text)) {
    return '[HTML 错误页面 - 可能是上游服务 502/503 错误]';
  }
  // 如果文本过长且没有空格（可能是 base64 或其他数据），进行截断
  if (text.length > 1000) {
    return text.substring(0, 500) + '... [内容过长已截断]';
  }
  return text;
}

function copyToClipboard(elementId) {
  const el = document.getElementById(elementId);
  navigator.clipboard.writeText(el.textContent).then(() => {
    showToast('已复制到剪贴板');
  }).catch(() => {
    showToast('复制失败', 'error');
  });
}

function copyModelName(model) {
  navigator.clipboard.writeText(model).then(() => {
    showToast('已复制模型名称');
  }).catch(() => {
    showToast('复制失败', 'error');
  });
}

function showToast(message, type = 'success') {
  // 创建 toast 元素
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    padding: 14px 24px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    ${type === 'error' 
      ? 'background: rgba(239, 68, 68, 0.9); color: white;' 
      : 'background: rgba(16, 185, 129, 0.9); color: white;'
    }
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 复制 API Key
function copyKey(key) {
  navigator.clipboard.writeText(key).then(() => {
    showToast('API Key 已复制');
  }).catch(() => {
    showToast('复制失败', 'error');
  });
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

