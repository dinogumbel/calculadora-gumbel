/* ============================================================
   CALCULADORA DE NORMALIDAD GUMBEL - LÓGICA DE APLICACIÓN
   ============================================================ */

// ============================================================
// ESTADO GLOBAL
// ============================================================
const state = {
  dataset: null,        // { columns: [{name, type, values[]}] }
  results: null,        // Resultados del análisis
  inputMode: 'matrix',  // 'matrix' | 'vector' | 'file'
  useCI: true,
  useBootstrap: true
};

// ============================================================
// i18n (solo español por ahora; estructura lista para quechua)
// ============================================================
const i18n = {
  es: {
    app_title: 'Calculadora de Normalidad Gumbel',
    app_subtitle: 'Instituto de Estadística Gumbel · Centro de Investigación El Poliedro',
    data_input_title: 'Entrada de Datos',
    tab_matrix: 'Pegar tabla',
    tab_vector: 'Pegar vector',
    tab_file: 'Archivo',
    hint_matrix: '💡 Primera fila = nombres de variables. Detecta comas, tabulaciones o espacios.',
    hint_vector: '💡 Separa valores con comas, espacios o saltos de línea.',
    opt_headers: 'Primera fila es encabezado',
    opt_sep: 'Separador:',
    sep_auto: 'Auto-detectar',
    vector_name: 'Nombre de la variable:',
    drop_text: 'Arrastra un archivo CSV o Excel aquí',
    drop_sub: 'o haz clic para seleccionar (.csv, .txt, .xlsx)',
    file_hint: '💡 El archivo debe tener encabezados en la primera fila.',
    btn_analyze: 'Analizar datos',
    btn_clear: 'Limpiar',
    btn_examples: 'Ejemplos',
    advanced_title: 'Opciones avanzadas',
    adv_group_var: 'Variable de agrupación:',
    adv_numeric_var: 'Variable numérica a comparar:',
    adv_none: '(ninguna)',
    btn_run_levene: 'Ejecutar Levene / Bartlett',
    btn_cite_big: 'Citar esta herramienta',
    actions_title: 'Acciones',
    btn_thesis: 'Resumen para tesis',
    btn_export: 'Exportar resultados',
    btn_recommend: '¿Qué prueba estadística uso?',
    btn_correlation: 'Matriz de correlación',
    btn_mardia: 'Mardia multivariante',
    options_title: 'Opciones',
    toggle_ci: 'Intervalos de confianza',
    toggle_bootstrap: 'Bootstrap (2000)',
    author_label: 'Desarrollado por:',
    cite_title: 'Citar esta herramienta',
    biblio_title: 'Bibliografía',
    thesis_title: 'Resumen para tesis',
    recommend_title: '¿Qué prueba estadística usar?',
    correlation_title: 'Matriz de correlación',
    mardia_title: 'Mardia multivariante',
    empty_title: 'Ingresa tus datos para comenzar',
    empty_desc: 'Pega una tabla con encabezados o un vector simple y pulsa "Analizar datos".'
  }
};

function t(key) {
  return (i18n.es && i18n.es[key]) || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n.es[key]) el.textContent = i18n.es[key];
  });
}

// ============================================================
// EJEMPLOS PRECARGADOS (formato matriz)
// ============================================================
const examplesData = {
  imc: {
    name: 'IMC de estudiantes',
    desc: '50 valores · distribución aproximadamente normal',
    matrix: `IMC
22.1
23.4
21.8
24.2
22.9
23.7
22.5
24.1
23.2
22.8
23.5
22.3
24.0
23.1
22.6
23.8
22.4
23.9
22.7
23.3
24.3
22.2
23.6
22.9
23.4
22.5
24.1
23.0
22.8
23.7
22.4
23.2
24.0
22.6
23.5
22.9
23.8
22.3
24.2
23.1
22.7
23.4
22.5
23.9
22.8
23.6
22.4
24.1
23.2
22.9`
  },
  nutricion: {
    name: 'Estudio nutricional (3 variables)',
    desc: '50 sujetos · IMC, Hemoglobina, Calorías',
    matrix: `IMC,Hemoglobina,Calorias
22.1,14.2,1850
23.4,13.8,2100
21.8,14.5,1950
24.2,13.5,2200
22.9,14.1,1900
23.7,13.9,2050
22.5,14.3,1980
24.1,13.7,2150
23.2,14.0,2000
22.8,13.6,1920
23.5,14.4,2080
22.3,13.3,1970
24.0,14.1,2180
23.1,13.8,2030
22.6,14.2,1940
23.8,13.5,2120
22.4,14.0,1990
23.9,13.9,2200
22.7,14.3,2010
23.3,13.4,1960
24.3,14.1,2090
22.2,13.7,1930
23.6,14.2,2160
22.9,13.8,2040
23.4,14.0,1980
22.5,13.6,2110
24.1,14.4,2020
23.0,13.5,1950
22.8,14.1,2170
23.7,13.9,2000
22.4,14.3,1940
23.2,13.4,2080
24.0,14.2,2030
22.6,13.8,1970
23.5,14.0,2140
22.9,13.6,2010
23.8,14.1,1990
22.3,14.4,2190
24.2,13.9,2050
23.1,13.7,1960`
  },
  proteinas: {
    name: 'Ingreso proteico (asimetría)',
    desc: '60 valores · distribución log-normal',
    matrix: `Proteinas
45
52
48
65
55
70
58
80
62
75
50
68
56
72
60
85
63
78
54
66
59
73
61
82
57
71
64
76
53
69
62
74
58
81
65
77
55
70
63
79
51
67
60
73
56
75
64
78
59
72
61
83
57
71
66
76
54
68
62
74`
  }
};

// ============================================================
// PARSER DE DATOS
// ============================================================
function detectSeparator(line) {
  if (line.includes('\t')) return '\t';
  if (line.includes(';')) return ';';
  if (line.includes(',')) return ',';
  // Si hay múltiples espacios, es separador espacio
  if (/\s{2,}/.test(line)) return 'multi-space';
  return /\s+/;
}

function parseValue(raw) {
  if (raw === null || raw === undefined) return NaN;
  const cleaned = String(raw).trim().replace(',', '.');
  if (cleaned === '' || cleaned === 'NA' || cleaned === 'NaN' || cleaned === '.') return NaN;
  const num = parseFloat(cleaned);
  return isNaN(num) ? cleaned : num; // devuelve string si no es número
}

function parseMatrix(text, hasHeaders = true, sepChoice = 'auto') {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return null;

  // Detectar separador
  let sep;
  if (sepChoice === 'auto') {
    sep = detectSeparator(lines[0]);
  } else {
    sep = {
      'tab': '\t',
      'comma': ',',
      'semicolon': ';',
      'space': ' '
    }[sepChoice] || /\s+/;
  }

  // Split de cada línea
  const splitLine = (line) => {
    if (sep === 'multi-space') return line.trim().split(/\s{2,}/);
    if (sep === ' ') return line.trim().split(/\s+/);
    return line.split(sep).map(c => c.trim());
  };

  // Encabezados
  let headers, dataLines;
  if (hasHeaders) {
    headers = splitLine(lines[0]);
    dataLines = lines.slice(1);
  } else {
    const firstRow = splitLine(lines[0]);
    headers = firstRow.map((_, i) => `Var${i + 1}`);
    dataLines = lines;
  }

  // Convertir a columnas
  const nCols = headers.length;
  const columns = headers.map(name => ({ name: name.trim() || 'SinNombre', values: [] }));

  dataLines.forEach(line => {
    const cells = splitLine(line);
    for (let i = 0; i < nCols; i++) {
      const v = parseValue(cells[i]);
      columns[i].values.push(v);
    }
  });

  // Detectar tipo de cada columna
  columns.forEach(col => {
    const numeric = col.values.filter(v => typeof v === 'number' && !isNaN(v));
    col.type = (numeric.length / col.values.length) > 0.8 ? 'numeric' : 'categorical';
  });

  return { columns };
}

function parseVector(text, name = 'Vector') {
  const tokens = text.split(/[\s,;\t\n]+/).filter(t => t.trim() !== '');
  const values = tokens.map(parseValue);
  return {
    columns: [{
      name: name,
      type: 'numeric',
      values: values
    }]
  };
}

// ============================================================
// API: LLAMADAS AL BACKEND
// ============================================================
async function checkConnection() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/health`, { method: 'GET' });
    if (!res.ok) throw new Error('No OK');
    updateConnectionStatus(true);
    return true;
  } catch (e) {
    updateConnectionStatus(false);
    return false;
  }
}

function updateConnectionStatus(online) {
  const el = document.getElementById('conn-status');
  const label = document.getElementById('conn-label');
  if (online) {
    el.className = 'conn-status online';
    label.textContent = 'Conectado';
  } else {
    el.className = 'conn-status offline';
    label.textContent = 'Sin conexión';
  }
}

async function apiCall(endpoint, payload) {
  const res = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${endpoint} → ${res.status}: ${errText}`);
  }
  return res.json();
}

async function analyzeVariableAPI(name, data) {
  return apiCall('/analyze/variable', { name, data });
}

async function analyzeMultipleAPI(vars) {
  return apiCall('/analyze/multiple', { variables: vars });
}

async function correlationAPI(matrix, method = 'pearson') {
  return apiCall('/correlation', { matrix, method });
}

async function leveneAPI(groups) {
  return apiCall('/levene', { groups });
}

async function bartlettAPI(groups) {
  return apiCall('/bartlett', { groups });
}

async function mardiaAPI(matrix) {
  return apiCall('/mardia', { matrix });
}

// ============================================================
// UTILIDADES DE FORMATO
// ============================================================
function fmt(x, decimals = 4) {
  if (x === null || x === undefined) return '—';
  if (typeof x !== 'number') return String(x);
  if (!isFinite(x)) return '∞';
  return x.toFixed(decimals);
}

function fmtP(p) {
  if (p === null || p === undefined) return '—';
  if (p < 0.001) return '< 0.001';
  return p.toFixed(3);
}

function classifyP(p, alpha = 0.05) {
  if (p === null || p === undefined) return 'gray';
  return p > alpha ? 'green' : 'red';
}

// ============================================================
// UI: EVENT LISTENERS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  renderExamplesMenu();
  renderBibliography();
  setupInputTabs();
  setupEventListeners();
  checkConnection();
  // Re-verificar conexión cada 30 segundos
  setInterval(checkConnection, 30000);
});

function setupInputTabs() {
  document.querySelectorAll('.input-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.input-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.inputMode;
      state.inputMode = mode;
      document.getElementById('mode-matrix').classList.toggle('hidden', mode !== 'matrix');
      document.getElementById('mode-vector').classList.toggle('hidden', mode !== 'vector');
      document.getElementById('mode-file').classList.toggle('hidden', mode !== 'file');
    });
  });
}

function setupEventListeners() {
  // Analizar
  document.getElementById('btn-analyze').addEventListener('click', handleAnalyze);

  // Limpiar
  document.getElementById('btn-clear').addEventListener('click', handleClear);

  // Ejemplos
  document.getElementById('btn-examples').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('examples-menu').classList.toggle('show');
  });
  document.addEventListener('click', () => {
    document.getElementById('examples-menu').classList.remove('show');
  });

  // Opciones avanzadas
  document.getElementById('advanced-toggle').addEventListener('click', () => {
    document.getElementById('advanced-section').classList.toggle('open');
  });

  // Ejecutar Levene/Bartlett
  document.getElementById('btn-run-homoscedasticity').addEventListener('click', handleHomoscedasticity);

  // Citar
  document.getElementById('btn-cite').addEventListener('click', () => {
    generateCitation('apa');
    openModal('modal-cite');
  });

  // Bibliografía
  document.getElementById('btn-biblio').addEventListener('click', () => openModal('modal-biblio'));

  // Cerrar modales
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.modal-overlay').classList.remove('show');
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('show');
    });
  });

  // Tabs de cita
  document.querySelectorAll('.cite-tab[data-cite-format]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cite-tab[data-cite-format]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      generateCitation(tab.dataset.citeFormat);
    });
  });

  // Toggles
  document.getElementById('toggle-ci').addEventListener('click', function() {
    this.classList.toggle('active');
    state.useCI = this.classList.contains('active');
  });
  document.getElementById('toggle-bootstrap').addEventListener('click', function() {
    this.classList.toggle('active');
    state.useBootstrap = this.classList.contains('active');
  });

  // Dropzone
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
  });
}

