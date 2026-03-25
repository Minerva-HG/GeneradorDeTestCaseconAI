// server.js
// UTF-8 está garantizado en Node.js por diseño — no se necesita configuración extra

'use strict';

const express    = require('express');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const pdfParse   = require('pdf-parse');
const mammoth    = require('mammoth');
const { parse }  = require('csv-parse/sync');
const ExcelJS    = require('exceljs');
const { CohereClient } = require('cohere-ai');
const {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
} = require('docx');

// ===== CONFIG =====
const PORT       = process.env.PORT || 3000;
const COHERE_KEY = process.env.COHERE_API_KEY || '';
const AI_MODEL   = process.env.AI_MODEL || 'command-r-08-2024';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Subida en memoria (sin tocar disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ===== UTILIDADES =====

/** Nombre de archivo seguro: quita tildes y caracteres raros */
function sanitizeFilename(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // quita diacríticos
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'documento';
}

/** Devuelve la extensión en minúsculas */
function getExt(filename) {
  return path.extname(filename || '').slice(1).toLowerCase();
}

// ===== EXTRACCIÓN DE TEXTO =====

async function extractText(buffer, filename) {
  const ext = getExt(filename);

  if (ext === 'pdf') {
    const data = await pdfParse(buffer);
    return { text: data.text || '', pages: data.numpages || 1, isPdf: true };
  }

  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value || '', pages: 1, isPdf: false };
  }

  if (ext === 'csv') {
    try {
      const records = parse(buffer, { encoding: 'utf8', skip_empty_lines: true, relax_column_count: true });
      const text = records.map(r => r.join('\t')).join('\n');
      return { text, pages: 1, isPdf: false };
    } catch {
      return { text: buffer.toString('utf8'), pages: 1, isPdf: false };
    }
  }

  // txt, py, groovy, robot, xml — texto plano
  return { text: buffer.toString('utf8'), pages: 1, isPdf: false };
}

// ===== EXPORTACIONES =====

/** PDF -> TXT */
function buildTxtBuffer(text) {
  return Buffer.from(text, 'utf8');
}

/** PDF -> DOCX */
async function buildDocxBuffer(text) {
  const paragraphs = text.split(/\n{2,}/).filter(Boolean).map(p =>
    new Paragraph({ children: [new TextRun(p.trim())] })
  );
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: 'Documento convertido', heading: HeadingLevel.HEADING_1 }),
        ...paragraphs,
      ],
    }],
  });
  return Packer.toBuffer(doc);
}

/** PDF -> XLSX (texto por página) */
async function buildXlsxFromText(text) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Texto');
  ws.columns = [{ header: 'Contenido', key: 'texto', width: 120 }];
  text.split('\n').forEach(line => ws.addRow({ texto: line }));
  return wb.xlsx.writeBuffer();
}

/** Casos de prueba (CSV ;) -> XLSX */
async function buildTestCasesXlsx(csvText) {
  // Limpiar bloque markdown si lo hay
  const clean = csvText.replace(/```(?:csv)?\n?([\s\S]*?)\n?```/gi, '$1').trim();
  const lines  = clean.split('\n').filter(Boolean);
  const headers = lines[0].split(';').map(h => h.replace(/^"|"$/g, '').trim());
  const rows    = lines.slice(1).map(line =>
    line.split(';').map(cell => cell.replace(/^"|"$/g, '').trim())
  );

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Casos de prueba');
  ws.columns = headers.map(h => ({ header: h, key: h, width: 30 }));
  rows.forEach(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ''; });
    ws.addRow(obj);
  });

  // Estilo de encabezado
  ws.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  });

  return wb.xlsx.writeBuffer();
}

// ===== COHERE CLIENT =====
function getCohere() {
  const key = COHERE_KEY;
  if (!key) throw new Error('Falta COHERE_API_KEY en variables de entorno.');
  return new CohereClient({ token: key });
}

async function cohereChat(systemPrompt, userContent) {
  const cohere = getCohere();
  const resp = await cohere.chat({
    model: AI_MODEL,
    message: systemPrompt + '\n\n' + userContent,
  });
  return resp.text || '';
}

// ===== RUTAS API =====

