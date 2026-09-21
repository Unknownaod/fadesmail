import { useEffect, useState } from "react";

// Reads the dark-mode flag that /settings writes to localStorage.
export function useTheme() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    function readTheme() {
      const saved = localStorage.getItem("fades.mail.darkMode");
      setTheme(saved === "false" ? "light" : "dark");
    }

    readTheme();

    window.addEventListener("storage", readTheme);
    return () => window.removeEventListener("storage", readTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return theme;
}
