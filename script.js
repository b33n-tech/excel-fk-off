let data = [];

document.getElementById("fileInput").addEventListener("change", handleFile);

function handleFile(e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  
  reader.onload = function(evt) {
    if(file.name.endsWith(".csv")) {
      data = Papa.parse(evt.target.result, {header: true}).data;
      populateColumns();
    } else {
      const workbook = XLSX.read(evt.target.result, {type: 'array'});
      const sheetName = workbook.SheetNames[0];
      data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      populateColumns();
    }
  };

  if(file.name.endsWith(".csv")) reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

function populateColumns() {
  const cols = Object.keys(data[0]);
  for(let i=1; i<=4; i++) {
    const sel = document.getElementById(`level${i}`);
    sel.innerHTML = "";
    cols.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
  }
}

document.getElementById("generateBtn").addEventListener("click", generatePivot);

function generatePivot() {
  const levels = [
    document.getElementById("level1").value,
    document.getElementById("level2").value,
    document.getElementById("level3").value,
    document.getElementById("level4").value
  ].filter(l => l); // filtrer niveaux vides

  const pivot = buildPivot(data, levels);
  renderTable(pivot, levels);
  renderChart(pivot, levels);
}

// Construire le pivot récursif
function buildPivot(data, levels) {
  const pivot = {};
  data.forEach(row => {
    let node = pivot;
    levels.forEach((lvl, idx) => {
      const val = row[lvl] || "N/A";
      if(idx === levels.length - 1) {
        node[val] = (node[val] || 0) + 1;
      } else {
        if(!node[val]) node[val] = {};
        node = node[val];
      }
    });
  });
  return pivot;
}

// Rendu tableau récursif
function renderTable(pivot, levels) {
  const container = document.getElementById("pivotTable");
  container.innerHTML = "";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  function traverse(node, row = [], depth = 0) {
    if(typeof node === "number") {
      const tr = document.createElement("tr");
      row.forEach(val => {
        const td = document.createElement("td");
        td.textContent = val;
        tr.appendChild(td);
      });
      const td = document.createElement("td");
      td.textContent = node;
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      Object.keys(node).forEach(k => traverse(node[k], [...row, k], depth+1));
    }
  }

  traverse(pivot);

  const headerTr = document.createElement("tr");
  levels.forEach(l => {
    const th = document.createElement("th");
    th.textContent = l;
    headerTr.appendChild(th);
  });
  const thCount = document.createElement("th");
  thCount.textContent = "Count";
  headerTr.appendChild(thCount);
  thead.appendChild(headerTr);

  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);
}

// Rendu graphique avec color picker
function renderChart(pivot, levels) {
  const ctx = document.getElementById('pivotChart').getContext('2d');

  const datasetsObj = {};
  function flatten(node, path=[]) {
    if(typeof node === "number") {
      const key = path.slice(0, -1).join(" | ") || path[0];
      if(!datasetsObj[key]) datasetsObj[key] = {};
      datasetsObj[key][path[path.length-1]] = node;
    } else {
      Object.keys(node).forEach(k => flatten(node[k], [...path, k]));
    }
  }
  flatten(pivot);

  const labels = Object.keys(datasetsObj);
  const subKeys = Array.from(new Set([].concat(...Object.values(datasetsObj).map(d => Object.keys(d)))));

  // Générer color pickers
  renderColorPickers(subKeys);

  const chartDatasets = subKeys.map(sub => ({
    label: sub,
    data: labels.map(lbl => datasetsObj[lbl][sub] || 0),
    backgroundColor: subColors[sub] || getRandomColor()
  }));

  if(window.chart) window.chart.destroy();
  window.chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: chartDatasets },
    options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true } } }
  });
}

// Couleurs stockées par sous-colonne
const subColors = {};

function renderColorPickers(subKeys) {
  const container = document.getElementById("colorControls");
  container.innerHTML = "";

  subKeys.forEach(sub => {
    const label = document.createElement("label");
    label.textContent = sub;

    const input = document.createElement("input");
    input.type = "color";
    input.value = subColors[sub] || getRandomColor();
    subColors[sub] = input.value;

    input.addEventListener("input", () => {
      subColors[sub] = input.value;
      // mettre à jour couleur dataset
      const ds = window.chart.data.datasets.find(d => d.label === sub);
      if(ds) {
        ds.backgroundColor = input.value;
        window.chart.update();
      }
    });

    label.appendChild(input);
    container.appendChild(label);
  });
}

function getRandomColor() {
  return '#' + Math.floor(Math.random()*16777215).toString(16);
}
