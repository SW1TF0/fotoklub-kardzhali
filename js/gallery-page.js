// ============================================================================
// gallery-page.js — full gallery grid (gallery.html) with pagination and a
// keyboard/click-navigable lightbox. Independent from the homepage teaser
// grid in js/app.js (different element id, different query).
// ============================================================================

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const PAGE_SIZE = 24;
const grid = document.getElementById("gallery-grid-full");
const loadMoreWrap = document.getElementById("gallery-load-more-wrap");
const loadMoreBtn = document.getElementById("gallery-load-more");

let photos = []; // flat list of everything rendered so far, for the lightbox
let lastDoc = null;
let reachedEnd = false;
let loading = false;

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function renderPlaceholder() {
  const seeds = Array.from({ length: 8 }, (_, i) => i + 1);
  grid.innerHTML = seeds
    .map(
      (n) => `
      <figure class="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
        <div class="flex aspect-[${n % 2 === 0 ? "3/4" : "4/3"}] items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 text-sm text-neutral-400">
          Снимка ${n} (демо)
        </div>
      </figure>`
    )
    .join("");
}

function appendPhotos(newPhotos) {
  const startIndex = photos.length;
  photos = photos.concat(newPhotos);

  const html = newPhotos
    .map((p, i) => {
      const index = startIndex + i;
      return `
      <figure class="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 cursor-pointer" data-index="${index}">
        <img src="${escapeHtml(p.url)}" alt="${escapeHtml(p.title || "Снимка от клуба")}" loading="lazy" class="w-full object-cover transition duration-500 hover:scale-105" />
        ${
          p.title
            ? `<figcaption class="px-3 py-2 text-sm text-neutral-400">${escapeHtml(p.title)}</figcaption>`
            : ""
        }
      </figure>`;
    })
    .join("");

  grid.insertAdjacentHTML("beforeend", html);

  grid.querySelectorAll("figure[data-index]").forEach((fig) => {
    fig.addEventListener("click", () => openLightbox(Number(fig.dataset.index)));
  });
}

async function loadNextPage() {
  if (loading || reachedEnd) return;
  loading = true;
  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = "Зареждане...";

  try {
    const constraints = [collection(db, "photos"), orderBy("createdAt", "desc"), limit(PAGE_SIZE)];
    const q = lastDoc
      ? query(collection(db, "photos"), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(PAGE_SIZE))
      : query(...constraints);

    const snap = await getDocs(q);

    if (snap.empty && photos.length === 0) {
      renderPlaceholder();
      loadMoreWrap.classList.add("hidden");
      reachedEnd = true;
      return;
    }

    lastDoc = snap.docs[snap.docs.length - 1] || lastDoc;
    appendPhotos(snap.docs.map((d) => d.data()));

    if (snap.docs.length < PAGE_SIZE) {
      reachedEnd = true;
      loadMoreWrap.classList.add("hidden");
    } else {
      loadMoreWrap.classList.remove("hidden");
    }
  } catch (err) {
    console.error("[gallery-page.js] Failed to load photos:", err);
    if (photos.length === 0) renderPlaceholder();
  } finally {
    loading = false;
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = "Зареди още";
  }
}

loadMoreBtn?.addEventListener("click", loadNextPage);
if (grid) loadNextPage();

// ---- Lightbox ---------------------------------------------------------------
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxCaption = document.getElementById("lightbox-caption");
const lightboxCloseBtn = document.getElementById("lightbox-close");
let currentIndex = -1;
let lastFocusedEl = null;

function getFocusableInLightbox() {
  return Array.from(
    lightbox.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])")
  );
}

function openLightbox(index) {
  currentIndex = index;
  lastFocusedEl = document.activeElement;
  showCurrent();
  lightbox.classList.remove("hidden");
  lightbox.classList.add("flex");
  document.body.style.overflow = "hidden";
  lightboxCloseBtn?.focus();
}

function closeLightbox() {
  lightbox.classList.add("hidden");
  lightbox.classList.remove("flex");
  document.body.style.overflow = "";
  lastFocusedEl?.focus();
}

function showCurrent() {
  const photo = photos[currentIndex];
  if (!photo) return;
  lightboxImg.src = photo.url;
  lightboxImg.alt = photo.title || "Снимка от клуба";
  lightboxCaption.textContent = photo.title || "";
}

function showNext() {
  if (photos.length === 0) return;
  currentIndex = (currentIndex + 1) % photos.length;
  showCurrent();
}

function showPrev() {
  if (photos.length === 0) return;
  currentIndex = (currentIndex - 1 + photos.length) % photos.length;
  showCurrent();
}

document.getElementById("lightbox-close")?.addEventListener("click", closeLightbox);
document.getElementById("lightbox-next")?.addEventListener("click", showNext);
document.getElementById("lightbox-prev")?.addEventListener("click", showPrev);

lightbox?.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (e) => {
  if (lightbox?.classList.contains("hidden")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowRight") showNext();
  if (e.key === "ArrowLeft") showPrev();
  if (e.key === "Tab") {
    // Keep keyboard focus inside the dialog while it's open.
    const focusable = getFocusableInLightbox();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
