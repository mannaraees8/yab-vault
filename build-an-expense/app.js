// Store for data management
const store = {
  key: 'expense_tracker_data',

  getAll() {
    return JSON.parse(localStorage.getItem(this.key) || '[]');
  },

  save(items) {
    localStorage.setItem(this.key, JSON.stringify(items));
    this.syncToGitHub(items);
  },

  create(item) {
    const items = this.getAll();
    item.id = Date.now().toString();
    item.createdAt = new Date().toISOString();
    items.push(item);
    this.save(items);
    return item;
  },

  update(id, updates) {
    const items = this.getAll();
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
      this.save(items);
      return items[index];
    }
    return null;
  },

  delete(id) {
    const items = this.getAll().filter(i => i.id !== id);
    this.save(items);
  },

  async syncToGitHub(items) {
    const token = localStorage.getItem('github_token');
    const username = localStorage.getItem('github_username');
    if (!token || !username) return;

    try {
      const url = `https://api.github.com/repos/${username}/yab-vault/contents/expense-tracker/data.json`;
      let sha;
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) sha = (await res.json()).sha;
      } catch (e) {}

      await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Update expense data',
          content: btoa(JSON.stringify(items, null, 2)),
          sha
        })
      });
    } catch (e) {
      console.warn('GitHub sync failed:', e);
    }
  }
};

// Router for navigation
const router = {
  routes: {},

  init(routes) {
    this.routes = routes;
    window.addEventListener('hashchange', () => this.route());
    this.route();
  },

  route() {
    const hash = window.location.hash.slice(1) || '';
    const [path, id] = hash.split('/');
    const handler = this.routes[path] || this.routes[''];
    if (handler) handler(id);
  },

  navigate(path) {
    window.location.hash = path;
  }
};

// AI Insights Generator
const aiInsights = {
  generateMonthlySummary(expenses) {
    if (expenses.length === 0) {
      return 'No expenses recorded yet. Start tracking to get insights!';
    }

    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const avgPerExpense = total / expenses.length;
    const topCategory = this.getTopCategory(expenses);
    const dailyAvg = total / 30; // Assuming 30 days

    return `This month you spent $${total.toFixed(2)} across ${expenses.length} expenses. Your average expense was $${avgPerExpense.toFixed(2)}, and you spent most on ${topCategory}. That's about $${dailyAvg.toFixed(2)} per day.`;
  },

  generateRecommendations(expenses) {
    if (expenses.length === 0) {
      return ['Start tracking your expenses to get personalized recommendations!'];
    }

    const recommendations = [];
    const categoryTotals = this.getCategoryTotals(expenses);
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Food spending analysis
    if (categoryTotals.food > total * 0.4) {
      recommendations.push('🍽️ Food expenses are high (over 40%). Consider meal planning and cooking at home more often.');
    }

    // Transport analysis
    if (categoryTotals.transport > total * 0.25) {
      recommendations.push('🚗 Transportation costs are significant. Look into carpooling or public transport options.');
    }

    // Shopping analysis
    if (categoryTotals.shopping > total * 0.3) {
      recommendations.push('🛍️ Shopping expenses are high. Try the 24-hour rule before making non-essential purchases.');
    }

    // General recommendations
    if (expenses.filter(e => e.amount < 10).length > expenses.length * 0.5) {
      recommendations.push('☕ You have many small purchases. These add up quickly - consider bundling trips.');
    }

    if (recommendations.length === 0) {
      recommendations.push('💰 Great job! Your spending looks balanced across categories.');
      recommendations.push('📊 Keep tracking to maintain awareness of your spending patterns.');
    }

    return recommendations;
  },

  getTopCategory(expenses) {
    const categoryTotals = this.getCategoryTotals(expenses);
    return Object.entries(categoryTotals).reduce((a, b) => categoryTotals[a[0]] > categoryTotals[b[0]] ? a : b)[0];
  },

  getCategoryTotals(expenses) {
    return expenses.reduce((totals, expense) => {
      totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
      return totals;
    }, {});
  }
};

// Utility functions
const utils = {
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  },

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  getCategoryIcon(category) {
    const icons = {
      food: 'utensils',
      transport: 'car',
      shopping: 'shopping-bag',
      bills: 'file-text',
      other: 'more-horizontal'
    };
    return icons[category] || 'more-horizontal';
  },

  getCategoryColor(category) {
    const colors = {
      food: 'from-orange-500 to-red-600',
      transport: 'from-blue-500 to-indigo-600',
      shopping: 'from-purple-500 to-pink-600',
      bills: 'from-green-500 to-emerald-600',
      other: 'from-gray-500 to-slate-600'
    };
    return colors[category] || 'from-gray-500 to-slate-600';
  }
};

