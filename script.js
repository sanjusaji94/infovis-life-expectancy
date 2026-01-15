console.log("SCRIPT OK");

const CSV_PATH = "data/Life_Expectancy_Data.csv";
const COL_LIFE = "Life expectancy "; // trailing space in the dataset

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

d3.csv(CSV_PATH, d => ({
  Country: d.Country?.trim(),
  Year: toNumber(d.Year),
  Status: d.Status?.trim(),
  life: toNumber(d[COL_LIFE]),
  gdp: toNumber(d.GDP),
  population: toNumber(d.Population)
})).then(data => {
  fullData = data.filter(d => d.Country && d.Year && d.life != null);

  const years = Array.from(new Set(fullData.map(d => d.Year))).sort((a,b)=>a-b);
  const minYear = years[0];
  const maxYear = years[years.length - 1];

  // init state
  state.year = maxYear;
  state.country = fullData[0].Country;

  // slider wiring
  const yearSlider = document.getElementById("yearSlider");
  const yearValue  = document.getElementById("yearValue");

  yearSlider.min = minYear;
  yearSlider.max = maxYear;
  yearSlider.value = state.year;
  yearValue.textContent = state.year;

  // debug text
  updateDebug(minYear, maxYear);

  yearSlider.addEventListener("input", () => {
    state.year = +yearSlider.value;
    yearValue.textContent = state.year;
    updateDebug(minYear, maxYear);

    // Next stage: update charts here
    // renderBar();
    // renderScatter();
    // renderHist();
    // renderLineHighlight();
  });

}).catch(err => {
  console.error("CSV FAILED", err);
  document.getElementById("debug").textContent = "CSV load failed — check console.";
});

function updateDebug(minYear, maxYear) {
  document.getElementById("debug").textContent =
    `Loaded ${fullData.length} rows • Year range: ${minYear}–${maxYear} • Selected year: ${state.year}`;
}
