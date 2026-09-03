// ============================================================================
// app.js — public site behaviour: nav, auth forms, gallery + news/stories feed
// ============================================================================

import { auth, db, googleProvider, ADMIN_EMAILS } from "./firebase-config.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---- Mobile nav toggle ------------------------------------------------------
const navToggle = document.getElementById("nav-toggle");
const mobileMenu = document.getElementById("mobile-menu");
navToggle?.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});
document.querySelectorAll("#mobile-menu a").forEach((link) => {
  link.addEventListener("click", () => mobileMenu.classList.add("hidden"));
});

// ---- Smooth scroll for in-page nav links -----------------------------------
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const targetId = link.getAttribute("href");
    if (targetId.length > 1) {
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
});

// ---- Auth state -> header UI ------------------------------------------------
const authArea = document.getElementById("auth-area");
const adminLinkWrap = document.getElementById("admin-link-wrap");
const adminLinkWrapMobile = document.getElementById("admin-link-wrap-mobile");

function renderAuthArea(user) {
  if (!authArea) return;

  if (user) {
    const isAdmin = ADMIN_EMAILS.includes(user.email);
    authArea.innerHTML = `
      <span class="hidden sm:inline text-sm text-neutral-300">${
        user.displayName || user.email
      }</span>
      <button id="logout-btn" class="rounded-full border border-neutral-700 px-4 py-1.5 text-sm hover:border-amber-400 hover:text-amber-400 transition">Изход</button>
    `;
    document
      .getElementById("logout-btn")
      ?.addEventListener("click", () => signOut(auth));

    if (adminLinkWrap) adminLinkWrap.classList.toggle("hidden", !isAdmin);
    adminLinkWrapMobile?.classList.toggle("hidden", !isAdmin);
  } else {
    authArea.innerHTML = `
      <a href="#auth" class="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-medium text-neutral-950 hover:bg-amber-300 transition">Вход / Регистрация</a>
    `;
    adminLinkWrap?.classList.add("hidden");
    adminLinkWrapMobile?.classList.add("hidden");
  }
}

onAuthStateChanged(auth, (user) => {
  renderAuthArea(user);
  const authSection = document.getElementById("auth");
  const loggedInPanel = document.getElementById("auth-logged-in");
  const authForms = document.getElementById("auth-forms");
  if (user && authSection) {
    authForms?.classList.add("hidden");
    loggedInPanel?.classList.remove("hidden");
    const nameSpan = document.getElementById("auth-logged-in-name");
    if (nameSpan) nameSpan.textContent = user.displayName || user.email;
  } else {
    authForms?.classList.remove("hidden");
    loggedInPanel?.classList.add("hidden");
  }
});

// ---- Login / Register tabs --------------------------------------------------
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const formLogin = document.getElementById("form-login");
const formRegister = document.getElementById("form-register");

function showTab(which) {
  const loginActive = which === "login";
  formLogin.classList.toggle("hidden", !loginActive);
  formRegister.classList.toggle("hidden", loginActive);
  tabLogin.classList.toggle("text-amber-400", loginActive);
  tabLogin.classList.toggle("border-amber-400", loginActive);
  tabLogin.classList.toggle("text-neutral-500", !loginActive);
  tabRegister.classList.toggle("text-amber-400", !loginActive);
  tabRegister.classList.toggle("border-amber-400", !loginActive);
  tabRegister.classList.toggle("text-neutral-500", loginActive);
}
tabLogin?.addEventListener("click", () => showTab("login"));
tabRegister?.addEventListener("click", () => showTab("register"));

function setAuthError(formEl, message) {
  const errorEl = formEl.querySelector("[data-error]");
  if (errorEl) errorEl.textContent = message || "";
}

formLogin?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setAuthError(formLogin, "");
  const email = formLogin.email.value.trim();
  const password = formLogin.password.value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    setAuthError(formLogin, translateAuthError(err.code));
  }
});

formRegister?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setAuthError(formRegister, "");
  const name = formRegister.name.value.trim();
  const email = formRegister.email.value.trim();
  const password = formRegister.password.value;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      name,
      email,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    setAuthError(formRegister, translateAuthError(err.code));
  }
});

