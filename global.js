// Console test
console.log("IT’S ALIVE!");

// Utility to select all elements
export function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Fetch JSON safely
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    return await response.json();
  } catch (err) {
    console.error("Error fetching or parsing JSON:", err);
    return [];
  }
}

// Render projects dynamically
export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!Array.isArray(projects) || !containerElement) return;

  containerElement.innerHTML = ''; // Clear container

  projects.forEach((project) => {
    const article = document.createElement('article');
    article.innerHTML = `
      <${headingLevel}>${project.title || 'Untitled'}</${headingLevel}>
      <img src="${project.image || 'https://via.placeholder.com/400x200'}" alt="${project.title || 'Project image'}">
      <p>${project.description || 'No description available.'}</p>
    `;
    containerElement.appendChild(article);
  });
}

// Fetch GitHub profile data
export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}

// Pages array
const pages = [
  { url: "index.html", title: "Home" },
  { url: "resume.html", title: "Resume" },
  { url: "blog.html", title: "Blog" },
  { url: "projects.html", title: "Projects" },
  { url: "meta/index.html", title: "Meta Visualization" },
  { url: "contact.html", title: "Contact" },
  { url: "https://github.com/DillonBowes", title: "GitHub" }
];

// Base path for project site
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/classsite/";

// Create navigation
const nav = document.createElement("nav");
nav.setAttribute("role", "navigation");
nav.setAttribute("aria-label", "Main site navigation");
document.body.prepend(nav);

pages.forEach((p) => {
  const a = document.createElement("a");
  // Prepend BASE_PATH only for internal pages
  a.href = p.url.startsWith("http") ? p.url : BASE_PATH + p.url;
  a.textContent = p.title;
  a.setAttribute("aria-label", p.title);

  // Mark current page correctly
  const currentPath = location.pathname.replace(/\/$/, ""); // remove trailing slash
  const linkPath = a.pathname.replace(/\/$/, "");
  if (currentPath === linkPath) a.classList.add("current");

  // Open external links in new tab
  if (p.url.startsWith("http")) a.target = "_blank";

  nav.appendChild(a);
});



// Color scheme selector
document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
`
);

const select = document.querySelector(".color-scheme select");

function setColorScheme(value) {
  document.documentElement.style.setProperty("color-scheme", value);
  localStorage.colorScheme = value;
  select.value = value;
}

if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

select.addEventListener("input", (e) => {
  setColorScheme(e.target.value);
});

// Contact form handling
const form = document.querySelector("form");

form?.addEventListener("submit", (event) => {
  event.preventDefault(); 

  const data = new FormData(form);
  const params = [];
  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }
  const url = `${form.action}?${params.join("&")}`;
  location.href = url;
});
