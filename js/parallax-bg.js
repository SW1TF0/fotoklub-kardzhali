// ============================================================================
// parallax-bg.js — scroll-driven parallax for the multi-layer hero backdrop
// (index.html only). Each .parallax-layer moves at its own fraction of the
// scroll distance (data-speed), so the real photo (slowest, furthest back)
// and the two silhouette ridges (faster, nearer) drift apart as the page
// scrolls, giving real depth instead of one flat image.
// ============================================================================

const layers = document.querySelectorAll(".parallax-layer");

let ticking = false;

function updateParallax() {
  const scrollY = window.scrollY;
  layers.forEach((layer) => {
    const speed = parseFloat(layer.dataset.speed || "0.3");
    layer.style.transform = `translateY(${scrollY * speed}px)`;
  });
  ticking = false;
}

if (layers.length > 0) {
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    },
    { passive: true }
  );
  updateParallax();
}