// ============================================================
// MANEJO DE ARCHIVOS
// ============================================================
function handleFile(file) {
  const info = document.getElementById('file-info');
  info.textContent = `📎 Cargando: ${file.name}...`;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      let text;
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        text = XLSX.utils.sheet_to_csv(sheet, { FS: ',' });
      } else {
        text = e.target.result;
      }
      document.getElementById('data-input-matrix').value = text;
      info.textContent = `✅ ${file.name} cargado (${text.split('\n').length} líneas)`;
      // Cambiar a modo matriz
      document.querySelector('.input-tab[data-input-mode="matrix"]').click();
    } catch (err) {
      info.textContent = `❌ Error al leer archivo: ${err.message}`;
    }
  };

  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file);
  }
}

// ============================================================
// ANÁLISIS PRINCIPAL
// ============================================================
async function handleAnalyze() {
  const btn = document.getElementById('btn-analyze');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span><span>Analizando...</span>';

  try {
    // Parsear según el modo
    let dataset;
    if (state.inputMode === 'matrix' || state.inputMode === 'file') {
      const text = document.getElementById('data-input-matrix').value;
      const hasHeaders = document.getElementById('chk-headers').checked;
      const sepChoice = document.getElementById('sel-sep').value;
      dataset = parseMatrix(text, hasHeaders, sepChoice);
    } else {
      const text = document.getElementById('data-input-vector').value;
      const name = document.getElementById('sel-vector-name').value || 'Vector';
      dataset = parseVector(text, name);
    }

    if (!dataset || dataset.columns.length === 0) {
      alert('No se detectaron datos válidos. Revisa el formato.');
      return;
    }

    state.dataset = dataset;

    // Filtrar columnas numéricas
    const numericCols = dataset.columns.filter(c => c.type === 'numeric');

    if (numericCols.length === 0) {
      alert('No se detectaron columnas numéricas.');
      return;
    }

    // Llamar API
    const vars = numericCols.map(c => ({
      name: c.name,
      data: c.values.filter(v => typeof v === 'number' && !isNaN(v))
    }));

    const results = await analyzeMultipleAPI(vars);
    state.results = results.results;

    // Actualizar dropdowns de variables
    updateVariableDropdowns(dataset.columns);

    // Renderizar
    renderSummaryTable(results.results);
    renderRecommendation();

  } catch (err) {
    console.error(err);
    alert('Error al analizar:\n' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>📊</span><span>Analizar datos</span>';
  }
}

function handleClear() {
  document.getElementById('data-input-matrix').value = '';
  document.getElementById('data-input-vector').value = '';
  document.getElementById('file-info').textContent = '';
  document.getElementById('results-container').innerHTML = `
    <div class="panel empty-state">
      <div class="empty-icon">📊</div>
      <h3>${t('empty_title')}</h3>
      <p>${t('empty_desc')}</p>
    </div>
  `;
  state.dataset = null;
  state.results = null;
}

// ============================================================
// RENDERIZADO
// ============================================================
function renderSummaryTable(results) {
  const container = document.getElementById('results-container');

  const rows = Object.entries(results).map(([name, r]) => {
    if (r.error) {
      return `<tr><td class="var-name">${name}</td><td colspan="8" style="color:var(--danger);">${r.error}</td></tr>`;
    }
    const d = r.descriptive;
    const sk = r.skewness_kurtosis;
    const sw = r.normality.shapiro_wilk;
    const ad = r.normality.anderson_darling;

    const swColor = sw.error ? 'gray' : classifyP(sw.p);
    const adColor = ad.error ? 'gray' : classifyP(ad.p);

    return `
      <tr data-var="${name}">
        <td class="var-name">${name}</td>
        <td>${d.n}</td>
        <td>${fmt(d.mean, 3)}</td>
        <td>${fmt(d.std, 3)}</td>
        <td>${fmt(sk.skewness, 3)}</td>
        <td>${fmt(sk.kurtosis, 3)}</td>
        <td><span class="tag ${swColor}">${fmtP(sw.p)}</span></td>
        <td><span class="tag ${adColor}">${fmtP(ad.p)}</span></td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="section-card">
      <div class="section-header">
        <div class="section-title"><span>📋</span> Resumen de análisis (${Object.keys(results).length} variables)</div>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
        Haz clic en una fila para ver el análisis detallado de esa variable.
      </p>
      <table class="summary-table">
        <thead>
          <tr>
            <th>Variable</th>
            <th>N</th>
            <th>Media</th>
            <th>DE</th>
            <th>Asim.</th>
            <th>Curt.</th>
            <th>SW (p)</th>
            <th>AD (p)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div id="detail-container"></div>
    </div>
  `;

  // Event listener para expandir
  container.querySelectorAll('tr[data-var]').forEach(tr => {
    tr.addEventListener('click', () => toggleDetail(tr.dataset.var, tr));
  });
}

function toggleDetail(varName, tr) {
  const detailContainer = document.getElementById('detail-container');
  const alreadyExpanded = tr.classList.contains('expanded');

  // Cerrar todos
  document.querySelectorAll('.summary-table tbody tr').forEach(r => r.classList.remove('expanded'));
  detailContainer.innerHTML = '';

  if (alreadyExpanded) return;

  tr.classList.add('expanded');
  const r = state.results[varName];
  if (!r || r.error) return;

    detailContainer.innerHTML = renderVariableDetail(varName, r);

  // Buscar la columna original para obtener los valores crudos
  const column = state.dataset.columns.find(c => c.name === varName);
  if (column) {
    setTimeout(() => renderCharts(varName, column.values), 50);
  }
}

function renderVariableDetail(name, r) {
  const d = r.descriptive;
  const sk = r.skewness_kurtosis;
  const n = r.normality;

  const renderTest = (key, test, isRec) => {
    if (test.error) {
      return `<div class="test-card"><div class="test-name">${key}</div><div style="color:var(--danger);font-size:0.8rem;">${test.error}</div></div>`;
    }
    const pColor = classifyP(test.p);
    const interp = test.p > CONFIG.ALPHA ? '✓ No se rechaza normalidad' : '✗ Se rechaza normalidad';
    const stat = test.W ?? test.D ?? test.A2 ?? test.K2 ?? test.JB ?? '—';
    return `
      <div class="test-card ${isRec ? 'recommended' : ''}">
        <div class="test-name">${key}</div>
        <div class="test-result">
          <div>Estadístico: <strong>${fmt(stat, 4)}</strong></div>
          <div>p-valor: <span class="p-value ${pColor === 'green' ? 'success' : 'danger'}">${fmtP(test.p)}</span></div>
          <div class="interpretation">${interp} (α=${CONFIG.ALPHA})</div>
        </div>
      </div>
    `;
  };

  const swContainsZero = sk.skewness_ci[0] <= 0 && sk.skewness_ci[1] >= 0;
  const kurtContainsZero = sk.kurtosis_ci[0] <= 0 && sk.kurtosis_ci[1] >= 0;
  const swColor = swContainsZero ? 'green' : 'yellow';
  const kurtColor = kurtContainsZero ? 'green' : 'yellow';
  const swText = swContainsZero ? 'Contiene 0 → compatible con normalidad' : 'No contiene 0 → desviación';
  const kurtText = kurtContainsZero ? 'Contiene 0 → compatible con normalidad' : 'No contiene 0 → desviación';

  return `
    <div class="detail-panel">
      <h4>📊 Estadísticos descriptivos</h4>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">N</div><div class="stat-value">${d.n}</div></div>
        <div class="stat-card"><div class="stat-label">Media</div><div class="stat-value">${fmt(d.mean, 4)}</div></div>
        <div class="stat-card"><div class="stat-label">Mediana</div><div class="stat-value">${fmt(d.median, 4)}</div></div>
        <div class="stat-card"><div class="stat-label">DE</div><div class="stat-value">${fmt(d.std, 4)}</div></div>
        <div class="stat-card"><div class="stat-label">Varianza</div><div class="stat-value">${fmt(d.variance, 4)}</div></div>
        <div class="stat-card"><div class="stat-label">Mín</div><div class="stat-value">${fmt(d.min, 4)}</div></div>
        <div class="stat-card"><div class="stat-label">Máx</div><div class="stat-value">${fmt(d.max, 4)}</div></div>
        <div class="stat-card"><div class="stat-label">IQR</div><div class="stat-value">${fmt(d.iqr, 4)}</div></div>
      </div>

      <h4>📐 Asimetría y curtosis (con IC bootstrap 95%)</h4>
                      <div class="stat-card">
          <div class="stat-label">Asimetría</div>
          <div class="stat-value">${fmt(sk.skewness, 4)}</div>
          <div class="traffic-light ${swColor}"><span class="dot"></span>IC: [${fmt(sk.skewness_ci[0], 3)}, ${fmt(sk.skewness_ci[1], 3)}]</div>
          <div style="font-size:0.68rem;color:var(--text-muted);margin-top:0.3rem;">${swText}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Curtosis</div>
          <div class="stat-value">${fmt(sk.kurtosis, 4)}</div>
          <div class="traffic-light ${kurtColor}"><span class="dot"></span>IC: [${fmt(sk.kurtosis_ci[0], 3)}, ${fmt(sk.kurtosis_ci[1], 3)}]</div>
          <div style="font-size:0.68rem;color:var(--text-muted);margin-top:0.3rem;">${kurtText}</div>
          <div style="font-size:0.68rem;color:var(--text-muted);margin-top:0.3rem;">${kurtText}</div>
        </div>

      <h4>🔬 Pruebas de normalidad</h4>
      <div class="tests-grid">
        ${renderTest('Shapiro-Wilk', n.shapiro_wilk, r.recommended_test.test === 'shapiro_wilk')}
        ${renderTest('Anderson-Darling', n.anderson_darling, r.recommended_test.test === 'anderson_darling')}
        ${renderTest('Lilliefors (KS)', n.lilliefors, false)}
        ${renderTest("D'Agostino-Pearson", n.dagostino_pearson, false)}
        ${renderTest('Jarque-Bera', n.jarque_bera, false)}
      </div>

      <h4>🎯 Prueba recomendada</h4>
      <div class="tutor-message">
        <strong>${r.recommended_test.test.replace(/_/g, ' ').toUpperCase()}</strong><br>
        ${r.recommended_test.reason}
      </div>

      <h4>📈 Visualizaciones</h4>
      <div class="charts-grid" id="charts-${name.replace(/[^a-zA-Z0-9]/g, '_')}">
        <div class="chart-container" id="chart-hist-${name.replace(/[^a-zA-Z0-9]/g, '_')}"></div>
        <div class="chart-container" id="chart-qq-${name.replace(/[^a-zA-Z0-9]/g, '_')}"></div>
        <div class="chart-container" id="chart-pp-${name.replace(/[^a-zA-Z0-9]/g, '_')}"></div>
        <div class="chart-container" id="chart-box-${name.replace(/[^a-zA-Z0-9]/g, '_')}"></div>
        <div class="chart-container chart-full" id="chart-violin-${name.replace(/[^a-zA-Z0-9]/g, '_')}"></div>
      </div>
    </div>
  `;
}

function renderRecommendation() {
  // Se llenará cuando se pulse el botón
}

// ============================================================
// MENÚ DE EJEMPLOS
// ============================================================
function renderExamplesMenu() {
  const menu = document.getElementById('examples-menu');
  menu.innerHTML = '';
  Object.entries(examplesData).forEach(([key, ex]) => {
    const item = document.createElement('div');
    item.className = 'example-item';
    item.innerHTML = `
      <div class="ex-name">${ex.name}</div>
      <div class="ex-desc">${ex.desc}</div>
    `;
    item.addEventListener('click', () => {
      document.getElementById('data-input-matrix').value = ex.matrix;
      menu.classList.remove('show');
      document.querySelector('.input-tab[data-input-mode="matrix"]').click();
    });
    menu.appendChild(item);
  });
}

// ============================================================
// BIBLIOGRAFÍA
// ============================================================
const bibliography = [
  { type: 'paper', text: 'Shapiro, S. S., & Wilk, M. B. (1965). An analysis of variance test for normality (complete samples). Biometrika, 52(3-4), 591-611.' },
  { type: 'paper', text: 'Anderson, T. W., & Darling, D. A. (1952). Asymptotic theory of certain "goodness-of-fit" criteria based on stochastic processes. Annals of Mathematical Statistics, 23(2), 193-212.' },
  { type: 'paper', text: "D'Agostino, R. B., & Pearson, E. S. (1973). Tests for departure from normality. Biometrika, 60(3), 613-622." },
  { type: 'paper', text: 'Lilliefors, H. W. (1967). On the Kolmogorov-Smirnov test for normality with mean and variance unknown. JASA, 62(318), 399-402.' },
  { type: 'paper', text: 'Levene, H. (1960). Robust tests for equality of variances. In Contributions to Probability and Statistics (pp. 278-292). Stanford University Press.' },
  { type: 'paper', text: 'Bartlett, M. S. (1937). Properties of sufficiency and statistical tests. Proc. Royal Society A, 160(901), 268-282.' },
  { type: 'paper', text: 'Royston, P. (1995). Remark AS R94: A remark on Algorithm AS 181: The W-test for normality. Applied Statistics, 44, 547-551.' },
  { type: 'paper', text: 'Iglewicz, B., & Hoaglin, D. C. (1993). How to detect and handle outliers. ASQC Quality Press.' },
  { type: 'paper', text: 'Mardia, K. V. (1970). Measures of multivariate skewness and kurtosis with applications. Biometrika, 57(3), 519-530.' },
  { type: 'book', text: 'Field, A. (2018). Discovering Statistics Using IBM SPSS Statistics (5th ed.). SAGE Publications.' }
];

function renderBibliography() {
  const list = document.getElementById('biblio-list');
  list.innerHTML = '';
  bibliography.forEach(item => {
    const li = document.createElement('li');
    li.className = 'biblio-item';
    const typeLabel = item.type === 'paper' ? 'Artículo' : 'Libro';
    li.innerHTML = `<span class="bib-type">${typeLabel}</span>${item.text}`;
    list.appendChild(li);
  });
}

// ============================================================
// CITACIÓN
// ============================================================
function generateCitation(format) {
  const today = new Date();
  const accessDate = today.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const year = CONFIG.TOOL_YEAR;
  const url = CONFIG.URL;
  const doi = CONFIG.DOI ? ` https://doi.org/${CONFIG.DOI}` : '';

  const citations = {
    apa: `${CONFIG.AUTHOR_SHORT} (${year}). ${CONFIG.TOOL_NAME}. ${CONFIG.INSTITUTION}, ${CONFIG.INSTITUTE}. ${url}${doi}`,
    mla: `${CONFIG.AUTHOR_NAME}. "${CONFIG.TOOL_NAME}." ${CONFIG.INSTITUTION}, ${CONFIG.INSTITUTE}, ${year}, ${url}. Consultado el ${accessDate}.`,
    chicago: `${CONFIG.AUTHOR_NAME}. ${year}. "${CONFIG.TOOL_NAME}." ${CONFIG.INSTITUTION}, ${CONFIG.INSTITUTE}. ${url}.`,
    harvard: `${CONFIG.AUTHOR_SHORT} (${year}). ${CONFIG.TOOL_NAME}. ${CONFIG.INSTITUTION}, ${CONFIG.INSTITUTE}. Disponible en: ${url} [Consultado el ${accessDate}].`,
    vancouver: `${CONFIG.AUTHOR_VANCOUVER}. ${CONFIG.TOOL_NAME} [Internet]. ${CONFIG.INSTITUTION}, ${CONFIG.INSTITUTE}; ${year} [citado el ${accessDate}]. Disponible en: ${url}`,
    bibtex: `@misc{castro${year}gumbel,
  author = {Castro Mattos, Miguel Angel},
  title = {${CONFIG.TOOL_NAME}},
  year = {${year}},
  publisher = {${CONFIG.INSTITUTION} - ${CONFIG.INSTITUTE}},
  url = {${url}},
  note = {Consultado el ${accessDate}}
}`
  };

  const content = document.getElementById('cite-content');
  content.innerHTML = `
    ${citations[format]}
    <button class="cite-copy-btn" onclick="copyCitation(this)">
      <span>📋</span><span>Copiar</span>
    </button>
  `;
}

function copyCitation(btn) {
  const text = btn.parentElement.textContent.replace('📋 Copiar', '').trim();
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied');
    btn.innerHTML = '<span>✓</span><span>¡Copiado!</span>';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '<span>📋</span><span>Copiar</span>';
    }, 2000);
  });
}

