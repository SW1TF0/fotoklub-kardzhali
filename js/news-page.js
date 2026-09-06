// ============================================================================
// news-page.js — full News & Stories feed (news.html) with a client-side
// type filter. Independent from the homepage teaser feed in js/app.js
// (different element id, larger limits).
// ============================================================================

import { db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const feedEl = document.getElementById("news-feed-full");
const filterButtons = document.querySelectorAll(".feed-filter-btn");

let newsItems = [];
let storyItems = [];
let activeFilter = "all";

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function renderFeedCard(item) {
  const badge =
    item.type === "story"
      ? `<span class="rounded-full bg-accent-400/10 px-3 py-1 text-xs font-medium text-accent-400">История</span>`
      : `<span class="rounded-full bg-neutral-700/40 px-3 py-1 text-xs font-medium text-neutral-300">Новина</span>`;
  const date = item.createdAt?.toDate
    ? item.createdAt.toDate().toLocaleDateString("bg-BG")
    : "";
  return `
    <article class="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
      <div class="mb-3 flex items-center gap-3">
        ${badge}
        <span class="text-xs text-neutral-400">${date}</span>
      </div>
      <h2 class="mb-2 text-lg font-semibold text-neutral-100">${escapeHtml(item.title || "")}</h2>
      <p class="text-sm leading-relaxed text-neutral-400">${escapeHtml(item.content || "")}</p>
    </article>`;
}

function placeholderFeed() {
  return `
    <article class="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-center">
      <p class="text-sm text-neutral-400">Все още няма публикувано съдържание в тази категория.</p>
    </article>`;
}

function renderFeed() {
  if (!feedEl) return;
  const items = [...newsItems, ...storyItems]
    .filter((item) => activeFilter === "all" || item.type === activeFilter)
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

  feedEl.innerHTML = items.length === 0 ? placeholderFeed() : items.map(renderFeedCard).join("");
}

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    activeFilter = btn.dataset.filter;
    filterButtons.forEach((b) => {
      const isActive = b === btn;
      b.classList.toggle("bg-accent-400", isActive);
      b.classList.toggle("text-neutral-950", isActive);
      b.classList.toggle("font-semibold", isActive);
      b.classList.toggle("border", !isActive);
      b.classList.toggle("border-neutral-700", !isActive);
      b.classList.toggle("text-neutral-300", !isActive);
      b.classList.toggle("font-medium", !isActive);
    });
    renderFeed();
  });
});

if (feedEl) {
  const newsQ = query(collection(db, "news"), orderBy("createdAt", "desc"), limit(100));
  const storiesQ = query(collection(db, "stories"), orderBy("createdAt", "desc"), limit(100));

  onSnapshot(
    newsQ,
    (snap) => {
      newsItems = snap.docs.map((d) => ({ id: d.id, type: "news", ...d.data() }));
      renderFeed();
    },
    renderFeed
  );

  onSnapshot(
    storiesQ,
    (snap) => {
      storyItems = snap.docs.map((d) => ({ id: d.id, type: "story", ...d.data() }));
      renderFeed();
    },
    renderFeed
  );
}
