// app.js — lógica del cliente (UTF-8 garantizado en el navegador)
'use strict';

// ===== ESTADO =====
const state = {
  text:     '',
  basename: '',
  isPdf:    false,
  casesBlob:   null,
  katalonBlob: null,
};

// ===== ELEMENTOS =====
const $ = id => document.getElementById(id);
const fileInput      = $('file-input');
const uploadArea     = $('upload-area');
const spinner        = $('spinner');
const spinnerMsg     = $('spinner-msg');
const globalError    = $('global-error');
const sectionMeta    = $('section-meta');
const metaGrid       = $('meta-grid');
const metaStats      = $('meta-stats');
const sectionConvert = $('section-convert');
const sectionAi      = $('section-ai');
const casesResult    = $('cases-result');
const katalonResult  = $('katalon-result');
const answerBox      = $('answer-box');
const answerText     = $('answer-text');
const questionInput  = $('question-input');
const katalonPreview = $('katalon-preview');
const casesPreview   = $('cases-preview');

// ===== UTILIDADES UI =====
function show(...els) { els.forEach(e => e.classList.remove('hidden')); }
function hide(...els) { els.forEach(e => e.classList.add('hidden')); }

function showSpinner(msg = 'Procesando…') {
  spinnerMsg.textContent = msg;
  show(spinner);
}
function hideSpinner() { hide(spinner); }

function showError(msg) {
  globalError.textContent = msg;
  show(globalError);
  setTimeout(() => hide(globalError), 8000);
}
function hideError() { hide(globalError); }

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== UPLOAD =====
uploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

async function handleFile(file) {
  hideError();
  hide(sectionMeta, sectionConvert, sectionAi, casesResult, katalonResult, answerBox);
  state.casesBlob = null;
  state.katalonBlob = null;

  const formData = new FormData();
  formData.append('file', file);

  showSpinner('Extrayendo texto del documento…');
  try {
    const res  = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al procesar el archivo.');

    state.text     = data.text || '';
    state.basename = data.basename || 'documento';
    state.isPdf    = data.isPdf || false;

    // Metadata
    metaGrid.innerHTML = renderMeta({
      'Nombre':    data.filename,
      'Tipo':      data.ext?.toUpperCase(),
      'Páginas':   data.pages,
      'Tamaño':    formatBytes(data.size),
    });
    metaStats.textContent = `Texto extraído: ${(data.wordCount || 0).toLocaleString()} palabras · ${(data.charCount || 0).toLocaleString()} caracteres`;
    show(sectionMeta);

    // Conversión solo para PDF
    if (data.isPdf) show(sectionConvert);

    // IA siempre disponible si hay texto
    if (state.text.trim()) show(sectionAi);

  } catch (err) {
    showError(err.message || String(err));
  } finally {
    hideSpinner();
    fileInput.value = '';
  }
}

function renderMeta(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `
      <div class="meta-item">
        <div class="label">${k}</div>
        <div class="value">${v}</div>
      </div>`)
    .join('');
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ===== DESCARGA PDF CONVERTIDO =====
$('btn-dl-txt').addEventListener('click', async () => {
  showSpinner('Generando TXT…');
  try {
    const res = await fetch('/api/download/txt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: state.text, basename: state.basename }),
    });
    const blob = await res.blob();
    triggerDownload(blob, state.basename + '.txt');
  } catch (err) { showError(err.message); }
  finally { hideSpinner(); }
});

$('btn-dl-docx').addEventListener('click', async () => {
  showSpinner('Generando DOCX…');
  try {
    const res = await fetch('/api/download/docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: state.text, basename: state.basename }),
    });
    const blob = await res.blob();
    triggerDownload(blob, state.basename + '.docx');
  } catch (err) { showError(err.message); }
  finally { hideSpinner(); }
});

$('btn-dl-xlsx-text').addEventListener('click', async () => {
  showSpinner('Generando XLSX…');
  try {
    const res = await fetch('/api/download/xlsx-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: state.text, basename: state.basename }),
    });
    const blob = await res.blob();
    triggerDownload(blob, state.basename + '.xlsx');
  } catch (err) { showError(err.message); }
  finally { hideSpinner(); }
});

// ===== IA: CASOS DE PRUEBA =====
$('btn-gen-cases').addEventListener('click', async () => {
  showSpinner('Generando casos de prueba con IA…');
  hide(casesResult);
  try {
    const res = await fetch('/api/ai/test-cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: state.text, basename: state.basename }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error generando casos de prueba.');
    }

    state.casesBlob = await res.blob();

    // Preview: leer el blob como array buffer y parsear las filas del XLSX en el cliente
    // (simple: mostramos aviso de descarga lista)
    casesPreview.innerHTML = '<p style="padding:.5rem;color:#475569;font-size:.85rem;">Vista previa no disponible en el navegador. Descarga el archivo para verlo en Excel.</p>';
    show(casesResult);
  } catch (err) {
    showError(err.message || String(err));
  } finally {
    hideSpinner();
  }
});

$('btn-dl-cases').addEventListener('click', () => {
  if (state.casesBlob) triggerDownload(state.casesBlob, state.basename + '_casos_de_prueba.xlsx');
});

// ===== IA: KATALON =====
$('btn-gen-katalon').addEventListener('click', async () => {
  showSpinner('Generando script Katalon con IA…');
  hide(katalonResult);
  try {
    const res = await fetch('/api/ai/katalon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: state.text, basename: state.basename }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error generando script Katalon.');
    }

    state.katalonBlob = await res.blob();

    // Preview: leer el texto del blob
    const code = await state.katalonBlob.text();
    katalonPreview.textContent = code;
    // Re-crear blob porque .text() lo consume
    state.katalonBlob = new Blob([code], { type: 'text/plain' });

    show(katalonResult);
  } catch (err) {
    showError(err.message || String(err));
  } finally {
    hideSpinner();
  }
});

$('btn-dl-katalon').addEventListener('click', () => {
  if (state.katalonBlob) triggerDownload(state.katalonBlob, state.basename + '.groovy');
});

// ===== IA: PREGUNTAS =====
$('btn-ask').addEventListener('click', askQuestion);
questionInput.addEventListener('keydown', e => { if (e.key === 'Enter') askQuestion(); });

async function askQuestion() {
  const q = questionInput.value.trim();
  if (!q) return;
  showSpinner('Buscando respuesta…');
  hide(answerBox);
  try {
    const res = await fetch('/api/ai/question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: state.text, question: q }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al consultar la IA.');
    answerText.textContent = data.answer || '(Sin respuesta)';
    show(answerBox);
  } catch (err) {
    showError(err.message || String(err));
  } finally {
    hideSpinner();
  }
}
