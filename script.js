const root = document.documentElement;
const toggle = document.getElementById("themeToggle");

/* Load saved theme or system preference */
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
  root.setAttribute("data-theme", "dark");
  toggle.checked = true;
} else if (
  !savedTheme &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
) {
  root.setAttribute("data-theme", "dark");
  toggle.checked = true;
}

/* Toggle theme */
function toggleTheme() {
  if (toggle.checked) {
    root.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  } else {
    root.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
  }
}
