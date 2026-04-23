export const ConfigCheck = () => {
  const missing = [];

  if (!import.meta.env.VITE_FIREBASE_API_KEY) missing.push("API Key");
  if (!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) missing.push("Auth Domain");
  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) missing.push("Project ID");
  if (!import.meta.env.VITE_FIREBASE_APP_ID) missing.push("App ID");

  if (missing.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#1a1a2e",
        color: "#fff",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          background: "#16213e",
          border: "1px solid #ef4444",
          borderRadius: "12px",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          ⚙️ Setup Required
        </h1>
        <p
          style={{
            fontSize: "0.95rem",
            marginBottom: "1.5rem",
            lineHeight: 1.5,
          }}
        >
          Firebase is not configured. Copy{" "}
          <code
            style={{
              background: "#0f3460",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
            }}
          >
            .env.example
          </code>{" "}
          to{" "}
          <code
            style={{
              background: "#0f3460",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
            }}
          >
            .env
          </code>{" "}
          and add:
        </p>
        <ul
          style={{
            textAlign: "left",
            background: "#0f3460",
            padding: "1rem",
            borderRadius: "8px",
            margin: "1rem 0",
            fontSize: "0.85rem",
            fontFamily: "monospace",
          }}
        >
          {missing.map((field) => (
            <li key={field} style={{ margin: "0.5rem 0" }}>
              ✗ VITE_FIREBASE_{field.toUpperCase().replace(/ /g, "_")}
            </li>
          ))}
        </ul>
        <p
          style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: "1.5rem" }}
        >
          Then restart the dev server.
        </p>
      </div>
    </div>
  );
};
