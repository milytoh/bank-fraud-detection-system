document.addEventListener("DOMContentLoaded", () => {
  const alerts = document.querySelectorAll(".alert");

  alerts.forEach((alert) => {
    setTimeout(() => {
      alert.style.transition = "opacity .5s ease, transform .5s ease";

      alert.style.opacity = "0";
      alert.style.transform = "translateY(-10px)";

      setTimeout(() => {
        alert.remove();
      }, 500);
    }, 4000);
  });
});
