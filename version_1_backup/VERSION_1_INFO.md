# 📌 PROYECTOS RC - Respaldo de la Versión 1 (Estable & Testeada por Agentes QA)

Se ha creado una copia de seguridad completa e inmutable de la **Versión 1** en la carpeta `version_1_backup/`.

---

## 🛡️ Contenido del Respaldo Versión 1
- **Aplicación Web Nativa**: `index.html`, `app.js`, `styles.css` (con pegado de capturas Ctrl+V, visor modal Lightbox HD, fechas editables, CRUD completo y Balance Neto).
- **Aplicación React / Next.js 14 App Router**: `src/` (`page.tsx`, `components/`, `types/index.ts`).
- **Configuración de Producción Vercel & Netlify**: `postcss.config.js`, `tailwind.config.js`, `tsconfig.json`, `package.json`, `prisma/schema.prisma`.
- **Documentación & Guías**: `production_deployment_guide.md`, `README.md`.

---

## ↺ Cómo Restaurar la Versión 1 en el Futuro

Si en algún momento se hacen cambios que rompan la aplicación o deseas regresar exactamente a esta Versión 1, puedes ejecutar el siguiente comando en la terminal PowerShell dentro de la carpeta del proyecto:

```powershell
Copy-Item -Recurse -Force -Path 'version_1_backup\*' -Destination '.'
```

O copiar manualmente todos los archivos dentro de la carpeta `version_1_backup/` y reemplazarlos en la raíz del proyecto.
