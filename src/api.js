import {
  createUserWithEmailAndPassword,
  deleteUser as firebaseDeleteUser,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db, firebaseConfigReady } from "./firebase";

const requireFirebase = () => {
  if (!firebaseConfigReady) {
    throw new Error("Firebase not configured.");
  }
};

const userDocRef = (userId) => doc(db, "users", userId);
const expensesCollectionRef = (userId) =>
  collection(db, "users", userId, "expenses");
const budgetsCollectionRef = (userId) =>
  collection(db, "users", userId, "budgets");
const budgetDocRef = (userId, category) =>
  doc(db, "users", userId, "budgets", category);

const normalizeUser = (user) => ({
  id: user.uid,
  name: user.displayName || user.email?.split("@")[0] || "User",
  email: user.email,
});

const mapDoc = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

const sortByDateDesc = (items) =>
  [...items].sort((left, right) => {
    const leftTime = new Date(
      left.date || left.createdAt?.toDate?.() || 0,
    ).getTime();
    const rightTime = new Date(
      right.date || right.createdAt?.toDate?.() || 0,
    ).getTime();
    return rightTime - leftTime;
  });

export const userAPI = {
  register: async (name, email, password) => {
    requireFirebase();
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      throw new Error("All fields required.");
    }

    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    await updateProfile(credential.user, { displayName: name.trim() });

    const profile = {
      id: credential.user.uid,
      name: name.trim(),
      email: credential.user.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userDocRef(credential.user.uid), profile, { merge: true });

    return { data: normalizeUser(credential.user) };
  },

  login: async (email, password) => {
    requireFirebase();
    if (!email?.trim() || !password?.trim()) {
      throw new Error("Email and password required.");
    }

    const credential = await signInWithEmailAndPassword(auth, email, password);
    const snapshot = await getDoc(userDocRef(credential.user.uid));

    if (!snapshot.exists()) {
      await setDoc(userDocRef(credential.user.uid), {
        id: credential.user.uid,
        name: credential.user.displayName || email.split("@")[0],
        email: credential.user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return { data: normalizeUser(credential.user) };
  },

  getUser: async (userId) => {
    requireFirebase();
    if (!userId) throw new Error("User ID required.");
    const snapshot = await getDoc(userDocRef(userId));
    return { data: snapshot.exists() ? snapshot.data() : null };
  },

  updateUser: async (userId, userData) => {
    requireFirebase();
    await updateDoc(userDocRef(userId), {
      ...userData,
      updatedAt: serverTimestamp(),
    });
    return { data: { id: userId, ...userData } };
  },

  deleteUser: async (userId) => {
    requireFirebase();
    await deleteDoc(userDocRef(userId));

    if (auth.currentUser?.uid === userId) {
      await firebaseDeleteUser(auth.currentUser);
    }

    return { data: { id: userId } };
  },

  logout: async () => {
    requireFirebase();
    await signOut(auth);
    return { data: { success: true } };
  },

  onAuthChange: (callback) => {
    requireFirebase();
    return onAuthStateChanged(auth, callback);
  },

  hasExistingAccount: async (email) => {
    requireFirebase();
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods.length > 0;
  },
};

export const expenseAPI = {
  addExpense: async (userId, expenseData) => {
    requireFirebase();
    if (!userId || !expenseData?.description || !expenseData?.amount) {
      throw new Error("Missing required fields.");
    }

    const payload = {
      ...expenseData,
      amount: Number(expenseData.amount) || 0,
      createdAt: serverTimestamp(),
    };
    const result = await addDoc(expensesCollectionRef(userId), payload);
    return { data: { id: result.id, ...payload } };
  },

  getExpenses: async (userId) => expenseAPI.getAllExpenses(userId),

  getAllExpenses: async (userId) => {
    requireFirebase();
    const snapshot = await getDocs(expensesCollectionRef(userId));
    return { data: sortByDateDesc(snapshot.docs.map(mapDoc)) };
  },

  getExpensesByCategory: async (userId, category) => {
    const response = await expenseAPI.getAllExpenses(userId);
    return {
      data: response.data.filter((expense) => expense.category === category),
    };
  },

  getExpensesByDateRange: async (userId, startDate, endDate) => {
    const response = await expenseAPI.getAllExpenses(userId);
    return {
      data: response.data.filter((expense) => {
        const expenseDate = new Date(expense.date);
        return (
          expenseDate >= new Date(startDate) && expenseDate <= new Date(endDate)
        );
      }),
    };
  },

  getTotalSpending: async (userId) => {
    const response = await expenseAPI.getAllExpenses(userId);
    const total = response.data.reduce(
      (sum, expense) => sum + (Number(expense.amount) || 0),
      0,
    );
    return { data: { total } };
  },

  getCategoryStats: async (userId) => {
    const response = await expenseAPI.getAllExpenses(userId);
    const categoryStats = response.data.reduce((stats, expense) => {
      const amount = Number(expense.amount) || 0;
      const current = stats[expense.category] || {
        category: expense.category,
        total: 0,
        count: 0,
      };

      current.total += amount;
      current.count += 1;
      stats[expense.category] = current;
      return stats;
    }, {});

    return { data: Object.values(categoryStats) };
  },

  updateExpense: async (userId, expenseId, expenseData) => {
    requireFirebase();
    await updateDoc(doc(db, "users", userId, "expenses", expenseId), {
      ...expenseData,
      amount: Number(expenseData.amount) || 0,
      updatedAt: serverTimestamp(),
    });
    return { data: { id: expenseId, ...expenseData } };
  },

  deleteExpense: async (userId, expenseId) => {
    requireFirebase();
    await deleteDoc(doc(db, "users", userId, "expenses", expenseId));
    return { data: { id: expenseId } };
  },

  deleteAllExpenses: async (userId) => {
    requireFirebase();
    const snapshot = await getDocs(expensesCollectionRef(userId));
    await Promise.all(snapshot.docs.map((expense) => deleteDoc(expense.ref)));
    return { data: { success: true } };
  },
};

export const budgetAPI = {
  setBudget: async (userId, budgetData) => {
    requireFirebase();
    if (!userId || !budgetData?.category || !budgetData?.amount) {
      throw new Error("Missing required fields.");
    }

    const payload = {
      category: budgetData.category,
      amount: Number(budgetData.amount) || 0,
      updatedAt: serverTimestamp(),
    };

    await setDoc(budgetDocRef(userId, budgetData.category), payload, {
      merge: true,
    });

    return { data: payload };
  },

  getBudgets: async (userId) => {
    requireFirebase();
    const snapshot = await getDocs(budgetsCollectionRef(userId));
    return { data: snapshot.docs.map(mapDoc) };
  },

  getBudgetsWithSpending: async (userId) => {
    requireFirebase();
    const [budgetSnapshot, expenseSnapshot] = await Promise.all([
      getDocs(budgetsCollectionRef(userId)),
      getDocs(expensesCollectionRef(userId)),
    ]);

    const expenses = expenseSnapshot.docs.map(mapDoc);
    const spendingByCategory = expenses.reduce((totals, expense) => {
      const amount = Number(expense.amount) || 0;
      totals[expense.category] = (totals[expense.category] || 0) + amount;
      return totals;
    }, {});

    const budgets = budgetSnapshot.docs.map((snapshot) => {
      const budget = mapDoc(snapshot);
      const spent = spendingByCategory[budget.category] || 0;
      const remaining = budget.amount - spent;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      return {
        id: budget.id,
        category: budget.category,
        amount: budget.amount,
        spent,
        remaining,
        percentage,
      };
    });

    return { data: budgets };
  },

  updateBudget: async (userId, budgetId, budgetData) => {
    requireFirebase();
    await setDoc(
      budgetDocRef(userId, budgetId),
      {
        category: budgetData.category || budgetId,
        amount: Number(budgetData.amount) || 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return { data: { id: budgetId, ...budgetData } };
  },

  deleteBudget: async (userId, budgetId) => {
    requireFirebase();
    await deleteDoc(budgetDocRef(userId, budgetId));
    return { data: { id: budgetId } };
  },
};

export default { userAPI, expenseAPI, budgetAPI };
