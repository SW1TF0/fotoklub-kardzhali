// ============================================================================
// cookies.js — lightweight cookie/localStorage consent banner, shared across
// every page. No third-party consent library — just enough to be transparent
// about what the site stores and let visitors opt out of anything non-essential.
// ============================================================================

const STORAGE_KEY = "fk_cookie_consent"; // "all" | "necessary"

function getConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setConsent(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Private browsing / storage disabled — banner will just reappear next
    // visit, which is an acceptable fallback.
  }
  document.dispatchEvent(new CustomEvent("cookieconsent", { detail: value }));
}

export function getCookieConsent() {
  return getConsent();
}

function buildBanner() {
  const banner = document.createElement("div");
  banner.id = "cookie-banner";
  banner.className =
    "fixed inset-x-0 bottom-0 z-[60] border-t border-neutral-800 bg-neutral-950/95 px-6 py-5 backdrop-blur";
  banner.innerHTML = `
    <div class="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm leading-relaxed text-neutral-400">
        Използваме бисквитки, необходими за работата на сайта (вход в профила и запазване
        на сесията). Без тях не можете да влезете в профила си.
        <a href="privacy.html#cookies" class="underline decoration-neutral-600 underline-offset-2 hover:text-accent-400">Научете повече</a>.
      </p>
      <div class="flex shrink-0 gap-3">
        <button id="cookie-necessary-btn" class="rounded-full border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-accent-400 hover:text-accent-400">
          Само необходими
        </button>
        <button id="cookie-accept-btn" class="rounded-full bg-accent-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-accent-300">
          Приемам всички
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById("cookie-accept-btn").addEventListener("click", () => {
    setConsent("all");
    banner.remove();
  });
  document.getElementById("cookie-necessary-btn").addEventListener("click", () => {
    setConsent("necessary");
    banner.remove();
  });
}

if (!getConsent()) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildBanner);
  } else {
    buildBanner();
  }
}
