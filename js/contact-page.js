// ============================================================================
// contact-page.js — contact form (contact.html), writes to the Firestore
// "messages" collection. Public create-only; admins read/delete via the
// "Съобщения" tab in admin.html (see js/admin.js).
// ============================================================================

import { db } from "./firebase-config.js";
import { getCookieConsent } from "./cookies.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("contact-form");

// ---- Map: third-party embed, only load after explicit consent -------------
const MAP_SRC =
  "https://www.google.com/maps?q=%D0%9E%D0%94%D0%9A%20%D0%9A%D1%8A%D1%80%D0%B4%D0%B6%D0%B0%D0%BB%D0%B8&output=embed";

function loadMap() {
  const wrapper = document.getElementById("map-wrapper");
  if (!wrapper) return;
  wrapper.innerHTML = `
    <iframe
      title="Карта — ЦПЛР-ОДК Кърджали"
      src="${MAP_SRC}"
      class="h-72 w-full grayscale"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
    ></iframe>`;
}

document.getElementById("map-load-btn")?.addEventListener("click", loadMap);

// If the visitor already accepted all cookies via the site-wide banner,
// that covers third-party embeds too — skip the extra click.
if (getCookieConsent() === "all") {
  loadMap();
}

// Firestore writes queue locally and can hang far longer than a plain HTTP
// request when the backend is unreachable (e.g. Firebase not configured
// yet) — never leave the button stuck on "Изпращане..." forever.
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const statusEl = form.querySelector("[data-status]");
  const submitBtn = form.querySelector('button[type="submit"]');
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const message = form.message.value.trim();

  submitBtn.disabled = true;
  statusEl.textContent = "Изпращане...";

  try {
    await withTimeout(
      addDoc(collection(db, "messages"), {
        name,
        email,
        message,
        createdAt: serverTimestamp(),
      }),
      15000
    );
    statusEl.textContent = "Благодарим! Съобщението е изпратено успешно.";
    form.reset();
  } catch (err) {
    console.error(err);
    statusEl.textContent =
      "Възникна грешка при изпращането. Опитайте отново или ни пишете директно на имейл.";
  } finally {
    submitBtn.disabled = false;
  }
});
