import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load CSV
async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

// Process commits
function processCommits(data) {
  return d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
    const first = lines[0];
    const { author, date, time, timezone, datetime } = first;
    const ret = {
      id: commit,
      url: 'https://github.com/YOUR_REPO/commit/' + commit,
      author,
      date,
      time,
      timezone,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length,
    };
    Object.defineProperty(ret, 'lines', { value: lines });
    return ret;
  });
}

// Render summary stats
function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);
}

// Tooltip functions
function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  if (!commit) return;
  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
}
function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}
function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

// Scatterplot + brushing
function renderScatterPlot(commits) {
  const width = 1000, height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const usableWidth = width - margin.left - margin.right;
  const usableHeight = height - margin.top - margin.bottom;

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();
  const yScale = d3.scaleLinear().domain([0, 24]).range([height - margin.bottom, margin.top]);
  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  // Draw axes
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScale));
  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat(d => `${String(d % 24).padStart(2,'0')}:00`));

  // Draw gridlines
  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableWidth));

  // Sort commits by size for proper layering
  const sortedCommits = commits.sort((a, b) => a.totalLines - b.totalLines);

  const dots = svg.append('g').attr('class', 'dots')
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, d) => {
      renderTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
      d3.select(event.currentTarget).style('fill-opacity', 1);
    })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave', (event) => {
      updateTooltipVisibility(false);
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
    });

  // Brushing
  const brush = d3.brush()
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
    .on('start brush end', brushed);

  svg.call(brush);

  function isCommitSelected(selection, commit) {
    if (!selection) return false;
    const [x0, y0] = selection[0];
    const [x1, y1] = selection[1];
    const cx = xScale(commit.datetime);
    const cy = yScale(commit.hourFrac);
    return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
  }

  function brushed(event) {
    const selection = event.selection;
    svg.selectAll('circle').classed('selected', d => isCommitSelected(selection, d));
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }

  function renderSelectionCount(selection) {
    const selectedCommits = selection ? commits.filter(d => isCommitSelected(selection, d)) : [];
    document.getElementById('selection-count').textContent =
      `${selectedCommits.length || 'No'} commits selected`;
    return selectedCommits;
  }

  function renderLanguageBreakdown(selection) {
    const selectedCommits = selection ? commits.filter(d => isCommitSelected(selection, d)) : [];
    const container = document.getElementById('language-breakdown');
    container.innerHTML = '';
    if (!selectedCommits.length) return;
    const lines = selectedCommits.flatMap(d => d.lines);
    const breakdown = d3.rollup(lines, v => v.length, d => d.type);
    for (const [lang, count] of breakdown) {
      const proportion = count / lines.length;
      container.innerHTML += `<dt>${lang}</dt><dd>${count} lines (${d3.format('.1~%')(proportion)})</dd>`;
    }
  }
}

// Run everything
(async function main() {
  const data = await loadData();
  const commits = processCommits(data);
  renderCommitInfo(data, commits);
  renderScatterPlot(commits);
})();