// ============================================================
// MODALES
// ============================================================
function openModal(id) {
  document.getElementById(id).classList.add('show');
}

// ============================================================
// VARIABLES DROPDOWN (Levene/Bartlett)
// ============================================================
function updateVariableDropdowns(columns) {
  const groupSel = document.getElementById('sel-group-var');
  const numSel = document.getElementById('sel-numeric-var');
  groupSel.innerHTML = '<option value="">(ninguna)</option>';
  numSel.innerHTML = '<option value="">(ninguna)</option>';

  columns.forEach((col, idx) => {
    if (col.type === 'categorical') {
      groupSel.innerHTML += `<option value="${idx}">${col.name}</option>`;
    } else {
      numSel.innerHTML += `<option value="${idx}">${col.name}</option>`;
    }
  });
}

// ============================================================
// HOMOCEDASTICIDAD
// ============================================================
async function handleHomoscedasticity() {
  const groupIdx = document.getElementById('sel-group-var').value;
  const numIdx = document.getElementById('sel-numeric-var').value;

  if (groupIdx === '' || numIdx === '') {
    alert('Selecciona una variable de agrupación y una variable numérica.');
    return;
  }

  const groupCol = state.dataset.columns[parseInt(groupIdx)];
  const numCol = state.dataset.columns[parseInt(numIdx)];

  // Agrupar valores
  const groupsMap = {};
  groupCol.values.forEach((g, i) => {
    const nv = numCol.values[i];
    if (typeof nv !== 'number' || isNaN(nv)) return;
    if (!groupsMap[g]) groupsMap[g] = [];
    groupsMap[g].push(nv);
  });

  const groups = Object.values(groupsMap).filter(g => g.length >= 2);
  if (groups.length < 2) {
    alert('Se necesitan al menos 2 grupos con datos numéricos.');
    return;
  }

  try {
    const lev = await leveneAPI(groups);
    const bar = await bartlettAPI(groups);

    const container = document.getElementById('results-container');
    const card = document.createElement('div');
    card.className = 'section-card';
    card.innerHTML = `
      <div class="section-header">
        <div class="section-title"><span>⚖️</span> Homocedasticidad</div>
      </div>
      <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem;">
        Variable: <strong>${numCol.name}</strong> · Agrupada por: <strong>${groupCol.name}</strong>
      </p>
      <div class="tests-grid">
        <div class="test-card">
          <div class="test-name">Levene (media)</div>
          <div class="test-result">
            <div>W: <strong>${fmt(lev.levene.W, 4)}</strong></div>
            <div>p: <span class="p-value ${classifyP(lev.levene.p) === 'green' ? 'success' : 'danger'}">${fmtP(lev.levene.p)}</span></div>
            <div class="interpretation">${lev.levene.p > CONFIG.ALPHA ? '✓ Varianzas iguales' : '✗ Varianzas distintas'}</div>
          </div>
        </div>
        <div class="test-card">
          <div class="test-name">Brown-Forsythe (mediana)</div>
          <div class="test-result">
            <div>W: <strong>${fmt(lev.brown_forsythe.W, 4)}</strong></div>
            <div>p: <span class="p-value ${classifyP(lev.brown_forsythe.p) === 'green' ? 'success' : 'danger'}">${fmtP(lev.brown_forsythe.p)}</span></div>
            <div class="interpretation">${lev.brown_forsythe.p > CONFIG.ALPHA ? '✓ Varianzas iguales' : '✗ Varianzas distintas'}</div>
          </div>
        </div>
        <div class="test-card">
          <div class="test-name">Bartlett</div>
          <div class="test-result">
            <div>T: <strong>${fmt(bar.T, 4)}</strong></div>
            <div>p: <span class="p-value ${classifyP(bar.p) === 'green' ? 'success' : 'danger'}">${fmtP(bar.p)}</span></div>
            <div class="interpretation">${bar.p > CONFIG.ALPHA ? '✓ Varianzas iguales' : '✗ Varianzas distintas'}</div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  } catch (err) {
    alert('Error en homocedasticidad: ' + err.message);
  }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
console.log(`${CONFIG.TOOL_NAME} v${CONFIG.TOOL_VERSION} - Cargado correctamente.`);
console.log(`Backend: ${CONFIG.API_BASE_URL}`);
// ============================================================
// GRÁFICOS CON PLOTLY
// ============================================================
const plotlyLayout = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(15, 23, 42, 0.4)',
  font: { color: '#94a3b8', family: 'Inter, sans-serif', size: 13 },
  margin: { t: 55, r: 30, b: 65, l: 70 },
  xaxis: {
    gridcolor: '#2d3a52',
    zerolinecolor: '#3b4a6b',
    linecolor: '#3b4a6b',
    tickfont: { size: 12, color: '#cbd5e1' },
    title: { font: { size: 14, color: '#94a3b8' } }
  },
  yaxis: {
    gridcolor: '#2d3a52',
    zerolinecolor: '#3b4a6b',
    linecolor: '#3b4a6b',
    tickfont: { size: 12, color: '#cbd5e1' },
    title: { font: { size: 14, color: '#94a3b8' } }
  },
  showlegend: true,
  legend: {
    font: { size: 12, color: '#e2e8f0' },
    bgcolor: 'rgba(30,41,59,0.6)',
    bordercolor: '#2d3a52',
    borderwidth: 1
  },
  title: { font: { size: 16, color: '#f1f5f9' } }
};
const plotlyLayoutLight = {
  paper_bgcolor: '#ffffff',
  plot_bgcolor: '#ffffff',
  font: { color: '#1a1a1a', family: 'Inter, sans-serif', size: 13 },
  margin: { t: 55, r: 30, b: 65, l: 70 },
  xaxis: {
    gridcolor: '#d0d0d0',
    zerolinecolor: '#999999',
    linecolor: '#666666',
    tickfont: { size: 12, color: '#333333' },
    title: { font: { size: 14, color: '#1a1a1a' } }
  },
  yaxis: {
    gridcolor: '#d0d0d0',
    zerolinecolor: '#999999',
    linecolor: '#666666',
    tickfont: { size: 12, color: '#333333' },
    title: { font: { size: 14, color: '#1a1a1a' } }
  },
  showlegend: true,
  legend: {
    font: { size: 12, color: '#1a1a1a' },
    bgcolor: 'rgba(245, 245, 245, 0.9)',
    bordercolor: '#cccccc',
    borderwidth: 1
  },
  title: { font: { size: 16, color: '#1a1a1a' } }
};

const plotlyConfig = { responsive: true, displayModeBar: false };

// Función auxiliar: inversa de la normal estándar (Beasley-Springer-Moro)
function normalInv(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
             3.754408661907416e+00];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

// CDF normal estándar
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

function renderCharts(varName, values) {
  const safeId = varName.replace(/[^a-zA-Z0-9]/g, '_');
  const data = values.filter(v => typeof v === 'number' && !isNaN(v));
  const n = data.length;
  if (n < 3) return;

  const sorted = [...data].sort((a, b) => a - b);
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const variance = data.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);

  // --- 1. Histograma + curva normal ---
  const nbins = Math.max(8, Math.ceil(Math.sqrt(n)));
  const minV = sorted[0];
  const maxV = sorted[n - 1];
  const binWidth = (maxV - minV) / nbins;

  const histTrace = {
    x: data,
    type: 'histogram',
    name: 'Datos',
    marker: { color: '#6366f1', opacity: 0.7, line: { color: '#818cf8', width: 1 } },
    nbinsx: nbins,
    histnorm: 'probability density'
  };

  // Curva normal teórica
  const xRange = [minV - std, maxV + std];
  const step = (xRange[1] - xRange[0]) / 200;
  const xNorm = [], yNorm = [];
  for (let x = xRange[0]; x <= xRange[1]; x += step) {
    xNorm.push(x);
    yNorm.push((1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2)));
  }
  const normTrace = {
    x: xNorm, y: yNorm,
    type: 'scatter', mode: 'lines',
    name: 'Normal teórica',
    line: { color: '#06b6d4', width: 2.5 }
  };

  Plotly.newPlot(`chart-hist-${safeId}`, [histTrace, normTrace], {
    ...plotlyLayout,
    title: '📊 Histograma + Curva Normal',
    barmode: 'overlay',
    yaxis: { ...plotlyLayout.yaxis, title: 'Densidad' },
    xaxis: { ...plotlyLayout.xaxis, title: varName }
  }, plotlyConfig);

  // --- 2. QQ-plot ---
  const qqX = [], qqY = [];
  for (let i = 0; i < n; i++) {
    const p = (i + 1 - 0.375) / (n + 0.25);
    qqX.push(normalInv(p));
    qqY.push(sorted[i]);
  }
  const qqTrace = {
    x: qqX, y: qqY,
    mode: 'markers',
    name: 'Cuantiles',
    marker: { color: '#8b5cf6', size: 7, line: { color: '#a78bfa', width: 1 } }
  };
  // Línea de referencia
  const qqLineX = [qqX[0], qqX[n - 1]];
  const qqLineY = [mean + std * qqX[0], mean + std * qqX[n - 1]];
  const qqLineTrace = {
    x: qqLineX, y: qqLineY,
    mode: 'lines',
    name: 'Referencia',
    line: { color: '#ef4444', dash: 'dash', width: 2 }
  };

  Plotly.newPlot(`chart-qq-${safeId}`, [qqTrace, qqLineTrace], {
    ...plotlyLayout,
    title: '📐 QQ-Plot',
    xaxis: { ...plotlyLayout.xaxis, title: 'Cuantiles teóricos (z)' },
    yaxis: { ...plotlyLayout.yaxis, title: 'Cuantiles muestrales' }
  }, plotlyConfig);

  // --- 3. PP-plot ---
  const ppX = [], ppY = [];
  for (let i = 0; i < n; i++) {
    ppX.push(normalCDF((sorted[i] - mean) / std));
    ppY.push((i + 1 - 0.5) / n);
  }
  const ppTrace = {
    x: ppX, y: ppY,
    mode: 'markers',
    name: 'PP',
    marker: { color: '#10b981', size: 6 }
  };
  const ppLineTrace = {
    x: [0, 1], y: [0, 1],
    mode: 'lines',
    name: 'Referencia',
    line: { color: '#ef4444', dash: 'dash', width: 2 }
  };

  Plotly.newPlot(`chart-pp-${safeId}`, [ppTrace, ppLineTrace], {
    ...plotlyLayout,
    title: '📉 PP-Plot',
    xaxis: { ...plotlyLayout.xaxis, title: 'CDF teórica', range: [0, 1] },
    yaxis: { ...plotlyLayout.yaxis, title: 'CDF empírica', range: [0, 1] }
  }, plotlyConfig);

  // --- 4. Boxplot ---
  const boxTrace = {
    y: data,
    type: 'box',
    name: varName,
    marker: { color: '#f59e0b' },
    boxpoints: 'outliers',
    line: { color: '#fb923c' },
    fillcolor: 'rgba(245, 158, 11, 0.3)'
  };

  Plotly.newPlot(`chart-box-${safeId}`, [boxTrace], {
    ...plotlyLayout,
    title: '📦 Boxplot',
    yaxis: { ...plotlyLayout.yaxis, title: varName },
    showlegend: false
  }, plotlyConfig);

  // --- 5. Violin plot ---
  const violinTrace = {
    y: data,
    type: 'violin',
    name: varName,
    marker: { color: '#6366f1' },
    line: { color: '#818cf8' },
    fillcolor: 'rgba(99, 102, 241, 0.3)',
    box: { visible: true, fillcolor: 'rgba(139, 92, 246, 0.5)' },
    meanline: { visible: true, color: '#06b6d4' },
    points: 'outliers',
    pointpos: 0
  };

  Plotly.newPlot(`chart-violin-${safeId}`, [violinTrace], {
    ...plotlyLayout,
    title: '🎻 Violin Plot (con box interno y media)',
    yaxis: { ...plotlyLayout.yaxis, title: varName },
    showlegend: false
  }, plotlyConfig);
    // Hacer los gráficos clicables para descargar
  setTimeout(() => {
    const safeName = varName.replace(/[^a-zA-Z0-9]/g, '_');
    makeChartDownloadable(`chart-hist-${safeName}`, `${varName}_histograma`);
    makeChartDownloadable(`chart-qq-${safeName}`, `${varName}_QQplot`);
    makeChartDownloadable(`chart-pp-${safeName}`, `${varName}_PPplot`);
    makeChartDownloadable(`chart-box-${safeName}`, `${varName}_boxplot`);
    makeChartDownloadable(`chart-violin-${safeName}`, `${varName}_violin`);
  }, 150);
}
// ============================================================
// DESCARGA DE GRÁFICOS
// ============================================================
function makeChartDownloadable(chartId, filename) {
  const chart = document.getElementById(chartId);
  if (!chart) return;

  // Estilo cursor pointer
  chart.style.cursor = 'pointer';
  chart.title = 'Clic para descargar como PNG';

  // Tooltip pequeño
  const tooltip = document.createElement('div');
  tooltip.style.cssText = `
    position: absolute;
    top: 8px;
    left: 8px;
    background: rgba(99, 102, 241, 0.9);
    color: white;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 600;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    z-index: 10;
  `;
  tooltip.textContent = '📷 Clic para descargar';
  chart.style.position = 'relative';
  chart.appendChild(tooltip);

  chart.addEventListener('mouseenter', () => tooltip.style.opacity = '1');
  chart.addEventListener('mouseleave', () => tooltip.style.opacity = '0');

  chart.addEventListener('click', () => {
       Plotly.downloadImage(chart, {
      format: 'png',
      width: 1600,
      height: 1000,
      scale: 2,
      filename: filename
    });
  });
}

// ============================================================
// EXPORTACIÓN DE RESULTADOS (WORD + CSV + GRÁFICOS + ZIP)
// ============================================================
async function exportResults() {
  const btn = document.getElementById('btn-export-results');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="action-icon">⏳</span><span>Generando...</span>';

  try {
    if (!state.results || !state.dataset) {
      alert('Primero debes analizar datos antes de exportar.');
      return;
    }

    // 1. Generar CSV
    const csvContent = generateCSV(state.results);

    // 2. Generar Word
    const wordBlob = await generateWord(state.results, state.dataset);

    // 3. Generar los gráficos como PNGs
    const charts = await generateAllChartsAsPNG();

    // 4. Empaquetar todo en ZIP
    const zip = new JSZip();

    // CSV
    zip.file('resultados.csv', csvContent);

    // Word
    zip.file('Informe_Normalidad.docx', wordBlob);

    // Carpeta de gráficos
    const graficosFolder = zip.folder('graficos');
    charts.forEach(chart => {
      graficosFolder.file(chart.filename, chart.blob, { binary: true });
    });

    // Citación
    const citacion = generateCitacionTxt();
    zip.file('citacion.txt', citacion);

    // Generar ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Descargar
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const zipName = `Normalidad_Gumbel_${dateStr}.zip`;
    downloadBlob(zipBlob, zipName);

    btn.innerHTML = '<span class="action-icon">✅</span><span>¡Descargado!</span>';
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }, 2000);

  } catch (err) {
    console.error(err);
    alert('Error al exportar:\n' + err.message);
    btn.innerHTML = originalHTML;
    btn.disabled = false;
  }
}

// ============================================================
// GENERAR CSV
// ============================================================
function generateCSV(results) {
  const headers = [
    'Variable', 'N', 'Media', 'Mediana', 'DE', 'Varianza',
    'Min', 'Max', 'IQR', 'Asimetria', 'Curtosis',
    'Shapiro_W', 'Shapiro_p', 'AD_A2', 'AD_p',
    'Lilliefors_D', 'Lilliefors_p',
    'Dagostino_K2', 'Dagostino_p',
    'JarqueBera_JB', 'JarqueBera_p',
    'Outliers_IQR', 'Outliers_ModZ'
  ];

  const rows = [headers.join(',')];

  Object.entries(results).forEach(([name, r]) => {
    if (r.error) {
      rows.push(`"${name}","ERROR: ${r.error}"`);
      return;
    }
    const d = r.descriptive;
    const sk = r.skewness_kurtosis;
    const n = r.normality;
    const out = r.outliers;

    const sw = n.shapiro_wilk.error ? ['', ''] : [n.shapiro_wilk.W, n.shapiro_wilk.p];
    const ad = n.anderson_darling.error ? ['', ''] : [n.anderson_darling.A2, n.anderson_darling.p];
    const lil = n.lilliefors.error ? ['', ''] : [n.lilliefors.D, n.lilliefors.p];
    const dp = n.dagostino_pearson.error ? ['', ''] : [n.dagostino_pearson.K2, n.dagostino_pearson.p];
    const jb = n.jarque_bera.error ? ['', ''] : [n.jarque_bera.JB, n.jarque_bera.p];

    const row = [
      `"${name}"`,
      d.n,
      d.mean.toFixed(4),
      d.median.toFixed(4),
      d.std.toFixed(4),
      d.variance.toFixed(4),
      d.min.toFixed(4),
      d.max.toFixed(4),
      d.iqr.toFixed(4),
      sk.skewness.toFixed(4),
      sk.kurtosis.toFixed(4),
      sw[0] !== '' ? sw[0].toFixed(4) : '',
      sw[1] !== '' ? sw[1].toFixed(6) : '',
      ad[0] !== '' ? ad[0].toFixed(4) : '',
      ad[1] !== '' ? ad[1].toFixed(6) : '',
      lil[0] !== '' ? lil[0].toFixed(4) : '',
      lil[1] !== '' ? lil[1].toFixed(6) : '',
      dp[0] !== '' ? dp[0].toFixed(4) : '',
      dp[1] !== '' ? dp[1].toFixed(6) : '',
      jb[0] !== '' ? jb[0].toFixed(4) : '',
      jb[1] !== '' ? jb[1].toFixed(6) : '',
      out.outliers_iqr.length,
      out.outliers_modified_z.length
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

// ============================================================
// GENERAR WORD (.docx)
// ============================================================
async function generateWord(results, dataset) {
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel,
    AlignmentType, ImageRun, Table, TableRow, TableCell,
    WidthType, BorderStyle, PageBreak
  } = docx;

  const today = new Date();
  const fecha = today.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const fechaISO = today.toISOString().split('T')[0];

  // ==== CONTENIDO ====
  const children = [];

  // ===== 1. Resumen del análisis =====
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 200 },
    children: [new TextRun({ text: '1. Resumen del análisis', font: 'Cambria', size: 28, bold: true })]
  }));

  const nVars = Object.keys(results).length;
  const nObs = Object.values(results)[0]?.descriptive?.n || '—';

  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: `Variables analizadas: ${nVars}`, font: 'Cambria', size: 22 })]
  }));
  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: `Tamaño muestral: ${nObs}`, font: 'Cambria', size: 22 })]
  }));
  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: `Fecha de análisis: ${fecha}`, font: 'Cambria', size: 22 })]
  }));
  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: `Nivel de significancia (α): ${CONFIG.ALPHA}`, font: 'Cambria', size: 22 })]
  }));

  // ===== 2. Tabla resumen =====
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 200 },
    children: [new TextRun({ text: '2. Tabla resumen', font: 'Cambria', size: 28, bold: true })]
  }));

  children.push(generateSummaryTableDocx(results));

  // ===== 3. Análisis por variable =====
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 200 },
    children: [new TextRun({ text: '3. Análisis por variable', font: 'Cambria', size: 28, bold: true })]
  }));

  let varIdx = 1;
  for (const [name, r] of Object.entries(results)) {
    if (r.error) continue;

    // Título de la variable
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 150 },
      children: [new TextRun({ text: `3.${varIdx}. ${name}`, font: 'Cambria', size: 24, bold: true })]
    }));

    // Descriptivos en prosa
    const d = r.descriptive;
    const sk = r.skewness_kurtosis;
    const texto1 = `La variable ${name} presentó una media de ${d.mean.toFixed(2)} (DE = ${d.std.toFixed(2)}), con una mediana de ${d.median.toFixed(2)} y un rango intercuartílico de ${d.iqr.toFixed(2)}. La asimetría fue de ${sk.skewness.toFixed(3)} y la curtosis de ${sk.kurtosis.toFixed(3)}.`;

    children.push(new Paragraph({
      spacing: { after: 150 },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: texto1, font: 'Cambria', size: 22 })]
    }));

    // Pruebas de normalidad en prosa APA
    const tests = r.normality;
    const frases = [];

    if (!tests.shapiro_wilk.error) {
      const sw = tests.shapiro_wilk;
      const decision = sw.p > 0.05 ? 'no mostró desviaciones significativas de la normalidad' : 'mostró desviaciones significativas de la normalidad';
      frases.push(`la prueba de Shapiro-Wilk ${decision}, W(${d.n}) = ${sw.W.toFixed(3)}, p = ${sw.p < 0.001 ? '< .001' : sw.p.toFixed(3)}`);
    }

    if (!tests.anderson_darling.error) {
      const ad = tests.anderson_darling;
      const decision = ad.p > 0.05 ? 'no mostró desviaciones significativas' : 'mostró desviaciones significativas';
      frases.push(`la prueba de Anderson-Darling ${decision}, A² = ${ad.A2.toFixed(3)}, p = ${ad.p < 0.001 ? '< .001' : ad.p.toFixed(3)}`);
    }

    if (!tests.lilliefors.error) {
      const lil = tests.lilliefors;
      const decision = lil.p > 0.05 ? 'no mostró desviaciones significativas' : 'mostró desviaciones significativas';
      frases.push(`la prueba de Kolmogorov-Smirnov con corrección de Lilliefors ${decision}, D(${d.n}) = ${lil.D.toFixed(3)}, p = ${lil.p < 0.001 ? '< .001' : lil.p.toFixed(3)}`);
    }

    if (!tests.dagostino_pearson.error) {
      const dp = tests.dagostino_pearson;
      const decision = dp.p > 0.05 ? 'no mostró desviaciones significativas' : 'mostró desviaciones significativas';
      frases.push(`la prueba de D'Agostino-Pearson ${decision}, K² = ${dp.K2.toFixed(3)}, p = ${dp.p < 0.001 ? '< .001' : dp.p.toFixed(3)}`);
    }

    if (!tests.jarque_bera.error) {
      const jb = tests.jarque_bera;
      const decision = jb.p > 0.05 ? 'no mostró desviaciones significativas' : 'mostró desviaciones significativas';
      frases.push(`la prueba de Jarque-Bera ${decision}, JB = ${jb.JB.toFixed(3)}, p = ${jb.p < 0.001 ? '< .001' : jb.p.toFixed(3)}`);
    }

    if (frases.length > 0) {
      const texto2 = frases.join('; ') + '.';
      children.push(new Paragraph({
        spacing: { after: 150 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: texto2, font: 'Cambria', size: 22 })]
      }));
    }

    // Conclusión
    const recomendada = r.recommended_test.test;
    const testRec = tests[recomendada];
    const esNormal = testRec && !testRec.error && testRec.p > 0.05;
    const conclusion = esNormal
      ? `Conclusión: Los datos de la variable ${name} son compatibles con una distribución normal (α = 0.05). Se recomienda el uso de pruebas paramétricas para el análisis de esta variable.`
      : `Conclusión: Los datos de la variable ${name} no son compatibles con una distribución normal (α = 0.05). Se recomienda el uso de pruebas no paramétricas o la aplicación de transformaciones (logarítmica, raíz cuadrada o Box-Cox) antes del análisis.`;

    children.push(new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: conclusion, font: 'Cambria', size: 22, italics: true })]
    }));

    // Gráficos insertados
    const safeId = name.replace(/[^a-zA-Z0-9]/g, '_');
    const chartTypes = ['hist', 'qq', 'pp', 'box', 'violin'];
    const chartTitles = ['Histograma + Curva Normal', 'QQ-Plot', 'PP-Plot', 'Boxplot', 'Violín Plot'];

    for (let ci = 0; ci < chartTypes.length; ci++) {

      try {
        const imgDataUrl = await exportChartAsImageLight(`chart-${chartTypes[ci]}-${safeId}`, {
          width: 800,
          height: 500,
          scale: 2
        });
		
		        if (!imgDataUrl) continue;
				
        const base64 = imgDataUrl.split(',')[1];
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        children.push(new Paragraph({
          spacing: { before: 200, after: 100 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: chartTitles[ci], font: 'Cambria', size: 20, italics: true })]
        }));

        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new ImageRun({
            data: bytes.buffer,
            transformation: { width: 500, height: 312 }
          })]
        }));
      } catch (e) {
        console.warn(`No se pudo insertar gráfico ${chartTypes[ci]}:`, e);
      }
    }

    varIdx++;
  }

  // ===== 4. Interpretación general =====
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 200 },
    children: [new TextRun({ text: '4. Interpretación general', font: 'Cambria', size: 28, bold: true })]
  }));

  const normales = [];
  const noNormales = [];
  for (const [name, r] of Object.entries(results)) {
    if (r.error) continue;
    const rec = r.recommended_test.test;
    const t = r.normality[rec];
    if (t && !t.error && t.p > 0.05) normales.push(name);
    else noNormales.push(name);
  }

  let textoGeneral = `Se evaluó la normalidad de ${Object.keys(results).length} variable(s). `;
  if (normales.length > 0) {
    textoGeneral += `Las variables ${normales.join(', ')} mostraron distribuciones compatibles con la normalidad. `;
  }
  if (noNormales.length > 0) {
    textoGeneral += `Las variables ${noNormales.join(', ')} mostraron desviaciones significativas de la normalidad. `;
  }
  textoGeneral += `Estos resultados deben considerarse al seleccionar las pruebas estadísticas apropiadas para los análisis inferenciales subsecuentes.`;

  children.push(new Paragraph({
    spacing: { after: 200 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text: textoGeneral, font: 'Cambria', size: 22 })]
  }));

  // ===== 5. Recomendaciones metodológicas =====
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 200 },
    children: [new TextRun({ text: '5. Recomendaciones metodológicas', font: 'Cambria', size: 28, bold: true })]
  }));

  const recomendaciones = [
    'Si todas las variables son normales: use pruebas paramétricas (t de Student, ANOVA, correlación de Pearson).',
    'Si alguna variable no es normal: considere pruebas no paramétricas (U de Mann-Whitney, H de Kruskal-Wallis, correlación de Spearman) o transformaciones de datos.',
    'Para muestras pequeñas (n < 30): la prueba de Shapiro-Wilk es la más potente.',
    'Para muestras grandes (n > 300): las pruebas de normalidad pueden detectar desviaciones triviales; complemente con inspección gráfica (QQ-plot).',
    'Antes de aplicar pruebas paramétricas, verifique también la homocedasticidad (Levene o Brown-Forsythe).'
  ];

  recomendaciones.forEach(rec => {
    children.push(new Paragraph({
      spacing: { after: 100 },
      alignment: AlignmentType.JUSTIFIED,
      bullet: { level: 0 },
      children: [new TextRun({ text: rec, font: 'Cambria', size: 22 })]
    }));
  });

  // ===== 6. Referencias =====
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 200 },
    children: [new TextRun({ text: '6. Referencias', font: 'Cambria', size: 28, bold: true })]
  }));

  const referencias = [
    'Anderson, T. W., & Darling, D. A. (1952). Asymptotic theory of certain "goodness-of-fit" criteria based on stochastic processes. The Annals of Mathematical Statistics, 23(2), 193-212. https://doi.org/10.1214/aoms/1177729437',
    'Bartlett, M. S. (1937). Properties of sufficiency and statistical tests. Proceedings of the Royal Society of London. Series A, 160(901), 268-282. https://doi.org/10.1098/rspa.1937.0109',
    "D'Agostino, R. B., & Pearson, E. S. (1973). Tests for departure from normality. Empirical results for the distributions of b₂ and √b₁. Biometrika, 60(3), 613-622. https://doi.org/10.1093/biomet/60.3.613",
    'Jarque, C. M., & Bera, A. K. (1980). Efficient tests for normality, homoscedasticity and serial independence of regression residuals. Economics Letters, 6(3), 255-259. https://doi.org/10.1016/0165-1765(80)90024-5',
    'Levene, H. (1960). Robust tests for equality of variances. En I. Olkin (Ed.), Contributions to Probability and Statistics: Essays in Honor of Harold Hotelling (pp. 278-292). Stanford University Press.',
    'Lilliefors, H. W. (1967). On the Kolmogorov-Smirnov test for normality with mean and variance unknown. Journal of the American Statistical Association, 62(318), 399-402. https://doi.org/10.1080/01621459.1967.10482916',
    'Mardia, K. V. (1970). Measures of multivariate skewness and kurtosis with applications. Biometrika, 57(3), 519-530. https://doi.org/10.1093/biomet/57.3.519',
    'Royston, P. (1995). Remark AS R94: A remark on Algorithm AS 181: The W-test for normality. Applied Statistics, 44(4), 547-551. https://doi.org/10.2307/2986146',
    'Shapiro, S. S., & Wilk, M. B. (1965). An analysis of variance test for normality (complete samples). Biometrika, 52(3-4), 591-611. https://doi.org/10.2307/2333709',
    'American Psychological Association. (2020). Publication manual of the American Psychological Association (7th ed.). https://doi.org/10.1037/0000165-000'
  ];

  referencias.forEach(ref => {
    children.push(new Paragraph({
      spacing: { after: 120 },
      alignment: AlignmentType.JUSTIFIED,
      indent: { left: 720, hanging: 720 },
      children: [new TextRun({ text: ref, font: 'Cambria', size: 20 })]
    }));
  });

  // ===== Copyright =====
  children.push(new Paragraph({
    spacing: { before: 600, after: 100 },
    children: [new TextRun({
      text: '© 2026 Centro de Investigación El Poliedro.',
      font: 'Cambria', size: 20, bold: true
    })]
  }));

  children.push(new Paragraph({
    spacing: { after: 150 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({
      text: 'Esta obra se publica bajo una licencia Creative Commons Atribución-NoComercial-CompartirIgual 4.0 Internacional (CC BY-NC-SA 4.0). Su reproducción está permitida bajo los términos de esta licencia siempre que se cite la fuente original y al Centro de Investigación El Poliedro.',
      font: 'Cambria', size: 20
    })]
  }));

  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({
      text: 'Consulta los términos completos en: https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es',
      font: 'Cambria', size: 20
    })]
  }));

  // ==== CONSTRUIR DOCUMENTO ====
  const doc = new Document({
    creator: CONFIG.AUTHOR_NAME,
    title: 'Informe de Análisis de Normalidad',
    description: `Generado por ${CONFIG.TOOL_NAME} v${CONFIG.TOOL_VERSION}`,
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new docx.Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: `${CONFIG.AUTHOR_NAME} · ${CONFIG.INSTITUTION}`,
                font: 'Cambria', size: 18, italics: true, color: '666666'
              })]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { bottom: { color: '999999', space: 1, style: BorderStyle.SINGLE, size: 6 } },
              children: [new TextRun({ text: '', font: 'Cambria', size: 2 })]
            })
          ]
        })
      },
      footers: {
        default: new docx.Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { color: '999999', space: 1, style: BorderStyle.SINGLE, size: 6 } },
              children: [new TextRun({ text: '', font: 'Cambria', size: 2 })]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: `${CONFIG.INSTITUTE} · ${CONFIG.TOOL_YEAR}`,
                font: 'Cambria', size: 18, italics: true, color: '666666'
              })]
            })
          ]
        })
      },
      children: children
    }]
  });

  return await Packer.toBlob(doc);
}

