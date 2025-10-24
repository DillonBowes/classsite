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
  { url: "contact.html", title: "Contact" },
  { url: "https://github.com/DillonBowes", title: "GitHub" }
];

// Base path for GitHub Pages
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/classsite/";

// Create navigation
const nav = document.createElement("nav");
nav.setAttribute("role", "navigation");
nav.setAttribute("aria-label", "Main site navigation");
document.body.prepend(nav);

for (let p of pages) {
  let url = !p.url.startsWith("http") ? BASE_PATH + p.url : p.url;
  let a = document.createElement("a");
  a.href = url;
  a.textContent = p.title;
  a.setAttribute("aria-label", p.title);
  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add("current");
  }
  if (a.host !== location.host) a.target = "_blank";
  nav.append(a);
}

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
