import { initAuth, handleLogin, handleSignup, handleLogout, handleGoogleSignIn } from './auth.js';
import { addTransaction, addCategory } from './db.js'; // Assumes addCategory exists
import { auth } from './firebase-config.js';
import { renderTransactionList } from './ui.js';

// Global state for transactions to support filtering
export let allTransactions = [];

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    setupEventListeners();
    setupDateDisplay();
});

const setupDateDisplay = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', options);
};

// Export to CSV
const exportToCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
        + "Date,Type,Category,Amount,Note\n"
        + allTransactions.map(t => `${t.date},${t.type},${t.category},${t.amount},"${t.note || ''}"`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const setupEventListeners = () => {
    // --- Auth Tabs & Forms ---
    const showSignupTab = document.getElementById('show-signup-tab');
    const showLoginTab = document.getElementById('show-login-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    showSignupTab.addEventListener('click', () => {
        loginForm.classList.add('hidden');
        loginForm.classList.remove('active');
        signupForm.classList.remove('hidden');
        signupForm.classList.add('active');
    });

    showLoginTab.addEventListener('click', () => {
        signupForm.classList.add('hidden');
        signupForm.classList.remove('active');
        loginForm.classList.remove('hidden');
        loginForm.classList.add('active');
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin(document.getElementById('login-email').value, document.getElementById('login-password').value);
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const p1 = document.getElementById('signup-password').value;
        const p2 = document.getElementById('signup-confirm-password').value;
        if (p1 !== p2) return alert('Passwords do not match');
        handleSignup(document.getElementById('signup-email').value, p1);
    });

    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Google Sign-In buttons
    const googleBtns = document.querySelectorAll('.btn-google');
    googleBtns.forEach(btn => {
        btn.addEventListener('click', handleGoogleSignIn);
    });

    // --- Mobile Menu Toggle ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const sidebar = document.querySelector('.sidebar');

    const toggleMobileMenu = () => {
        sidebar.classList.toggle('mobile-open');
        mobileMenuOverlay.classList.toggle('active');
    };

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }

    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', toggleMobileMenu);
    }

    // --- Navigation ---
    const navItems = document.querySelectorAll('.sidebar nav li');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            views.forEach(v => {
                v.classList.add('hidden');
                v.classList.remove('active');
            });

            item.classList.add('active');
            const viewId = item.getAttribute('data-view');
            const target = document.getElementById(viewId);
            target.classList.remove('hidden');
            target.classList.add('active');

            // Close mobile menu when navigating
            if (sidebar.classList.contains('mobile-open')) {
                toggleMobileMenu();
            }
        });
    });

    // --- Modal Handling ---
    const modal = document.getElementById('transaction-modal');
    const openBtns = [
        document.getElementById('add-transaction-sidebar-btn'),
        document.getElementById('add-transaction-dash-btn'),
        document.getElementById('add-transaction-view-btn')
    ];
    const closeBtn = document.querySelector('.close-modal');

    openBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', () => modal.classList.remove('hidden'));
    });

    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

    // --- Add Transaction ---
    document.getElementById('transaction-form-modal').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!auth.currentUser) return;

        const type = document.querySelector('input[name="type"]:checked').value;
        const amount = document.getElementById('t-amount').value;
        const date = document.getElementById('t-date').value;
        const category = document.getElementById('t-category').value;
        const note = document.getElementById('t-note').value;

        const success = await addTransaction(auth.currentUser.uid, {
            type, amount: parseFloat(amount), date, category, note
        });

        if (success) {
            e.target.reset();
            modal.classList.add('hidden');
            // document.getElementById('t-date').valueAsDate = new Date();
        }
    });

    // --- Filters ---
    const searchInput = document.getElementById('tx-search');
    const categoryFilter = document.getElementById('tx-filter-category');

    const applyFilters = () => {
        const query = searchInput.value.toLowerCase();
        const cat = categoryFilter.value;

        const filtered = allTransactions.filter(t => {
            const matchesSearch = (t.note && t.note.toLowerCase().includes(query)) || t.category.toLowerCase().includes(query);
            const matchesCat = cat === 'all' || t.category.toLowerCase() === cat;
            return matchesSearch && matchesCat;
        });
        renderTransactionList(filtered);
    };

    searchInput.addEventListener('input', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);

    // --- Export CSV ---
    document.getElementById('export-csv-btn').addEventListener('click', exportToCSV);

    // --- Add Category ---
    document.getElementById('add-category-btn').addEventListener('click', async () => {
        const name = prompt("Enter category name:");
        if (name && auth.currentUser) {
            await addCategory(auth.currentUser.uid, name);
        }
    });
};
