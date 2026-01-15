console.log("SCRIPT OK ✅");

// show something on the page (not just console)
document.getElementById("debug").textContent = "script.js loaded ✅";

if (typeof d3 === "undefined") {
  console.error("D3 is NOT loaded ❌");
  document.getElementById("debug").textContent = "D3 not loaded ❌";
} else {
  console.log("D3 OK ✅");

  d3.csv("data/Life_Expectancy_Data.csv")
    .then(data => {
      console.log("CSV OK ✅ rows:", data.length);
      document.getElementById("debug").textContent =
        `CSV loaded ✅ rows: ${data.length}, cols: ${data.columns.length}`;
    })
    .catch(err => {
      console.error("CSV FAILED ❌", err);
      document.getElementById("debug").textContent =
        "CSV failed ❌ (check console for error)";
    });
}
