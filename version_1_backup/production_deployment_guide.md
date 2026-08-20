# 🚀 Guía de Salida a Producción: PROYECTOS RC

Esta guía paso a paso detalla el procedimiento profesional para desplegar la plataforma **PROYECTOS RC** en servidores de producción con alta disponibilidad, optimización responsiva multi-dispositivo (iOS, Android, Tablet, Desktop) y base de datos relacional.

---

## 📱 Verificación Responsiva Multi-Dispositivo

- **Smartphones (iOS Safari & Android Chrome)**:
  - Menú lateral tipo *Drawer* colapsable mediante botón hamburguesa (☰).
  - Modales centrados con desplazamiento táctil.
  - Tablero Kanban adaptable a 1 columna o vista en tabla deslizable.
- **Tablets (iPad / Galaxy Tab)**:
  - Cuadrículas adaptativas de 2 columnas para métricas y finanzas.
- **Desktops & Laptops**:
  - Vista completa de 4 columnas, atajo de teclado **⌘K / Ctrl+K** y *glassmorphism* de alta velocidad.

---

## 🌐 Pasos para Publicar la Aplicación en Producción

### OPCIÓN 1: Publicación Inmediata con Netlify Drop o Vercel (Recomendada en 1 minuto)

Si deseas publicar la aplicación web nativa completa que funciona instantáneamente:

1. Abre tu navegador e ingresa a **[drop.netlify.com](https://drop.netlify.com)** o a tu consola de **[Vercel](https://vercel.com)**.
2. Abre la carpeta del proyecto en tu computadora: `c:\Users\Edmundo\Desktop\GESTION DE PROYECTOS`.
3. Arrastra y suelta la carpeta entera dentro de la pantalla de Netlify o Vercel.
4. En menos de **10 segundos**, obtendrás un enlace público con SSL gratis, ejemplo: `https://proyectos-rc.netlify.app`.

---

### OPCIÓN 2: Publicación Completa en Vercel con Repositorio GitHub

Para tener despliegues automáticos cada vez que hagas cambios:

#### Paso A: Subir el Proyecto a GitHub
1. Abre una terminal dentro de `c:\Users\Edmundo\Desktop\GESTION DE PROYECTOS`.
2. Ejecuta los comandos:
   ```bash
   git init
   git add .
   git commit -m "Feat: PROYECTOS RC v1.0 Responsivo"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/proyectos-rc.git
   git push -u origin main
   ```

#### Paso B: Conectar en Vercel
1. Ingresa a **[Vercel.com](https://vercel.com)** e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New Project"** e selecciona el repositorio `proyectos-rc`.
3. En la sección **Build and Output Settings**:
   - **Framework Preset**: Next.js (o Other si solo despliegas el index.html).
   - **Build Command**: `npx prisma generate && next build` (para Next.js).
4. Si usas base de datos en la nube (Supabase / Neon), agrega la variable de entorno `DATABASE_URL`.
5. Haz clic en **"Deploy"**. En 1 minuto tendrás la aplicación desplegada en producción.

---

### OPCIÓN 3: Base de Datos Relacional PostgreSQL en la Nube (Supabase / Neon)

1. Ingresa a **[Supabase.com](https://supabase.com)** o **[Neon.tech](https://neon.tech)** y crea una cuenta gratuita.
2. Crea una base de datos llamada `proyectos-rc-db`.
3. Copia tu cadena de conexión PostgreSQL (`DATABASE_URL`).
4. En el proyecto local, en `prisma/schema.prisma` cambia el proveedor a `postgresql`.
5. Ejecuta en tu terminal:
   ```bash
   npx prisma db push
   ```

---

## 🔒 Configuración de Dominio Personalizado & SSL Gratis

1. En tu panel de Vercel o Netlify, ve a **Settings > Domains**.
2. Agrega tu dominio propio (ejemplo: `www.proyectosrc.com`).
3. Apunta los registros CNAME o A en tu proveedor de dominio (GoDaddy, Namecheap, Cloudflare):
   - **Registro A**: `@` -> `76.76.21.21`
   - **Registro CNAME**: `www` -> `cname.vercel-dns.com`
4. El certificado SSL (HTTPS) se activará automáticamente sin costo adicional.
