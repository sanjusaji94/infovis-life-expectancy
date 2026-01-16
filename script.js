console.log("SCRIPT OK");

const CSV_PATH = "data/Life_Expectancy_Data.csv";
const COL_LIFE = "Life expectancy "; // trailing space in dataset

// Shared state
const state = {
  year: null,
  country: null
};

// Globals for debug scope
let minYearGlobal = null;
let maxYearGlobal = null;

let fullData = [];

// ---------------- Helpers ----------------
function toNumber(x) {
  const v = (x ?? "").toString().trim();
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function shortLabel(s, max = 14) {
  if (!s) return s;
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function updateDebug() {
  const el = document.getElementById("debug");
  if (!el) return;
  el.textContent =
    `Loaded ${fullData.length} rows • Year range: ${minYearGlobal}–${maxYearGlobal} • Selected year: ${state.year} • Selected country: ${state.country ?? "-"}`;
}

// ---------------- Tooltip ----------------
const tooltip = d3.select("#tooltip");

function showTooltip(html, event) {
  tooltip
    .style("opacity", 1)
    .html(html)
    .style("left", (event.clientX + 12) + "px")
    .style("top", (event.clientY + 12) + "px");
}
function hideTooltip() {
  tooltip.style("opacity", 0);
}

// One place to set country (dropdown + bar click + scatter click)
function setCountry(newCountry) {
  state.country = newCountry;

  // update dropdown UI
  const sel = document.getElementById("countrySelect");
  if (sel && sel.value !== newCountry) sel.value = newCountry;

  // re-render dependent charts
  renderLineChart();
  renderBarChart();
  renderScatterChart();

  updateDebug();
}

// ---------------- Responsive SVG helper ----------------
// Creates an SVG that scales to container width using viewBox.
function makeResponsiveSvg(containerSelector, widthPx, heightPx) {
  const el = d3.select(containerSelector);
  el.selectAll("*").remove();

  const svg = el.append("svg")
    .attr("viewBox", `0 0 ${widthPx} ${heightPx}`)
    .attr("preserveAspectRatio", "xMinYMin meet");

  return svg;
}

// =======================================================
// BAR CHART
// =======================================================
const barCfg = {
  w: 700, // base viewBox width (scales down responsively)
  h: 260,
  m: { top: 18, right: 16, bottom: 100, left: 52 }
};

let barSvg, barG, barXAxisG, barYAxisG;

function innerBarW() {
  return barCfg.w - barCfg.m.left - barCfg.m.right;
}
function innerBarH() {
  return barCfg.h - barCfg.m.top - barCfg.m.bottom;
}

function initBarChart() {
  barSvg = makeResponsiveSvg("#barChart", barCfg.w, barCfg.h);

  barG = barSvg.append("g")
    .attr("transform", `translate(${barCfg.m.left},${barCfg.m.top})`);

  barXAxisG = barG.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerBarH()})`);

  barYAxisG = barG.append("g")
    .attr("class", "axis");
}

function renderBarChart() {
  if (!barG) return;

  const yearData = fullData.filter(d => d.Year === state.year && d.life != null);

  const byCountry = d3.rollup(
    yearData,
    v => d3.max(v, d => d.life),
    d => d.Country
  );

  let rows = Array.from(byCountry, ([Country, life]) => ({ Country, life }))
    .sort((a, b) => b.life - a.life)
    .slice(0, 10);

  // This line means: if no country selected yet, pick the first bar country.
  // It only runs on initial load (before user picks anything).
  if (!state.country && rows.length > 0) state.country = rows[0].Country;

  const x = d3.scaleBand()
    .domain(rows.map(d => d.Country))
    .range([0, innerBarW()])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(rows, d => d.life)]).nice()
    .range([innerBarH(), 0]);

  // Axis
  barXAxisG.call(d3.axisBottom(x).tickSizeOuter(0));

  // Shorten tick labels + ensure title is not appended repeatedly
  barXAxisG.selectAll("text")
    .text(d => shortLabel(d, 14))
    .attr("transform", "rotate(-35)")
    .style("text-anchor", "end")
    .each(function(d) {
      d3.select(this).selectAll("title")
        .data([d])
        .join("title")
        .text(d);
    });

  barYAxisG.call(d3.axisLeft(y));

  // Bars
  barG.selectAll("rect.bar")
    .data(rows, d => d.Country)
    .join("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.Country))
    .attr("width", x.bandwidth())
    .attr("y", d => y(d.life))
    .attr("height", d => innerBarH() - y(d.life))
    .attr("fill", d => (d.Country === state.country ? "black" : "#999"))
    .on("mousemove", (event, d) => {
      showTooltip(
        `<b>${d.Country}</b><br/>Year: ${state.year}<br/>Life expectancy: ${d.life.toFixed(1)}`,
        event
      );
    })
    .on("mouseleave", hideTooltip)
    .on("click", (_, d) => setCountry(d.Country));

  barG.selectAll("text.barTitle")
    .data([0])
    .join("text")
    .attr("class", "barTitle")
    .attr("x", 0)
    .attr("y", -6)
    .attr("font-size", 12)
    .text(`Top 10 — Year ${state.year}`);
}

// =======================================================
// HISTOGRAM
// =======================================================
const histCfg = {
  w: 700,
  h: 260,
  m: { top: 18, right: 16, bottom: 55, left: 52 }
};

let histSvg, histG, histXAxisG, histYAxisG;

function innerHistW() {
  return histCfg.w - histCfg.m.left - histCfg.m.right;
}
function innerHistH() {
  return histCfg.h - histCfg.m.top - histCfg.m.bottom;
}

function initHistChart() {
  histSvg = makeResponsiveSvg("#histChart", histCfg.w, histCfg.h);

  histG = histSvg.append("g")
    .attr("transform", `translate(${histCfg.m.left},${histCfg.m.top})`);

  histXAxisG = histG.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHistH()})`);

  histYAxisG = histG.append("g")
    .attr("class", "axis");
}

