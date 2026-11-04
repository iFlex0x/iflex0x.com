(() => {
    const theme = document.getElementById("Z_Theme");
    const meta = document.querySelector('meta[name="theme-color"]');

    function mode(value) {
        document.documentElement.classList.toggle("Z_Light", value === "light");
        if (theme) theme.setAttribute("aria-pressed", String(value === "light"));
        if (meta) meta.setAttribute("content", value === "light" ? "#e4ddcc" : "#070707");
    }

    try {
        const stored = localStorage.getItem("Z_Theme");
        mode(stored ?? (document.documentElement.classList.contains("Z_Light") ? "light" : "dark"));
    } catch {
        mode("dark");
    }

    theme?.addEventListener("click", () => {
        const next = document.documentElement.classList.contains("Z_Light") ? "dark" : "light";
        try {
            localStorage.setItem("Z_Theme", next);
        } catch {}
        mode(next);
    });
})();
