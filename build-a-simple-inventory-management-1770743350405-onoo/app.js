// Store Object as providedconst store = {key: 'build-a-simple-inventory-management_data',repoPath: 'build-a-simple-inventory-management/data.json',getGitHubConfig() {if (window.self === window.top) {const currentUrl = window.location.href;const dashboardUrl = `/dashboard?openApp=${encodeURIComponent(currentUrl)}`;console.warn('⚠️ Security: Apps must run inside YAB Dashboard');console.log('Redirecting to Dashboard...');window.location.href = dashboardUrl;return null;}const hashParams = new URLSearchParams(window.location.hash.slice(1));const hashToken = hashParams.get('token');const hashOwner = hashParams.get('owner');if (hashToken && hashOwner) {localStorage.setItem('github_token', decodeURIComponent(hashToken));localStorage.setItem('github_owner', decodeURIComponent(hashOwner));return {token: decodeURIComponent(hashToken),owner: decodeURIComponent(hashOwner),readOnly: false};}const urlParams = new URLSearchParams(window.location.search);const shareMode = urlParams.get('mode');const shareOwner = urlParams.get('owner');const shareToken = urlParams.get('share');if ((shareMode === 'read' || shareMode === 'write') && shareOwner && shareToken) {const ownerToken = hashParams.get('ownerToken');if (ownerToken) {localStorage.setItem(`shared_${shareOwner}_token`, decodeURIComponent(ownerToken));console.log(`✅ Shared app: Using owner's token from URL hash (mode: ${shareMode})`);return {token: decodeURIComponent(ownerToken),owner: shareOwner,readOnly: shareMode === 'read'};}const storedToken = localStorage.getItem(`shared_${shareOwner}_token`);if (storedToken) {console.log(`✅ Shared app: Using stored owner's token (mode: ${shareMode})`);return {token: storedToken,owner: shareOwner,readOnly: shareMode === 'read'};}console.error('❌ Shared app error: Owner token not found');console.error('Debug info:', {shareMode,shareOwner,shareToken,urlHash: window.location.hash,fullUrl: window.location.href});alert(`⚠️ Share link error\n\nThe owner's access token is missing from this share link.\n\nPossible causes:\n• Link was copied incorrectly\n• URL was shortened/modified\n• This is a "read-only" link without owner token\n\nPlease ask ${shareOwner} to generate a new share link.`);return null;}const token = localStorage.getItem('github_token');const owner = localStorage.getItem('github_owner');return (token && owner) ? { token, owner, readOnly: false } : null;},async getAll() {const github = this.getGitHubConfig();if (!github) {alert('⚠️ GitHub not configured! Please connect your GitHub account in settings to use this app.');return [];}try {const url = `https://api.github.com/repos/${github.owner}/yab-vault/contents/${this.repoPath}`;const res = await fetch(url, {headers: {Authorization: `Bearer ${github.token}`,Accept: 'application/vnd.github.v3+json'}});if (res.ok) {const data = await res.json();const content = atob(data.content);const items = JSON.parse(content);localStorage.setItem(this.key, JSON.stringify(items));return items;}if (res.status === 404) {console.log('Data file not found, starting fresh');return [];}throw new Error(`Failed to load data: HTTP ${res.status}`);} catch (e) {console.error('Failed to load from GitHub:', e);alert(`❌ Failed to load data from GitHub: ${e.message}\n\nPlease check your internet connection and GitHub credentials.`);return [];}},async save(items) {const github = this.getGitHubConfig();if (github && github.readOnly) {alert('⚠️ This is a shared app with read-only access. You cannot modify the owner's data.');throw new Error('Read-only access - cannot save data');}if (!github) {alert('⚠️ GitHub not configured! Please connect your GitHub account in settings to save data.');throw new Error('GitHub not configured');}try {const url = `https://api.github.com/repos/${github.owner}/yab-vault/contents/${this.repoPath}`;let sha;try {const res = await fetch(url, {headers: {Authorization: `Bearer ${github.token}`,Accept: 'application/vnd.github.v3+json'}});if (res.ok) sha = (await res.json()).sha;} catch (e) {;}const response = await fetch(url, {method: 'PUT',headers: {Authorization: `Bearer ${github.token}`,'Content-Type': 'application/json',Accept: 'application/vnd.github.v3+json'},body: JSON.stringify({message: 'Update data from app',content: btoa(JSON.stringify(items, null, 2)),sha})});if (!response.ok) {const errorData = await response.json();if (response.status === 409) {const shouldRefresh = confirm('⚠️ CONFLICT DETECTED\n\nSomeone else modified this data while you were editing.\n\nClick OK to refresh and see their changes (YOUR CHANGES WILL BE LOST).\nClick Cancel to keep editing (you\'ll need to save again).');if (shouldRefresh) {window.location.reload();}throw new Error('Data conflict - please refresh and try again');}throw new Error(`GitHub API error: ${errorData.message || response.statusText}`);}localStorage.setItem(this.key, JSON.stringify(items));console.log('✅ Data saved to GitHub successfully');} catch (e) {console.error('Failed to save to GitHub:', e);alert(`❌ Failed to save data to GitHub!\n\nError: ${e.message}\n\nYour changes were NOT saved. Please check your internet connection and GitHub credentials.`);throw e;}},async create(item) {const items = await this.getAll();item.id = Date.now().toString();item.createdAt = new Date().toISOString();items.push(item);await this.save(items);return item;},async update(id, updates) {const items = await this.getAll();const index = items.findIndex(i => i.id === id);if (index !== -1) {items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };await this.save(items);}},async delete(id) {const items = await this.getAll();const filtered = items.filter(i => i.id !== id);await this.save(filtered);}};// Router Objectconst router = {routes: {},init(routes) {this.routes = routes;window.addEventListener('hashchange', () => this.route());this.route();},route() {const hash = window.location.hash.slice(1) || '';const [path, id] = hash.split('/');const handler = this.routes[path] || this.routes[''];if (handler) handler(id);},navigate(path) {window.location.hash = path;}};// Util Functionsfunction renderStats(items) {const stats = {total: items.length,completed: items.filter(i => i.quantity > 0).length,urgent: items.filter(i => i.quantity === 0).length};return `<div class='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
    <div class='bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white'>
      <i data-lucide='box' class='w-8 h-8 mb-2'></i>
      <p class='text-4xl font-bold'>${stats.total}</p>
      <p class='text-blue-100'>Total Items</p>
    </div>
    <div class='bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg p-6 text-white'>
      <i data-lucide='check-circle' class='w-8 h-8 mb-2'></i>
      <p class='text-4xl font-bold'>${stats.completed}</p>
      <p class='text-emerald-100'>In Stock</p>
    </div>
    <div class='bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg p-6 text-white'>
      <i data-lucide='alert-octagon' class='w-8 h-8 mb-2'></i>
      <p class='text-4xl font-bold'>${stats.urgent}</p>
      <p class='text-red-100'>Out of Stock</p>
    </div>
  </div>`;}function renderRecentItems(items) {return items.length ? items.slice(0, 3).map(item => `<div class='bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all duration-200 cursor-pointer'>
    <div class='flex items-center justify-between'>
      <div class='flex items-center gap-3'>
        <img src='${item.image}' class='w-12 h-12 rounded-full' alt='${item.name}' />
        <div>
          <h3 class='font-semibold text-slate-900'>${item.name}</h3>
          <p class='text-sm text-slate-500'>${item.category}</p>
        </div>
      </div>
      <div class='text-right'>
        <p class='font-bold text-lg text-slate-900'>${item.quantity}</p>
      </div>
    </div>
  </div>`).join('') : `<div class='flex flex-col items-center justify-center py-16 px-4 text-center'>
    <div class='w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4'>
      <i data-lucide='inbox' class='w-10 h-10 text-blue-600'></i>
    </div>
    <h3 class='text-xl font-semibold text-slate-900 mb-2'>No items yet</h3>
    <p class='text-slate-600 mb-6 max-w-sm'>Get started by creating your first item</p>
    <button class='bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all' onclick='router.navigate("new")'>
      <i data-lucide='plus' class='w-5 h-5 inline mr-2'></i>
      Create First Item
    </button>
  </div>`;}async function showList() {const items = await store.getAll();const statsHtml = renderStats(items);const recentItemsHtml = renderRecentItems(items);document.getElementById('app-content').innerHTML = `<div>
    ${statsHtml}
    <div class='bg-white rounded-xl shadow-lg p-6 mb-8'>
      <h3 class='font-bold mb-4'>Recent Items</h3>
      <div id='recent-items'>${recentItemsHtml}</div>
    </div>
  </div>`;lucide.createIcons();}async function showForm(id) {let item = {name: '', description: '', quantity: '', category: 'electronics', image: ''};if (id) {const items = await store.getAll();item = items.find(i => i.id === id) || item;}const formHtml = `<form id='item-form' class='space-y-4'>
    <div>
      <label class='block text-sm font-semibold text-slate-700 mb-2'>Item Name</label>
      <input type='text' name='name' value='${item.name}' required class='w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none'>
    </div>
    <div>
      <label class='block text-sm font-semibold text-slate-700 mb-2'>Description</label>
      <textarea name='description' class='w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none'>${item.description}</textarea>
    </div>
    <div>
      <label class='block text-sm font-semibold text-slate-700 mb-2'>Quantity</label>
      <input type='number' name='quantity' value='${item.quantity}' required class='w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none'>
    </div>
    <div>
      <label class='block text-sm font-semibold text-slate-700 mb-2'>Category</label>
      <select name='category' class='w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none'>
        <option value='electronics' ${item.category === 'electronics' && 'selected'}>Electronics</option>
        <option value='furniture' ${item.category === 'furniture' && 'selected'}>Furniture</option>
        <option value='clothing' ${item.category === 'clothing' && 'selected'}>Clothing</option>
        <option value='other' ${item.category === 'other' && 'selected'}>Other</option>
      </select>
    </div>
    <div>
      <label class='block text-sm font-semibold text-slate-700 mb-2'>Image</label>
      <input type='file' name='image' accept='image/*' class='w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none'>
    </div>
    <div class='flex justify-end gap-2'>
      ${id ? `<button type='button' onclick='deleteItem("${id}")' class='bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all'>Delete</button>` : ''}
      <button type='button' onclick='router.navigate("")' class='bg-slate-100 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium'>Cancel</button>
      <button type='submit' class='bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all font-medium'>${id ? 'Update' : 'Save'}</button>
    </div>
  </form>`;document.getElementById('app-content').innerHTML = formHtml;const form = document.getElementById('item-form');form.onsubmit = async (e) => {e.preventDefault();const formData = new FormData(form);const newItem = {name: formData.get('name'),description: formData.get('description'),quantity: +formData.get('quantity'),category: formData.get('category'),image: formData.get('image')};if (id) {await store.update(id, newItem);} else {await store.create(newItem);}router.navigate('');};lucide.createIcons();}async function deleteItem(id) {if (confirm('Are you sure you want to delete this item?')) {await store.delete(id);router.navigate('');}}document.addEventListener('DOMContentLoaded', () => {const hashParams = new URLSearchParams(window.location.hash.slice(1));const autoToken = hashParams.get('token');const autoOwner = hashParams.get('owner');const ownerToken = hashParams.get('ownerToken');if (autoToken && autoOwner) {if (!localStorage.getItem('github_token')) {localStorage.setItem('github_token', decodeURIComponent(autoToken));localStorage.setItem('github_owner', decodeURIComponent(autoOwner));console.log('✅ GitHub credentials auto-configured from YAB Dashboard');}}if (ownerToken) {console.log('✅ Received owner token from share link');}if (autoToken || ownerToken) {window.location.hash = '';}router.init({'': showList,'new': () => showForm(),'edit': (id) => showForm(id)});lucide.createIcons();});