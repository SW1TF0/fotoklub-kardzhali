// ============================================================================
// admin.js — admin dashboard: auth guard + CRUD for photos, stories, news,
// and a read-only list of registered users.
// ============================================================================

import { auth, db, ADMIN_EMAILS } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---- Auth guard --------------------------------------------------------------
const loginScreen = document.getElementById("admin-login-screen");
const dashboard = document.getElementById("admin-dashboard");
const deniedScreen = document.getElementById("admin-denied-screen");
const adminNameEl = document.getElementById("admin-name");

function isAdmin(user) {
  // Email allowlist (simple). If you've set a Firebase custom claim
  // `admin: true` instead, swap this for a check on the user's ID token
  // result, e.g.:
  //   const token = await user.getIdTokenResult();
  //   return !!token.claims.admin;
  return !!user && ADMIN_EMAILS.includes(user.email);
}

function showOnly(el) {
  [loginScreen, dashboard, deniedScreen].forEach((s) => s?.classList.add("hidden"));
  el?.classList.remove("hidden");
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    showOnly(loginScreen);
    return;
  }
  if (isAdmin(user)) {
    showOnly(dashboard);
    if (adminNameEl) adminNameEl.textContent = user.displayName || user.email;
    initModules();
  } else {
    showOnly(deniedScreen);
  }
});

document.getElementById("admin-login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const errorEl = form.querySelector("[data-error]");
  errorEl.textContent = "";
  try {
    await signInWithEmailAndPassword(auth, form.email.value.trim(), form.password.value);
  } catch (err) {
    errorEl.textContent = "Грешен имейл или парола, или нямате администраторски достъп.";
  }
});

document.querySelectorAll("[data-admin-logout]").forEach((btn) =>
  btn.addEventListener("click", () => signOut(auth))
);

// ---- Sidebar tab switching ----------------------------------------------------
const navButtons = document.querySelectorAll("[data-panel-target]");
const panels = document.querySelectorAll("[data-panel]");

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-panel-target");
    panels.forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== target));
    navButtons.forEach((b) => {
      b.classList.toggle("bg-accent-400/10", b === btn);
      b.classList.toggle("text-accent-400", b === btn);
      b.classList.toggle("text-neutral-400", b !== btn);
    });
    document.getElementById("admin-sidebar")?.classList.add("hidden", "md:block");
  });
});

document.getElementById("admin-mobile-toggle")?.addEventListener("click", () => {
  document.getElementById("admin-sidebar")?.classList.toggle("hidden");
});

let modulesInitialized = false;
function initModules() {
  if (modulesInitialized) return;
  modulesInitialized = true;
  initPhotosModule();
  initStoriesModule();
  initNewsModule();
  initUsersModule();
  initMessagesModule();
}