// ============================================================
// TABLA RESUMEN EN WORD
// ============================================================
function generateSummaryTableDocx(results) {
  const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, AlignmentType } = docx;

  const headers = ['Variable', 'N', 'Media', 'DE', 'Asim.', 'Curt.', 'W(p)', 'A²(p)'];

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      shading: { fill: 'E8E8E8' },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: h, font: 'Cambria', size: 18, bold: true })]
      })]
    }))
  });

  const dataRows = Object.entries(results).map(([name, r]) => {
    if (r.error) {
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: name, font: 'Cambria', size: 18 })] })] }),
          new TableCell({
            columnSpan: 7,
            children: [new Paragraph({ children: [new TextRun({ text: r.error, font: 'Cambria', size: 18, color: 'CC0000' })] })]
          })
        ]
      });
    }

    const d = r.descriptive;
    const sk = r.skewness_kurtosis;
    const sw = r.normality.shapiro_wilk;
    const ad = r.normality.anderson_darling;

    const swText = sw.error ? '—' : `${sw.W.toFixed(3)} (${sw.p < 0.001 ? '<.001' : sw.p.toFixed(3)})`;
    const adText = ad.error ? '—' : `${ad.A2.toFixed(3)} (${ad.p < 0.001 ? '<.001' : ad.p.toFixed(3)})`;

    const cells = [
      name,
      d.n.toString(),
      d.mean.toFixed(3),
      d.std.toFixed(3),
      sk.skewness.toFixed(3),
      sk.kurtosis.toFixed(3),
      swText,
      adText
    ];

    return new TableRow({
      children: cells.map((c, i) => new TableCell({
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({
          alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
          children: [new TextRun({ text: c, font: 'Cambria', size: 18 })]
        })]
      }))
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows]
  });
}