function renderHistChart() {
  if (!histG) return;

  const values = fullData
    .filter(d => d.Year === state.year && d.life != null)
    .map(d => d.life);

  if (values.length === 0) return;

  const x = d3.scaleLinear()
    .domain(d3.extent(values)).nice()
    .range([0, innerHistW()]);

  const bins = d3.bin()
    .domain(x.domain())
    .thresholds(12)(values);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)]).nice()
    .range([innerHistH(), 0]);

  histXAxisG.call(d3.axisBottom(x).ticks(6));
  histYAxisG.call(d3.axisLeft(y));

  histG.selectAll("rect.bin")
    .data(bins)
    .join("rect")
    .attr("class", "bin")
    .attr("x", d => x(d.x0) + 1)
    .attr("y", d => y(d.length))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 2))
    .attr("height", d => innerHistH() - y(d.length))
    .attr("fill", "#999")
    .on("mousemove", (event, d) => {
      showTooltip(
        `Year: <b>${state.year}</b><br/>Range: <b>${d.x0.toFixed(1)}–${d.x1.toFixed(1)}</b><br/>Countries: <b>${d.length}</b>`,
        event
      );
    })
    .on("mouseleave", hideTooltip);

  histG.selectAll("text.histTitle")
    .data([0])
    .join("text")
    .attr("class", "histTitle")
    .attr("x", 0)
    .attr("y", -6)
    .attr("font-size", 12)
    .text(`Distribution — Year ${state.year}`);
}

// =======================================================
// SCATTER
// =======================================================
const scatCfg = {
  w: 700,
  h: 260,
  m: { top: 18, right: 16, bottom: 55, left: 52 }
};

let scatSvg, scatG, scatXAxisG, scatYAxisG;

function innerScatW() {
  return scatCfg.w - scatCfg.m.left - scatCfg.m.right;
}
function innerScatH() {
  return scatCfg.h - scatCfg.m.top - scatCfg.m.bottom;
}

function initScatterChart() {
  scatSvg = makeResponsiveSvg("#scatterChart", scatCfg.w, scatCfg.h);

  scatG = scatSvg.append("g")
    .attr("transform", `translate(${scatCfg.m.left},${scatCfg.m.top})`);

  scatXAxisG = scatG.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerScatH()})`);

  scatYAxisG = scatG.append("g")
    .attr("class", "axis");
}

function renderScatterChart() {
  if (!scatG) return;

  const rows = fullData.filter(d => d.Year === state.year && d.life != null && d.gdp != null);
  if (rows.length === 0) return;

  const x = d3.scaleLinear()
    .domain(d3.extent(rows, d => d.gdp)).nice()
    .range([0, innerScatW()]);

  const y = d3.scaleLinear()
    .domain(d3.extent(rows, d => d.life)).nice()
    .range([innerScatH(), 0]);

  scatXAxisG.call(d3.axisBottom(x).ticks(6));
  scatYAxisG.call(d3.axisLeft(y));

  scatG.selectAll("circle.pt")
    .data(rows, d => d.Country)
    .join("circle")
    .attr("class", "pt")
    .attr("cx", d => x(d.gdp))
    .attr("cy", d => y(d.life))
    .attr("r", d => (d.Country === state.country ? 5 : 3))
    .attr("fill", d => (d.Country === state.country ? "black" : "#999"))
    .attr("opacity", 0.85)
    .on("mousemove", (event, d) => {
      showTooltip(
        `<b>${d.Country}</b><br/>Year: ${state.year}<br/>Life expectancy: ${d.life}<br/>GDP: ${d.gdp}`,
        event
      );
    })
    .on("mouseleave", hideTooltip)
    .on("click", (_, d) => setCountry(d.Country));

  scatG.selectAll("text.scatTitle")
    .data([0])
    .join("text")
    .attr("class", "scatTitle")
    .attr("x", 0)
    .attr("y", -6)
    .attr("font-size", 12)
    .text(`GDP vs Life Expectancy — Year ${state.year}`);
}

// =======================================================
// LINE
// =======================================================
const lineCfg = {
  w: 700,
  h: 260,
  m: { top: 18, right: 16, bottom: 55, left: 52 }
};

let lineSvg, lineG, lineXAxisG, lineYAxisG;

function innerLineW() {
  return lineCfg.w - lineCfg.m.left - lineCfg.m.right;
}
function innerLineH() {
  return lineCfg.h - lineCfg.m.top - lineCfg.m.bottom;
}

function initLineChart() {
  lineSvg = makeResponsiveSvg("#lineChart", lineCfg.w, lineCfg.h);

  lineG = lineSvg.append("g")
    .attr("transform", `translate(${lineCfg.m.left},${lineCfg.m.top})`);

  lineXAxisG = lineG.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerLineH()})`);

  lineYAxisG = lineG.append("g")
    .attr("class", "axis");
}