// ==============================================================================
// Module 1 — Снимки (Photos)
// ==============================================================================
function initPhotosModule() {
  const form = document.getElementById("photo-form");
  const listEl = document.getElementById("photos-list");
  const urlInput = document.getElementById("photo-url");
  const editIdInput = document.getElementById("photo-edit-id");
  const cancelEditBtn = document.getElementById("photo-cancel-edit");
  const submitBtn = document.getElementById("photo-submit-btn");

  const q = query(collection(db, "photos"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    if (snap.empty) {
      listEl.innerHTML = `<p class="text-sm text-neutral-400">Все още няма качени снимки.</p>`;
      return;
    }
    listEl.innerHTML = snap.docs
      .map((d) => {
        const p = d.data();
        return `
        <div class="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
          <img src="${p.url}" alt="" class="h-16 w-16 rounded-lg object-cover" />
          <div class="flex-1 min-w-0">
            <p class="truncate text-sm font-medium text-neutral-200">${escapeHtml(p.title || "(без заглавие)")}</p>
          </div>
          <button data-edit="${d.id}" class="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs hover:border-accent-400 hover:text-accent-400">Редакция</button>
          <button data-delete="${d.id}" class="rounded-lg border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950">Изтрий</button>
        </div>`;
      })
      .join("");

    listEl.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const docSnap = snap.docs.find((d) => d.id === btn.dataset.edit);
        const p = docSnap.data();
        form.title.value = p.title || "";
        urlInput.value = p.url || "";
        editIdInput.value = docSnap.id;
        submitBtn.textContent = "Запази промените";
        cancelEditBtn.classList.remove("hidden");
        window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
      });
    });
    listEl.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Изтриване на снимката?")) return;
        await deleteDoc(doc(db, "photos", btn.dataset.delete));
      });
    });
  });

  cancelEditBtn?.addEventListener("click", () => resetPhotoForm());

  function resetPhotoForm() {
    form.reset();
    editIdInput.value = "";
    submitBtn.textContent = "Добави снимка";
    cancelEditBtn.classList.add("hidden");
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = form.title.value.trim();
    const url = urlInput.value.trim();
    const editId = editIdInput.value;
    const statusEl = form.querySelector("[data-status]");
    statusEl.textContent = "Запазване...";

    try {
      if (editId) {
        await updateDoc(doc(db, "photos", editId), { title, url });
      } else {
        await addDoc(collection(db, "photos"), {
          title,
          url,
          createdAt: serverTimestamp(),
        });
      }
      statusEl.textContent = "Готово!";
      resetPhotoForm();
      setTimeout(() => (statusEl.textContent = ""), 2000);
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Грешка при запазването.";
    }
  });
}

// ==============================================================================
// Module 2 — Истории (Stories)
// ==============================================================================
function initStoriesModule() {
  initSimpleContentModule({
    collectionName: "stories",
    formId: "story-form",
    listId: "stories-list",
    editIdField: "story-edit-id",
    cancelBtnId: "story-cancel-edit",
    submitBtnId: "story-submit-btn",
    submitLabel: "Публикувай история",
  });
}

// ==============================================================================
// Module 3 — Новини (News)
// ==============================================================================
function initNewsModule() {
  initSimpleContentModule({
    collectionName: "news",
    formId: "news-form",
    listId: "news-list",
    editIdField: "news-edit-id",
    cancelBtnId: "news-cancel-edit",
    submitBtnId: "news-submit-btn",
    submitLabel: "Публикувай новина",
  });
}

function initSimpleContentModule({
  collectionName,
  formId,
  listId,
  editIdField,
  cancelBtnId,
  submitBtnId,
  submitLabel,
}) {
  const form = document.getElementById(formId);
  const listEl = document.getElementById(listId);
  const editIdInput = document.getElementById(editIdField);
  const cancelEditBtn = document.getElementById(cancelBtnId);
  const submitBtn = document.getElementById(submitBtnId);
  if (!form || !listEl) return;

  const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    if (snap.empty) {
      listEl.innerHTML = `<p class="text-sm text-neutral-400">Все още няма записи.</p>`;
      return;
    }
    listEl.innerHTML = snap.docs
      .map((d) => {
        const item = d.data();
        const date = item.createdAt?.toDate
          ? item.createdAt.toDate().toLocaleDateString("bg-BG")
          : "";
        return `
        <div class="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div class="mb-2 flex items-start justify-between gap-3">
            <div>
              <p class="font-medium text-neutral-200">${escapeHtml(item.title || "")}</p>
              <p class="text-xs text-neutral-400">${date}</p>
            </div>
            <div class="flex shrink-0 gap-2">
              <button data-edit="${d.id}" class="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs hover:border-accent-400 hover:text-accent-400">Редакция</button>
              <button data-delete="${d.id}" class="rounded-lg border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950">Изтрий</button>
            </div>
          </div>
          <p class="text-sm text-neutral-400">${escapeHtml(item.content || "")}</p>
        </div>`;
      })
      .join("");

    listEl.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const docSnap = snap.docs.find((d) => d.id === btn.dataset.edit);
        const item = docSnap.data();
        form.title.value = item.title || "";
        form.content.value = item.content || "";
        editIdInput.value = docSnap.id;
        submitBtn.textContent = "Запази промените";
        cancelEditBtn.classList.remove("hidden");
        window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
      });
    });
    listEl.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Изтриване на записа?")) return;
        await deleteDoc(doc(db, collectionName, btn.dataset.delete));
      });
    });
  });

  cancelEditBtn?.addEventListener("click", () => resetForm());

  function resetForm() {
    form.reset();
    editIdInput.value = "";
    submitBtn.textContent = submitLabel;
    cancelEditBtn.classList.add("hidden");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = form.title.value.trim();
    const content = form.content.value.trim();
    const editId = editIdInput.value;
    const statusEl = form.querySelector("[data-status]");
    statusEl.textContent = "Запазване...";

    try {
      if (editId) {
        await updateDoc(doc(db, collectionName, editId), { title, content });
      } else {
        await addDoc(collection(db, collectionName), {
          title,
          content,
          createdAt: serverTimestamp(),
        });
      }
      statusEl.textContent = "Готово!";
      resetForm();
      setTimeout(() => (statusEl.textContent = ""), 2000);
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Грешка при запазването.";
    }
  });
}

