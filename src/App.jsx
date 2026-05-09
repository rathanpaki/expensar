import React, { useState, useEffect, useRef } from "react";
import {
  PlusCircle,
  TrendingDown,
  TrendingUp,
  Calendar,
  DollarSign,
  Trash2,
  Filter,
  Bell,
  Download,
  AlertCircle,
  Target,
  LogOut,
  Settings,
  Eye,
  EyeOff,
  Zap,
  Award,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { userAPI, expenseAPI, budgetAPI } from "./api";
import { firebaseConfigReady } from "./firebase";
import { ConfigCheck } from "./ConfigCheck";
import { getAuthErrorMessage } from "./errorHandler";
import { AISuggestionsModal } from "./AISuggestionsModal";
import "./App.css";

const ExpenseTracker = () => {
  if (!firebaseConfigReady) {
    return <ConfigCheck />;
  }
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // login or register
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // Expense State
  const [expenses, setExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterCategory, setFilterCategory] = useState("all");

  // Budget State
  const [budgets, setBudgets] = useState({});
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState("food");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [selectedBudgetPopup, setSelectedBudgetPopup] = useState(null);

  // UI State
  const [reportView, setReportView] = useState("weekly");
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true",
  );
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAiSuggestionsModal, setShowAiSuggestionsModal] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [currencyCode, setCurrencyCode] = useState(
    () => localStorage.getItem("currencyCode") || "USD",
  );
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const [customCategories, setCustomCategories] = useState(() => {
    const saved = localStorage.getItem("customCategories");
    return saved ? JSON.parse(saved) : [];
  });
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState({
    label: "",
    icon: "📦",
    color: "#A8D8EA",
  });
  const [lastMonthReset, setLastMonthReset] = useState(() => {
    return localStorage.getItem("lastMonthReset") || "";
  });
  const currencyMenuRef = useRef(null);
  const exportMenuRef = useRef(null);

  const defaultCategories = [
    { id: "food", label: "Food & Dining", color: "#FF6B6B", icon: "🍽️" },
    { id: "transport", label: "Transport", color: "#4ECDC4", icon: "🚗" },
    {
      id: "entertainment",
      label: "Entertainment",
      color: "#95E1D3",
      icon: "🎬",
    },
    { id: "shopping", label: "Shopping", color: "#F38181", icon: "🛍️" },
    { id: "bills", label: "Bills & Utilities", color: "#AA96DA", icon: "💡" },
    { id: "health", label: "Health", color: "#FCBAD3", icon: "⚕️" },
    { id: "other", label: "Other", color: "#A8D8EA", icon: "📦" },
  ];

  const categories = [
    ...defaultCategories,
    ...customCategories.map((cat) => ({
      id: `custom_${cat.id}`,
      label: cat.label,
      color: cat.color,
      icon: cat.icon,
    })),
  ];

  const currencyOptions = [
    { code: "USD", label: "US Dollar", locale: "en-US", symbol: "$" },
    { code: "LKR", label: "Sri Lankan Rupee", locale: "si-LK", symbol: "Rs" },
    { code: "QAR", label: "Qatar Riyal", locale: "en-QA", symbol: "ر.ق" },
    { code: "EUR", label: "Euro", locale: "de-DE", symbol: "€" },
    { code: "GBP", label: "British Pound", locale: "en-GB", symbol: "£" },
    { code: "INR", label: "Indian Rupee", locale: "en-IN", symbol: "₹" },
    { code: "AUD", label: "Australian Dollar", locale: "en-AU", symbol: "A$" },
    { code: "JPY", label: "Japanese Yen", locale: "ja-JP", symbol: "¥" },
  ];

  const getMonthKey = (dateValue) => {
    const parsedDate = dateValue ? new Date(dateValue) : new Date();
    return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}`;
  };

  const isSameMonth = (dateValue, monthKey) =>
    getMonthKey(dateValue) === monthKey;

  // Load user session
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsLoggedIn(true);
      if (firebaseConfigReady) {
        loadExpenses(user.id);
        loadBudgets(user.id);
      }
    }

    if (!firebaseConfigReady) {
      return undefined;
    }

    const unsubscribe = userAPI.onAuthChange((firebaseUser) => {
      if (!firebaseUser) {
        return;
      }

      (async () => {
        try {
          const profileResponse = await userAPI.getUser(firebaseUser.uid);
          const profile = profileResponse.data || {};
          const user = {
            id: firebaseUser.uid,
            name:
              profile.name ||
              firebaseUser.displayName ||
              firebaseUser.email?.split("@")[0] ||
              "User",
            email: firebaseUser.email,
          };

          setCurrentUser(user);
          setIsLoggedIn(true);
          localStorage.setItem("currentUser", JSON.stringify(user));
          loadExpenses(user.id);
          loadBudgets(user.id);
        } catch (err) {
          if (err?.code === "permission-denied") {
            const user = {
              id: firebaseUser.uid,
              name:
                firebaseUser.displayName ||
                firebaseUser.email?.split("@")[0] ||
                "User",
              email: firebaseUser.email,
            };

            setCurrentUser(user);
            setIsLoggedIn(true);
            localStorage.setItem("currentUser", JSON.stringify(user));
            addNotification(
              "Firebase permissions are blocking Firestore reads. Deploy the Firestore rules for this app.",
              "error",
            );
            return;
          }

          addNotification("Failed to load Firebase session", "error");
        }
      })();
    });

    return () => unsubscribe();
  }, []);

  // Apply dark mode
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    if (darkMode) {
      document.body.style.background = "#1a1a2e";
      document.body.style.color = "#fff";
    } else {
      document.body.style.background = "#f8f9fa";
      document.body.style.color = "#333";
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("currencyCode", currencyCode);
  }, [currencyCode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        currencyMenuRef.current &&
        !currencyMenuRef.current.contains(event.target)
      ) {
        setShowCurrencyMenu(false);
      }

      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target)
      ) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Monthly reset check
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Initialize month on first login
    if (!lastMonthReset) {
      console.log("First login - initializing month tracker:", currentMonth);
      localStorage.setItem("lastMonthReset", currentMonth);
      setLastMonthReset(currentMonth);
      loadExpenses(currentUser.id);
      return;
    }

    // Check if month has changed
    if (lastMonthReset !== currentMonth) {
      console.log("Month changed from", lastMonthReset, "to", currentMonth);
      const rotateMonthlyData = async () => {
        try {
          setLoading(true);
          localStorage.setItem("lastMonthReset", currentMonth);
          setLastMonthReset(currentMonth);
          await loadExpenses(currentUser.id);
          addNotification(
            "✨ New month started! The list now shows this month only, and previous months stay saved for exports.",
            "success",
          );
        } catch (err) {
          console.error("Monthly reset error:", err);
          addNotification("Monthly reset failed. Try refreshing.", "error");
        } finally {
          setLoading(false);
        }
      };
      rotateMonthlyData();
    }
  }, [isLoggedIn, currentUser, lastMonthReset]);

  // Save custom categories to localStorage
  useEffect(() => {
    localStorage.setItem("customCategories", JSON.stringify(customCategories));
  }, [customCategories]);

  // Add notification
  const addNotification = (message, type = "info") => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  };

  // Auth handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (authMode === "register") {
        if (!authForm.name.trim()) {
          throw new Error("Name is required");
        }
        const response = await userAPI.register(
          authForm.name,
          authForm.email,
          authForm.password,
        );
        // Auto-login after registration
        setCurrentUser(response.data);
        localStorage.setItem("currentUser", JSON.stringify(response.data));
        setIsLoggedIn(true);
        loadExpenses(response.data.id);
        loadBudgets(response.data.id);
        addNotification(`Welcome ${response.data.name}! 🎉`, "success");
      } else {
        const response = await userAPI.login(authForm.email, authForm.password);
        setCurrentUser(response.data);
        localStorage.setItem("currentUser", JSON.stringify(response.data));
        setIsLoggedIn(true);
        loadExpenses(response.data.id);
        loadBudgets(response.data.id);
        addNotification(`Welcome back, ${response.data.name}! 👋`, "success");
      }
      setAuthForm({ email: "", password: "", name: "" });
    } catch (err) {
      const msg = getAuthErrorMessage(err.code || "");
      const code = err.code || "";

      if (code === "auth/user-not-found" && authMode === "login") {
        setAuthMode("register");
      }

      if (code === "auth/email-already-in-use" && authMode === "register") {
        setAuthMode("login");
      }

      setError(msg);
      addNotification(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await userAPI.logout();
    } finally {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setExpenses([]);
      setAllExpenses([]);
      setBudgets({});
      localStorage.removeItem("currentUser");
      setAuthForm({ email: "", password: "", name: "" });
      addNotification("Logged out successfully", "info");
    }
  };

  // Load expenses from backend
  const loadExpenses = async (userId) => {
    setIsLoadingExpenses(true);
    try {
      const response = await expenseAPI.getAllExpenses(userId);
      const loadedExpenses = response.data || [];
      const activeMonthKey = getMonthKey();
      setAllExpenses(loadedExpenses);
      setExpenses(
        loadedExpenses.filter((expense) =>
          isSameMonth(expense.date, activeMonthKey),
        ),
      );
    } catch (err) {
      console.error(err);
      setExpenses([]);
      setAllExpenses([]);
    } finally {
      setIsLoadingExpenses(false);
    }
  };

  // Load budgets from backend
  const loadBudgets = async (userId) => {
    setIsLoadingBudgets(true);
    try {
      const response = await budgetAPI.getBudgetsWithSpending(userId);
      const budgetsMap = {};
      response.data.forEach((b) => {
        budgetsMap[b.category] = b.amount;
      });
      setBudgets(budgetsMap);
    } catch (err) {
      console.error(err);
      setBudgets({});
    } finally {
      setIsLoadingBudgets(false);
    }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      addNotification("Please fill in all fields correctly", "error");
      return;
    }

    try {
      setLoading(true);
      const expenseData = {
        description: description.trim(),
        amount: parseFloat(amount),
        category,
        date,
      };
      await expenseAPI.addExpense(currentUser.id, expenseData);
      loadExpenses(currentUser.id);
      setDescription("");
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      addNotification("Expense added 💰", "success");
      checkBudgetAlert(category, parseFloat(amount));
    } catch (err) {
      console.error(err);
      addNotification("Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id) => {
    try {
      await expenseAPI.deleteExpense(currentUser.id, id);
      loadExpenses(currentUser.id);
      addNotification("Deleted", "info");
    } catch (err) {
      console.error(err);
      addNotification("Try again.", "error");
    }
  };

  const createCustomCategory = (e) => {
    e.preventDefault();
    if (!newCategory.label.trim()) {
      addNotification("Category name is required", "error");
      return;
    }

    const newId = `cat_${Date.now()}`;
    const categoryToAdd = {
      id: newId,
      label: newCategory.label.trim(),
      icon: newCategory.icon,
      color: newCategory.color,
    };

    setCustomCategories([...customCategories, categoryToAdd]);
    setBudgetCategory(`custom_${newId}`);
    setNewCategory({ label: "", icon: "📦", color: "#A8D8EA" });
    setShowCreateCategoryModal(false);
    addNotification("✨ Custom category created!", "success");
  };

  const setBudget = async (e) => {
    e.preventDefault();
    if (!budgetAmount || parseFloat(budgetAmount) <= 0) {
      addNotification("Enter a valid amount.", "error");
      return;
    }

    try {
      setLoading(true);
      const budgetData = {
        category: budgetCategory,
        amount: parseFloat(budgetAmount),
      };

      if (isEditingBudget) {
        await budgetAPI.updateBudget(
          currentUser.id,
          budgetCategory,
          budgetData,
        );
        addNotification("Budget updated 💸", "success");
      } else {
        await budgetAPI.setBudget(currentUser.id, budgetData);
        addNotification("Budget set 🎯", "success");
      }

      loadBudgets(currentUser.id);
      setBudgetAmount("");
      setBudgetCategory("food");
      setShowBudgetModal(false);
      setIsEditingBudget(false);
    } catch (err) {
      console.error(err);
      addNotification("Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteBudget = async (category) => {
    try {
      setLoading(true);
      await budgetAPI.deleteBudget(currentUser.id, category);
      loadBudgets(currentUser.id);
      addNotification("Budget deleted", "info");
    } catch (err) {
      console.error(err);
      addNotification("Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const openEditBudgetModal = (category, amount) => {
    setBudgetCategory(category);
    setBudgetAmount(amount.toString());
    setIsEditingBudget(true);
    setShowBudgetModal(true);
  };

  const checkBudgetAlert = (cat, newAmount) => {
    if (!budgets[cat]) return;

    const currentSpending =
      expenses
        .filter((exp) => exp.category === cat)
        .reduce((sum, exp) => sum + exp.amount, 0) + newAmount;

    const budget = budgets[cat];
    const percentage = (currentSpending / budget) * 100;

    if (percentage >= 90 && percentage < 100) {
      addNotification(
        `⚠️ Warning: ${percentage.toFixed(1)}% of ${categories.find((c) => c.id === cat)?.label} budget used`,
        "warning",
      );
    } else if (percentage >= 100) {
      addNotification(
        `🚨 Alert: ${categories.find((c) => c.id === cat)?.label} budget exceeded!`,
        "error",
      );
    }
  };

  // Filter and calculate totals
  const filteredExpenses =
    filterCategory === "all"
      ? expenses
      : expenses.filter((exp) => exp.category === filterCategory);

  const totalExpenses = filteredExpenses.reduce(
    (sum, exp) => sum + exp.amount,
    0,
  );

  // Calculate category spending with budget comparison
  const categoryData = categories
    .map((cat) => {
      const spent = expenses
        .filter((exp) => exp.category === cat.id)
        .reduce((sum, exp) => sum + exp.amount, 0);
      const budget = budgets[cat.id] || 0;
      return {
        ...cat,
        spent,
        budget,
        percentage: budget > 0 ? (spent / budget) * 100 : 0,
        remaining: budget > 0 ? budget - spent : 0,
      };
    })
    .filter((cat) => cat.spent > 0 || cat.budget > 0);

  const expenseHistory = allExpenses.length > 0 ? allExpenses : expenses;

  // Get date ranges
  const getDateRange = (type) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return type === "weekly" ? startOfWeek : startOfMonth;
  };

  // Generate report data
  const generateReportData = () => {
    const startDate = getDateRange(reportView);
    const reportExpenses = expenses.filter(
      (exp) => new Date(exp.date) >= startDate,
    );

    if (reportView === "weekly") {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dailyData = Array(7)
        .fill(0)
        .map((_, i) => {
          const day = new Date(startDate);
          day.setDate(startDate.getDate() + i);
          const dayExpenses = reportExpenses.filter(
            (exp) => new Date(exp.date).toDateString() === day.toDateString(),
          );
          return {
            day: dayNames[day.getDay()],
            amount: dayExpenses.reduce((sum, exp) => sum + exp.amount, 0),
          };
        });
      return dailyData;
    } else {
      const weeks = Math.ceil(new Date().getDate() / 7);
      const weeklyData = Array(weeks)
        .fill(0)
        .map((_, i) => {
          const weekStart = new Date(startDate);
          weekStart.setDate(startDate.getDate() + i * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);

          const weekExpenses = reportExpenses.filter((exp) => {
            const expDate = new Date(exp.date);
            return expDate >= weekStart && expDate <= weekEnd;
          });

          return {
            week: `Week ${i + 1}`,
            amount: weekExpenses.reduce((sum, exp) => sum + exp.amount, 0),
          };
        });
      return weeklyData;
    }
  };

  const reportData = generateReportData();
  const pieData = categoryData
    .filter((cat) => cat.spent > 0)
    .map((cat) => ({
      name: cat.label,
      value: cat.spent,
      color: cat.color,
    }));

  const activeCurrency =
    currencyOptions.find((option) => option.code === currencyCode) ||
    currencyOptions[0];

  const formatCurrency = (value) => {
    const numericValue = Number(value) || 0;

    if (activeCurrency.code === "QAR") {
      const formattedNumber = new Intl.NumberFormat(activeCurrency.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numericValue);

      return `${activeCurrency.symbol} ${formattedNumber}`;
    }

    return new Intl.NumberFormat(activeCurrency.locale, {
      style: "currency",
      currency: activeCurrency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  };

  // Get spending insights
  const getInsights = () => {
    if (expenses.length === 0) return [];

    const insights = [];
    const avgSpending = totalExpenses / Math.max(filteredExpenses.length, 1);
    const avgDailySpending =
      totalExpenses / Math.max(filteredExpenses.length, 1);

    // Calculate spending trend (compare recent to older)
    const midpoint = Math.floor(filteredExpenses.length / 2);
    const recentExpenses = filteredExpenses.slice(0, midpoint);
    const olderExpenses = filteredExpenses.slice(midpoint);
    const recentAvg =
      recentExpenses.reduce((sum, exp) => sum + exp.amount, 0) /
      Math.max(recentExpenses.length, 1);
    const olderAvg =
      olderExpenses.reduce((sum, exp) => sum + exp.amount, 0) /
      Math.max(olderExpenses.length, 1);
    const spendingTrend = ((recentAvg - olderAvg) / olderAvg) * 100;

    // 1. Budget Health Score & Overall Assessment
    const budgetedCategories = categoryData.filter((c) => c.budget > 0);
    const budgetHealth =
      budgetedCategories.length > 0
        ? (budgetedCategories.filter((c) => c.percentage < 100).length /
            budgetedCategories.length) *
          100
        : 0;

    if (budgetHealth >= 80) {
      insights.push(
        "🎯 Excellent budget control! You're staying well within your limits.",
      );
    } else if (budgetHealth >= 50) {
      insights.push(
        "📈 Good budget management, but watch a few categories closely.",
      );
    } else if (budgetHealth > 0) {
      insights.push(
        "⚠️ Multiple budgets are at risk. Review your spending habits.",
      );
    }

    // 2. Spending Trend Analysis
    if (filteredExpenses.length > 2) {
      if (spendingTrend > 15) {
        insights.push(
          `📊 ⚠️ Your spending increased ${Math.abs(spendingTrend).toFixed(0)}% recently. Try to control it!`,
        );
      } else if (spendingTrend < -15) {
        insights.push(
          `📊 ✅ Great! Your spending decreased ${Math.abs(spendingTrend).toFixed(0)}% recently. Keep it up!`,
        );
      }
    }

    // 3. Smart Budget Recommendations
    const categoryWithoutBudget = categoryData.find(
      (c) => c.spent > 0 && c.budget === 0 && c.spent > totalExpenses * 0.1,
    );
    if (categoryWithoutBudget) {
      const recommendedBudget = (categoryWithoutBudget.spent * 1.2).toFixed(2);
      insights.push(
        `💡 ${categoryWithoutBudget.label} needs a budget! Recommended: ${formatCurrency(recommendedBudget)}`,
      );
    }

    // 4. Top Spending Category Analysis
    const topCategory = categoryData.reduce(
      (a, b) => (a.spent > b.spent ? a : b),
      { spent: 0 },
    );
    if (topCategory.spent > totalExpenses * 0.4) {
      const percentageOfTotal = (
        (topCategory.spent / totalExpenses) *
        100
      ).toFixed(0);
      insights.push(
        `🔝 ${topCategory.label} takes ${percentageOfTotal}% of your budget!`,
      );

      // Suggest saving opportunity
      const savingsOpportunity = (topCategory.spent * 0.1).toFixed(2);
      insights.push(
        `💰 Reducing ${topCategory.label} by 10% could save ${formatCurrency(savingsOpportunity)}/month!`,
      );
    }

    // 5. Budget Exceeded Alert
    const budgetExceeded = categoryData.filter(
      (c) => c.budget > 0 && c.percentage >= 100,
    );
    if (budgetExceeded.length > 0) {
      const overBudgetAmount = budgetExceeded.reduce(
        (sum, c) => sum + (c.spent - c.budget),
        0,
      );
      insights.push(
        `🚨 ${budgetExceeded.length} budget(s) exceeded by ${formatCurrency(overBudgetAmount)} total!`,
      );
    }

    // 6. Average Daily Spending Insight
    if (filteredExpenses.length >= 3) {
      const projectedMonthly = (avgDailySpending * 30).toFixed(2);
      insights.push(
        `📅 Average daily spending: ${formatCurrency(avgDailySpending.toFixed(2))} (≈ ${formatCurrency(projectedMonthly)}/month)`,
      );
    }

    // 7. Low Spending Categories (Opportunity to Reallocate)
    const lowSpendingCat = categoryData.find(
      (c) => c.budget > 0 && c.percentage < 20 && c.spent > 0,
    );
    if (lowSpendingCat) {
      const budgetDifference = (
        lowSpendingCat.budget - lowSpendingCat.spent
      ).toFixed(2);
      insights.push(
        `✨ ${lowSpendingCat.label} budget has ${formatCurrency(budgetDifference)} remaining. Well controlled!`,
      );
    }

    // 8. High Frequency Low Value Expenses
    const smallExpenses = filteredExpenses.filter(
      (e) => e.amount < avgDailySpending / 2,
    );
    if (smallExpenses.length > filteredExpenses.length * 0.5) {
      const smallExpenseTotal = smallExpenses.reduce(
        (sum, e) => sum + e.amount,
        0,
      );
      insights.push(
        `🎯 ${smallExpenses.length} small expenses total ${formatCurrency(smallExpenseTotal.toFixed(2))}. Every bit counts!`,
      );
    }

    // 9. Weekend vs Weekday Spending (if enough data)
    if (filteredExpenses.length >= 7) {
      const weekendExpenses = filteredExpenses
        .filter((e) => {
          const day = new Date(e.date).getDay();
          return day === 0 || day === 6;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      const weekdayExpenses = filteredExpenses
        .filter((e) => {
          const day = new Date(e.date).getDay();
          return day !== 0 && day !== 6;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      if (weekendExpenses > weekdayExpenses * 1.5) {
        insights.push(
          `🎉 You spend significantly more on weekends. Plan better for leisure!`,
        );
      }
    }

    return insights.slice(0, 5); // Return top 5 insights
  };

  // Calculate Financial Health Score (0-100)
  const getFinancialHealthScore = () => {
    if (expenses.length === 0) return 0;

    let score = 50; // Base score

    // Budget adherence (max +30 points)
    const budgetedCategories = categoryData.filter((c) => c.budget > 0);
    if (budgetedCategories.length > 0) {
      const withoutExceeding = budgetedCategories.filter(
        (c) => c.percentage < 100,
      );
      const adherence = withoutExceeding.length / budgetedCategories.length;
      score += adherence * 30;
    }

    // Spending consistency (max +15 points)
    const avgAmount = totalExpenses / filteredExpenses.length;
    const variance =
      filteredExpenses.reduce(
        (sum, exp) => sum + Math.abs(exp.amount - avgAmount),
        0,
      ) / filteredExpenses.length;
    const consistency = Math.max(0, 1 - (variance / avgAmount) * 0.5);
    score += consistency * 15;

    // Budget coverage (max +5 points)
    const categoriesWithBudget = categoryData.filter(
      (c) => c.budget > 0,
    ).length;
    const budgetCoverage = Math.min(
      (categoriesWithBudget / categories.length) * 0.5,
      1,
    );
    score += budgetCoverage * 5;

    return Math.min(100, Math.round(score));
  };

  // Get Smart Budget Recommendations
  const getBudgetRecommendations = () => {
    const recommendations = [];

    categoryData.forEach((cat) => {
      if (cat.spent > 0 && cat.budget === 0) {
        // Recommend budget for category without one
        const recommended = (cat.spent * 1.2).toFixed(2);
        recommendations.push({
          category: cat.label,
          current: cat.spent.toFixed(2),
          recommended,
          reason: "Based on your spending pattern",
        });
      } else if (cat.budget > 0 && cat.percentage > 90) {
        // Recommend increase if consistently high
        const recommended = (cat.budget * 1.15).toFixed(2);
        recommendations.push({
          category: cat.label,
          current: cat.budget.toFixed(2),
          recommended,
          reason: "You're consistently near the limit",
        });
      }
    });

    return recommendations.slice(0, 3); // Top 3 recommendations
  };

  // Detect Spending Anomalies
  const getSpendingAnomalies = () => {
    if (filteredExpenses.length < 3) return [];

    const avgAmount = totalExpenses / filteredExpenses.length;
    const stdDeviation = Math.sqrt(
      filteredExpenses.reduce(
        (sum, exp) => sum + Math.pow(exp.amount - avgAmount, 2),
        0,
      ) / filteredExpenses.length,
    );

    const anomalies = filteredExpenses.filter(
      (exp) => Math.abs(exp.amount - avgAmount) > stdDeviation * 2,
    );

    return anomalies.slice(0, 3); // Return top 3 anomalies
  };

  // Get Savings Opportunities
  const getSavingsOpportunities = () => {
    const opportunities = [];
    const avgDailySpending =
      totalExpenses / Math.max(filteredExpenses.length, 1);

    // Opportunity 1: Reduce top category
    const topCategory = categoryData.reduce(
      (a, b) => (a.spent > b.spent ? a : b),
      { spent: 0 },
    );
    if (topCategory.spent > 0) {
      const savings = (topCategory.spent * 0.1).toFixed(2);
      opportunities.push({
        title: `Reduce ${topCategory.label} by 10%`,
        savings: savings,
        description: `You could save ${formatCurrency(savings)} this month`,
      });
    }

    // Opportunity 2: Eliminate small daily expenses
    const smallExpenses = filteredExpenses.filter(
      (e) => e.amount < avgDailySpending / 3,
    );
    if (smallExpenses.length > 5) {
      const totalSmall = smallExpenses.reduce((sum, e) => sum + e.amount, 0);
      const savings = (totalSmall * 0.3).toFixed(2);
      opportunities.push({
        title: "Cut small daily expenses by 30%",
        savings: savings,
        description: `${smallExpenses.length} small purchases add up to ${formatCurrency(totalSmall.toFixed(2))}`,
      });
    }

    // Opportunity 3: Budget optimization
    const unbuggetedHigh = categoryData.find(
      (c) => c.spent > 0 && c.budget === 0 && c.spent > totalExpenses * 0.15,
    );
    if (unbuggetedHigh) {
      const savings = (unbuggetedHigh.spent * 0.15).toFixed(2);
      opportunities.push({
        title: `Set and control ${unbuggetedHigh.label} budget`,
        savings: savings,
        description: "Reducing this category by 15% could save you money",
      });
    }

    return opportunities;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Date", "Description", "Category", "Amount"];
    const rows = expenseHistory.map((exp) => [
      exp.date,
      exp.description,
      categories.find((c) => c.id === exp.category)?.label || exp.category,
      exp.amount.toFixed(2),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    addNotification("Expenses exported successfully! 📥", "success");
  };

  // Export with timeline/date range
  const exportWithTimeline = (timelineType) => {
    let filteredForExport = [...expenseHistory];
    const now = new Date();

    switch (timelineType) {
      case "today":
        filteredForExport = expenseHistory.filter(
          (exp) => new Date(exp.date).toDateString() === now.toDateString(),
        );
        break;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        filteredForExport = expenseHistory.filter(
          (exp) => new Date(exp.date) >= weekStart,
        );
        break;
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        filteredForExport = expenseHistory.filter(
          (exp) => new Date(exp.date) >= monthStart,
        );
        break;
      case "quarter":
        const quarterStart = new Date(
          now.getFullYear(),
          Math.floor(now.getMonth() / 3) * 3,
          1,
        );
        filteredForExport = expenseHistory.filter(
          (exp) => new Date(exp.date) >= quarterStart,
        );
        break;
      case "year":
        const yearStart = new Date(now.getFullYear(), 0, 1);
        filteredForExport = expenseHistory.filter(
          (exp) => new Date(exp.date) >= yearStart,
        );
        break;
      default:
        break;
    }

    if (filteredForExport.length === 0) {
      addNotification("No expenses found for this timeline", "warning");
      return;
    }

    // Enhanced CSV with summary
    const headers = ["Date", "Description", "Category", "Amount"];
    const rows = filteredForExport
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((exp) => [
        exp.date,
        exp.description,
        categories.find((c) => c.id === exp.category)?.label || exp.category,
        exp.amount.toFixed(2),
      ]);

    const totalAmount = filteredForExport.reduce(
      (sum, exp) => sum + exp.amount,
      0,
    );
    const summaryRows = [
      [],
      ["SUMMARY"],
      ["Total Expenses", "", "", totalAmount.toFixed(2)],
      ["Transaction Count", "", "", filteredForExport.length],
      [
        "Average per Transaction",
        "",
        "",
        (totalAmount / filteredForExport.length).toFixed(2),
      ],
      [
        "Report Period",
        timelineType.toUpperCase(),
        "",
        new Date().toLocaleDateString(),
      ],
    ];

    const csv = [headers, ...rows, ...summaryRows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_${timelineType}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    addNotification(
      `${timelineType.toUpperCase()} expenses exported! 📊`,
      "success",
    );
  };

  // Export last month's expenses
  const exportLastMonth = () => {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    let filteredForExport = expenseHistory.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate >= lastMonthStart && expDate <= lastMonthEnd;
    });

    if (filteredForExport.length === 0) {
      addNotification("No expenses found for last month", "warning");
      return;
    }

    const headers = ["Date", "Description", "Category", "Amount"];
    const rows = filteredForExport
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((exp) => [
        exp.date,
        exp.description,
        categories.find((c) => c.id === exp.category)?.label || exp.category,
        exp.amount.toFixed(2),
      ]);

    const totalAmount = filteredForExport.reduce(
      (sum, exp) => sum + exp.amount,
      0,
    );
    const monthName = lastMonthStart.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const summaryRows = [
      [],
      ["SUMMARY"],
      ["Total Expenses", "", "", totalAmount.toFixed(2)],
      ["Transaction Count", "", "", filteredForExport.length],
      [
        "Average per Transaction",
        "",
        "",
        (totalAmount / filteredForExport.length).toFixed(2),
      ],
      ["Report Period", monthName, "", new Date().toLocaleDateString()],
    ];

    const csv = [headers, ...rows, ...summaryRows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_last_month_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    addNotification("Last month expenses exported! 📊", "success");
  };

  // Export custom date range
  const exportCustomDateRange = () => {
    const startDate = new Date(customDateRange.startDate);
    const endDate = new Date(customDateRange.endDate);

    if (startDate > endDate) {
      addNotification("Start date must be before end date", "error");
      return;
    }

    let filteredForExport = expenseHistory.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate >= startDate && expDate <= endDate;
    });

    if (filteredForExport.length === 0) {
      addNotification("No expenses found for this date range", "warning");
      return;
    }

    const headers = ["Date", "Description", "Category", "Amount"];
    const rows = filteredForExport
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((exp) => [
        exp.date,
        exp.description,
        categories.find((c) => c.id === exp.category)?.label || exp.category,
        exp.amount.toFixed(2),
      ]);

    const totalAmount = filteredForExport.reduce(
      (sum, exp) => sum + exp.amount,
      0,
    );
    const summaryRows = [
      [],
      ["SUMMARY"],
      ["Total Expenses", "", "", totalAmount.toFixed(2)],
      ["Transaction Count", "", "", filteredForExport.length],
      [
        "Average per Transaction",
        "",
        "",
        (totalAmount / filteredForExport.length).toFixed(2),
      ],
      [
        "Report Period",
        `${customDateRange.startDate} to ${customDateRange.endDate}`,
        "",
        new Date().toLocaleDateString(),
      ],
    ];

    const csv = [headers, ...rows, ...summaryRows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_custom_${customDateRange.startDate}_to_${customDateRange.endDate}.csv`;
    a.click();
    addNotification("Custom range expenses exported! 📊", "success");
    setShowCustomDateModal(false);
    setShowExportMenu(false);
  };

  // Auth UI
  if (!isLoggedIn) {
    return (
      <div
        className={`auth-container ${darkMode ? "dark" : ""}`}
        style={{ background: darkMode ? "#1a1a2e" : "#f8f9fa" }}
      >
        <div className="auth-card">
          <div className="auth-header">
            <DollarSign size={40} style={{ marginBottom: "1rem" }} />
            <h1>💰 Expense Tracker Pro</h1>
            <p>Manage your finances with ease</p>
          </div>

          <div className="auth-tabs">
            <button
              className={`auth-tab ${authMode === "login" ? "active" : ""}`}
              onClick={() => setAuthMode("login")}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${authMode === "register" ? "active" : ""}`}
              onClick={() => setAuthMode("register")}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="auth-form">
            {authMode === "register" && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, name: e.target.value })
                  }
                  placeholder="John Doe"
                  className="form-input"
                  required={authMode === "register"}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({ ...authForm, email: e.target.value })
                }
                placeholder="you@example.com"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={authForm.password}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, password: e.target.value })
                  }
                  placeholder="••••••••"
                  className="form-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ color: "#ef4444", fontSize: "0.875rem" }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.875rem",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "600",
                fontFamily: '"Work Sans", sans-serif',
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? "Loading..."
                : authMode === "login"
                  ? "Sign In"
                  : "Sign Up"}
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              fontSize: "0.875rem",
              color: "#64748b",
              marginTop: "1rem",
            }}
          >
            {authMode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setError("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#667eea",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              {authMode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Main App UI
  return (
    <div
      className={`expense-tracker-container ${darkMode ? "dark" : ""}`}
      style={{ background: darkMode ? "#1a1a2e" : "#f8f9fa" }}
    >
      {/* Notifications */}
      <div className="notifications-container">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`notification notification-${notif.type}`}
          >
            {notif.message}
          </div>
        ))}
      </div>

      <div className="expense-tracker-content">
        {/* Header */}
        <div className="expense-tracker-header">
          <div className="header-content">
            <h1 className="expense-tracker-title">💰 Expense Tracker Pro</h1>
            <p className="expense-tracker-subtitle">
              Welcome, {currentUser?.name}! |{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="header-actions">
            <div className="currency-switcher" ref={currencyMenuRef}>
              <button
                type="button"
                className="currency-button"
                onClick={() => setShowCurrencyMenu((prev) => !prev)}
              >
                {activeCurrency.code} {activeCurrency.symbol}
              </button>
              {showCurrencyMenu && (
                <div className="currency-menu">
                  {currencyOptions.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      className="currency-option"
                      onClick={() => {
                        setCurrencyCode(option.code);
                        setShowCurrencyMenu(false);
                      }}
                    >
                      {option.code} - {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "1.5rem",
              }}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "0.5rem 1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontFamily: '"Work Sans", sans-serif',
              }}
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-container">
          <button
            onClick={() => setShowBudgetModal(true)}
            className="action-button"
          >
            <Target size={18} />
            Set Budget
          </button>
          <button
            onClick={() => setShowAiSuggestionsModal(true)}
            className="action-button"
          >
            <Zap size={18} />
            AI Suggestions
          </button>
          <div
            ref={exportMenuRef}
            style={{ position: "relative", display: "inline-block" }}
          >
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="action-button export-button"
            >
              <Download size={18} />
              Export
            </button>
            {showExportMenu && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  backgroundColor: darkMode
                    ? "rgba(42, 42, 62, 0.95)"
                    : "rgba(255, 255, 255, 0.95)",
                  border: `1px solid ${darkMode ? "rgba(102, 126, 234, 0.2)" : "rgba(102, 126, 234, 0.15)"}`,
                  borderRadius: "8px",
                  marginTop: "0.5rem",
                  minWidth: "150px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                  zIndex: 100,
                  backdropFilter: "blur(10px)",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => {
                    exportToCSV();
                    setShowExportMenu(false);
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: darkMode ? "#e2e8f0" : "#475569",
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = darkMode
                      ? "rgba(102, 126, 234, 0.15)"
                      : "rgba(102, 126, 234, 0.1)";
                    e.currentTarget.style.color = "#667eea";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = darkMode
                      ? "#e2e8f0"
                      : "#475569";
                  }}
                >
                  All Expenses
                </button>
                <button
                  onClick={() => {
                    exportWithTimeline("today");
                    setShowExportMenu(false);
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: darkMode ? "#e2e8f0" : "#475569",
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = darkMode
                      ? "rgba(102, 126, 234, 0.15)"
                      : "rgba(102, 126, 234, 0.1)";
                    e.currentTarget.style.color = "#667eea";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = darkMode
                      ? "#e2e8f0"
                      : "#475569";
                  }}
                >
                  📅 Today
                </button>
                <button
                  onClick={() => {
                    exportWithTimeline("week");
                    setShowExportMenu(false);
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: darkMode ? "#e2e8f0" : "#475569",
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = darkMode
                      ? "rgba(102, 126, 234, 0.15)"
                      : "rgba(102, 126, 234, 0.1)";
                    e.currentTarget.style.color = "#667eea";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = darkMode
                      ? "#e2e8f0"
                      : "#475569";
                  }}
                >
                  📊 This Week
                </button>
                <button
                  onClick={() => {
                    exportWithTimeline("month");
                    setShowExportMenu(false);
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: darkMode ? "#e2e8f0" : "#475569",
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = darkMode
                      ? "rgba(102, 126, 234, 0.15)"
                      : "rgba(102, 126, 234, 0.1)";
                    e.currentTarget.style.color = "#667eea";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = darkMode
                      ? "#e2e8f0"
                      : "#475569";
                  }}
                >
                  📆 This Month
                </button>
                <button
                  onClick={() => {
                    exportWithTimeline("quarter");
                    setShowExportMenu(false);
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: darkMode ? "#e2e8f0" : "#475569",
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = darkMode
                      ? "rgba(102, 126, 234, 0.15)"
                      : "rgba(102, 126, 234, 0.1)";
                    e.currentTarget.style.color = "#667eea";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = darkMode
                      ? "#e2e8f0"
                      : "#475569";
                  }}
                >
                  📈 This Quarter
                </button>
                <button
                  onClick={() => {
                    exportWithTimeline("year");
                    setShowExportMenu(false);
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: darkMode ? "#e2e8f0" : "#475569",
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = darkMode
                      ? "rgba(102, 126, 234, 0.15)"
                      : "rgba(102, 126, 234, 0.1)";
                    e.currentTarget.style.color = "#667eea";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = darkMode
                      ? "#e2e8f0"
                      : "#475569";
                  }}
                >
                  📅 This Year
                </button>
                <button
                  onClick={() => {
                    exportLastMonth();
                    setShowExportMenu(false);
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: darkMode ? "#e2e8f0" : "#475569",
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = darkMode
                      ? "rgba(102, 126, 234, 0.15)"
                      : "rgba(102, 126, 234, 0.1)";
                    e.currentTarget.style.color = "#667eea";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = darkMode
                      ? "#e2e8f0"
                      : "#475569";
                  }}
                >
                  📆 Last Month
                </button>
                <button
                  onClick={() => {
                    setShowCustomDateModal(true);
                    setShowExportMenu(false);
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: darkMode ? "#e2e8f0" : "#475569",
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = darkMode
                      ? "rgba(102, 126, 234, 0.15)"
                      : "rgba(102, 126, 234, 0.1)";
                    e.currentTarget.style.color = "#667eea";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = darkMode
                      ? "#e2e8f0"
                      : "#475569";
                  }}
                >
                  📋 Custom Range
                </button>
              </div>
            )}
          </div>
        </div>

        {getInsights().length > 0 && (
          <div
            className="insights-container"
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {/* Financial Health Score */}
            <div
              style={{
                padding: "0.75rem",
                background: darkMode
                  ? "linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15))"
                  : "linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08))",
                borderRadius: "10px",
                border: `1px solid ${darkMode ? "rgba(102, 126, 234, 0.35)" : "rgba(102, 126, 234, 0.25)"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    color: darkMode ? "#e2e8f0" : "#1e293b",
                  }}
                >
                  💪 Health Score
                </span>
                <span
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "800",
                    color:
                      getFinancialHealthScore() >= 80
                        ? "#10b981"
                        : getFinancialHealthScore() >= 60
                          ? "#f59e0b"
                          : "#ef4444",
                  }}
                >
                  {getFinancialHealthScore()}/100
                </span>
              </div>
              <div
                style={{
                  height: "6px",
                  background: darkMode
                    ? "rgba(255,255,255, 0.15)"
                    : "rgba(0,0,0,0.08)",
                  borderRadius: "3px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${getFinancialHealthScore()}%`,
                    background:
                      getFinancialHealthScore() >= 80
                        ? "#10b981"
                        : getFinancialHealthScore() >= 60
                          ? "#f59e0b"
                          : "#ef4444",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  marginTop: "0.35rem",
                  color: darkMode ? "#cbd5e1" : "#64748b",
                }}
              >
                {getFinancialHealthScore() >= 80
                  ? "✅ Excellent"
                  : getFinancialHealthScore() >= 60
                    ? "👍 Good"
                    : "📈 Fair"}
              </div>
            </div>

            {/* Smart Insights */}
            <div
              style={{
                padding: "0.75rem",
                background: darkMode
                  ? "rgba(30, 41, 59, 0.6)"
                  : "rgba(248, 250, 252, 0.8)",
                borderRadius: "10px",
                border: `1px solid ${darkMode ? "rgba(102, 126, 234, 0.25)" : "rgba(102, 126, 234, 0.2)"}`,
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  marginBottom: "0.5rem",
                  color: darkMode ? "#e2e8f0" : "#1e293b",
                }}
              >
                <Zap size={16} />
                Smart Insights
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                {getInsights().map((insight, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "0.5rem 0.75rem",
                      background: darkMode
                        ? "rgba(102, 126, 234, 0.12)"
                        : "rgba(102, 126, 234, 0.08)",
                      borderLeft: `3px solid ${darkMode ? "#667eea" : "#4f46e5"}`,
                      borderRadius: "5px",
                      fontSize: "0.8rem",
                      color: darkMode ? "#e2e8f0" : "#1e293b",
                      lineHeight: "1.4",
                    }}
                  >
                    {insight}
                  </div>
                ))}
              </div>
            </div>

            {/* Budget Recommendations */}
            {getBudgetRecommendations().length > 0 && (
              <div
                style={{
                  padding: "0.75rem",
                  background: darkMode
                    ? "rgba(30, 41, 59, 0.6)"
                    : "rgba(248, 250, 252, 0.8)",
                  borderRadius: "10px",
                  border: `1px solid ${darkMode ? "rgba(217, 119, 6, 0.25)" : "rgba(217, 119, 6, 0.2)"}`,
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    marginBottom: "0.5rem",
                    color: darkMode ? "#fbbf24" : "#b45309",
                  }}
                >
                  🎯 Budget Tips
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  {getBudgetRecommendations().map((rec, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.5rem 0.75rem",
                        background: darkMode
                          ? "rgba(217, 119, 6, 0.12)"
                          : "rgba(217, 119, 6, 0.08)",
                        borderLeft: `3px solid ${darkMode ? "#f59e0b" : "#d97706"}`,
                        borderRadius: "5px",
                        fontSize: "0.75rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: "700",
                            color: darkMode ? "#fbbf24" : "#b45309",
                          }}
                        >
                          {rec.category}
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: darkMode ? "#cbd5e1" : "#64748b",
                            marginTop: "0.2rem",
                          }}
                        >
                          {rec.reason}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: darkMode ? "#cbd5e1" : "#64748b",
                          }}
                        >
                          Suggest
                        </div>
                        <div
                          style={{
                            fontWeight: "700",
                            color: darkMode ? "#fbbf24" : "#b45309",
                          }}
                        >
                          {formatCurrency(rec.recommended)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Savings Opportunities */}
            {getSavingsOpportunities().length > 0 && (
              <div
                style={{
                  padding: "0.75rem",
                  background: darkMode
                    ? "rgba(30, 41, 59, 0.6)"
                    : "rgba(248, 250, 252, 0.8)",
                  borderRadius: "10px",
                  border: `1px solid ${darkMode ? "rgba(34, 197, 94, 0.25)" : "rgba(34, 197, 94, 0.2)"}`,
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    marginBottom: "0.5rem",
                    color: darkMode ? "#86efac" : "#16a34a",
                  }}
                >
                  💰 Savings
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  {getSavingsOpportunities().map((opp, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.5rem 0.75rem",
                        background: darkMode
                          ? "rgba(34, 197, 94, 0.12)"
                          : "rgba(34, 197, 94, 0.08)",
                        borderLeft: `3px solid ${darkMode ? "#22c55e" : "#16a34a"}`,
                        borderRadius: "5px",
                        fontSize: "0.75rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: "700",
                            color: darkMode ? "#86efac" : "#16a34a",
                          }}
                        >
                          {opp.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: darkMode ? "#cbd5e1" : "#64748b",
                            marginTop: "0.2rem",
                          }}
                        >
                          {opp.description}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: darkMode ? "#cbd5e1" : "#64748b",
                          }}
                        >
                          Save
                        </div>
                        <div
                          style={{
                            fontWeight: "700",
                            color: darkMode ? "#86efac" : "#16a34a",
                          }}
                        >
                          +{formatCurrency(opp.savings)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats Overview */}
        <div className="stats-grid">
          <div className="stat-card animation-delay-1">
            <div className="stat-card-header">
              <DollarSign size={20} color="#667eea" />
              <span className="stat-card-label">Total Spent</span>
            </div>
            <div
              className="stat-card-value"
              style={{ color: darkMode ? "#fff" : "#1e293b" }}
            >
              {formatCurrency(totalExpenses)}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                marginTop: "0.5rem",
              }}
            >
              {filteredExpenses.length} transactions
            </div>
          </div>

          <div className="stat-card animation-delay-2">
            <div className="stat-card-header">
              <TrendingDown size={20} color="#f43f5e" />
              <span className="stat-card-label">Transactions</span>
            </div>
            <div
              className="stat-card-value"
              style={{ color: darkMode ? "#fff" : "#1e293b" }}
            >
              {filteredExpenses.length}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                marginTop: "0.5rem",
              }}
            >
              {filteredExpenses.length > 0
                ? `Avg: ${formatCurrency(
                    totalExpenses / filteredExpenses.length,
                  )}`
                : "No data"}
            </div>
          </div>

          <div className="stat-card animation-delay-3">
            <div className="stat-card-header">
              <Award size={20} color="#10b981" />
              <span className="stat-card-label">Budget Status</span>
            </div>
            <div
              className="stat-card-value"
              style={{ color: darkMode ? "#fff" : "#1e293b" }}
            >
              {Object.keys(budgets).length}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                marginTop: "0.5rem",
              }}
            >
              {Object.keys(budgets).length} active budgets
            </div>
          </div>
        </div>

        {/* Budget Alerts */}
        {categoryData.some((cat) => cat.budget > 0 && cat.percentage >= 80) && (
          <div className="budget-alert">
            <div className="budget-alert-header">
              <Bell size={20} color="#f59e0b" />
              <h3 className="budget-alert-title">Budget Alerts</h3>
            </div>
            {categoryData
              .filter((cat) => cat.budget > 0 && cat.percentage >= 80)
              .map((cat) => (
                <div
                  key={cat.id}
                  className={`alert-item ${cat.percentage >= 100 ? "alert-danger" : "alert-warning"}`}
                >
                  <strong>
                    {cat.icon} {cat.label}:
                  </strong>{" "}
                  {cat.percentage.toFixed(1)}% of budget used
                  {cat.percentage >= 100 &&
                    ` (Over by ${formatCurrency(Math.abs(cat.remaining))})`}
                </div>
              ))}
          </div>
        )}

        <div className="form-budget-grid">
          {/* Add Expense Form */}
          <div className="card animation-delay-1">
            <h2 className="card-title">Add Expense</h2>
            <form onSubmit={addExpense}>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Coffee at Starbucks"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-input select-input"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="submit-button"
              >
                <PlusCircle size={20} />
                {loading ? "Adding..." : "Add Expense"}
              </button>
            </form>
          </div>

          {/* Budget Overview */}
          {isLoadingBudgets ? (
            <div className="card animation-delay-2">
              <h2 className="card-title">Budget vs Spending</h2>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "2rem",
                }}
              >
                <div className="spinner"></div>
              </div>
            </div>
          ) : categoryData.length > 0 ? (
            <div className="card animation-delay-2">
              <h2 className="card-title">Budget vs Spending</h2>
              {categoryData.map((cat, index) => (
                <div
                  key={cat.id}
                  className="budget-item"
                  onClick={() =>
                    cat.budget > 0 && setSelectedBudgetPopup(cat.id)
                  }
                  style={{
                    cursor: cat.budget > 0 ? "pointer" : "default",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (cat.budget > 0) {
                      e.currentTarget.style.background = darkMode
                        ? "rgba(102, 126, 234, 0.1)"
                        : "rgba(102, 126, 234, 0.05)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div className="budget-header">
                    <span className="budget-name">
                      {cat.icon} {cat.label}
                    </span>
                    <span className="budget-amount">
                      {formatCurrency(cat.spent)}
                      {cat.budget > 0 && ` / ${formatCurrency(cat.budget)}`}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width:
                          cat.budget > 0
                            ? `${Math.min(cat.percentage, 100)}%`
                            : "100%",
                        background:
                          cat.percentage >= 100
                            ? "#ef4444"
                            : cat.percentage >= 80
                              ? "#f59e0b"
                              : cat.color,
                        transitionDelay: `${index * 0.1}s`,
                      }}
                    />
                  </div>
                  {cat.budget > 0 && (
                    <div className="budget-remaining">
                      {cat.remaining >= 0
                        ? `${formatCurrency(cat.remaining)} remaining`
                        : `Over by ${formatCurrency(Math.abs(cat.remaining))}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {/* Budget Actions Popup */}
          {selectedBudgetPopup && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0, 0, 0, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: "1rem",
                overflow: "auto",
              }}
              onClick={() => setSelectedBudgetPopup(null)}
            >
              <div
                style={{
                  background: darkMode ? "#1a1a2e" : "white",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  boxShadow: darkMode
                    ? "0 10px 40px rgba(0, 0, 0, 0.5)"
                    : "0 10px 40px rgba(0, 0, 0, 0.1)",
                  textAlign: "center",
                  width: "100%",
                  maxWidth: "400px",
                  minWidth: "280px",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3
                  style={{
                    marginBottom: "1.5rem",
                    color: darkMode ? "white" : "#1a1a2e",
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    wordBreak: "break-word",
                  }}
                >
                  {categories.find((c) => c.id === selectedBudgetPopup)?.label}{" "}
                  Budget
                </h3>

                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    flexDirection: "column",
                  }}
                >
                  <button
                    onClick={() => {
                      const budgetAmount = budgets[selectedBudgetPopup];
                      openEditBudgetModal(selectedBudgetPopup, budgetAmount);
                      setSelectedBudgetPopup(null);
                    }}
                    style={{
                      padding: "0.9rem 1.5rem",
                      background: "#667eea",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      fontFamily: '"Work Sans", sans-serif',
                      cursor: "pointer",
                      transition: "all 0.2s",
                      width: "100%",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#764ba2";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#667eea";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    ✏️ Edit Budget
                  </button>

                  <button
                    onClick={() => {
                      deleteBudget(selectedBudgetPopup);
                      setSelectedBudgetPopup(null);
                    }}
                    style={{
                      padding: "0.9rem 1.5rem",
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      fontFamily: '"Work Sans", sans-serif',
                      cursor: "pointer",
                      transition: "all 0.2s",
                      width: "100%",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#dc2626";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#ef4444";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    🗑️ Delete Budget
                  </button>

                  <button
                    onClick={() => setSelectedBudgetPopup(null)}
                    style={{
                      padding: "0.9rem 1.5rem",
                      background: darkMode ? "#333" : "#f0f0f0",
                      color: darkMode ? "#ccc" : "#333",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      fontFamily: '"Work Sans", sans-serif',
                      cursor: "pointer",
                      transition: "all 0.2s",
                      width: "100%",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = darkMode
                        ? "#444"
                        : "#e0e0e0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = darkMode
                        ? "#333"
                        : "#f0f0f0";
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reports Section */}
        <div className="card section-card animation-delay-3">
          <div className="reports-header">
            <h2 className="card-title">Expense Reports</h2>
            <div className="view-toggle">
              <button
                onClick={() => setReportView("weekly")}
                className={`view-button ${reportView === "weekly" ? "active" : "inactive"}`}
              >
                Weekly
              </button>
              <button
                onClick={() => setReportView("monthly")}
                className={`view-button ${reportView === "monthly" ? "active" : "inactive"}`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="reports-grid">
            {/* Area Chart */}
            <div>
              <h3 className="chart-title">Spending Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={reportData}>
                  <defs>
                    <linearGradient
                      id="colorAmount"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#667eea"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey={reportView === "weekly" ? "day" : "week"}
                    stroke="#64748b"
                    style={{
                      fontSize: "0.75rem",
                      fontFamily: '"Work Sans", sans-serif',
                    }}
                  />
                  <YAxis
                    stroke="#64748b"
                    style={{
                      fontSize: "0.75rem",
                      fontFamily: '"Work Sans", sans-serif',
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: darkMode ? "#2a2a3e" : "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontFamily: '"Work Sans", sans-serif',
                    }}
                    formatter={(value) => [formatCurrency(value), "Amount"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#667eea"
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            {pieData.length > 0 && (
              <div>
                <h3 className="chart-title">Category Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: darkMode ? "#2a2a3e" : "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontFamily: '"Work Sans", sans-serif',
                      }}
                      formatter={(value) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Expense List */}
        <div className="card section-card expense-list-card animation-delay-4">
          <div className="expense-list-header">
            <h2 className="card-title">Recent Expenses</h2>
            <div className="filter-container">
              <Filter size={18} color="#64748b" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingExpenses ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "2rem",
              }}
            >
              <div className="spinner"></div>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="empty-state expense-list-scroll">
              <TrendingUp
                size={48}
                style={{ margin: "0 auto 1rem", opacity: 0.5 }}
              />
              <p className="empty-state-text">
                {filterCategory === "all"
                  ? "No expenses yet. Start tracking your spending!"
                  : "No expenses in this category."}
              </p>
            </div>
          ) : (
            <div className="expense-list-scroll expense-list-items">
              {filteredExpenses.map((expense, index) => {
                const cat = categories.find((c) => c.id === expense.category);
                return (
                  <div
                    key={expense.id}
                    className="expense-card"
                    style={{
                      animationDelay: `${index * 0.05}s`,
                    }}
                  >
                    <div className="expense-card-content">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <div
                          className="expense-icon"
                          style={{
                            background: `${cat.color}20`,
                          }}
                        >
                          {cat.icon}
                        </div>
                        <div className="expense-details">
                          <div className="expense-description">
                            {expense.description}
                          </div>
                          <div className="expense-meta">
                            <span>{cat.label}</span>
                            <span>•</span>
                            <span>
                              {new Date(expense.date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="expense-actions">
                        <div className="expense-amount">
                          {formatCurrency(expense.amount)}
                        </div>
                        <button
                          className="delete-button"
                          onClick={() => deleteExpense(expense.id)}
                          aria-label="Delete expense"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AISuggestionsModal
        open={showAiSuggestionsModal}
        onClose={() => setShowAiSuggestionsModal(false)}
        darkMode={darkMode}
        insights={getInsights()}
        financialHealthScore={getFinancialHealthScore()}
        budgetRecommendations={getBudgetRecommendations()}
        savingsOpportunities={getSavingsOpportunities()}
        formatCurrency={formatCurrency}
      />

      {/* Budget Modal */}
      {showBudgetModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowBudgetModal(false);
              setIsEditingBudget(false);
            }
          }}
        >
          <div
            className="modal-content"
            style={{ background: darkMode ? "#2a2a3e" : "white" }}
          >
            <h2 className="card-title">
              {isEditingBudget ? "Edit Budget" : "Set Category Budget"}
            </h2>
            <form onSubmit={setBudget}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select
                    value={budgetCategory}
                    onChange={(e) => setBudgetCategory(e.target.value)}
                    disabled={isEditingBudget}
                    className="form-input select-input"
                    style={{
                      opacity: isEditingBudget ? 0.6 : 1,
                      cursor: isEditingBudget ? "not-allowed" : "pointer",
                      flex: 1,
                    }}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                  {!isEditingBudget && (
                    <button
                      type="button"
                      onClick={() => setShowCreateCategoryModal(true)}
                      style={{
                        padding: "0.625rem 1rem",
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                      title="Create new category"
                    >
                      ➕ New
                    </button>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Budget Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="0.00"
                  className="form-input"
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowBudgetModal(false);
                    setIsEditingBudget(false);
                    setBudgetAmount("");
                    setBudgetCategory("food");
                  }}
                  style={{
                    flex: 1,
                    padding: "0.875rem",
                    background: darkMode ? "#1a1a2e" : "white",
                    color: "#64748b",
                    border: "2px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontWeight: "600",
                    fontFamily: '"Work Sans", sans-serif',
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "0.875rem",
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontWeight: "600",
                    fontFamily: '"Work Sans", sans-serif',
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading
                    ? isEditingBudget
                      ? "Updating..."
                      : "Setting..."
                    : isEditingBudget
                      ? "Update Budget"
                      : "Set Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Date Range Modal */}
      {showCustomDateModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCustomDateModal(false);
            }
          }}
        >
          <div
            className="modal-content"
            style={{ background: darkMode ? "#2a2a3e" : "white" }}
          >
            <h2 className="card-title">Export Custom Date Range</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                exportCustomDateRange();
              }}
            >
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) =>
                    setCustomDateRange({
                      ...customDateRange,
                      startDate: e.target.value,
                    })
                  }
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) =>
                    setCustomDateRange({
                      ...customDateRange,
                      endDate: e.target.value,
                    })
                  }
                  className="form-input"
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCustomDateModal(false)}
                  style={{
                    flex: 1,
                    padding: "0.875rem",
                    background: darkMode ? "#1a1a2e" : "white",
                    color: "#64748b",
                    border: "2px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontWeight: "600",
                    fontFamily: '"Work Sans", sans-serif',
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "0.875rem",
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontWeight: "600",
                    fontFamily: '"Work Sans", sans-serif',
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "Exporting..." : "Export"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Custom Category Modal */}
      {showCreateCategoryModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateCategoryModal(false);
            }
          }}
        >
          <div
            className="modal-content"
            style={{ background: darkMode ? "#2a2a3e" : "white" }}
          >
            <h2 className="card-title">Create Custom Category</h2>
            <form onSubmit={createCustomCategory}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input
                  type="text"
                  value={newCategory.label}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, label: e.target.value })
                  }
                  placeholder="e.g., Groceries, Gym, Subscriptions"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Select Icon or Emoji</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, 1fr)",
                    gap: "0.5rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  {[
                    "🍕",
                    "🍔",
                    "🍜",
                    "🎮",
                    "📱",
                    "💻",
                    "💪",
                    "🏃",
                    "🚀",
                    "✈️",
                    "🚗",
                    "🎓",
                    "📚",
                    "🎬",
                    "🎵",
                    "🎨",
                    "🏠",
                    "🏥",
                    "⚕️",
                    "💄",
                    "👔",
                    "👟",
                    "🐕",
                    "🌸",
                    "🌟",
                    "🎁",
                    "💎",
                    "📸",
                    "🎪",
                    "🎭",
                    "🏋️",
                    "🧘",
                    "🍿",
                    "🍺",
                    "☕",
                    "🛍️",
                    "💳",
                    "💰",
                    "💸",
                    "⚡",
                    "🌈",
                  ].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() =>
                        setNewCategory({ ...newCategory, icon: emoji })
                      }
                      style={{
                        padding: "0.5rem",
                        fontSize: "1.5rem",
                        background:
                          newCategory.icon === emoji
                            ? "rgba(102, 126, 234, 0.3)"
                            : darkMode
                              ? "rgba(102, 126, 234, 0.1)"
                              : "rgba(102, 126, 234, 0.05)",
                        border:
                          newCategory.icon === emoji
                            ? "2px solid #667eea"
                            : "1px solid transparent",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {newCategory.icon && (
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: darkMode ? "#cbd5e1" : "#64748b",
                      textAlign: "center",
                    }}
                  >
                    Selected: {newCategory.icon}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Color</label>
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  {[
                    "#FF6B6B",
                    "#4ECDC4",
                    "#95E1D3",
                    "#F38181",
                    "#AA96DA",
                    "#FCBAD3",
                    "#A8D8EA",
                    "#FFD93D",
                    "#6BCB77",
                    "#FF6B9D",
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategory({ ...newCategory, color })}
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "6px",
                        background: color,
                        border:
                          newCategory.color === color
                            ? "3px solid white"
                            : "2px solid transparent",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxShadow:
                          newCategory.color === color
                            ? `0 0 0 2px ${color}`
                            : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div
                style={{
                  marginTop: "1.5rem",
                  padding: "1rem",
                  background: darkMode
                    ? "rgba(102, 126, 234, 0.1)"
                    : "rgba(102, 126, 234, 0.05)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    fontSize: "2rem",
                    lineHeight: "1",
                  }}
                >
                  {newCategory.icon}
                </div>
                <div style={{ color: darkMode ? "#e2e8f0" : "#475569" }}>
                  <div
                    style={{
                      fontSize: "0.9rem",
                      color: darkMode ? "#cbd5e1" : "#64748b",
                    }}
                  >
                    Preview:
                  </div>
                  <div style={{ fontWeight: "600" }}>
                    {newCategory.label || "Category Name"}
                  </div>
                </div>
              </div>

              <div
                style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateCategoryModal(false);
                    setNewCategory({ label: "", icon: "📦", color: "#A8D8EA" });
                  }}
                  style={{
                    flex: 1,
                    padding: "0.875rem",
                    background: darkMode ? "#1a1a2e" : "white",
                    color: "#64748b",
                    border: "2px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontWeight: "600",
                    fontFamily: '"Work Sans", sans-serif',
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "0.875rem",
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontWeight: "600",
                    fontFamily: '"Work Sans", sans-serif',
                    cursor: "pointer",
                  }}
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;
