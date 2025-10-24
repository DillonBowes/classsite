import { fetchJSON, renderProjects } from './global.js';

document.addEventListener("DOMContentLoaded", async () => {
  const projects = await fetchJSON('./lib/projects.json');
  const projectsContainer = document.querySelector('.projects');
  renderProjects(projects, projectsContainer, 'h2');
});
