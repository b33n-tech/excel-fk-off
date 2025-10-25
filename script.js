let data = [];

document.getElementById("fileInput").addEventListener("change", handleFile);

function handleFile(e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  
  reader.onload = function(evt) {
    let workbook;
    if(file.name.endsWith(".csv")) {
      const text = evt.target.result;
      data = Papa.parse(text, {header: true}).data;
      populateColumns();
    } else {
      const ab = evt.target.result;
      workbook = XLSX.read(ab, {type: 'array'});
      const sheetName = workbook.SheetNames[0];
      data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      populateColumns();
    }
  };

  if(file.name.endsWith(".csv")) reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

// Remplit les selects avec les noms de colonnes
function populateColumns() {
  const cols = Object.keys(data[0]);
  const mainSelect = document.getElementById("mainCol");
  const subSelect = document.getElementById("subCol");
  mainSelect.innerHTML = "";
  subSelect.innerHTML = "";
  cols.forEach(c => {
    mainSelect.innerHTML += `<option value="${c}">${c}</option>`;
    subSelect.innerHTML += `<option value="${c}">${c}</option>`;
  });
}

document.getElementById("generateBtn").addEventListener("click", generatePivot);

function generatePivot() {
  const main = document.getElementById("mainCol").value;
  const sub = document.getElementById("subCol").value;

  // Création d'une structure pivot simple
  const pivot = {};
  data.forEach(row => {
    const mainVal = row[main] || "N/A";
    const subVal = row[sub] || "N/A";
    if(!pivot[mainVal]) pivot[mainVal] = {};
    pivot[mainVal][subVal] = (pivot[mainVal][subVal] || 0) + 1;
  });

  renderTable(pivot);
  renderChart(pivot);
}

function renderTable(pivot) {
  const container = document.getElementById("pivotTable");
  const allSubCols = Array.from(new Set([].concat(...Object.values(pivot).map(v => Object.keys(v)))));
  
  let html = "<table><thead><tr><th></th>";
  allSubCols.forEach(sc => html += `<th>${sc}</th>`);
  html += "</tr></thead><tbody>";

  Object.keys(pivot).forEach(mainKey => {
    html += `<tr><th>${mainKey}</th>`;
    allSubCols.forEach(subKey => {
      html += `<td>${pivot[mainKey][subKey] || 0}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

function renderChart(pivot) {
  const ctx = document.getElementById('pivotChart').getContext('2d');
  const allSubCols = Array.from(new Set([].concat(...Object.values(pivot).map(v => Object.keys(v)))));
  const labels = Object.keys(pivot);
  const datasets = allSubCols.map(sub => ({
    label: sub,
    data: labels.map(main => pivot[main][sub] || 0),
    backgroundColor: getRandomColor()
  }));

  if(window.chart) window.chart.destroy();
  window.chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: { responsive: true, plugins: { legend: { position: 'top' } } }
  });
}

function getRandomColor() {
  return '#' + Math.floor(Math.random()*16777215).toString(16);
}
