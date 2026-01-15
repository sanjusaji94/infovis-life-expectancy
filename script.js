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
  m: { top: 18, right: 16, bottom: 80, left: 52 }
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
  renderBarChart();
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
  barXAxisG.call(d3.axisBottom(x).tickSizeOuter(0))
    .selectAll("text")
    .attr("transform", "rotate(-35)")
    .style("text-anchor", "end");

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

  // first render
  updateDebug(minYear, maxYear);
  renderBarChart();

  yearSlider.addEventListener("input", () => {
    state.year = +yearSlider.value;
    yearValue.textContent = state.year;

    updateDebug(minYear, maxYear);
    renderBarChart(); // bar updates with year
  });

}).catch(err => {
  console.error("CSV FAILED", err);
  document.getElementById("debug").textContent = "CSV load failed — check console.";
});

function updateDebug(minYear, maxYear) {
  document.getElementById("debug").textContent =
    `Loaded ${fullData.length} rows • Year range: ${minYear}–${maxYear} • Selected year: ${state.year} • Selected country: ${state.country ?? "-"}`;
}
