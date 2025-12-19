const root = document.documentElement;
const toggle = document.getElementById("themeToggle");

// Store theme preference in memory (not localStorage for artifact compatibility)
let currentTheme = null;

// Initialize theme based on system preference
function initTheme() {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.setAttribute("data-theme", "dark");
    toggle.checked = true;
    currentTheme = "dark";
  } else {
    root.removeAttribute("data-theme");
    toggle.checked = false;
    currentTheme = "light";
  }
}

// Toggle theme when checkbox changes
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
    // Only auto-update if user hasn't manually set a preference
    if (!currentTheme || currentTheme === "system") {
      if (e.matches) {
        root.setAttribute("data-theme", "dark");
        toggle.checked = true;
      } else {
        root.removeAttribute("data-theme");
        toggle.checked = false;
      }
    }
  });

// Initialize on page load
initTheme();
