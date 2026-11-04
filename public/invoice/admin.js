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

    async function readJson(response) {
        try {
            return await response.json();
        } catch {
            return null;
        }
    }

    const form = document.getElementById("invoice-form");
    const items = document.getElementById("items");
    const add = document.getElementById("add-item");

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
            <button class="icon-btn" type="button" data-remove aria-label="remove item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
        items.append(row);
    }

    add?.addEventListener("click", addRow);
    items?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-remove]");
        if (button) button.closest("[data-item]")?.remove();
    });

    function payload() {
        if (!form || !items) return null;
        const value = (name) => form.querySelector(`[name="${name}"]`)?.value?.trim() ?? "";
        return {
            number: value("number"),
            clientName: value("clientName"),
            clientSub: value("clientSub"),
            clientLines: value("clientLines")
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean),
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
            const response = await fetch(
                edit ? `/admin/api/invoices/${form.dataset.id}` : "/admin/api/invoices",
                {
                    method: edit ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json", "X-Admin-Request": "1" },
                    body: JSON.stringify(data),
                },
            );
            if (!response.ok) {
                const body = (await readJson(response)) ?? {};
                if (response.status === 403 && body.error === "forbidden")
                    return say("session expired, reload");
                throw new Error(body.error ?? "save failed");
            }
            let id = form.dataset.id;
            if (!edit) {
                const result = await readJson(response);
                if (!result?.id) return say("session expired, reload");
                id = result.id;
            }
            location.href = `/admin/invoice/${id}`;
        } catch (error) {
            say(error.message);
        } finally {
            button?.removeAttribute("disabled");
        }
    });

    const CONFIRM = {
        void: "void this invoice? the client can still read it until the link expires.",
        revoke: "revoke the link? the client gets a dead link.",
        rotate: "rotate the link? the old one stops working right away.",
    };

    document.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-action]");
        if (!button) return;
        const actions = button.closest(".actions");
        if (!actions) return;
        const action = button.dataset.action;
        if (CONFIRM[action] && !confirm(CONFIRM[action])) return;
        try {
            const response = await fetch(`/admin/api/invoices/${actions.dataset.id}/action`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Admin-Request": "1" },
                body: JSON.stringify({ action }),
            });
            if (!response.ok) {
                const body = (await readJson(response)) ?? {};
                if (response.status === 403 && body.error === "forbidden")
                    return say("session expired, reload");
                throw new Error(body.error ?? "action failed");
            }
            const result = await readJson(response);
            if (!result) return say("session expired, reload");
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
