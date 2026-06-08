// Simple animation on scroll
const sections = document.querySelectorAll("section");

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = 1;
      entry.target.style.transform = "translateY(0)";
    }
  });
});

sections.forEach((sec) => {
  sec.style.opacity = 0;
  sec.style.transform = "translateY(30px)";
  sec.style.transition = "0.6s ease";
  observer.observe(sec);
});

// button click effect
document.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener(
    "mousedown",
    () => (btn.style.transform = "scale(0.95)"),
  );
  btn.addEventListener("mouseup", () => (btn.style.transform = "scale(1)"));
});
