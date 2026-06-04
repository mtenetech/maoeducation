# Análisis de capacidad y costos (Railway) + base para plan de ventas

> Fecha: 2026-06-03 · Estado: estimación de ingeniería (requiere validación con prueba de carga).
> Moneda: USD. Tarifas Railway tomadas de docs oficiales (junio 2026).

## 1. Arquitectura desplegada (resumen)

- **API**: Fastify v4 + Prisma 5 → PostgreSQL. Un solo servicio. Auth por JWT (15 min) — la mayoría de requests **no** golpean la BD para autorizar (permisos van en el token).
- **Web**: build de Vite servido con `vite preview` (mejorable, ver §6).
- **Base de datos**: PostgreSQL 16, **una sola instancia compartida**. Multi-tenant por fila (`institution_id` en todas las tablas).
- **Implicación clave**: NO se levanta infraestructura por institución. Una API + una Postgres sirven a todas. El costo crece **sub-linealmente** con el número de instituciones.

## 2. Tarifas de Railway (oficiales)

| Recurso | Tarifa | Notas |
|---|---|---|
| CPU | **$20 / vCPU / mes** ($0.000463/vCPU‑min) | Se factura el uso **real** por segundo, no lo asignado |
| RAM | **$10 / GB / mes** | Idem, por segundo |
| Egress (red) | **$0.05 / GB** | Salida de datos |
| Volumen (disco) | **$0.15 / GB / mes** | Persistencia |
| Plan Hobby | $5/mes (incluye $5 de uso) | Para pruebas |
| Plan Pro | $20/mes (incluye $20 de uso) | Producción; cobro = $20 + (uso − $20) |

Fuente: railway.com/pricing y docs.railway.com/reference/pricing/plans.

## 3. Modelo de carga por institución (500 alumnos)

**Usuarios** ≈ 500 alumnos + ~500 representantes + ~40 docentes/staff ≈ **~1.000 usuarios**.

**Patrón de uso (SaaS escolar):**
- Activos diarios (DAU): ~40% → ~400 usuarios/día.
- Requests/usuario activo/día: ~30 (con caché de TanStack Query, staleTime 5 min, que reduce refetch).
- **~12.000 requests/día/institución** → promedio **~0,3 req/s** en ventana escolar (~12 h), pero **a ráfagas**.

**Pico (peor caso): día de publicación de boletines / cierre de notas:**
- Concurrencia activa pico: ~25–30% de usuarios → ~250–300 simultáneos.
- **~20 req/s sostenidos por institución**, picos cortos hasta ~40–50 req/s.

**Costo de CPU por request (estimado):**
- Lectura ligera (JWT + 1–3 queries Prisma): ~10–30 ms CPU, respuesta 2–15 KB.
- Reporte pesado (sábana de notas): ~100–300 ms CPU, respuesta 20–100 KB.
- Login (bcrypt cost 12): ~150–250 ms CPU (poco frecuente).
- Mezcla ponderada: **~25 ms CPU/req ≈ 0,025 vCPU‑s/req**.

## 4. Costo Railway por escenarios (infra compartida)

Railway factura **uso promedio mensual**, no el pico. El pico define cuánta **holgura/replicas** necesitas (latencia/disponibilidad), no tanto el costo.

> CPU promedio/institución ≈ 360.000 req/mes × 0,025 vCPU‑s = 9.000 vCPU‑s ≈ 2,5 vCPU‑h/mes ≈ **$0,07/inst/mes** en CPU puro. El costo real lo dominan el **baseline always‑on**, la **RAM para concurrencia** y el **egress**.

| Escenario | Alumnos | Pico agregado realista | Infra recomendada | **Costo Railway/mes** | Por institución |
|---|---|---|---|---|---|
| **1–10 instituciones** | ≤ 5.000 | ~40–60 req/s | 1 API (1 vCPU/1 GB) + web estática + Postgres (1 vCPU/1 GB) | **~$30–45** | ~$3–4,5 |
| **~50 instituciones** | ~25.000 | ~150–300 req/s | 1–2 réplicas API + Postgres (2–4 vCPU/2–4 GB) + PgBouncer | **~$90–140** | ~$1,8–2,8 |
| **~100 instituciones** | ~50.000 | ~300–600 req/s | 2–4 réplicas API + Postgres (4–8 vCPU) + PgBouncer + Redis | **~$180–300** | ~$1,8–3 |

**Peor caso teórico (todas pico a la vez):** 100 × 20 req/s = 2.000 req/s. Requiere 5–10 réplicas + read‑replica de Postgres + caché. Pero como Railway factura uso real, un pico breve casi no cambia la factura mensual; solo carga **sostenida** lo hace. En contexto escolar, el pico nacional simultáneo es raro (salvo boletines sincronizados).

