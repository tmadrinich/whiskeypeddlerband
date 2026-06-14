// =====================
// main.js – Header/Footer, Nav, Active Links, Fade, Carousel
// =====================

document.addEventListener("DOMContentLoaded", function () {
  // Fade in page
  document.body.classList.add("fade-in");

  // ---------------------
  // Load Header
  // ---------------------
  fetch("/partials/header.html")
    .then((res) => {
      if (!res.ok) throw new Error("Header not found");
      return res.text();
    })
    .then((data) => {
      document.getElementById("site-header").innerHTML = data;
      initNav();
      highlightActiveLink();
      initLinkFade();
    })
    .catch((err) => console.error("Error loading header:", err));

  // ---------------------
  // Load Footer
  // ---------------------
  fetch("/partials/footer.html")
    .then((res) => {
      if (!res.ok) throw new Error("Footer not found");
      return res.text();
    })
    .then((data) => {
      document.getElementById("site-footer").innerHTML = data;
    })
    .catch((err) => console.error("Error loading footer:", err));

  initCarousel();
});

// =====================
// Mobile Nav Toggle
// =====================
function initNav() {
  const nav = document.querySelector(".main-nav");
  const toggle = document.querySelector(".nav-toggle");

  if (!nav || !toggle) return;

  toggle.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}

// =====================
// Highlight Active Page (Clean URLs)
// =====================
function highlightActiveLink() {
  const navLinks = document.querySelectorAll(".nav-links a, .main-nav a");
  let path = window.location.pathname.replace(/\/$/, "");

  if (path === "") path = "/";

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (href === path) {
      link.classList.add("active");
    }
  });
}

// =====================
// Fade on Internal Link Click
// =====================
function initLinkFade() {
  const internalLinks = document.querySelectorAll("a[href^='/'], a[href^='./']");

  internalLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      const href = this.getAttribute("href");

      // Ignore external, anchor, or empty links
      if (!href || href.startsWith("http") || href.startsWith("#")) return;

      e.preventDefault();

      document.body.classList.remove("fade-in");
      document.body.style.opacity = 0;

      setTimeout(() => {
        window.location.href = href;
      }, 500);
    });
  });
}

// =====================
// Carousel (Safe on pages without it)
// =====================
function initCarousel() {
  const track = document.querySelector(".carousel-track");
  if (!track) return;

  const slides = Array.from(track.children);
  const nextBtn = document.querySelector(".carousel-btn.next");
  const prevBtn = document.querySelector(".carousel-btn.prev");

  let index = 0;

  function updateCarousel() {
    track.style.transform = `translateX(-${index * 100}%)`;
  }

  nextBtn.addEventListener("click", () => {
    index = (index + 1) % slides.length;
    updateCarousel();
  });

  prevBtn.addEventListener("click", () => {
    index = (index - 1 + slides.length) % slides.length;
    updateCarousel();
  });

  let startX = 0;

  track.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
  });

  track.addEventListener("touchend", (e) => {
    const diff = e.changedTouches[0].clientX - startX;
    if (diff > 50) prevBtn.click();
    if (diff < -50) nextBtn.click();
  });
}
