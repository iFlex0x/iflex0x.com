(() => {
    const Z_Mq = window.matchMedia("(prefers-color-scheme: light)");
    function Z_Mode(Z_T) {
        document.documentElement.classList.toggle("Z_Light", Z_T === "light");
        const Z_B = document.getElementById("Z_Theme");
        if (Z_B) {
            Z_B.setAttribute("aria-pressed", String(Z_T === "light"));
        }
        const Z_M = document.querySelector('meta[name="theme-color"]');
        if (Z_M) Z_M.setAttribute("content", Z_T === "light" ? "#e4ddcc" : "#070707");
    }
    Z_Mode(document.documentElement.classList.contains("Z_Light") ? "light" : "dark");
    Z_Mq.addEventListener("change", (Z_E) => {
        try {
            if (!localStorage.getItem("Z_Theme")) Z_Mode(Z_E.matches ? "light" : "dark");
        } catch {}
    });
    document.getElementById("Z_Theme")?.addEventListener("click", () => {
        const Z_Next = document.documentElement.classList.contains("Z_Light") ? "dark" : "light";
        try {
            localStorage.setItem("Z_Theme", Z_Next);
        } catch {}
        Z_Mode(Z_Next);
    });
})();
