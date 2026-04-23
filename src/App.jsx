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
  const [currencyCode, setCurrencyCode] = useState(
    () => localStorage.getItem("currencyCode") || "USD",
  );
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const currencyMenuRef = useRef(null);
  const exportMenuRef = useRef(null);

  const categories = [
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
      setExpenses(response.data || []);
    } catch (err) {
      console.error(err);
      setExpenses([]);
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

    if (avgSpending > 50) {
      insights.push(
        "🔍 Your spending is relatively high. Consider setting budgets.",
      );
    }

    const topCategory = categoryData.reduce(
      (a, b) => (a.spent > b.spent ? a : b),
      { spent: 0 },
    );
    if (topCategory.spent > totalExpenses * 0.4) {
      insights.push(
        `📊 ${topCategory.label} is your highest spending category.`,
      );
    }

    const budgetExceeded = categoryData.filter(
      (c) => c.budget > 0 && c.percentage >= 100,
    );
    if (budgetExceeded.length > 0) {
      insights.push(`⚠️ ${budgetExceeded.length} budget(s) exceeded.`);
    }

    return insights;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Date", "Description", "Category", "Amount"];
    const rows = expenses.map((exp) => [
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
    let filteredForExport = [...expenses];
    const now = new Date();

    switch (timelineType) {
      case "today":
        filteredForExport = expenses.filter(
          (exp) => new Date(exp.date).toDateString() === now.toDateString(),
        );
        break;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        filteredForExport = expenses.filter(
          (exp) => new Date(exp.date) >= weekStart,
        );
        break;
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        filteredForExport = expenses.filter(
          (exp) => new Date(exp.date) >= monthStart,
        );
        break;
      case "quarter":
        const quarterStart = new Date(
          now.getFullYear(),
          Math.floor(now.getMonth() / 3) * 3,
          1,
        );
        filteredForExport = expenses.filter(
          (exp) => new Date(exp.date) >= quarterStart,
        );
        break;
      case "year":
        const yearStart = new Date(now.getFullYear(), 0, 1);
        filteredForExport = expenses.filter(
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
          <div
            ref={exportMenuRef}
            style={{ position: "relative", display: "inline-block" }}
          >
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={expenses.length === 0}
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
              </div>
            )}
          </div>
        </div>

        {/* Insights */}
        {getInsights().length > 0 && (
          <div className="insights-container">
            <Zap size={18} style={{ marginRight: "0.75rem", flexShrink: 0 }} />
            <div>
              {getInsights().map((insight, idx) => (
                <div key={idx}>{insight}</div>
              ))}
            </div>
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
                <select
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                  disabled={isEditingBudget}
                  className="form-input select-input"
                  style={{
                    opacity: isEditingBudget ? 0.6 : 1,
                    cursor: isEditingBudget ? "not-allowed" : "pointer",
                  }}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
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
    </div>
  );
};

export default ExpenseTracker;
