(() => {
    const zulu = document.getElementById("Z_Zulu");
    function clock() {
        if (!zulu) return;
        const now = new Date();
        const pad = (value) => String(value).padStart(2, "0");
        zulu.textContent = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}z`;
    }
    clock();
    setInterval(clock, 1000);

    const message = document.getElementById("msg");
    const say = (text) => {
        if (message) message.textContent = text;
    };

    const form = document.getElementById("invoice-form");
    const items = document.getElementById("items");
    const preview = document.getElementById("total-preview");
    const add = document.getElementById("add-item");

    function cents(value) {
        const text = String(value ?? "").trim();
        if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
        const [whole, fraction = ""] = text.split(".");
        return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    }

    function usd(value) {
        const whole = Math.floor(value / 100);
        const rest = String(value % 100).padStart(2, "0");
        return `$${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${rest}`;
    }

    function total() {
        if (!form || !items) return 0;
        let subtotal = 0;
        for (const row of items.querySelectorAll("[data-item]")) {
            const qty = cents(row.querySelector('[name="qty"]')?.value);
            const rate = cents(row.querySelector('[name="rate"]')?.value);
            if (qty !== null && rate !== null) subtotal += Math.round((qty * rate) / 100);
        }
        const discount = cents(form.querySelector('[name="discount"]')?.value) ?? 0;
        const tax = cents(form.querySelector('[name="taxRate"]')?.value) ?? 0;
        const taxable = Math.max(0, subtotal - Math.min(discount, subtotal));
        return taxable + Math.round((taxable * tax) / 10000);
    }

    function update() {
        if (preview) preview.textContent = usd(total());
    }

    function addRow() {
        if (!items) return;
        const row = document.createElement("div");
        row.className = "inv-row";
        row.dataset.item = "";
        row.innerHTML = `
            <label class="field"><span>title</span><input class="input" name="title" value=""></label>
            <label class="field"><span>description</span><input class="input" name="desc" value=""></label>
            <label class="field"><span>qty</span><input class="input" name="qty" value="1"></label>
            <label class="field"><span>rate</span><input class="input" name="rate" value="0.00"></label>
            <button class="btn-danger" type="button" data-remove>remove</button>`;
        items.append(row);
        update();
    }

    add?.addEventListener("click", addRow);
    items?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-remove]");
        if (button) button.closest("[data-item]")?.remove();
        update();
    });
    form?.addEventListener("input", update);
    update();

    function payload() {
        if (!form || !items) return null;
        const value = (name) => form.querySelector(`[name="${name}"]`)?.value?.trim() ?? "";
        return {
            number: value("number"),
            clientName: value("clientName"),
            clientSub: value("clientSub"),
            clientLines: value("clientLines").split("\n").map((line) => line.trim()).filter(Boolean),
            issuedOn: value("issuedOn"),
            dueOn: value("dueOn") || null,
            items: [...items.querySelectorAll("[data-item]")].map((row) => ({
                title: row.querySelector('[name="title"]')?.value ?? "",
                desc: row.querySelector('[name="desc"]')?.value ?? "",
                qty: row.querySelector('[name="qty"]')?.value ?? "",
                rate: row.querySelector('[name="rate"]')?.value ?? "",
            })),
            discount: value("discount"),
            discountLabel: value("discountLabel"),
            taxRate: value("taxRate"),
            note: value("note"),
        };
    }

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = payload();
        if (!data) return;
        const button = form.querySelector('button[type="submit"]');
        button?.setAttribute("disabled", "disabled");
        const edit = form.dataset.mode === "edit";
        try {
            const response = await fetch(edit ? `/admin/api/invoices/${form.dataset.id}` : "/admin/api/invoices", {
                method: edit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json", "X-Admin-Request": "1" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                if (response.status === 403) return say("session expired, reload");
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error ?? "save failed");
            }
            if (edit) {
                location.href = `/admin/invoice/${form.dataset.id}`;
                return;
            }
            const result = await response.json();
            location.href = `/admin/invoice/${result.id}`;
        } catch (error) {
            say(error.message);
        } finally {
            button?.removeAttribute("disabled");
        }
    });

    document.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-action]");
        if (!button) return;
        const actions = button.closest(".actions");
        if (!actions) return;
        const action = button.dataset.action;
        if (["void", "revoke", "rotate"].includes(action) && !confirm(`${action} this invoice?`)) return;
        try {
            const response = await fetch(`/admin/api/invoices/${actions.dataset.id}/action`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Admin-Request": "1" },
                body: JSON.stringify({ action }),
            });
            if (!response.ok) {
                if (response.status === 403) return say("session expired, reload");
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error ?? "action failed");
            }
            const result = await response.json();
            if (result.url) {
                const link = document.getElementById("invoice-link");
                if (link) link.value = result.url;
                let copied = true;
                try {
                    await navigator.clipboard.writeText(result.url);
                } catch {
                    copied = false;
                }
                say(copied ? "new link copied" : "link updated in the field above");
                return;
            }
            location.reload();
        } catch (error) {
            say(error.message);
        }
    });

    document.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-copy]");
        if (!button) return;
        try {
            await navigator.clipboard.writeText(button.dataset.copy);
            button.textContent = "copied";
        } catch {
            say("copy failed, select the link manually");
        }
        setTimeout(() => {
            button.textContent = "copy link";
        }, 1500);
    });
})();
