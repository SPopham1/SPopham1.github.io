const root = document.documentElement;
const toggle = document.getElementById("themeToggle");

// Check if theme is stored in memory (not localStorage)
let currentTheme = null;

// Check system preference on load
if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  root.setAttribute("data-theme", "dark");
  toggle.checked = true;
  currentTheme = "dark";
}

// Toggle theme function
toggle.addEventListener("change", function () {
  if (this.checked) {
    root.setAttribute("data-theme", "dark");
    currentTheme = "dark";
  } else {
    root.removeAttribute("data-theme");
    currentTheme = "light";
  }
});

// Listen for system theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!currentTheme) {
      if (e.matches) {
        root.setAttribute("data-theme", "dark");
        toggle.checked = true;
      } else {
        root.removeAttribute("data-theme");
        toggle.checked = false;
      }
    }
  });
