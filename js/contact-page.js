// ============================================================================
// contact-page.js — contact form (contact.html), writes to the Firestore
// "messages" collection. Public create-only; admins read/delete via the
// "Съобщения" tab in admin.html (see js/admin.js).
// ============================================================================

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("contact-form");

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