function renderLineChart() {
  if (!lineG || !state.country) return;

  const rows = fullData
    .filter(d => d.Country === state.country && d.life != null)
    .sort((a, b) => a.Year - b.Year);

  if (rows.length === 0) return;

  const x = d3.scaleLinear()
    .domain(d3.extent(rows, d => d.Year))
    .range([0, innerLineW()]);

  const y = d3.scaleLinear()
    .domain(d3.extent(rows, d => d.life)).nice()
    .range([innerLineH(), 0]);

  lineXAxisG.call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));
  lineYAxisG.call(d3.axisLeft(y));

  const line = d3.line()
    .x(d => x(d.Year))
    .y(d => y(d.life));

  lineG.selectAll("path.trend")
    .data([rows])
    .join("path")
    .attr("class", "trend")
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .attr("d", line);

  const yr = rows.find(d => d.Year === state.year);

  lineG.selectAll("circle.yearDot")
    .data(yr ? [yr] : [])
    .join("circle")
    .attr("class", "yearDot")
    .attr("r", 4.5)
    .attr("cx", d => x(d.Year))
    .attr("cy", d => y(d.life))
    .attr("fill", "black")
    .on("mousemove", (event, d) => {
      showTooltip(
        `<b>${state.country}</b><br/>Year: ${d.Year}<br/>Life expectancy: ${d.life}`,
        event
      );
    })
    .on("mouseleave", hideTooltip);

  lineG.selectAll("text.lineTitle")
    .data([0])
    .join("text")
    .attr("class", "lineTitle")
    .attr("x", 0)
    .attr("y", -6)
    .attr("font-size", 12)
    .text(`Trend — ${state.country}`);
}

// =======================================================
// LOAD DATA + INIT
// =======================================================
d3.csv(CSV_PATH, d => ({
  Country: d.Country?.trim(),
  Year: toNumber(d.Year),
  Status: d.Status?.trim(),
  life: toNumber(d[COL_LIFE]),
  gdp: toNumber(d.GDP),
  population: toNumber(d.Population)
})).then(data => {
  fullData = data.filter(d => d.Country && d.Year && d.life != null);

  const years = Array.from(new Set(fullData.map(d => d.Year))).sort((a, b) => a - b);
  minYearGlobal = years[0];
  maxYearGlobal = years[years.length - 1];

  state.year = maxYearGlobal;

  // Dropdown
  const countries = Array.from(new Set(fullData.map(d => d.Country))).sort(d3.ascending);
  if (!state.country) state.country = countries[0];

  const countrySelect = d3.select("#countrySelect");
  countrySelect.selectAll("option")
    .data(countries)
    .join("option")
    .attr("value", d => d)
    .text(d => d);

  countrySelect.property("value", state.country);

  countrySelect.on("change", () => {
    setCountry(countrySelect.property("value"));
  });

  // Slider
  const yearSlider = document.getElementById("yearSlider");
  const yearValue = document.getElementById("yearValue");

  yearSlider.min = minYearGlobal;
  yearSlider.max = maxYearGlobal;
  yearSlider.value = state.year;
  yearValue.textContent = state.year;

  yearSlider.addEventListener("input", () => {
    state.year = +yearSlider.value;
    yearValue.textContent = state.year;

    updateDebug();
    renderBarChart();
    renderHistChart();
    renderScatterChart();
    renderLineChart();
  });

  // Init charts
  initBarChart();
  initHistChart();
  initScatterChart();
  initLineChart();

  // First render
  updateDebug();
  renderBarChart();
  renderHistChart();
  renderScatterChart();
  renderLineChart();

  // Resize handler (now safe because SVG is responsive)
  window.addEventListener("resize", () => {
    // re-init to reset viewBox if you want (optional)
    initBarChart();
    initHistChart();
    initScatterChart();
    initLineChart();

    renderBarChart();
    renderHistChart();
    renderScatterChart();
    renderLineChart();
  });

}).catch(err => {
  console.error("CSV FAILED", err);
  document.getElementById("debug").textContent = "CSV load failed — check console.";
});
