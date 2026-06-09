// // Simple animation on scroll
// const sections = document.querySelectorAll("section");

// const observer = new IntersectionObserver((entries) => {
//   entries.forEach((entry) => {
//     if (entry.isIntersecting) {
//       entry.target.style.opacity = 1;
//       entry.target.style.transform = "translateY(0)";
//     }
//   });
// });

// sections.forEach((sec) => {
//   sec.style.opacity = 0;
//   sec.style.transform = "translateY(30px)";
//   sec.style.transition = "0.6s ease";
//   observer.observe(sec);
// });

// // button click effect
// document.querySelectorAll("button").forEach((btn) => {
//   btn.addEventListener(
//     "mousedown",
//     () => (btn.style.transform = "scale(0.95)"),
//   );
//   btn.addEventListener("mouseup", () => (btn.style.transform = "scale(1)"));
// });

/* ===========================
   FraudShield – main.js
   =========================== */

(function () {
  "use strict";

  /* ---------- Scroll-reveal ---------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target); // fire once
        }
      });
    },
    { threshold: 0.1 },
  );

  document.querySelectorAll(".reveal").forEach((el) => {
    revealObserver.observe(el);
  });

  /* ---------- Button press micro-interactions ---------- */
  document
    .querySelectorAll(
      "button, .btn-hero-primary, .btn-hero-secondary, .btn-portal-primary, .btn-portal-error",
    )
    .forEach((el) => {
      el.addEventListener(
        "mousedown",
        () => (el.style.transform = "scale(0.95)"),
      );
      el.addEventListener("mouseup", () => (el.style.transform = ""));
      el.addEventListener("mouseleave", () => (el.style.transform = ""));
    });

  /* ---------- Responsive nav toggle ---------- */
  const navToggle = document.querySelector(".nav__toggle");
  const navMenu = document.querySelector(".nav__menu");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    window.addEventListener(
      "resize",
      () => {
        if (window.innerWidth >= 768) {
          navMenu.classList.remove("is-open");
          navToggle.setAttribute("aria-expanded", "false");
        }
      },
      { passive: true },
    );
  }

  /* ---------- Sticky nav: add shadow on scroll ---------- */
  const nav = document.getElementById("nav");
  if (nav) {
    window.addEventListener(
      "scroll",
      () => {
        if (window.scrollY > 10) {
          nav.style.boxShadow = "0 4px 24px rgba(0,0,0,0.4)";
        } else {
          nav.style.boxShadow = "";
        }
      },
      { passive: true },
    );
  }

  /* ---------- Newsletter: basic feedback ---------- */
  const emailBtn = document.querySelector(".footer__email-btn");
  const emailInput = document.querySelector(".footer__email-input");

  if (emailBtn && emailInput) {
    emailBtn.addEventListener("click", () => {
      const val = emailInput.value.trim();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

      if (!valid) {
        emailInput.style.outline = "2px solid #ffb4ab";
        emailInput.placeholder = "Enter a valid email";
        setTimeout(() => {
          emailInput.style.outline = "";
          emailInput.placeholder = "Email address";
        }, 2000);
        return;
      }

      emailBtn.textContent = "✓ Joined";
      emailBtn.disabled = true;
      emailInput.value = "";
      emailInput.placeholder = "Thanks for subscribing!";
    });
  }
})();
