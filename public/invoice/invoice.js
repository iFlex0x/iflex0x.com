(() => {
    const print = document.getElementById("print");
    if (!print) return;
    print.hidden = false;
    print.addEventListener("click", () => window.print());
})();
