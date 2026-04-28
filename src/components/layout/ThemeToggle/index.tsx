import { useTheme } from "../../../hooks/useTheme";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        padding: 3,
        border: "1px solid var(--color-border)",
        background: isDark ? "var(--color-asphalt)" : "var(--color-orange)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        transition: "background var(--transition-normal)",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: isDark ? "var(--color-text-muted)" : "#fff",
          transform: isDark ? "translateX(0)" : "translateX(18px)",
          transition: "transform var(--transition-normal), background var(--transition-normal)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
        }}
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
};

export default ThemeToggle;