// ============================================================
// GENERAR TODOS LOS GRÁFICOS COMO PNG
// ============================================================
async function generateAllChartsAsPNG() {
  const charts = [];
  const chartTypes = ['hist', 'qq', 'pp', 'box', 'violin'];

  for (const [varName, r] of Object.entries(state.results)) {
    if (r.error) continue;
    const safeId = varName.replace(/[^a-zA-Z0-9]/g, '_');

    for (const type of chartTypes) {
      const chartId = `chart-${type}-${safeId}`;
      const el = document.getElementById(chartId);
      if (!el) continue;

      try {
        // Exportar con tema claro (fondo blanco)
        const dataUrl = await exportChartAsImageLight(chartId, {
          width: 1200,
          height: 750,
          scale: 2
        });
        if (!dataUrl) continue;

        const blob = await (await fetch(dataUrl)).blob();
        const cleanName = varName.replace(/[^a-zA-Z0-9_-]/g, '_');
        charts.push({
          filename: `${cleanName}_${type}.png`,
          blob: blob
        });
      } catch (e) {
        console.warn(`Error al exportar gráfico ${varName}_${type}:`, e);
      }
    }
  }

  return charts;
}

// ============================================================
// CITACIÓN EN TXT
// ============================================================
function generateCitacionTxt() {
  const today = new Date();
  const accessDate = today.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const year = CONFIG.TOOL_YEAR;
  const url = CONFIG.URL;

  return `CÓMO CITAR ESTA HERRAMIENTA
============================================

Si usas la Calculadora de Normalidad Gumbel en tu investigación,
por favor cítala de la siguiente manera:

Formato APA 7:
${CONFIG.AUTHOR_SHORT} (${year}). ${CONFIG.TOOL_NAME}. ${CONFIG.INSTITUTION}, ${CONFIG.INSTITUTE}. ${url}

Formato Vancouver:
${CONFIG.AUTHOR_VANCOUVER}. ${CONFIG.TOOL_NAME} [Internet]. ${CONFIG.INSTITUTION}, ${CONFIG.INSTITUTE}; ${year} [citado el ${accessDate}]. Disponible en: ${url}

BibTeX:
@misc{castro${year}gumbel,
  author = {Castro Mattos, Miguel Angel},
  title = {${CONFIG.TOOL_NAME}},
  year = {${year}},
  publisher = {${CONFIG.INSTITUTION} - ${CONFIG.INSTITUTE}},
  url = {${url}},
  note = {Consultado el ${accessDate}}
}

============================================
Generado el: ${accessDate}
Versión: ${CONFIG.TOOL_VERSION}
`;
}