/** POST /api/upload — extrae texto y metadata del documento */
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo.' });

    const { buffer, originalname, size } = req.file;
    const ext = getExt(originalname);
    const { text, pages, isPdf } = await extractText(buffer, originalname);

    res.json({
      filename:  originalname,
      basename:  sanitizeFilename(path.basename(originalname, path.extname(originalname))),
      ext,
      size,
      pages,
      isPdf,
      wordCount: text.trim() ? text.split(/\s+/).length : 0,
      charCount: text.length,
      text:      text.slice(0, 100000), // limitar payload
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

/** POST /api/download/txt — descarga TXT del texto extraído */
app.post('/api/download/txt', express.json({ limit: '20mb' }), async (req, res) => {
  const { text, basename } = req.body;
  const buf = buildTxtBuffer(text || '');
  const filename = sanitizeFilename(basename || 'documento') + '.txt';
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buf);
});

/** POST /api/download/docx */
app.post('/api/download/docx', express.json({ limit: '20mb' }), async (req, res) => {
  const { text, basename } = req.body;
  const buf = await buildDocxBuffer(text || '');
  const filename = sanitizeFilename(basename || 'documento') + '.docx';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buf);
});

/** POST /api/download/xlsx-text */
app.post('/api/download/xlsx-text', express.json({ limit: '20mb' }), async (req, res) => {
  const { text, basename } = req.body;
  const buf = await buildXlsxFromText(text || '');
  const filename = sanitizeFilename(basename || 'documento') + '.xlsx';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buf);
});

/** POST /api/ai/test-cases — genera casos de prueba en XLSX */
app.post('/api/ai/test-cases', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { text, basename } = req.body;
    const system = (
      'Eres un analista QA experto. Genera casos de prueba a partir del documento, en español. ' +
      'Responde ÚNICAMENTE con una tabla en CSV usando punto y coma (;) como separador. ' +
      'Primera línea (encabezado): ID;Test Step;Expected;TestData. ' +
      'Cada fila siguiente es un caso de prueba. Usa comillas dobles para campos con ; o saltos de línea.'
    );
    const raw = await cohereChat(system, 'DOCUMENTO:\n' + (text || '').slice(0, 25000));
    const buf  = await buildTestCasesXlsx(raw);
    const filename = sanitizeFilename(basename || 'documento') + '_casos_de_prueba.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: friendlyError(err) });
  }
});

/** POST /api/ai/katalon — genera script Groovy para Katalon */
app.post('/api/ai/katalon', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { text, basename } = req.body;
    const system = (
      'Eres un experto en automatización con Katalon Studio. Genera un script de prueba en Groovy ' +
      'basado en el documento. Usa keywords de Katalon: WebUI.openBrowser, WebUI.navigateToUrl, ' +
      'WebUI.click, WebUI.setText, WebUI.verifyElementPresent, WebUI.verifyTextPresent, WebUI.closeBrowser, etc. ' +
      'Responde ÚNICAMENTE con el código Groovy, sin explicaciones. Incluye comentarios útiles en el código.'
    );
    const raw  = await cohereChat(system, 'DOCUMENTO:\n' + (text || '').slice(0, 25000));
    const code = raw.replace(/```(?:groovy)?\n?([\s\S]*?)\n?```/gi, '$1').trim();
    const filename = sanitizeFilename(basename || 'documento') + '.groovy';
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(code, 'utf8'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: friendlyError(err) });
  }
});

/** POST /api/ai/question — responde preguntas sobre el documento */
app.post('/api/ai/question', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { text, question } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: 'Escribe una pregunta.' });
    const system = (
      'Respondes en español usando exclusivamente el contexto proporcionado. ' +
      'Si la información no está en el contexto, dilo explícitamente.'
    );
    const answer = await cohereChat(
      system,
      'Contexto:\n' + (text || '').slice(0, 30000) + '\n\nPregunta: ' + question
    );
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: friendlyError(err) });
  }
});

// ===== ERROR HANDLER =====
function friendlyError(err) {
  const msg = String(err?.message || err).toLowerCase();
  if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid api key'))
    return 'API key de Cohere inválida o expirada. Verifica COHERE_API_KEY.';
  if (msg.includes('429') || msg.includes('rate_limit'))
    return 'Límite de Cohere alcanzado. Espera un momento e intenta de nuevo.';
  if (msg.includes('timeout') || msg.includes('timed out'))
    return 'La solicitud tardó demasiado. Intenta con un documento más corto.';
  if (msg.includes('falta cohere'))
    return 'Falta COHERE_API_KEY. Agrégala como variable de entorno.';
  return String(err?.message || err);
}

// ===== INICIO =====
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  if (!COHERE_KEY) console.warn('ADVERTENCIA: COHERE_API_KEY no configurada.');
});
