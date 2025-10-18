const projectIcons = document.querySelectorAll(".project-icon");
const modal = document.querySelector(".modal");
const modalContent = document.querySelector(".modal-content");

projectIcons.forEach(icon => {
  icon.addEventListener("click", () => {
    const title = icon.getAttribute("data-title");
    const desc = icon.getAttribute("data-description");
    modalContent.innerHTML = `<h2>${title}</h2>${desc}`;
    modal.style.display = "flex";
  });
});

modal.addEventListener("click", () => {
  modal.style.display = "none";
});