**Almacenamiento (volumen):**
- Asistencia es la tabla más grande: modo diario ~90k filas/año/inst; modo por‑materia ~720k filas/año/inst.
- ~150–300 MB/institución/año (con índices). 100 instituciones ≈ 15–30 GB/año → **~$2–5/mes** de volumen. Trivial.

**Conclusión de costo:** a escala, la infraestructura cuesta **~$2–4 por institución/mes**. Con un colchón conservador (backups, monitoreo, soporte, sobre‑aprovisionamiento) presupuestar **$5–8 por institución/mes** all‑in.

## 5. Cuellos de botella y plan de escalado (orden de prioridad)

1. **Frontend con `vite preview`** → migrar a hosting estático (Railway static / Cloudflare Pages / CDN). Más rápido, más barato, elimina un servicio. **(Alta)**
2. **Sin compresión** → agregar `@fastify/compress` (gzip/brotli): −70–80% de egress y mejor latencia. **(Alta, fácil)**
3. **Uploads en disco local** (efímero en Railway) → adjuntar **Volume** o mover a **object storage** (Cloudflare R2 = egress gratis, ideal a escala). Riesgo actual: se pierden archivos al redeploy. **(Crítica)**
4. **Pooling de conexiones**: Prisma abre pool por instancia; con réplicas se puede agotar Postgres. Añadir **PgBouncer** antes de escalar horizontalmente. **(Alta antes de >1 réplica)**
5. **Caché (Redis)** para lecturas calientes (dashboard, reportes) y descargar Postgres a escala. **(Media, desde ~50 inst)**
6. **Endpoints de reporte pesados** (sábana anual hace N consultas por período en paralelo desde el cliente) → agregar en SQL/batch server‑side y cachear. **(Media)**
7. **Rate limiting** (`@fastify/rate-limit`) para evitar abuso y costos descontrolados. **(Media)**
8. **Índices multi‑tenant**: verificar índices por `institution_id` + filtros frecuentes; considerar particionar `attendance_records` por año a gran escala. **(Media)**
9. **Autoscaling** de la API en Railway (réplicas + healthcheck) con métricas de req/s y p95. **(Media)**
10. **Backups / PITR** de Postgres y observabilidad (latencia, conexiones, CPU). **(Alta operativa)**

## 6. Base para el plan de ventas

**Costo de infra por institución: ~$2–4/mes (escala) → presupuestar $5–8 all‑in.**

Referencia de mercado (sistemas de gestión escolar en LatAm): **$0,30–$1,50 por alumno/mes** o flat por institución.

Ejemplo con 500 alumnos:

| Plan | Precio | Ingreso/inst/mes | Costo infra | Margen bruto (infra) |
|---|---|---|---|---|
| Básico (por alumno) | $0,30/alumno | $150 | ~$5–8 | ~95% |
| Estándar | $0,60/alumno | $300 | ~$5–8 | ~97% |
| Premium (DECE, reportes, etc.) | $1,00/alumno | $500 | ~$5–8 | ~98% |

**Recomendaciones comerciales:**
- Cobrar **por alumno matriculado por año lectivo** (escala con el valor entregado y con el costo real, que también escala por alumno).
- Contratos **anuales** (alinea con el año escolar y mejora el flujo de caja).
- La infraestructura es **2–5% del ingreso** incluso en el plan más barato → margen sano; el costo real del negocio es **soporte, ventas y desarrollo**, no la nube.
- Ofrecer un **piloto gratuito** (Railway Hobby/Trial) por bajo costo.
- A partir de ~50 instituciones, renegociar **committed spend** con Railway (descuentos Pro/Enterprise) o evaluar VPS dedicado si el margen lo justifica.

## 7. Próximos pasos para validar

1. **Prueba de carga** con k6 o Artillery sobre los endpoints calientes (login, dashboard, notas/sábana, asistencia bulk) para calibrar ms‑CPU/req y req/s por instancia reales.
2. Medir **payload promedio** real (antes/después de compresión) para fijar el egress.
3. Implementar las mejoras 1–4 de §5 (estáticos, compresión, uploads en R2, PgBouncer) — bajan costo y suben capacidad antes de vender a escala.
4. Definir SLO (p95 < 300 ms, disponibilidad 99,5%) y umbrales de autoscaling.

> Nota: todos los números son estimaciones de ingeniería basadas en patrones típicos de SaaS escolar y en el código actual. Una prueba de carga ajustará ±2–3× la parte de CPU/req, que es la de mayor incertidumbre.

---

## 8. Mejoras implementadas (explicado para dummies)

Se implementaron 3 mejoras en el **código** (ya funcionan) y 1 es de **configuración** que debes hacer tú en los paneles de Railway/Cloudflare. Aquí qué es cada una y por qué importa.

