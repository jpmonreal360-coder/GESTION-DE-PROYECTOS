# RUNBOOK OPERATIVO: PERSISTENCIA Y PREVENCIÓN DE REVERSIONES DE DATOS (PROYECTOS RC)

## ⚠️ Principio Fundamental

**Los despliegues (deployments) de Vercel NO son una base de datos ni constituyen un respaldo (backup).**  
Cualquier despliegue nuevo o reinstalado consulta y escribe sobre la misma base de datos remota persistente en Upstash Redis (`ws_rc_ws_main`). Por ello, desplegar una versión anterior del código **no restaura datos**, sino que consulta exactamente la misma base de datos.

---

## 🔑 1. Variables de Entorno Requeridas en Vercel

Para que la aplicación funcione en modo lectura/escritura canónico, se deben configurar las siguientes variables de entorno en Vercel (Production, Preview y Development):

| Variable | Descripción |
| :--- | :--- |
| `UPSTASH_REDIS_REST_URL` | URL del REST API de Upstash Redis (ej. `https://xxx.upstash.io`). |
| `UPSTASH_REDIS_REST_TOKEN` | Token de acceso REST para lectura/escritura en Upstash Redis. |
| `KV_REST_API_URL` | *(Alias alternativo para Vercel KV)*. |
| `KV_REST_API_TOKEN` | *(Alias alternativo para Vercel KV)*. |
| `ADMIN_BACKUP_SECRET` | *(Opcional)* Clave secreta de servidor para autorizar la API administrativa de respaldos. |

*Nota: Jamás publiques o incluyas tokens reales en archivos del repositorio, commits o pantalla.*

---

## 🩺 2. Verificación de Salud de Persistencia

Puedes verificar el estado del proveedor de base de datos y la revisión actual de producción sin exponer datos sensibles ni secretos mediante la API de salud:

```bash
GET https://gestion-de-proyectos-smoky.vercel.app/api/health/persistence
```

**Respuesta Esperada (`200 OK`):**
```json
{
  "provider": "upstash",
  "status": "ok",
  "workspaceKey": "ws_rc***in",
  "revision": 12,
  "updatedAt": 1787602822144,
  "updatedAtIso": "2026-08-24T20:42:40.999Z",
  "projectsCount": 4,
  "expensesCount": 220,
  "checksumPrefix": "15e7d8a44d9c",
  "commit": "3392eb042b1494cb1a4bde85abdb7fcc69972470"
}
```

Si la respuesta devuelve `503 PERSISTENCE_UNAVAILABLE`, la base de datos se encuentra inaccesible o faltan credenciales, y la aplicación entrará automáticamente en modo **`offline-readonly`** para no alterar los datos.

---

## 🛡️ 3. Protocolo de Respaldo Inmutable (App-Level Backups)

### A. Respaldos Preventivos Automáticos
El sistema crea automáticamente un respaldo inmutable en Redis con formato:
`ws_backup:<workspaceId>:backup:<timestamp>:rev<revision>`
antes de ejecutar **toda mutación masiva o destructiva** (borrado de proyectos, borrado masivo de gastos, reasignaciones de lotes o importaciones por pegado).

### B. Exportación de Respaldo JSON desde la Aplicación
Cualquier usuario puede descargar en cualquier momento una copia local con la versión y checksum actual:
1. Haz clic en el botón de exportar o en la opción del menú.
2. Se descargará el archivo `rc_ws_rc_ws_main_rev<revision>_<timestamp>.json`.
3. Este archivo contiene la estructura completa del workspace y su checksum SHA-256.

---

## 🔄 4. Restauración de Emergencia ante Incidentes

Si por algún motivo accidental se requiere restaurar una versión anterior:

1. **Localizar la clave de respaldo inmutable** en Upstash Redis (ejemplo: `ws_backup:rc_ws_main:preventive_initial:1787608445842`).
2. **Crear primero una copia de seguridad del estado destino actual** antes de sobreescribir.
3. Ejecutar una inyección REST `PUT` desde un entorno administrativo enviando el snapshot deseado con la nueva `expectedRevision`.

---

## 🚫 5. Qué Hacer ante Conflictos o Errores de Red

- **Si ves la alerta "Conflicto de Concurrencia (409)"**:  
  Significa que otra sesión modificó el servidor mientras tenías la ventana abierta. Haz clic en **"Recargar datos de la nube"** para actualizar tu vista sin perder consistencia, o haz clic en **"Exportar JSON Local"** para guardar tus cambios pendientes.
- **Si ves el banner "Modo Lectura Sin Conexión (503)"**:  
  Significa que el servidor de Redis no está disponible o las credenciales no respondieron. Las escrituras remotas están bloqueadas para prevenir que se envíen datos incompletos. Revisa las variables de entorno en Vercel Dashboard.
