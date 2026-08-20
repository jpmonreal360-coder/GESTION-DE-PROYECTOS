#  PROYECTOS RC - Gestión Multiproyecto Estilo Apple & Notion

Plataforma de alta fidelidad para la gestión integral de múltiples proyectos con experiencia de usuario inspirada en el lenguaje de diseño de **Apple (macOS Tahoe / iOS SF System)** y las capacidades organizativas de **Notion**.

---

## 🌟 Solución de Producción Vercel & Netlify

Se corrigió la falta de archivo `postcss.config.js` requerida para la compilación de Tailwind CSS y PostCSS en Vercel. Ahora la aplicación compila con el 100% de sus estilos esmerilados y componentes responsivos intactos tanto en Next.js como en la versión web nativa.

### 1. Dirección de Diseño & UI/UX (Estilo Apple)
- **Minimalismo Refinado**: Jerarquía tipográfica pulida (Inter / San Francisco), espacios holgados y paleta monocromática elegante.
- **Glassmorphism Acelerado por GPU**: Fondos esmerilados con efecto `backdrop-blur-2xl` y microbordes translúcidos.
- **Visor Modal Lightbox de Fotos HD**:
  - Al hacer clic en **"Ver Foto"** o en la **miniatura de la imagen**, se abre un visor modal emergente esmerilado en pantalla completa con soporte para imágenes de alta resolución, capturas pegadas con **Ctrl+V** y opción de descarga directa.
- **Diseño 100% Responsivo**: Compatible con smartphones (iOS Safari, Android Chrome), tablets y pantallas de escritorio.

### 2. Gestión de Documentos & Pegado Directo de Capturas (Ctrl+V)
- **📋 Pegado de Screenshots / Fotos (Ctrl+V)**: Copia cualquier captura y presiona **Ctrl+V**.
- **📕 Archivos PDF y 📊 Google Sheets**: Subida de PDF y enlaces a Google Sheets.

### 3. Gestión Integral (Edición, Eliminación, Fechas Editables & Asignación)
- **📅 Fechas Editables en Todos los Conceptos** (Proyectos, Finanzas, Tareas y Documentos).
- **✏️ Edición y 🗑️ Eliminación Completa** de Proyectos, Transacciones, Tareas y Documentos.
- **👤 Asignación de Tareas** a responsables del equipo (`Edmundo A.`, `Sofia R.`, `Carlos M.`, `Lucia P.`).

---

## 📁 Arquitectura del Proyecto

```text
GESTION DE PROYECTOS/
├── index.html                  # Aplicación Web Nativa (Lightbox Modal HD / Ctrl+V Paste / CRUD)
├── styles.css                  # Sistema de Diseño CSS responsivo Apple
├── app.js                      # Lógica reactiva (Visor Lightbox, Clipboard API, Drag & Drop)
├── postcss.config.js           # Configuración PostCSS para compilación Vercel / Next.js
├── production_deployment_guide.md # Guía completa de salida a producción (Netlify / Vercel)
├── prisma/
│   └── schema.prisma           # Esquema relacional Prisma
├── src/                        # Componentes React Next.js 14+
└── README.md                   # Documentación y guía de instalación
```