### ✅ 1. Compresión de respuestas (HECHO en código)
**Qué es:** el servidor ahora "empaqueta apretado" (gzip/brotli) los datos antes de enviarlos al navegador, como un ZIP automático.
**Por qué:** un JSON de 50 KB viaja como ~10 KB. Menos datos = **menos costo de egress** (lo que cobra Railway por datos que salen) y **páginas más rápidas**, sobre todo en celulares con internet lento.
**Tú no haces nada.** Ya está activo (`@fastify/compress`, solo comprime respuestas > 1 KB).

### ✅ 2. Archivos en almacenamiento durable (HECHO en código, falta crear el bucket)
**El problema:** los adjuntos (tareas, mensajes, evidencias de incidentes) se guardaban en el **disco del servidor**. En Railway ese disco es **temporal**: en cada actualización del código **se borra todo**. Es decir, los archivos subidos se perdían.
**La solución:** ahora la app sabe guardar los archivos en un **bucket** (un "disco en la nube" permanente) compatible con S3. Recomendado: **Cloudflare R2** (barato y con descarga gratis).
**Cómo funciona:** si no configuras nada, sigue usando el disco local (sirve para desarrollo). Cuando pones las variables de entorno del bucket, automáticamente guarda ahí. El frontend no cambia: las descargas pasan por la misma URL `/uploads/...`.
**Qué debes hacer tú (una vez):**
1. Crear una cuenta en Cloudflare → R2 → crear un bucket (ej. `mao-uploads`).
2. Generar un "API Token" de R2 (te da una *access key* y una *secret key*).
3. En Railway, en el servicio de la **API**, agregar estas variables:
   - `STORAGE_DRIVER=s3`
   - `S3_ENDPOINT=https://<tu_account_id>.r2.cloudflarestorage.com`
   - `S3_BUCKET=mao-uploads`
   - `S3_ACCESS_KEY_ID=...`
   - `S3_SECRET_ACCESS_KEY=...`
   - `S3_REGION=auto`
4. Redeploy. Listo: los nuevos archivos van al bucket y ya no se pierden.
> El logo de la institución y del boletín ya se guardan como "data URI" dentro de la base de datos, así que esos nunca se perdían.

### ✅ 3. Listo para PgBouncer / pooling de conexiones (HECHO en código, falta activar el pooler)
**Qué es:** cada copia de la API abre varias "líneas telefónicas" (conexiones) hacia Postgres. Si pones varias copias (réplicas) para aguantar más carga, se pueden **agotar** las conexiones de Postgres y todo falla. **PgBouncer** es un "recepcionista" que reparte un número pequeño de líneas entre muchas llamadas.
**Lo que se hizo en código:** Prisma ahora usa dos URLs: `DATABASE_URL` (por el pooler) y `DIRECT_URL` (conexión directa, solo para migraciones). En local ambas son iguales.
**Qué debes hacer tú (cuando vayas a escalar, ~50+ instituciones o >1 réplica):**
1. Agregar PgBouncer (Railway tiene plantilla / o el pooler de tu Postgres).
2. En Railway poner:
   - `DATABASE_URL` = URL del **pooler** + `?pgbouncer=true`
   - `DIRECT_URL` = URL **directa** de Postgres (la de siempre)
> Si aún no escalas, no hace falta tocar nada: con ambas iguales funciona idéntico a antes.

### ⚙️ 4. Frontend como sitio estático / CDN (configuración, NO código)
**El problema:** el frontend se sirve con `vite preview`, que es un servidor pensado para *pruebas*, corre en un proceso Node 24/7 (cuesta) y no usa CDN.
**La solución (recomendada):** publicar el build del frontend en **Cloudflare Pages** (hosting estático **gratis**, rápido y global). Así eliminas ese servicio de Railway (ahorras el baseline always‑on) y la web carga desde el servidor más cercano al usuario.
**Qué debes hacer tú (una vez):**
1. Cloudflare → Pages → conectar el repo.
2. Build command: `pnpm --filter web build` · Output dir: `apps/web/dist`.
3. Variable `VITE_API_URL` apuntando a la API de Railway.
4. Apuntar tu dominio a Pages.
> Alternativa sin CDN: servir el frontend desde la propia API (un solo servicio). Se puede hacer después si prefieres simplicidad sobre velocidad.

### Resumen de impacto
| Mejora | Estado | Beneficio |
|---|---|---|
| Compresión | ✅ código | −70–80% egress, más rápido |
| Archivos en R2 | ✅ código (crear bucket) | **no se pierden archivos**, egress gratis en R2 |
| PgBouncer‑ready | ✅ código (activar pooler al escalar) | permite réplicas sin tumbar Postgres |
| Frontend en CDN | ⚙️ configuración | −1 servicio always‑on, web más rápida |
