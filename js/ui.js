import { deleteTransaction, addCategory, deleteCategory } from './db.js';

// Elements
const totalBalanceEl = document.getElementById('total-balance');
const monthIncomeEl = document.getElementById('month-income');
const monthExpenseEl = document.getElementById('month-expense');
const dashboardTxList = document.getElementById('dashboard-tx-list');
const fullTxList = document.getElementById('full-tx-list');
const categoriesList = document.getElementById('categories-list');

// Analytics Elements
const topCategoryEl = document.getElementById('top-category');
const analyticsIncomeEl = document.getElementById('analytics-income');
const analyticsExpenseEl = document.getElementById('analytics-expense');
const savingRateEl = document.getElementById('saving-rate');
const avgExpenseEl = document.getElementById('avg-expense');

let balanceChart = null;
let incomeExpenseChart = null;
let categoryPieChart = null;

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
};

// --- DASHBOARD ---
export const updateDashboard = (transactions) => {
    // Current Month Filter
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthTx = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = currentMonthTx
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expense = currentMonthTx
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Total Balance (All time)
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
    const balance = totalIncome - totalExpense;

    totalBalanceEl.textContent = formatCurrency(balance);
    monthIncomeEl.textContent = formatCurrency(income);
    monthExpenseEl.textContent = formatCurrency(expense);

    renderBalanceTrendChart(transactions);
    renderRecentTransactions(transactions.slice(0, 5)); // Top 5
};

const renderRecentTransactions = (txs) => {
    dashboardTxList.innerHTML = '';
    txs.forEach(t => dashboardTxList.appendChild(createTransactionElement(t)));
};

// --- CHARTS ---
const renderBalanceTrendChart = (transactions) => {
    try {
        const canvas = document.getElementById('balanceTrendChart');
        if (!canvas) {
            console.warn('Balance trend chart canvas not found');
            return;
        }

        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        const ctx = canvas.getContext('2d');

        // Process data: Running balance over time
        // Sort ascending by date
        const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

        const labels = sortedTx.map(t => new Date(t.date).toLocaleDateString());
        let currentBalance = 0;
        const data = sortedTx.map(t => {
            const amt = t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount);
            currentBalance += amt;
            return currentBalance;
        });

        if (balanceChart) balanceChart.destroy();

        balanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Balance',
                    data: data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { grid: { borderDash: [5, 5] } }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering balance trend chart:', error);
    }
};

// --- TRANSACTIONS LIST ---
export const renderTransactionList = (transactions) => {
    fullTxList.innerHTML = '';
    transactions.forEach(t => fullTxList.appendChild(createTransactionElement(t, true)));
};

const createTransactionElement = (t, showActions = false) => {
    const li = document.createElement('li');
    li.className = 'transaction-item';

    const isIncome = t.type === 'income';
    const iconName = isIncome ? 'arrow-up-circle-outline' : 'cart-outline'; // Simplified icons
    // TODO: Map categories to icons

    li.innerHTML = `
        <div class="tx-left">
            <div class="tx-icon"><ion-icon name="${iconName}"></ion-icon></div>
            <div class="tx-details">
                <h4>${t.category}</h4>
                <span>${t.date} ${t.note ? '• ' + t.note : ''}</span>
            </div>
        </div>
        <div style="display:flex; align-items:center;">
            <span class="tx-amount ${t.type}">
                ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}
            </span>
            ${showActions ? `
                <div class="tx-actions">
                    <button class="delete-btn"><ion-icon name="trash-outline"></ion-icon></button>
                </div>
            ` : ''}
        </div>
    `;

    if (showActions) {
        li.querySelector('.delete-btn').addEventListener('click', () => {
            if (confirm('Delete transaction?')) deleteTransaction(t.id);
        });
    }
    return li;
};

// --- CATEGORIES ---
export const renderCategories = (categories = []) => {
    categoriesList.innerHTML = '';

    // Default categories if none custom
    const displayCats = categories.length > 0 ? categories : [{ name: 'Food' }, { name: 'Transport' }, { name: 'Salary' }, { name: 'Utilities' }];

    displayCats.forEach(c => {
        const li = document.createElement('li');
        li.style.padding = '10px';
        li.style.borderBottom = '1px solid #e2e8f0';
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';

        li.innerHTML = `<span>${c.name}</span> <button style="color:red;border:none;background:none;cursor:pointer;">&times;</button>`;
        li.querySelector('button').addEventListener('click', async () => {
            if (c.id) await deleteCategory(c.id); // Only delete if it calls db
            else alert('Cannot delete default categories in this demo.');
        });
        categoriesList.appendChild(li);
    });

    // Update Select Dropdowns
    updateCategorySelects(displayCats);
};

const updateCategorySelects = (cats) => {
    const modalSelect = document.getElementById('t-category');
    const filterSelect = document.getElementById('tx-filter-category');

    // Save current selection
    // const currentVal = modalSelect.value; 

    // Reset
    modalSelect.innerHTML = '';
    filterSelect.innerHTML = '<option value="all">All Categories</option>';

    cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name.toLowerCase();
        opt.textContent = c.name;
        modalSelect.appendChild(opt.cloneNode(true));
        filterSelect.appendChild(opt);
    });
};

// --- ANALYTICS ---
export const renderAnalytics = (transactions) => {
    // 1. Stats
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);

    analyticsIncomeEl.textContent = formatCurrency(totalIncome);
    analyticsExpenseEl.textContent = formatCurrency(totalExpense);

    // Saving Rate
    const rate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    savingRateEl.textContent = rate.toFixed(1) + '%';

    // Top Category
    const catTotals = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        catTotals[t.category] = (catTotals[t.category] || 0) + parseFloat(t.amount);
    });
    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    topCategoryEl.textContent = sortedCats.length > 0 ? sortedCats[0][0] : '-';

    // Average Monthly Expense
    const monthsWithExpenses = new Set(
        transactions.filter(t => t.type === 'expense').map(t => {
            const d = new Date(t.date);
            return `${d.getFullYear()}-${d.getMonth()}`;
        })
    ).size;
    const avgExpense = monthsWithExpenses > 0 ? totalExpense / monthsWithExpenses : 0;
    avgExpenseEl.textContent = formatCurrency(avgExpense);

    // 2. Charts
    renderAnalyticsCharts(totalIncome, totalExpense, catTotals);
};

const renderAnalyticsCharts = (income, expense, catTotals) => {
    try {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        // Bar Chart
        const barCanvas = document.getElementById('incomeExpenseChart');
        if (barCanvas) {
            const barCtx = barCanvas.getContext('2d');
            if (incomeExpenseChart) incomeExpenseChart.destroy();
            incomeExpenseChart = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: ['Income', 'Expense'],
                    datasets: [{
                        label: 'Amount',
                        data: [income, expense],
                        backgroundColor: ['#10b981', '#ef4444'],
                        borderRadius: 8
                    }]
                },
                options: { responsive: true }
            });
        }

        // Pie Chart
        const pieCanvas = document.getElementById('categoryPieChart');
        if (pieCanvas) {
            const pieCtx = pieCanvas.getContext('2d');
            if (categoryPieChart) categoryPieChart.destroy();
            categoryPieChart = new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(catTotals),
                    datasets: [{
                        data: Object.values(catTotals),
                        backgroundColor: ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#22d3ee', '#818cf8'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true }
            });
        }
    } catch (error) {
        console.error('Error rendering analytics charts:', error);
    }
};
