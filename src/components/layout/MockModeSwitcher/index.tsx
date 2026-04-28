import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { setUser } from "../../../store/slice";
import { mockStore, setCurrentUserId } from "../../../mocks/store";
import { useTheme } from "../../../hooks/useTheme";

const WORKERS = mockStore.workers.map((w) => ({
  id: w.id,
  label: `${w.first_name} ${w.last_name}`,
  type: w.worker_type,
}));

const LANGUAGES = ["uk", "de", "en", "ru"] as const;

const MockModeSwitcher = () => {
  const dispatch = useDispatch();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [currentId, setCurrentId] = useState(mockStore.currentUserId);

  const switchWorker = useCallback(
    (id: number) => {
      setCurrentUserId(id);
      setCurrentId(id);
      localStorage.setItem("mock_user_id", String(id));
      const worker = mockStore.workers.find((w) => w.id === id);
      if (worker) {
        localStorage.setItem("botApiWorkerId", String(worker.id));
        dispatch(setUser(worker));
      }
    },
    [dispatch]
  );

  const switchLanguage = useCallback((lang: string) => {
    localStorage.setItem("i18nextLng", lang);
    window.location.reload();
  }, []);

  const currentWorker = mockStore.workers.find((w) => w.id === currentId);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "80px",
        right: "12px",
        zIndex: 9999,
        fontFamily: "monospace",
        fontSize: "11px",
      }}
    >
      {open && (
        <div
          style={{
            background: "#1a1a2e",
            border: "1px solid #e94560",
            borderRadius: "8px",
            padding: "10px",
            marginBottom: "6px",
            minWidth: "200px",
            color: "#eee",
          }}
        >
          <div style={{ color: "#e94560", fontWeight: "bold", marginBottom: "8px" }}>
            🛠 MOCK MODE
          </div>

          <div style={{ marginBottom: "6px", color: "#aaa" }}>Роль:</div>
          {WORKERS.map((w) => (
            <button
              key={w.id}
              onClick={() => switchWorker(w.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "3px 6px",
                marginBottom: "2px",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                background: w.id === currentId ? "#e94560" : "transparent",
                color: w.id === currentId ? "#fff" : "#ccc",
                fontSize: "11px",
              }}
            >
              {w.label} <span style={{ opacity: 0.7 }}>({w.type})</span>
            </button>
          ))}

          <div style={{ marginTop: "8px", marginBottom: "4px", color: "#aaa", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Тема:</span>
            <button
              onClick={toggleTheme}
              style={{
                padding: "2px 10px", borderRadius: "4px", border: "1px solid #444",
                cursor: "pointer", background: theme === "light" ? "#F97316" : "transparent",
                color: "#eee", fontSize: "11px",
              }}
            >
              {theme === "dark" ? "🌙 темна" : "☀️ світла"}
            </button>
          </div>

          <div style={{ marginTop: "8px", marginBottom: "6px", color: "#aaa" }}>Мова:</div>
          <div style={{ display: "flex", gap: "4px" }}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => switchLanguage(lang)}
                style={{
                  padding: "2px 8px",
                  borderRadius: "4px",
                  border: "1px solid #444",
                  cursor: "pointer",
                  background:
                    localStorage.getItem("i18nextLng") === lang ? "#e94560" : "transparent",
                  color: "#eee",
                  fontSize: "11px",
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "#e94560",
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          cursor: "pointer",
          fontSize: "16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title={`Mock: ${currentWorker?.worker_type ?? "?"}`}
      >
        🛠
      </button>
    </div>
  );
};

export default MockModeSwitcher;
