require('dotenv').config();

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  ExportPDFJob,
  ExportPDFParams,
  ExportPDFTargetFormat,
  SDKError,
  ServiceUsageError,
  ServiceApiError
} = require('@adobe/pdfservices-node-sdk');

const app = express();
app.use(cors());

// Configurar multer con límite de tamaño (50 MB) y filtro de tipo
const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

// Función auxiliar para limpiar archivos temporales
function limpiarArchivos(...rutas) {
  rutas.forEach(ruta => {
    try {
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    } catch (e) {
      console.error(`No se pudo eliminar ${ruta}:`, e.message);
    }
  });
}

app.post('/api/pdf-to-docx', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ningún archivo PDF' });
  }

  const pdfPath = req.file.path;
  const originalName = req.file.originalname || 'documento.pdf';
  const docxName = originalName.replace(/\.pdf$/i, '.docx');
  const outputPath = path.join(__dirname, 'uploads', `${Date.now()}-${docxName}`);

  try {
    // 1. Crear credenciales
    const credentials = new ServicePrincipalCredentials({
      clientId: process.env.PDF_SERVICES_CLIENT_ID,
      clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET
    });

    // 2. Crear instancia de PDFServices
    const pdfServices = new PDFServices({ credentials });

    // 3. Subir el PDF a Adobe
    const inputAsset = await pdfServices.upload({
      readStream: fs.createReadStream(pdfPath),
      mimeType: MimeType.PDF
    });

    // 4. Configurar parámetros de exportación a DOCX
    const params = new ExportPDFParams({
      targetFormat: ExportPDFTargetFormat.DOCX
    });

    // 5. Crear y enviar el job de conversión
    const job = new ExportPDFJob({ inputAsset, params });
    const pollingURL = await pdfServices.submit({ job });

    // 6. Obtener resultado
    const pdfServicesResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: ExportPDFJob.Result
    });

    const resultAsset = pdfServicesResponse.result.asset;
    const streamAsset = await pdfServices.getContent({ asset: resultAsset });

    // 7. Escribir el DOCX a disco
    const writeStream = fs.createWriteStream(outputPath);
    streamAsset.readStream.pipe(writeStream);

    writeStream.on('finish', () => {
      res.download(outputPath, docxName, (err) => {
        if (err) {
          console.error('Error enviando archivo:', err);
        }
        limpiarArchivos(pdfPath, outputPath);
      });
    });

    writeStream.on('error', (err) => {
      console.error('Error escribiendo archivo:', err);
      limpiarArchivos(pdfPath, outputPath);
      res.status(500).json({ error: 'Error al guardar el archivo convertido' });
    });

  } catch (error) {
    limpiarArchivos(pdfPath, outputPath);

    if (error instanceof SDKError) {
      console.error('SDK Error:', error.message);
    } else if (error instanceof ServiceUsageError) {
      console.error('Service Usage Error:', error.message);
    } else if (error instanceof ServiceApiError) {
      console.error('Service API Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }

    res.status(500).json({ error: 'Error al convertir PDF a DOCX' });
  }
});

// Manejo de errores de multer
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'El archivo excede el tamaño máximo de 50 MB' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API activa en http://localhost:${PORT}`);
});
