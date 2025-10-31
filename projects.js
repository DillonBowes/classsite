// projects.js
import { fetchJSON, renderProjects } from './global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

document.addEventListener('DOMContentLoaded', async () => {
  const projects = await fetchJSON('./lib/projects.json');
  const projectsContainer = document.querySelector('.projects');
  const searchBar = document.querySelector('.searchBar');

  let selectedYear = null; // track active year

  // === Initial render ===
  renderProjects(projects, projectsContainer, 'h2');
  renderPieChart(projects);

  // === Step 4: Search filter ===
  searchBar.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = projects.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
    );

    const visible = selectedYear
      ? filtered.filter((p) => p.year === selectedYear)
      : filtered;

    renderProjects(visible, projectsContainer, 'h2');
    renderPieChart(visible);
  });

  // === Reusable Pie Chart Function ===
  function renderPieChart(currentProjects) {
    // Aggregate counts per year
    const rolledData = d3.rollups(
      currentProjects,
      (v) => v.length,
      (d) => d.year
    );

    const data = rolledData.map(([year, count]) => ({
      label: year,
      value: count,
    }));

    // === D3 Setup ===
    const svg = d3.select('#projects-pie-plot');
    svg.selectAll('*').remove();

    const radius = 50;
    const arcGenerator = d3.arc().innerRadius(0).outerRadius(radius);
    const sliceGenerator = d3.pie().value((d) => d.value);
    const arcData = sliceGenerator(data);

    // --- FIX #1: Color scale tied to year labels ---
    const colors = d3.scaleOrdinal()
      .domain(projects.map((d) => d.year))
      .range(d3.schemeTableau10);

    // === Draw slices ===
    svg
      .selectAll('path')
      .data(arcData)
      .join('path')
      .attr('d', arcGenerator)
      .attr('fill', (d) => colors(d.data.label)) // FIX #2: use label, not index
      .attr('stroke', '#222')
      .attr('stroke-width', 1)
      .attr('opacity', (d) =>
        selectedYear && d.data.label !== selectedYear ? 0.4 : 1
      )
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        // Toggle selection
        selectedYear = selectedYear === d.data.label ? null : d.data.label;

        // Filter projects by year
        const visible = selectedYear
          ? projects.filter((p) => p.year === selectedYear)
          : projects;

        renderProjects(visible, projectsContainer, 'h2');
        renderPieChart(visible);
      });

    // === Legend ===
    const legend = d3.select('.legend');
    legend.selectAll('*').remove();

    data.forEach((d) => {
      legend
        .append('li')
        .attr('style', `--color:${colors(d.label)}`) // FIX #3: same color mapping
        .classed('active', d.label === selectedYear)
        .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
        .style('cursor', 'pointer')
        .style('opacity', d.label !== selectedYear && selectedYear ? 0.5 : 1)
        .on('click', () => {
          selectedYear = selectedYear === d.label ? null : d.label;
          const visible = selectedYear
            ? projects.filter((p) => p.year === selectedYear)
            : projects;
          renderProjects(visible, projectsContainer, 'h2');
          renderPieChart(visible);
        });
    });
  }
});
