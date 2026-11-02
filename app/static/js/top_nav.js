// Dropdown behaviour for the shared PTox/DEx top navigation bar
document.querySelectorAll(".nav-dropdown").forEach((dropdown) => {
  const button = dropdown.querySelector(".nav-dropdown-button");
  if (!button) {
    return;
  }
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = dropdown.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(isOpen));
  });
});

document.addEventListener("click", () => {
  document.querySelectorAll(".nav-dropdown.is-open").forEach((dropdown) => {
    dropdown.classList.remove("is-open");
    const button = dropdown.querySelector(".nav-dropdown-button");
    if (button) {
      button.setAttribute("aria-expanded", "false");
    }
  });
});