// ============================================================
// DESCARGA DE BLOB
// ============================================================
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// CONECTAR BOTÓN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-export-results');
  if (btn) {
    btn.addEventListener('click', exportResults);
  }
});
// ============================================================
// CONECTAR BOTONES DEL PANEL DERECHO
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Matriz de correlación
  const btnCorr = document.getElementById('btn-correlation');
  if (btnCorr) {
    btnCorr.addEventListener('click', handleCorrelation);
  }

    // Mardia multivariante
  const btnMardia = document.getElementById('btn-mardia');
  if (btnMardia) {
    btnMardia.addEventListener('click', handleMardia);
  }
});
// ============================================================
// EXPORTAR GRÁFICO CON TEMA CLARO (temporal)
// ============================================================
async function exportChartAsImageLight(chartId, options = {}) {
  const chartEl = document.getElementById(chartId);
  if (!chartEl) return null;

  // 1. Guardar el layout actual (oscuro)
  const originalLayout = chartEl.layout;

  // 2. Aplicar el layout claro
  const lightLayout = JSON.parse(JSON.stringify(plotlyLayoutLight));
  // Mantener el título original
  lightLayout.title = originalLayout.title;

  // 3. Redibujar con el tema claro
  await Plotly.relayout(chartEl, lightLayout);

  // 4. Esperar a que se pinte
  await new Promise(resolve => setTimeout(resolve, 100));

  // 5. Exportar como PNG
  const dataUrl = await Plotly.toImage(chartEl, {
    format: 'png',
    width: options.width || 1200,
    height: options.height || 750,
    scale: options.scale || 2
  });

  // 6. Restaurar el layout oscuro
  await Plotly.relayout(chartEl, originalLayout);

  return dataUrl;
}
// ============================================================
// MATRIZ DE CORRELACIÓN (con heatmap)
// ============================================================
let currentCorrelationMethod = 'pearson';

async function handleCorrelation() {
  if (!state.dataset) {
    alert('Primero analiza datos para calcular correlaciones.');
    return;
  }

  // Filtrar columnas numéricas con al menos 3 valores
  const numericCols = state.dataset.columns
    .filter(c => c.type === 'numeric')
    .map(c => ({
      name: c.name,
      values: c.values.filter(v => typeof v === 'number' && !isNaN(v))
    }))
    .filter(c => c.values.length >= 3);

  if (numericCols.length < 2) {
    alert('Se necesitan al menos 2 variables numéricas con 3+ valores para calcular correlaciones.');
    return;
  }

  // Alinear longitudes (usar la mínima)
  const minLen = Math.min(...numericCols.map(c => c.values.length));
  const matrix = numericCols.map(c => c.values.slice(0, minLen));

  // Mostrar modal con spinner
  const content = document.getElementById('correlation-content');
  content.innerHTML = `
    <div style="text-align:center; padding: 2rem;">
      <div class="spinner" style="margin: 0 auto 1rem;"></div>
      <p style="color:var(--text-muted);">Calculando correlaciones...</p>
    </div>
  `;
  openModal('modal-correlation');

  try {
    const result = await correlationAPI(matrix, currentCorrelationMethod);
    renderCorrelationResult(result, numericCols.map(c => c.name));
  } catch (err) {
    content.innerHTML = `
      <div class="empty-state">
        <p style="color: var(--danger);">Error: ${err.message}</p>
      </div>
    `;
  }
}

function renderCorrelationResult(result, varNames) {
  const content = document.getElementById('correlation-content');

  if (result.error) {
    content.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">${result.error}</p></div>`;
    return;
  }

  const { correlations, p_values, n, n_omitted } = result;

  // Construir HTML
  let html = `
    <div style="margin-bottom: 1rem;">
      <div class="options-row" style="margin-bottom: 0.8rem;">
        <label>
          <span>Método:</span>
          <select id="sel-corr-method">
            <option value="pearson" ${currentCorrelationMethod === 'pearson' ? 'selected' : ''}>Pearson</option>
            <option value="spearman" ${currentCorrelationMethod === 'spearman' ? 'selected' : ''}>Spearman</option>
            <option value="kendall" ${currentCorrelationMethod === 'kendall' ? 'selected' : ''}>Kendall</option>
          </select>
        </label>
        <label>
          <input type="checkbox" id="chk-only-sig">
          <span>Solo significativas (p &lt; 0.05)</span>
        </label>
      </div>

      <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom: 0.5rem;">
        N = ${n} ${n_omitted > 0 ? `· ${n_omitted} casos omitidos por datos faltantes` : ''}
      </p>

      <div id="corr-heatmap" style="width:100%; height:${Math.max(400, varNames.length * 80)}px; margin-bottom: 1.5rem;"></div>

      <h4 style="font-size:0.85rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.6rem;">
        Coeficientes (p-valor)
      </h4>
      <table class="summary-table" id="corr-table">
        <thead>
          <tr>
            <th></th>
            ${varNames.map(v => `<th>${v}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  // Filas de la tabla
  for (let i = 0; i < varNames.length; i++) {
    html += `<tr><td class="var-name">${varNames[i]}</td>`;
    for (let j = 0; j < varNames.length; j++) {
      if (i === j) {
        html += `<td style="background: var(--bg-tertiary); text-align:center;">—</td>`;
      } else {
        const r = correlations[i][j];
        const p = p_values[i][j];
        const sig = p < 0.05;
        const sig2 = p < 0.01;
        const sig3 = p < 0.001;
        const star = sig3 ? '***' : sig2 ? '**' : sig ? '*' : '';
        const rColor = r > 0 ? `rgba(239, 68, 68, ${Math.abs(r) * 0.3})` :
                              `rgba(59, 130, 246, ${Math.abs(r) * 0.3})`;
        html += `
          <td style="background: ${rColor}; text-align:center;">
            <strong>${r.toFixed(3)}</strong>${star}<br>
            <span style="font-size:0.65rem; color:var(--text-muted);">p=${p < 0.001 ? '<.001' : p.toFixed(3)}</span>
          </td>
        `;
      }
    }
    html += '</tr>';
  }

  html += `
        </tbody>
      </table>

      <p style="font-size:0.7rem; color:var(--text-muted); margin-top: 0.8rem; font-style: italic;">
        * p &lt; 0.05 · ** p &lt; 0.01 · *** p &lt; 0.001
      </p>

      <div style="margin-top: 1rem; display:flex; gap:0.5rem;">
        <button class="btn-secondary" id="btn-corr-download">
          <span>📥</span> Descargar heatmap
        </button>
      </div>
    </div>
  `;

  content.innerHTML = html;

  // Renderizar heatmap con Plotly
  renderCorrelationHeatmap(correlations, varNames, currentCorrelationMethod);

  // Listener cambio de método
  document.getElementById('sel-corr-method').addEventListener('change', (e) => {
    currentCorrelationMethod = e.target.value;
    handleCorrelation();
  });

  // Listener checkbox "solo significativas"
  document.getElementById('chk-only-sig').addEventListener('change', (e) => {
    const rows = document.querySelectorAll('#corr-table tbody tr');
    const cells = document.querySelectorAll('#corr-table tbody td');
    if (e.target.checked) {
      // Ocultar celdas no significativas
      document.querySelectorAll('#corr-table tbody tr').forEach((tr, i) => {
        Array.from(tr.children).forEach((td, j) => {
          if (i !== j && p_values[i][j] >= 0.05) {
            td.style.opacity = '0.15';
          }
        });
      });
    } else {
      document.querySelectorAll('#corr-table tbody td').forEach(td => {
        td.style.opacity = '1';
      });
    }
  });

  // Listener descargar heatmap
  document.getElementById('btn-corr-download').addEventListener('click', async () => {
    const chartEl = document.getElementById('corr-heatmap');
    if (!chartEl) return;
    const dataUrl = await Plotly.toImage(chartEl, {
      format: 'png', width: 1200, height: Math.max(600, varNames.length * 120), scale: 2
    });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `correlacion_${currentCorrelationMethod}.png`;
    link.click();
  });
}