// Dashboard View
function showDashboard() {
  const expenses = store.getAll();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
  });

  const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryTotals = aiInsights.getCategoryTotals(monthlyExpenses);
  const summary = aiInsights.generateMonthlySummary(monthlyExpenses);
  const recommendations = aiInsights.generateRecommendations(monthlyExpenses);

  const html = `
    <div class='fade-in space-y-8'>
      <!-- Header -->
      <div class='text-center mb-8'>
        <h2 class='text-4xl font-bold text-slate-900 mb-2'>Dashboard</h2>
        <p class='text-lg text-slate-600'>Your spending insights for ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>

      <!-- Monthly Stats -->
      <div class='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <div class='bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6'>
          <div class='flex items-center justify-between mb-2'>
            <p class='text-sm font-medium text-blue-900'>Total Spent</p>
            <i data-lucide='dollar-sign' class='w-5 h-5 text-blue-600'></i>
          </div>
          <p class='text-3xl font-bold text-blue-900'>${utils.formatCurrency(monthlyTotal)}</p>
        </div>
        <div class='bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-200 p-6'>
          <div class='flex items-center justify-between mb-2'>
            <p class='text-sm font-medium text-emerald-900'>Expenses</p>
            <i data-lucide='receipt' class='w-5 h-5 text-emerald-600'></i>
          </div>
          <p class='text-3xl font-bold text-emerald-900'>${monthlyExpenses.length}</p>
        </div>
        <div class='bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-6'>
          <div class='flex items-center justify-between mb-2'>
            <p class='text-sm font-medium text-purple-900'>Daily Average</p>
            <i data-lucide='calendar' class='w-5 h-5 text-purple-600'></i>
          </div>
          <p class='text-3xl font-bold text-purple-900'>${utils.formatCurrency(monthlyTotal / 30)}</p>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div class='bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200 p-6'>
        <h3 class='text-xl font-semibold text-slate-900 mb-4'>Spending by Category</h3>
        ${Object.keys(categoryTotals).length > 0 ? `
          <div class='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4'>
            ${Object.entries(categoryTotals).map(([category, amount]) => `
              <div class='text-center p-4 rounded-xl bg-gradient-to-br ${utils.getCategoryColor(category)} text-white'>
                <i data-lucide='${utils.getCategoryIcon(category)}' class='w-8 h-8 mx-auto mb-2'></i>
                <p class='text-sm font-medium capitalize mb-1'>${category}</p>
                <p class='text-lg font-bold'>${utils.formatCurrency(amount)}</p>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class='text-center py-8 text-slate-500'>
            <i data-lucide='pie-chart' class='w-12 h-12 mx-auto mb-2 opacity-50'></i>
            <p>No expenses this month</p>
          </div>
        `}
      </div>

      <!-- AI Insights -->
      <div class='bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200 p-6'>
        <div class='flex items-center gap-2 mb-4'>
          <div class='w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center'>
            <i data-lucide='brain' class='w-4 h-4 text-white'></i>
          </div>
          <h3 class='text-xl font-semibold text-slate-900'>AI Insights</h3>
        </div>
        <div class='bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-200'>
          <p class='text-slate-700 leading-relaxed'>${summary}</p>
        </div>
        <div class='space-y-3'>
          <h4 class='font-semibold text-slate-900'>Recommendations:</h4>
          ${recommendations.map(rec => `
            <div class='flex items-start gap-3 p-3 bg-slate-50 rounded-lg'>
              <div class='w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0'></div>
              <p class='text-slate-700'>${rec}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Quick Actions -->
      <div class='flex justify-center gap-4'>
        <button onclick='router.navigate("new")' class='bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200 font-medium'>
          <i data-lucide='plus' class='w-5 h-5 inline mr-2'></i>
          Add Expense
        </button>
        <button onclick='router.navigate("list")' class='bg-slate-100 text-slate-700 px-8 py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium'>
          <i data-lucide='list' class='w-5 h-5 inline mr-2'></i>
          View All
        </button>
      </div>
    </div>
  `;

  document.getElementById('app-content').innerHTML = html;
  lucide.createIcons();
}

// List View
function showList() {
  const expenses = store.getAll().sort((a, b) => new Date(b.date) - new Date(a.date));
  
  const html = `
    <div class='fade-in space-y-6'>
      <!-- Header -->
      <div class='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
        <div>
          <h2 class='text-3xl font-bold text-slate-900'>All Expenses</h2>
          <p class='text-slate-600'>${expenses.length} expense${expenses.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <div class='flex items-center gap-3'>
          <div class='relative'>
            <input 
              type='text' 
              id='search-input' 
              placeholder='Search expenses...' 
              class='pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all'
              oninput='filterExpenses()'
            >
            <i data-lucide='search' class='w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400'></i>
          </div>
          <select id='category-filter' onchange='filterExpenses()' class='px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none'>
            <option value=''>All Categories</option>
            <option value='food'>Food</option>
            <option value='transport'>Transport</option>
            <option value='shopping'>Shopping</option>
            <option value='bills'>Bills</option>
            <option value='other'>Other</option>
          </select>
        </div>
      </div>

      <!-- Expenses List -->
      <div id='expenses-container'>
        ${expenses.length > 0 ? `
          <div class='space-y-4'>
            ${expenses.map(expense => `
              <div class='expense-item bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:border-blue-300 transition-all duration-200' data-category='${expense.category}' data-description='${expense.description.toLowerCase()}'>
                <div class='flex items-center justify-between'>
                  <div class='flex items-center gap-4'>
                    <div class='w-12 h-12 rounded-full bg-gradient-to-br ${utils.getCategoryColor(expense.category)} flex items-center justify-center flex-shrink-0'>
                      <i data-lucide='${utils.getCategoryIcon(expense.category)}' class='w-6 h-6 text-white'></i>
                    </div>
                    <div class='min-w-0 flex-1'>
                      <h3 class='font-semibold text-slate-900 truncate'>${expense.description}</h3>
                      <div class='flex items-center gap-4 mt-1'>
                        <span class='text-sm text-slate-500 capitalize'>${expense.category}</span>
                        <span class='text-sm text-slate-500'>${utils.formatDate(expense.date)}</span>
                      </div>
                      ${expense.notes ? `<p class='text-sm text-slate-600 mt-1 truncate'>${expense.notes}</p>` : ''}
                    </div>
                  </div>
                  <div class='flex items-center gap-3'>
                    <div class='text-right'>
                      <p class='font-bold text-lg text-slate-900'>${utils.formatCurrency(expense.amount)}</p>
                    </div>
                    <div class='flex items-center gap-2'>
                      <button onclick='router.navigate("edit/${expense.id}")' class='p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'>
                        <i data-lucide='edit-2' class='w-4 h-4'></i>
                      </button>
                      <button onclick='confirmDelete("${expense.id}")' class='p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors'>
                        <i data-lucide='trash-2' class='w-4 h-4'></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class='flex flex-col items-center justify-center py-16 px-4 text-center'>
            <div class='w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4'>
              <i data-lucide='receipt' class='w-10 h-10 text-blue-600'></i>
            </div>
            <h3 class='text-xl font-semibold text-slate-900 mb-2'>No expenses yet</h3>
            <p class='text-slate-600 mb-6 max-w-sm'>Start tracking your expenses to get insights into your spending habits</p>
            <button onclick='router.navigate("new")' class='bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all'>
              <i data-lucide='plus' class='w-5 h-5 inline mr-2'></i>
              Add First Expense
            </button>
          </div>
        `}
      </div>
    </div>
  `;

  document.getElementById('app-content').innerHTML = html;
  lucide.createIcons();
}

// Form View (Create/Edit)
function showForm(id = null) {
  const isEdit = !!id;
  const expense = isEdit ? store.getAll().find(e => e.id === id) : null;

  if (isEdit && !expense) {
    router.navigate('list');
    return;
  }

  const html = `
    <div class='fade-in max-w-2xl mx-auto'>
      <div class='bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200 p-8'>
        <div class='mb-8'>
          <h2 class='text-3xl font-bold text-slate-900 mb-2'>${isEdit ? 'Edit Expense' : 'Add New Expense'}</h2>
          <p class='text-slate-600'>${isEdit ? 'Update your expense details' : 'Track a new expense'}</p>
        </div>

        <form id='expense-form' onsubmit='saveExpense(event)' class='space-y-6'>
          <input type='hidden' id='expense-id' value='${id || ''}'>
          
          <div>
            <label class='block text-sm font-semibold text-slate-700 mb-2'>Description *</label>
            <input 
              type='text' 
              id='description' 
              required 
              value='${expense?.description || ''}'
              class='w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none' 
              placeholder='Enter expense description'
            >
          </div>

          <div class='grid grid-cols-1 sm:grid-cols-2 gap-6'>
            <div>
              <label class='block text-sm font-semibold text-slate-700 mb-2'>Amount *</label>
              <div class='relative'>
                <div class='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <span class='text-slate-500 text-lg'>$</span>
                </div>
                <input 
                  type='number' 
                  id='amount' 
                  required 
                  min='0' 
                  step='0.01'
                  value='${expense?.amount || ''}'
                  class='w-full pl-8 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none' 
                  placeholder='0.00'
                >
              </div>
            </div>

            <div>
              <label class='block text-sm font-semibold text-slate-700 mb-2'>Category *</label>
              <select 
                id='category' 
                required 
                class='w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none'
              >
                <option value=''>Select category</option>
                <option value='food' ${expense?.category === 'food' ? 'selected' : ''}>🍽️ Food</option>
                <option value='transport' ${expense?.category === 'transport' ? 'selected' : ''}>🚗 Transport</option>
                <option value='shopping' ${expense?.category === 'shopping' ? 'selected' : ''}>🛍️ Shopping</option>
                <option value='bills' ${expense?.category === 'bills' ? 'selected' : ''}>📄 Bills</option>
                <option value='other' ${expense?.category === 'other' ? 'selected' : ''}>📦 Other</option>
              </select>
            </div>
          </div>

          <div>
            <label class='block text-sm font-semibold text-slate-700 mb-2'>Date *</label>
            <input 
              type='date' 
              id='date' 
              required 
              value='${expense?.date || new Date().toISOString().split('T')[0]}'
              class='w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none'
            >
          </div>

          <div>
            <label class='block text-sm font-semibold text-slate-700 mb-2'>Notes</label>
            <textarea 
              id='notes' 
              rows='3'
              placeholder='Add any additional notes...'
              class='w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none'
            >${expense?.notes || ''}</textarea>
          </div>

          <div class='flex flex-col sm:flex-row gap-4 pt-4'>
            <button 
              type='submit' 
              class='flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200 font-medium'
            >
              <i data-lucide='${isEdit ? 'save' : 'plus'}' class='w-5 h-5 inline mr-2'></i>
              ${isEdit ? 'Update Expense' : 'Add Expense'}
            </button>
            
            ${isEdit ? `
              <button 
                type='button'
                onclick='confirmDelete("${id}")'
                class='bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all font-medium'
              >
                <i data-lucide='trash-2' class='w-5 h-5 inline mr-2'></i>
                Delete
              </button>
            ` : ''}
            
            <button 
              type='button'
              onclick='router.navigate("list")'
              class='bg-slate-100 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium'
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('app-content').innerHTML = html;
  lucide.createIcons();

  // Focus on description field
  document.getElementById('description').focus();
}

// Save expense function
function saveExpense(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  const expenseData = {
    description: document.getElementById('description').value.trim(),
    amount: parseFloat(document.getElementById('amount').value),
    category: document.getElementById('category').value,
    date: document.getElementById('date').value,
    notes: document.getElementById('notes').value.trim()
  };

  // Validate required fields
  if (!expenseData.description || !expenseData.amount || !expenseData.category || !expenseData.date) {
    alert('Please fill in all required fields.');
    return;
  }

  if (expenseData.amount <= 0) {
    alert('Amount must be greater than 0.');
    return;
  }

  const id = document.getElementById('expense-id').value;
  
  try {
    if (id) {
      // Update existing expense
      store.update(id, expenseData);
    } else {
      // Create new expense
      store.create(expenseData);
    }
    
    // Navigate back to list
    router.navigate('list');
  } catch (error) {
    console.error('Error saving expense:', error);
    alert('Error saving expense. Please try again.');
  }
}

// Delete confirmation
function confirmDelete(id) {
  const expense = store.getAll().find(e => e.id === id);
  if (!expense) return;

  if (confirm(`Are you sure you want to delete "${expense.description}"?`)) {
    store.delete(id);
    router.navigate('list');
  }
}

// Filter expenses function
function filterExpenses() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const categoryFilter = document.getElementById('category-filter').value;
  const expenseItems = document.querySelectorAll('.expense-item');

  expenseItems.forEach(item => {
    const description = item.getAttribute('data-description');
    const category = item.getAttribute('data-category');
    
    const matchesSearch = !searchTerm || description.includes(searchTerm);
    const matchesCategory = !categoryFilter || category === categoryFilter;
    
    if (matchesSearch && matchesCategory) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize router
  router.init({
    '': showDashboard,
    'list': showList,
    'new': () => showForm(),
    'edit': (id) => showForm(id)
  });

  // Initialize icons
  lucide.createIcons();
});