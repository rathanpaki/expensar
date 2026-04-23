// Safe error handler - logs to console but never shows backend details to users
export const handleErrorSafely = (error, userMessage = "Try again.") => {
  // Log full error for debugging
  console.error("[Expense Tracker Error]", error);

  // Return safe user message
  return {
    message: userMessage,
    logged: true,
  };
};

// Error message mapper for auth-specific errors
export const getAuthErrorMessage = (code) => {
  const messages = {
    "auth/email-already-in-use": "Email already registered.",
    "auth/user-not-found": "Account not found.",
    "auth/wrong-password": "Invalid email or password.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/weak-password": "Password too weak. Use 6+ characters.",
    "auth/invalid-email": "Invalid email format.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };

  return messages[code] || "Something went wrong. Try again.";
};