function renderCorrelationHeatmap(correlations, varNames, method) {
  const z = correlations;
  const text = correlations.map((row, i) =>
    row.map((v, j) => i === j ? '—' : v.toFixed(3))
  );

  const trace = {
    z: z,
    x: varNames,
    y: varNames,
    type: 'heatmap',
    colorscale: [
      [0.0, '#1e40af'],   // azul fuerte (negativa)
      [0.25, '#60a5fa'],
      [0.5, '#f8fafc'],   // blanco (cero)
      [0.75, '#f87171'],
      [1.0, '#991b1b']    // rojo fuerte (positiva)
    ],
    zmin: -1,
    zmax: 1,
    text: text,
    texttemplate: '%{text}',
    textfont: { size: 11, color: '#1a1a1a', family: 'JetBrains Mono, monospace' },
    hovertemplate: '%{y} vs %{x}<br>r = %{z:.4f}<extra></extra>',
    colorbar: {
      title: 'r',
      titleside: 'right',
      tickfont: { color: '#94a3b8' },
      titlefont: { color: '#94a3b8' }
    }
  };

  const layout = {
    ...plotlyLayoutLight,
    title: {
      text: `Matriz de correlación (${method.charAt(0).toUpperCase() + method.slice(1)})`,
      font: { size: 15, color: '#1a1a1a' }
    },
    xaxis: {
      ...plotlyLayoutLight.xaxis,
      side: 'bottom',
      tickangle: -45
    },
    yaxis: {
      ...plotlyLayoutLight.yaxis,
      autorange: 'reversed'
    },
    margin: { t: 60, r: 100, b: 100, l: 120 }
  };

  Plotly.newPlot('corr-heatmap', [trace], layout, { responsive: true, displayModeBar: false });
}
// ============================================================
// MARDIA MULTIVARIANTE
// ============================================================
async function handleMardia() {
  if (!state.dataset) {
    alert('Primero analiza datos para calcular Mardia.');
    return;
  }

  // Filtrar columnas numéricas con al menos 3 valores
  const numericCols = state.dataset.columns
    .filter(c => c.type === 'numeric')
    .map(c => ({
      name: c.name,
      values: c.values.filter(v => typeof v === 'number' && !isNaN(v))
    }))
    .filter(c => c.values.length >= 3);

  if (numericCols.length < 2) {
    alert('Se necesitan al menos 2 variables numéricas para Mardia.');
    return;
  }

  // Alinear longitudes
  const minLen = Math.min(...numericCols.map(c => c.values.length));
  const matrix = numericCols.map(c => c.values.slice(0, minLen));

  // Convertir a formato de filas (cada fila = un sujeto)
  const rowsMatrix = [];
  for (let i = 0; i < minLen; i++) {
    const row = [];
    for (let j = 0; j < numericCols.length; j++) {
      row.push(matrix[j][i]);
    }
    rowsMatrix.push(row);
  }

  // Mostrar modal con spinner
  const content = document.getElementById('mardia-content');
  content.innerHTML = `
    <div style="text-align:center; padding: 2rem;">
      <div class="spinner" style="margin: 0 auto 1rem;"></div>
      <p style="color:var(--text-muted);">Calculando Mardia multivariante...</p>
    </div>
  `;
  openModal('modal-mardia');

  try {
    const result = await mardiaAPI(rowsMatrix);
    renderMardiaResult(result, numericCols.map(c => c.name), minLen);
  } catch (err) {
    content.innerHTML = `
      <div class="empty-state">
        <p style="color: var(--danger);">Error: ${err.message}</p>
      </div>
    `;
  }
}

function renderMardiaResult(result, varNames, n) {
  const content = document.getElementById('mardia-content');

  if (result.error) {
    content.innerHTML = `
      <div class="empty-state">
        <p style="color: var(--danger);">${result.error}</p>
      </div>
    `;
    return;
  }

  const sk = result.skewness;
  const ku = result.kurtosis;

  const skSig = sk.p < 0.05;
  const kuSig = ku.p < 0.05;

  const skColor = skSig ? 'danger' : 'success';
  const kuColor = kuSig ? 'danger' : 'success';

  // Interpretación general
  let conclusion, conclusionClass;
  if (!skSig && !kuSig) {
    conclusion = '✅ Los datos son compatibles con una distribución normal multivariante (ambos tests p > 0.05).';
    conclusionClass = 'success';
  } else if (skSig && kuSig) {
    conclusion = '❌ Los datos NO siguen una distribución normal multivariante (asimetría y curtosis significativas).';
    conclusionClass = 'danger';
  } else if (skSig) {
    conclusion = '⚠️ La asimetría multivariante es significativa, pero la curtosis no. Indicio parcial de no normalidad multivariante.';
    conclusionClass = 'warning';
  } else {
    conclusion = '⚠️ La curtosis multivariante es significativa, pero la asimetría no. Indicio parcial de no normalidad multivariante (colas pesadas o ligeras).';
    conclusionClass = 'warning';
  }

  const html = `
    <div style="margin-bottom: 1rem;">
      <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom: 1rem;">
        Variables analizadas: <strong>${varNames.join(', ')}</strong><br>
        N = ${n} · p = ${varNames.length} variables
      </p>

      <div class="tests-grid" style="margin-bottom: 1rem;">
        <div class="test-card">
          <div class="test-name">
            Asimetría multivariante
            <span class="tooltip-trigger">ⓘ<span class="tooltip-content">
              Evalúa si la forma de la distribución multivariante es simétrica. El estadístico sigue una distribución χ² bajo la hipótesis nula.
            </span></span>
          </div>
          <div class="test-result">
            <div>Estadístico (κ₁): <strong>${fmt(sk.statistic, 4)}</strong></div>
            <div>gl: <strong>${sk.df}</strong></div>
            <div>p-valor: <span class="p-value ${skColor === 'success' ? 'success' : 'danger'}">${fmtP(sk.p)}</span></div>
            <div class="interpretation">
              ${skSig ? '✗ Asimetría significativa' : '✓ Asimetría no significativa'}
            </div>
          </div>
        </div>

        <div class="test-card">
          <div class="test-name">
            Curtosis multivariante
            <span class="tooltip-trigger">ⓘ<span class="tooltip-content">
              Evalúa el peso de las colas de la distribución multivariante. El estadístico sigue una distribución normal estándar bajo la hipótesis nula.
            </span></span>
          </div>
          <div class="test-result">
            <div>Estadístico (κ₂): <strong>${fmt(ku.statistic, 4)}</strong></div>
            <div>p-valor: <span class="p-value ${kuColor === 'success' ? 'success' : 'danger'}">${fmtP(ku.p)}</span></div>
            <div class="interpretation">
              ${kuSig ? '✗ Curtosis significativa' : '✓ Curtosis no significativa'}
            </div>
          </div>
        </div>
      </div>

      <h4 style="font-size:0.85rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; margin: 1.2rem 0 0.6rem;">
        Interpretación
      </h4>
      <div class="tutor-message ${conclusionClass}">
        ${conclusion}
      </div>

      <h4 style="font-size:0.85rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; margin: 1.2rem 0 0.6rem;">
        ¿Cuándo usar Mardia?
      </h4>
      <div style="font-size:0.82rem; color:var(--text-secondary); line-height:1.7;">
        <ul style="padding-left: 1.2rem;">
          <li>Antes de un <strong>análisis factorial exploratorio o confirmatorio</strong>.</li>
          <li>Antes de un <strong>MANOVA</strong> (análisis multivariante de varianza).</li>
          <li>Antes de <strong>modelos de ecuaciones estructurales (SEM)</strong>.</li>
          <li>Antes de <strong>análisis discriminante</strong> o <strong>cluster jerárquico</strong>.</li>
        </ul>
        <p style="margin-top: 0.6rem; font-size: 0.78rem; color: var(--text-muted);">
          Nota: Mardia es sensible al tamaño muestral. Con n grande, detecta desviaciones triviales. Complementa con inspección gráfica multivariante (QQ-plot de distancias de Mahalanobis).
        </p>
      </div>
    </div>
  `;

  content.innerHTML = html;
}
// ============================================================
// RESUMEN PARA TESIS
// ============================================================
let currentThesisFormat = 'paragraph';

function handleThesisSummary() {
  if (!state.results) {
    alert('Primero analiza datos para generar el resumen.');
    return;
  }
  generateThesisSummary(currentThesisFormat);
  openModal('modal-thesis');
}

function generateThesisSummary(format) {
  const content = document.getElementById('thesis-content');

  if (!state.results) {
    content.textContent = 'Primero analiza datos para generar el resumen.';
    return;
  }

  let text = '';

  if (format === 'paragraph') {
    text = generateThesisParagraph();
  } else if (format === 'structured') {
    text = generateThesisStructured();
  } else if (format === 'table') {
    text = generateThesisTable();
  }

  content.textContent = text.trim();
}

