# Guía de Despliegue en Producción — PROYECTOS RC (Vercel & Cloud DB)

Esta guía detalla los pasos requeridos para desplegar **PROYECTOS RC** en Vercel con persistencia real en la nube sin parpadeos ni almacenamiento en memoria volátil.

---

## 🗄️ Requerimiento Principal: Base de Datos Persistente (Upstash Redis / Vercel KV REST)

El backend de la aplicación (`src/app/api/workspace/[id]/route.ts`) es 100% stateless y consulta directamente un almacén persistente clave-valor compartido globalmente por todas las funciones Serverless de Vercel.

### 🔑 Variables de Entorno Obligatorias en Vercel Production

Debes configurar las siguientes variables en el panel de **Vercel Dashboard ➔ Settings ➔ Environment Variables**:

| Variable | Descripción / Ejemplo |
| :--- | :--- |
| `UPSTASH_REDIS_REST_URL` | URL de la API REST de Upstash Redis (ej. `https://your-database.upstash.io`) |
| `UPSTASH_REDIS_REST_TOKEN` | Token Bearer de la API REST de Upstash Redis |
| `KV_REST_API_URL` | (Alias automático de Vercel KV) `https://your-database.upstash.io` |
| `KV_REST_API_TOKEN` | (Alias automático de Vercel KV) `your_bearer_token` |

> ⚠️ **IMPORTANTE:** Si cualquiera de estas variables falta en el entorno de producción, la API responderá con un código **HTTP 503 Service Unavailable** explícito, impidiendo servir datos de memoria o fallbacks de datos demo obsoletos.

---

## 🚀 Pasos de Despliegue en Vercel

1. **Vincular Repositorio GitHub:**
   - Conecta el repositorio `jpmonreal360-coder/GESTION-DE-PROYECTOS` a tu proyecto en Vercel.

2. **Configurar Variables de Entorno:**
   - Ve a **Settings ➔ Environment Variables** en Vercel.
   - Agrega `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` (o activa la integración **Storage ➔ Vercel KV**).

3. **Re-desplegar (Redeploy):**
   - Ve a la pestaña **Deployments**.
   - Haz clic en `...` en el despliegue más reciente y selecciona **Redeploy** (desmarcando *"Use existing build cache"*).

---

## 🧪 Verificación de Producción (12 Consultas Consecutivas GET)

Ejecuta el siguiente comando contra tu endpoint desplegado:

```bash
for i in $(seq 1 12); do
  curl -sS -H 'Cache-Control: no-store' https://gestion-de-proyectos-smoky.vercel.app/api/workspace/rc_ws_main
  echo
done
```

**Criterios de Aceptación:**
- Las 12 respuestas devuelven **HTTP 200 OK** con exactamente el mismo `updatedAt` y el mismo payload.
- Ninguna solicitud devuelve `notFound: true` mientras el workspace exista en la base de datos.
- Las mutaciones (crear/eliminar proyecto) persisten tras recargar (F5) y entre sesiones independientes sin reaparición de elementos eliminados.

<!-- Auto Trigger Upstash KV Production Sync -->