document.getElementById("google-signin-btn")?.addEventListener("click", async () => {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    await setDoc(
      doc(db, "users", cred.user.uid),
      {
        uid: cred.user.uid,
        name: cred.user.displayName || "",
        email: cred.user.email,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error(err);
  }
});

document.getElementById("auth-logout-btn")?.addEventListener("click", () => signOut(auth));

function translateAuthError(code) {
  const map = {
    "auth/email-already-in-use": "Този имейл вече е регистриран.",
    "auth/invalid-email": "Невалиден имейл адрес.",
    "auth/weak-password": "Паролата трябва да е поне 6 символа.",
    "auth/user-not-found": "Няма потребител с този имейл.",
    "auth/wrong-password": "Грешна парола.",
    "auth/invalid-credential": "Грешен имейл или парола.",
    "auth/missing-password": "Моля, въведете парола.",
  };
  return map[code] || "Възникна грешка. Опитайте отново.";
}

// ---- Gallery feed (Firestore: photos) --------------------------------------
const galleryGrid = document.getElementById("gallery-grid");
if (galleryGrid) {
  const q = query(collection(db, "photos"), orderBy("createdAt", "desc"), limit(24));
  onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        galleryGrid.innerHTML = placeholderGallery();
        return;
      }
      galleryGrid.innerHTML = snap.docs
        .map((d) => {
          const p = d.data();
          return `
            <figure class="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
              <img src="${escapeHtml(p.url)}" alt="${escapeHtml(p.title || "Снимка от клуба")}" loading="lazy" class="w-full object-cover transition duration-500 hover:scale-105" />
              ${
                p.title
                  ? `<figcaption class="px-3 py-2 text-sm text-neutral-400">${escapeHtml(p.title)}</figcaption>`
                  : ""
              }
            </figure>`;
        })
        .join("");
    },
    () => {
      galleryGrid.innerHTML = placeholderGallery();
    }
  );
}

function placeholderGallery() {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
  return seeds
    .map(
      (n) => `
      <figure class="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
        <div class="flex aspect-[${n % 2 === 0 ? "3/4" : "4/3"}] items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-600 text-sm">
          Снимка ${n} (демо)
        </div>
      </figure>`
    )
    .join("");
}

// ---- News & stories feed (Firestore: news + stories) -----------------------
const feedEl = document.getElementById("news-feed");
if (feedEl) {
  const newsQ = query(collection(db, "news"), orderBy("createdAt", "desc"), limit(10));
  const storiesQ = query(collection(db, "stories"), orderBy("createdAt", "desc"), limit(10));

  let newsItems = [];
  let storyItems = [];

  function renderFeed() {
    const items = [...newsItems, ...storyItems].sort(
      (a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
    );
    if (items.length === 0) {
      feedEl.innerHTML = placeholderFeed();
      return;
    }
    feedEl.innerHTML = items.map(renderFeedCard).join("");
  }

  function renderFeedCard(item) {
    const badge =
      item.type === "story"
        ? `<span class="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-400">История</span>`
        : `<span class="rounded-full bg-neutral-700/40 px-3 py-1 text-xs font-medium text-neutral-300">Новина</span>`;
    const date = item.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleDateString("bg-BG")
      : "";
    return `
      <article class="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
        <div class="mb-3 flex items-center gap-3">
          ${badge}
          <span class="text-xs text-neutral-500">${date}</span>
        </div>
        <h3 class="mb-2 text-lg font-semibold text-neutral-100">${escapeHtml(item.title || "")}</h3>
        <p class="text-sm leading-relaxed text-neutral-400">${escapeHtml(item.content || "")}</p>
      </article>`;
  }

  function placeholderFeed() {
    return `
      <article class="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
        <div class="mb-3 flex items-center gap-3">
          <span class="rounded-full bg-neutral-700/40 px-3 py-1 text-xs font-medium text-neutral-300">Новина</span>
          <span class="text-xs text-neutral-500">Скоро</span>
        </div>
        <h3 class="mb-2 text-lg font-semibold text-neutral-100">Новините на клуба ще се появят тук</h3>
        <p class="text-sm leading-relaxed text-neutral-400">Съдържанието се добавя от администраторския панел и ще се показва автоматично.</p>
      </article>`;
  }

  onSnapshot(newsQ, (snap) => {
    newsItems = snap.docs.map((d) => ({ id: d.id, type: "news", ...d.data() }));
    renderFeed();
  }, renderFeed);

  onSnapshot(storiesQ, (snap) => {
    storyItems = snap.docs.map((d) => ({ id: d.id, type: "story", ...d.data() }));
    renderFeed();
  }, renderFeed);
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

// ---- Footer year -------------------------------------------------------------
const yearEl = document.getElementById("current-year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