// ==============================================================================
// Module 4 — Регистрации (Users) — read-only
// ==============================================================================
function initUsersModule() {
  const listEl = document.getElementById("users-list");
  const countEl = document.getElementById("users-count");
  if (!listEl) return;

  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    if (countEl) countEl.textContent = snap.size;
    if (snap.empty) {
      listEl.innerHTML = `<p class="text-sm text-neutral-400">Все още няма регистрирани потребители.</p>`;
      return;
    }
    listEl.innerHTML = `
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-neutral-800 text-neutral-400">
            <th class="py-2 pr-4 font-medium">Име</th>
            <th class="py-2 pr-4 font-medium">Имейл</th>
            <th class="py-2 pr-4 font-medium">Регистриран на</th>
          </tr>
        </thead>
        <tbody>
          ${snap.docs
            .map((d) => {
              const u = d.data();
              const date = u.createdAt?.toDate
                ? u.createdAt.toDate().toLocaleDateString("bg-BG")
                : "—";
              return `
              <tr class="border-b border-neutral-900">
                <td class="py-2 pr-4 text-neutral-200">${escapeHtml(u.name || "—")}</td>
                <td class="py-2 pr-4 text-neutral-400">${escapeHtml(u.email || "—")}</td>
                <td class="py-2 pr-4 text-neutral-400">${date}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>`;
  });
}

// ==============================================================================
// Module 5 — Съобщения (Contact messages) — read + delete only
// ==============================================================================
function initMessagesModule() {
  const listEl = document.getElementById("messages-list");
  if (!listEl) return;

  const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    if (snap.empty) {
      listEl.innerHTML = `<p class="text-sm text-neutral-400">Все още няма получени съобщения.</p>`;
      return;
    }
    listEl.innerHTML = snap.docs
      .map((d) => {
        const m = d.data();
        const date = m.createdAt?.toDate
          ? m.createdAt.toDate().toLocaleString("bg-BG")
          : "";
        return `
        <div class="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div class="mb-2 flex items-start justify-between gap-3">
            <div>
              <p class="font-medium text-neutral-200">${escapeHtml(m.name || "—")}</p>
              <p class="text-xs text-neutral-400">${escapeHtml(m.email || "—")} &middot; ${date}</p>
            </div>
            <button data-delete="${d.id}" class="shrink-0 rounded-lg border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950">Изтрий</button>
          </div>
          <p class="text-sm text-neutral-400">${escapeHtml(m.message || "")}</p>
        </div>`;
      })
      .join("");

    listEl.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Изтриване на съобщението?")) return;
        await deleteDoc(doc(db, "messages", btn.dataset.delete));
      });
    });
  });
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}
