console.log("SCRIPT OK");

const CSV_PATH = "data/Life_Expectancy_Data.csv";
const COL_LIFE = "Life expectancy "; // trailing space in dataset

const state = {
  year: null,
  country: null
};

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

let fullData = [];

// Shared tooltip for all charts
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

// ---------- Bar chart setup ----------
const barCfg = {
  h: 260,
  m: { top: 18, right: 16, bottom: 100, left: 52 }

};

let barSvg, barG, barXAxisG, barYAxisG;

function initBarChart() {
  const el = d3.select("#barChart");
  el.selectAll("*").remove();

  const w = el.node().clientWidth || 520; // fallback

  barSvg = el.append("svg")
    .attr("width", w)
    .attr("height", barCfg.h);

  barG = barSvg.append("g")
    .attr("transform", `translate(${barCfg.m.left},${barCfg.m.top})`);

  barXAxisG = barG.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerBarH()})`);

  barYAxisG = barG.append("g")
    .attr("class", "axis");
}

window.addEventListener("resize", () => {
  initBarChart();
  initHistChart();
  renderBarChart();
  renderHistChart();
});

function innerBarW() {
  const w = +barSvg.attr("width");
  return w - barCfg.m.left - barCfg.m.right;
}
function innerBarH() {
  return barCfg.h - barCfg.m.top - barCfg.m.bottom;
}

function getYearData() {
  // Filter to selected year, keep valid values
  return fullData.filter(d => d.Year === state.year && d.life != null);
}

function renderBarChart() {
  const yearData = getYearData();

  // If duplicates per country exist, keep max life (safe)
  const byCountry = d3.rollup(
    yearData,
    v => d3.max(v, d => d.life),
    d => d.Country
  );

  let rows = Array.from(byCountry, ([Country, life]) => ({ Country, life }));

  rows.sort((a, b) => b.life - a.life);
  rows = rows.slice(0, 10); // Top 10

  // If no country selected yet, choose first
  if (!state.country) state.country = rows[0]?.Country ?? null;

  const x = d3.scaleBand()
    .domain(rows.map(d => d.Country))
    .range([0, innerBarW()])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(rows, d => d.life)]).nice()
    .range([innerBarH(), 0]);

// Axes
barXAxisG.call(d3.axisBottom(x).tickSizeOuter(0));

barXAxisG.selectAll("text")
  .text(d => shortLabel(d, 14))   // SHORTEN LABEL
  .attr("transform", "rotate(-35)")
  .style("text-anchor", "end")
  .append("title")                // native tooltip on axis label
  .text(d => d);                  // full country name

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
    .on("click", (_, d) => {
      state.country = d.Country;       // selection event
      renderBarChart();                // update highlight
      // Next stage: renderLineChart() when line exists
    });

  // Title inside chart (optional)
  barG.selectAll("text.barTitle")
    .data([0])
    .join("text")
    .attr("class", "barTitle")
    .attr("x", 0)
    .attr("y", -6)
    .attr("font-size", 12)
    .text(`Top 10 — Year ${state.year}`);
}

// ---------- Histogram setup ----------
const histCfg = {
  h: 260,
  m: { top: 18, right: 16, bottom: 55, left: 52 }
};

let histSvg, histG, histXAxisG, histYAxisG;

function initHistChart() {
  const el = d3.select("#histChart");
  el.selectAll("*").remove();

  const w = el.node().clientWidth || 520;

  histSvg = el.append("svg")
    .attr("width", w)
    .attr("height", histCfg.h);

  histG = histSvg.append("g")
    .attr("transform", `translate(${histCfg.m.left},${histCfg.m.top})`);

  histXAxisG = histG.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHistH()})`);

  histYAxisG = histG.append("g")
    .attr("class", "axis");
}

function innerHistW() {
  const w = +histSvg.attr("width");
  return w - histCfg.m.left - histCfg.m.right;
}
function innerHistH() {
  return histCfg.h - histCfg.m.top - histCfg.m.bottom;
}

function renderHistChart() {
  // values for selected year
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

// ---------- Scatter setup ----------
const scatCfg = {
  h: 260,
  m: { top: 18, right: 16, bottom: 55, left: 52 }
};

let scatSvg, scatG, scatXAxisG, scatYAxisG;

function initScatterChart() {
  const el = d3.select("#scatterChart");
  el.selectAll("*").remove();

  const w = el.node().clientWidth || 520;

  scatSvg = el.append("svg")
    .attr("width", w)
    .attr("height", scatCfg.h);

  scatG = scatSvg.append("g")
    .attr("transform", `translate(${scatCfg.m.left},${scatCfg.m.top})`);

  scatXAxisG = scatG.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerScatH()})`);

  scatYAxisG = scatG.append("g")
    .attr("class", "axis");
}

function innerScatW() {
  const w = +scatSvg.attr("width");
  return w - scatCfg.m.left - scatCfg.m.right;
}
function innerScatH() {
  return scatCfg.h - scatCfg.m.top - scatCfg.m.bottom;
}

function renderScatterChart() {
  const rows = fullData
    .filter(d => d.Year === state.year && d.life != null && d.gdp != null);

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
    .on("click", (_, d) => {
      state.country = d.Country;
      // update highlight in bar & scatter now
      renderBarChart();
      renderScatterChart();
      // Next stage: renderLineChart() when line exists
    });

  scatG.selectAll("text.scatTitle")
    .data([0])
    .join("text")
    .attr("class", "scatTitle")
    .attr("x", 0)
    .attr("y", -6)
    .attr("font-size", 12)
    .text(`GDP vs Life Expectancy — Year ${state.year}`);
}

// ---------- Load data + connect slider ----------
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
  const minYear = years[0];
  const maxYear = years[years.length - 1];

  state.year = maxYear;

  // slider wiring
  const yearSlider = document.getElementById("yearSlider");
  const yearValue = document.getElementById("yearValue");

  yearSlider.min = minYear;
  yearSlider.max = maxYear;
  yearSlider.value = state.year;
  yearValue.textContent = state.year;

  // init charts
  initBarChart();
  initHistChart();

  // first render
  updateDebug(minYear, maxYear);
  renderBarChart();
  renderHistChart();

  yearSlider.addEventListener("input", () => {
    state.year = +yearSlider.value;
    yearValue.textContent = state.year;

    updateDebug(minYear, maxYear);
    renderBarChart(); // bar updates with year
    renderHistChart(); // histogram updates with year
  });

}).catch(err => {
  console.error("CSV FAILED", err);
  document.getElementById("debug").textContent = "CSV load failed — check console.";
});

function updateDebug(minYear, maxYear) {
  document.getElementById("debug").textContent =
    `Loaded ${fullData.length} rows • Year range: ${minYear}–${maxYear} • Selected year: ${state.year} • Selected country: ${state.country ?? "-"}`;
}