function generateThesisParagraph() {
  let text = '';
  const results = state.results;
  const varNames = Object.keys(results);

  // Encabezado
  text += 'ANÁLISIS DE NORMALIDAD\n';
  text += '='.repeat(60) + '\n\n';
  text += `Se evaluó la normalidad de ${varNames.length} variable(s) `;
  text += `mediante las pruebas de Shapiro-Wilk, Anderson-Darling, `;
  text += `Kolmogorov-Smirnov con corrección de Lilliefors, D'Agostino-Pearson y Jarque-Bera, `;
  text += `utilizando un nivel de significancia de α = 0.05.\n\n`;

  // Análisis por variable
  varNames.forEach((name, idx) => {
    const r = results[name];
    if (r.error) {
      text += `Variable "${name}": ${r.error}\n\n`;
      return;
    }

    const d = r.descriptive;
    const sk = r.skewness_kurtosis;
    const n = r.normality;
    const sw = n.shapiro_wilk;
    const ad = n.anderson_darling;
    const lil = n.lilliefors;
    const dp = n.dagostino_pearson;
    const jb = n.jarque_bera;

    text += `Variable ${name} (n = ${d.n}):\n`;
    text += `  La media fue ${d.mean.toFixed(2)} (DE = ${d.std.toFixed(2)}), `;
    text += `con una mediana de ${d.median.toFixed(2)} y un rango intercuartílico de ${d.iqr.toFixed(2)}. `;
    text += `La asimetría fue ${sk.skewness.toFixed(3)} (IC 95%: [${sk.skewness_ci[0].toFixed(3)}, ${sk.skewness_ci[1].toFixed(3)}]) `;
    text += `y la curtosis ${sk.kurtosis.toFixed(3)} (IC 95%: [${sk.kurtosis_ci[0].toFixed(3)}, ${sk.kurtosis_ci[1].toFixed(3)}]).\n\n`;

    // Pruebas
    text += '  Pruebas de normalidad:\n';
    if (!sw.error) {
      text += `    • Shapiro-Wilk: W(${d.n}) = ${sw.W.toFixed(3)}, p = ${sw.p < 0.001 ? '< .001' : sw.p.toFixed(3)}\n`;
    }
    if (!ad.error) {
      text += `    • Anderson-Darling: A² = ${ad.A2.toFixed(3)}, p = ${ad.p < 0.001 ? '< .001' : ad.p.toFixed(3)}\n`;
    }
    if (!lil.error) {
      text += `    • Lilliefors: D(${d.n}) = ${lil.D.toFixed(3)}, p = ${lil.p < 0.001 ? '< .001' : lil.p.toFixed(3)}\n`;
    }
    if (!dp.error) {
      text += `    • D'Agostino-Pearson: K² = ${dp.K2.toFixed(3)}, p = ${dp.p < 0.001 ? '< .001' : dp.p.toFixed(3)}\n`;
    }
    if (!jb.error) {
      text += `    • Jarque-Bera: JB = ${jb.JB.toFixed(3)}, p = ${jb.p < 0.001 ? '< .001' : jb.p.toFixed(3)}\n`;
    }

    // Conclusión
    const rec = r.recommended_test.test;
    const testRec = n[rec];
    const esNormal = testRec && !testRec.error && testRec.p > 0.05;
    text += `\n  Conclusión: Los datos de la variable ${name} `;
    text += esNormal
      ? `son compatibles con una distribución normal (α = 0.05). Se recomienda el uso de pruebas paramétricas.`
      : `no son compatibles con una distribución normal (α = 0.05). Se recomienda el uso de pruebas no paramétricas o transformaciones.`;
    text += '\n\n';
    text += '-'.repeat(60) + '\n\n';
  });

  text += `\nFecha de análisis: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
  text += `Herramienta: ${CONFIG.TOOL_NAME} v${CONFIG.TOOL_VERSION}\n`;

  return text;
}

function generateThesisStructured() {
  let text = '';
  const results = state.results;

  text += 'ANÁLISIS DE NORMALIDAD — RESUMEN ESTRUCTURADO\n';
  text += '='.repeat(60) + '\n\n';

  Object.entries(results).forEach(([name, r]) => {
    if (r.error) {
      text += `▪ ${name}: ${r.error}\n\n`;
      return;
    }

    const d = r.descriptive;
    const sk = r.skewness_kurtosis;
    const n = r.normality;
    const rec = r.recommended_test.test;
    const testRec = n[rec];
    const esNormal = testRec && !testRec.error && testRec.p > 0.05;

    text += `▪ Variable: ${name}\n`;
    text += `  - N: ${d.n}\n`;
    text += `  - Media (DE): ${d.mean.toFixed(2)} (${d.std.toFixed(2)})\n`;
    text += `  - Mediana: ${d.median.toFixed(2)}\n`;
    text += `  - IQR: ${d.iqr.toFixed(2)}\n`;
    text += `  - Rango: [${d.min.toFixed(2)}, ${d.max.toFixed(2)}]\n`;
    text += `  - Asimetría: ${sk.skewness.toFixed(3)}\n`;
    text += `  - Curtosis: ${sk.kurtosis.toFixed(3)}\n`;

    if (!n.shapiro_wilk.error) {
      text += `  - Shapiro-Wilk: W(${d.n}) = ${n.shapiro_wilk.W.toFixed(3)}, p = ${n.shapiro_wilk.p < 0.001 ? '< .001' : n.shapiro_wilk.p.toFixed(3)}\n`;
    }
    if (!n.anderson_darling.error) {
      text += `  - Anderson-Darling: A² = ${n.anderson_darling.A2.toFixed(3)}, p = ${n.anderson_darling.p < 0.001 ? '< .001' : n.anderson_darling.p.toFixed(3)}\n`;
    }

    text += `  - Conclusión: ${esNormal ? 'Normal' : 'No normal'}\n`;
    text += `  - Prueba recomendada: ${rec.replace(/_/g, ' ')}\n\n`;
  });

  return text;
}

function generateThesisTable() {
  let text = '';
  const results = state.results;

  text += 'TABLA RESUMEN DE NORMALIDAD\n';
  text += '='.repeat(60) + '\n\n';
  text += '| Variable | N | Media | DE | Asim. | Curt. | W(p) | A²(p) | Conclusión |\n';
  text += '|---|---|---|---|---|---|---|---|---|\n';

  Object.entries(results).forEach(([name, r]) => {
    if (r.error) {
      text += `| ${name} | — | — | — | — | — | — | — | ERROR |\n`;
      return;
    }

    const d = r.descriptive;
    const sk = r.skewness_kurtosis;
    const n = r.normality;
    const sw = n.shapiro_wilk;
    const ad = n.anderson_darling;
    const rec = r.recommended_test.test;
    const testRec = n[rec];
    const esNormal = testRec && !testRec.error && testRec.p > 0.05;

    const swText = sw.error ? '—' : `${sw.W.toFixed(3)} (${sw.p < 0.001 ? '<.001' : sw.p.toFixed(3)})`;
    const adText = ad.error ? '—' : `${ad.A2.toFixed(3)} (${ad.p < 0.001 ? '<.001' : ad.p.toFixed(3)})`;

    text += `| ${name} | ${d.n} | ${d.mean.toFixed(2)} | ${d.std.toFixed(2)} | ${sk.skewness.toFixed(2)} | ${sk.kurtosis.toFixed(2)} | ${swText} | ${adText} | ${esNormal ? 'Normal' : 'No normal'} |\n`;
  });

  text += '\n\n';
  text += generateThesisParagraph();

  return text;
}
// ============================================================
// RESUMEN PARA TESIS
// ============================================================

function handleThesisSummary() {
  if (!state.results) {
    alert('Primero analiza datos para generar el resumen.');
    return;
  }
  generateThesisSummary(currentThesisFormat);
  openModal('modal-thesis');
}

function generateThesisSummary(format) {
  const content = document.getElementById('thesis-content');

  if (!state.results) {
    content.textContent = 'Primero analiza datos para generar el resumen.';
    return;
  }

  let text = '';

  if (format === 'paragraph') {
    text = generateThesisParagraph();
  } else if (format === 'structured') {
    text = generateThesisStructured();
  } else if (format === 'table') {
    text = generateThesisTable();
  }

  content.textContent = text.trim();
}

function generateThesisParagraph() {
  let text = '';
  const results = state.results;
  const varNames = Object.keys(results);

  text += 'ANÁLISIS DE NORMALIDAD\n';
  text += '='.repeat(60) + '\n\n';
  text += `Se evaluó la normalidad de ${varNames.length} variable(s) `;
  text += `mediante las pruebas de Shapiro-Wilk, Anderson-Darling, `;
  text += `Kolmogorov-Smirnov con corrección de Lilliefors, D'Agostino-Pearson y Jarque-Bera, `;
  text += `utilizando un nivel de significancia de α = 0.05.\n\n`;

  varNames.forEach((name) => {
    const r = results[name];
    if (r.error) {
      text += `Variable "${name}": ${r.error}\n\n`;
      return;
    }

    const d = r.descriptive;
    const sk = r.skewness_kurtosis;
    const n = r.normality;
    const sw = n.shapiro_wilk;
    const ad = n.anderson_darling;
    const lil = n.lilliefors;
    const dp = n.dagostino_pearson;
    const jb = n.jarque_bera;

    text += `Variable ${name} (n = ${d.n}):\n`;
    text += `  La media fue ${d.mean.toFixed(2)} (DE = ${d.std.toFixed(2)}), `;
    text += `con una mediana de ${d.median.toFixed(2)} y un rango intercuartílico de ${d.iqr.toFixed(2)}. `;
    text += `La asimetría fue ${sk.skewness.toFixed(3)} (IC 95%: [${sk.skewness_ci[0].toFixed(3)}, ${sk.skewness_ci[1].toFixed(3)}]) `;
    text += `y la curtosis ${sk.kurtosis.toFixed(3)} (IC 95%: [${sk.kurtosis_ci[0].toFixed(3)}, ${sk.kurtosis_ci[1].toFixed(3)}]).\n\n`;

    text += '  Pruebas de normalidad:\n';
    if (!sw.error) {
      text += `    • Shapiro-Wilk: W(${d.n}) = ${sw.W.toFixed(3)}, p = ${sw.p < 0.001 ? '< .001' : sw.p.toFixed(3)}\n`;
    }
    if (!ad.error) {
      text += `    • Anderson-Darling: A² = ${ad.A2.toFixed(3)}, p = ${ad.p < 0.001 ? '< .001' : ad.p.toFixed(3)}\n`;
    }
    if (!lil.error) {
      text += `    • Lilliefors: D(${d.n}) = ${lil.D.toFixed(3)}, p = ${lil.p < 0.001 ? '< .001' : lil.p.toFixed(3)}\n`;
    }
    if (!dp.error) {
      text += `    • D'Agostino-Pearson: K² = ${dp.K2.toFixed(3)}, p = ${dp.p < 0.001 ? '< .001' : dp.p.toFixed(3)}\n`;
    }
    if (!jb.error) {
      text += `    • Jarque-Bera: JB = ${jb.JB.toFixed(3)}, p = ${jb.p < 0.001 ? '< .001' : jb.p.toFixed(3)}\n`;
    }

    const rec = r.recommended_test.test;
    const testRec = n[rec];
    const esNormal = testRec && !testRec.error && testRec.p > 0.05;
    text += `\n  Conclusión: Los datos de la variable ${name} `;
    text += esNormal
      ? `son compatibles con una distribución normal (α = 0.05). Se recomienda el uso de pruebas paramétricas.`
      : `no son compatibles con una distribución normal (α = 0.05). Se recomienda el uso de pruebas no paramétricas o transformaciones.`;
    text += '\n\n';
    text += '-'.repeat(60) + '\n\n';
  });

  text += `\nFecha de análisis: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
  text += `Herramienta: ${CONFIG.TOOL_NAME} v${CONFIG.TOOL_VERSION}\n`;

  return text;
}

function generateThesisStructured() {
  let text = '';
  const results = state.results;

  text += 'ANÁLISIS DE NORMALIDAD — RESUMEN ESTRUCTURADO\n';
  text += '='.repeat(60) + '\n\n';

  Object.entries(results).forEach(([name, r]) => {
    if (r.error) {
      text += `▪ ${name}: ${r.error}\n\n`;
      return;
    }

    const d = r.descriptive;
    const sk = r.skewness_kurtosis;
    const n = r.normality;
    const rec = r.recommended_test.test;
    const testRec = n[rec];
    const esNormal = testRec && !testRec.error && testRec.p > 0.05;

    text += `▪ Variable: ${name}\n`;
    text += `  - N: ${d.n}\n`;
    text += `  - Media (DE): ${d.mean.toFixed(2)} (${d.std.toFixed(2)})\n`;
    text += `  - Mediana: ${d.median.toFixed(2)}\n`;
    text += `  - IQR: ${d.iqr.toFixed(2)}\n`;
    text += `  - Rango: [${d.min.toFixed(2)}, ${d.max.toFixed(2)}]\n`;
    text += `  - Asimetría: ${sk.skewness.toFixed(3)}\n`;
    text += `  - Curtosis: ${sk.kurtosis.toFixed(3)}\n`;

    if (!n.shapiro_wilk.error) {
      text += `  - Shapiro-Wilk: W(${d.n}) = ${n.shapiro_wilk.W.toFixed(3)}, p = ${n.shapiro_wilk.p < 0.001 ? '< .001' : n.shapiro_wilk.p.toFixed(3)}\n`;
    }
    if (!n.anderson_darling.error) {
      text += `  - Anderson-Darling: A² = ${n.anderson_darling.A2.toFixed(3)}, p = ${n.anderson_darling.p < 0.001 ? '< .001' : n.anderson_darling.p.toFixed(3)}\n`;
    }

    text += `  - Conclusión: ${esNormal ? 'Normal' : 'No normal'}\n`;
    text += `  - Prueba recomendada: ${rec.replace(/_/g, ' ')}\n\n`;
  });

  return text;
}

function generateThesisTable() {
  let text = '';
  const results = state.results;

  text += 'TABLA RESUMEN DE NORMALIDAD\n';
  text += '='.repeat(60) + '\n\n';
  text += '| Variable | N | Media | DE | Asim. | Curt. | W(p) | A²(p) | Conclusión |\n';
  text += '|---|---|---|---|---|---|---|---|---|\n';

  Object.entries(results).forEach(([name, r]) => {
    if (r.error) {
      text += `| ${name} | — | — | — | — | — | — | — | ERROR |\n`;
      return;
    }

    const d = r.descriptive;
    const sk = r.skewness_kurtosis;
    const n = r.normality;
    const sw = n.shapiro_wilk;
    const ad = n.anderson_darling;
    const rec = r.recommended_test.test;
    const testRec = n[rec];
    const esNormal = testRec && !testRec.error && testRec.p > 0.05;

    const swText = sw.error ? '—' : `${sw.W.toFixed(3)} (${sw.p < 0.001 ? '<.001' : sw.p.toFixed(3)})`;
    const adText = ad.error ? '—' : `${ad.A2.toFixed(3)} (${ad.p < 0.001 ? '<.001' : ad.p.toFixed(3)})`;

    text += `| ${name} | ${d.n} | ${d.mean.toFixed(2)} | ${d.std.toFixed(2)} | ${sk.skewness.toFixed(2)} | ${sk.kurtosis.toFixed(2)} | ${swText} | ${adText} | ${esNormal ? 'Normal' : 'No normal'} |\n`;
  });

  text += '\n\n';
  text += generateThesisParagraph();

  return text;
}

// ============================================================
// CONECTAR BOTÓN Y TABS DEL RESUMEN DE TESIS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Botón
  const btnThesis = document.getElementById('btn-thesis-summary');
  if (btnThesis) {
    btnThesis.addEventListener('click', handleThesisSummary);
  }

  // Tabs del modal
  document.querySelectorAll('.cite-tab[data-thesis-format]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cite-tab[data-thesis-format]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentThesisFormat = tab.dataset.thesisFormat;
      generateThesisSummary(currentThesisFormat);
    });
  });
});
// ============================================================
// CONTADOR DE VISITAS (frontend)
// ============================================================
function getOrCreateVisitorId() {
  let id = localStorage.getItem('gumbel_visitor_id');
  if (!id) {
    id = 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('gumbel_visitor_id', id);
  }
  return id;
}

async function registerVisit() {
  const visitorId = getOrCreateVisitorId();
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/visits/increment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId })
    });
    if (!res.ok) throw new Error('Error al registrar visita');
    const data = await res.json();
    updateVisitsDisplay(data);
  } catch (err) {
    console.warn('No se pudo registrar la visita:', err);
    const el = document.getElementById('visits-count');
    if (el) el.textContent = '—';
  }
}

function updateVisitsDisplay(data) {
  const el = document.getElementById('visits-count');
  if (!el) return;
  el.textContent = data.total_visits.toLocaleString('es-ES');
  el.parentElement.title =
    `Total: ${data.total_visits} visitas\n` +
    `Únicos: ${data.unique_visitors}\n` +
    `Últimas 24h: ${data.last_24h_visits} visitas (${data.last_24h_unique} únicos)`;
}

async function refreshVisitsDisplay() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/visits`);
    if (!res.ok) return;
    const data = await res.json();
    updateVisitsDisplay(data);
  } catch (err) {
    // Silencioso
  }
}

document.addEventListener('DOMContentLoaded', () => {
  registerVisit();
  setInterval(refreshVisitsDisplay, 60000);
});