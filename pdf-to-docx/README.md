# PDF a DOCX - Conversor con Angular + Node.js + Adobe PDF Services

Aplicación que convierte archivos PDF a DOCX manteniendo formato, imágenes y estructura del documento original.

## Arquitectura

```
Angular (Frontend)
  └─ Sube PDF
      ↓
Node.js (Backend API)
  └─ Envía PDF a Adobe PDF Services
      ↓
Adobe convierte PDF → DOCX
      ↓
Node devuelve DOCX
      ↓
Angular descarga el archivo
```

## Requisitos previos

- **Node.js** v18 o superior
- **Angular CLI** v17: `npm install -g @angular/cli`
- **Credenciales de Adobe PDF Services**: obtenerlas en [Adobe Developer Console](https://acrobatservices.adobe.com/dc-integration-creation-app-cdn/main.html)

## Configuración

### 1. Backend

```bash
cd pdf-to-docx/backend
npm install
```

Crear archivo `.env` con tus credenciales:

```env
PDF_SERVICES_CLIENT_ID=tu_client_id_aqui
PDF_SERVICES_CLIENT_SECRET=tu_client_secret_aqui
PORT=3000
```

### 2. Frontend

```bash
cd pdf-to-docx/frontend
npm install
```

## Ejecución

### Opción 1: Ejecutar por separado

**Backend** (terminal 1):
```bash
cd pdf-to-docx/backend
npm start
```

**Frontend** (terminal 2):
```bash
cd pdf-to-docx/frontend
ng serve
```

### Opción 2: Usar el script

```bash
cd pdf-to-docx
start-app.bat
```

## Acceso

- **Frontend Angular**: http://localhost:4200
- **Backend API**: http://localhost:3000

## Endpoint de la API

### POST `/api/pdf-to-docx`

- **Content-Type**: `multipart/form-data`
- **Campo**: `file` (archivo PDF, máximo 50 MB)
- **Respuesta**: archivo DOCX (blob)

## Estructura del proyecto

```
pdf-to-docx/
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   └── uploads/          (se crea automáticamente)
├── frontend/
│   ├── angular.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   └── src/
│       ├── index.html
│       ├── main.ts
│       ├── styles.css
│       └── app/
│           ├── app.component.ts
│           ├── services/
│           │   └── pdf-converter.service.ts
│           └── components/
│               └── pdf-converter/
│                   ├── pdf-converter.component.ts
│                   ├── pdf-converter.component.html
│                   └── pdf-converter.component.css
├── start-app.bat
└── README.md
```
