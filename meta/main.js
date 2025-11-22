import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load CSV
async function loadData() {
  return d3.csv('loc.csv', row => ({
    ...row,
    size: +row.size,
    datetime: new Date(row.datetime),
  }));
}

// Process commits
function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([commit, files]) => {
    const first = files[0];
    const totalSize = d3.sum(files, f => f.size);
    return {
      id: commit,
      url: 'https://github.com/dillonbowes/classsite/commit/' + commit,
      author: first.author,
      datetime: first.datetime,
      hourFrac: first.datetime.getHours() + first.datetime.getMinutes() / 60,
      files,
      totalSize,
    };
  });
}

// Render stats
function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').html('').append('dl').attr('class', 'stats');
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);
  dl.append('dt').text('Total files tracked');
  dl.append('dd').text(data.length);
  dl.append('dt').text('Total size (bytes)');
  dl.append('dd').text(d3.sum(data, d => d.size));
}

// Tooltip
function renderTooltipContent(commit) {
  if (!commit) return;
  document.getElementById('commit-link').href = commit.url;
  document.getElementById('commit-link').textContent = commit.id;
  document.getElementById('commit-date').textContent = commit.datetime?.toLocaleString();
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-lines').textContent = commit.files.length + ' files, ' + commit.totalSize + ' bytes';
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 10}px`;
  tooltip.style.top = `${event.clientY + 10}px`;
}

// Unit visualization with colored lines
function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.files);
  const files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  const filesContainer = d3.select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(enter => enter.append('div').call(div => {
      div.append('dt').append('code');
      div.append('dd');
    }));

  filesContainer.select('dt > code').text(d => `${d.name} (${d.lines.length} lines)`);
  filesContainer.select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .style('background', d => colors(d.type)); // set color by type
}

// Scatterplot
function renderScatterPlot(commits) {
  const width = 1000, height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const svg = d3.select('#chart').html('').append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  const yScale = d3.scaleLinear().domain([0,24]).range([height - margin.bottom, margin.top]);
  const [minSize,maxSize] = d3.extent(commits, d => d.totalSize);
  const rScale = d3.scaleSqrt().domain([minSize,maxSize]).range([3,30]);

  svg.append('g').attr('transform', `translate(0,${height-margin.bottom})`).attr('class','x-axis').call(d3.axisBottom(xScale));
  svg.append('g').attr('transform', `translate(${margin.left},0)`).attr('class','y-axis').call(d3.axisLeft(yScale).tickFormat(d=>`${String(d%24).padStart(2,'0')}:00`));

  svg.append('g').attr('class','gridlines').attr('transform',`translate(${margin.left},0)`).call(d3.axisLeft(yScale).tickSize(-width+margin.left+margin.right).tickFormat(''));

  const sortedCommits = commits.sort((a,b)=>b.totalSize-a.totalSize);

  const dots = svg.append('g').attr('class','dots').selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join('circle')
    .attr('cx', d=>xScale(d.datetime))
    .attr('cy', d=>yScale(d.hourFrac))
    .attr('r', d=>rScale(d.totalSize))
    .attr('fill','steelblue')
    .style('fill-opacity',0.7)
    .on('mouseenter',(event,d)=>{
      renderTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
      d3.select(event.currentTarget).style('fill-opacity',1);
    })
    .on('mousemove',updateTooltipPosition)
    .on('mouseleave',(event)=>{
      updateTooltipVisibility(false);
      d3.select(event.currentTarget).style('fill-opacity',0.7);
    });

  const brush = d3.brush().extent([[margin.left, margin.top],[width-margin.right,height-margin.bottom]])
    .on('start brush end', brushed);

  svg.call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();

  function isCommitSelected(selection, commit) {
    if(!selection) return false;
    const [[x0,y0],[x1,y1]] = selection;
    const cx = xScale(commit.datetime);
    const cy = yScale(commit.hourFrac);
    return x0<=cx && cx<=x1 && y0<=cy && cy<=y1;
  }

  function brushed(event){
    const selection = event.selection;
    const selected = commits.filter(d=>isCommitSelected(selection,d));
    svg.selectAll('circle').classed('selected',d=>isCommitSelected(selection,d));

    const countEl = document.getElementById('selection-count');
    countEl.textContent = selected.length ? `${selected.length} commits selected` : 'No commits selected';

    const container = document.getElementById('language-breakdown');
    container.innerHTML = '';
    if(selected.length){
      const files = selected.flatMap(d=>d.files);
      const breakdown = d3.rollup(files,v=>v.length,d=>d.type);
      for(const [type,count] of breakdown){
        const proportion = d3.format('.1~%')(count/files.length);
        container.innerHTML += `<dt>${type}</dt><dd>${count} files (${proportion})</dd>`;
      }
    }
  }

  return { svg, xScale, yScale, rScale, dots };
}

// Main
(async function main(){
  const data = await loadData();
  const commits = processCommits(data);

  renderCommitInfo(data, commits);
  renderScatterPlot(commits);
  updateFileDisplay(commits);

  // Slider
  const slider = document.getElementById('commit-progress');
  const timeDisplay = document.getElementById('commit-time');

  function updateBySlider() {
    const pct = +slider.value;
    const timeScale = d3.scaleTime()
      .domain(d3.extent(commits, d => d.datetime))
      .range([0,100]);
    const commitMaxTime = timeScale.invert(pct);
    timeDisplay.textContent = commitMaxTime.toLocaleString();

    const filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
    renderScatterPlot(filteredCommits);
    updateFileDisplay(filteredCommits);
  }

  slider.addEventListener('input', updateBySlider);
  updateBySlider(); // initialize
})();
