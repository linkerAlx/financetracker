import { db } from './firebase-config.js';
import {
    collection, addDoc, deleteDoc, doc,
    onSnapshot, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { updateDashboard, renderTransactionList, renderCategories, renderAnalytics } from './ui.js';
import { allTransactions } from './app.js'; // Importing array to update it

let unsubscribeTx = null;
let unsubscribeCats = null;

// --- Transactions ---
export const addTransaction = async (userId, transaction) => {
    try {
        await addDoc(collection(db, 'transactions'), {
            uid: userId,
            ...transaction,
            createdAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Error adding transaction: ", error);
        return false;
    }
};

export const deleteTransaction = async (id) => {
    try {
        await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
        console.error("Error deleting transaction: ", error);
    }
};

// --- Categories ---
export const addCategory = async (userId, name) => {
    try {
        await addDoc(collection(db, 'categories'), {
            uid: userId,
            name: name,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error adding category: ", error);
    }
};

export const deleteCategory = async (id) => {
    try {
        await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
        console.error("Error deleting category: ", error);
    }
};

// --- Listeners ---
export const setupRealtimeListener = (userId) => {
    // Query without orderBy to avoid index requirement
    // We'll sort in JavaScript instead
    const qTx = query(
        collection(db, "transactions"),
        where("uid", "==", userId)
    );

    unsubscribeTx = onSnapshot(qTx, (snapshot) => {
        const transactions = [];
        snapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() });
        });

        // Sort by date in JavaScript (descending - newest first)
        transactions.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA; // Descending order
        });

        console.log(`Loaded ${transactions.length} transactions from Firestore`);

        // Update App.js cache for filters
        import('./app.js').then(module => {
            module.allTransactions.length = 0;
            module.allTransactions.push(...transactions);
        });

        updateDashboard(transactions);
        renderTransactionList(transactions);
        renderAnalytics(transactions);
    }, (error) => {
        console.error("Error fetching transactions:", error);
        alert("Failed to load transactions. Please refresh the page.");
    });

    // 2. Categories Listener
    const qCats = query(collection(db, "categories"), where("uid", "==", userId));
    unsubscribeCats = onSnapshot(qCats, (snapshot) => {
        const categories = [];
        snapshot.forEach((doc) => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        console.log(`Loaded ${categories.length} categories from Firestore`);
        renderCategories(categories);
    }, (error) => {
        console.error("Error fetching categories:", error);
    });
};

export const unsubscribeListener = () => {
    if (unsubscribeTx) unsubscribeTx();
    if (unsubscribeCats) unsubscribeCats();
};
