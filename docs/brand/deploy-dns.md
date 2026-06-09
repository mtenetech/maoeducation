# Despliegue de Auleka en Railway + DNS

Arquitectura objetivo (todo en **un mismo proyecto Railway**, 3 servicios):

| Servicio | Carpeta (Root Directory) | Dominio | Construye con |
|---|---|---|---|
| **landing** | `apps/landing` | `auleka.com` + `www.auleka.com` | `apps/landing/nixpacks.toml` (Astro) |
| **web** (app) | `apps/web` | `app.auleka.com` | `apps/web/nixpacks.toml` (Vite) |
| **api** | `apps/api` | `api.auleka.com` | `apps/api/nixpacks.toml` (Fastify) |

> La app y la API probablemente ya existen como servicios. Solo se **agrega** el servicio `landing`
> y se ajustan dominios + variables de entorno.

---

## 1. Registrar el dominio

1. Registra **`auleka.com`** (está libre hoy). Cualquier registrador sirve (GoDaddy, Namecheap, Cloudflare…).
2. Opcional, para señal local: registra **`auleka.ec`** y/o **`auleka.com.ec`** en **https://nic.ec**
   (GoDaddy NO vende `.ec`). Puedes redirigirlos a `auleka.com`.
3. Recomendado: gestionar el DNS desde **Cloudflare** (gratis) — facilita el dominio raíz (ver §4).

## 2. Crear el servicio `landing` en Railway

1. En el proyecto Railway → **New Service → GitHub Repo** → este repo.
2. **Settings → Root Directory:** `apps/landing`.
3. Railway detecta `nixpacks.toml` (build `pnpm build`, start `astro preview --host 0.0.0.0 --port $PORT`).
4. Si el build se queja por `pnpm`, fija **Settings → Build → Install Command** vacío (lo maneja nixpacks).

## 3. Variables de entorno por servicio

**landing**
```
PUBLIC_API_URL=https://api.auleka.com
PUBLIC_APP_URL=https://app.auleka.com
```
> Son `PUBLIC_*` → se incrustan en el build. Si las cambias, hay que **redesplegar** la landing.

**web** (app)
```
VITE_API_URL=https://api.auleka.com
```
> La app ya lee `VITE_API_URL` en `apps/web/src/shared/lib/api-client.ts`. En prod debe apuntar a la API.

**api**
```
CORS_ORIGINS=https://auleka.com,https://www.auleka.com,https://app.auleka.com
FRONTEND_URL=https://app.auleka.com   # (compatibilidad / cookies)
```
> Sin `CORS_ORIGINS`, el formulario de la landing fallará por CORS en producción.
> El código ya soporta la lista separada por comas (`apps/api/src/app.ts`).

### 3.bis Despliegue temporal (URLs de Railway, mientras propaga `auleka.com`)

Funciona TODO sin el dominio, usando las URLs `*.up.railway.app`. URLs conocidas hoy:

- **api:** `https://api-production-1cb4.up.railway.app`
- **web:** `https://web-production-fc25c.up.railway.app`
- **landing:** `https://<se-genera-al-crear-el-servicio>.up.railway.app`

Variables a usar mientras tanto:

```
# landing
PUBLIC_API_URL=https://api-production-1cb4.up.railway.app
PUBLIC_APP_URL=https://web-production-fc25c.up.railway.app

# web
VITE_API_URL=https://api-production-1cb4.up.railway.app

# api
CORS_ORIGINS=https://web-production-fc25c.up.railway.app,https://<URL-de-la-landing>.up.railway.app
```

Cuando `auleka.com` propague: cambia estas variables a los dominios finales, **redespliega** (la landing y la web
hornean sus `PUBLIC_*`/`VITE_*` en build) y agrega los dominios personalizados (§4).

## 4. Dominios personalizados + DNS

En cada servicio Railway → **Settings → Networking → Custom Domain**, agrega el dominio. Railway te dará
un destino **CNAME** (algo como `xxxx.up.railway.app`). Crea los registros en tu DNS:

| Registro | Tipo | Apunta a | Servicio |
|---|---|---|---|
| `app.auleka.com` | CNAME | (target de Railway) | web |
| `api.auleka.com` | CNAME | (target de Railway) | api |
| `www.auleka.com` | CNAME | (target de Railway) | landing |
| `auleka.com` (raíz) | CNAME/ALIAS/ANAME | (target de Railway) | landing |

> **Dominio raíz (`auleka.com`):** los CNAME no se permiten en la raíz en DNS clásico. Usa el
> **CNAME flattening** de Cloudflare (o un registro ALIAS/ANAME). Por eso se recomienda Cloudflare.
> Alternativa: deja la raíz como redirección 301 a `www.auleka.com`.

TLS/HTTPS lo emite Railway automáticamente una vez el DNS resuelve.

## 5. Verificación post-deploy

1. `https://auleka.com` carga la landing.
2. `https://app.auleka.com` carga la app (login Auleka).
3. En la landing, envía el formulario "Solicita una demo" → debe redirigir a `/gracias` y crear el lead.
4. Ver leads (superadmin de plataforma): `GET https://api.auleka.com/api/v1/leads` con el token de plataforma,
   o consultar la tabla `leads` en la BD.
5. Pega `https://auleka.com` en WhatsApp → debe mostrar la tarjeta con título, descripción e imagen.

## 6. Pendientes recomendados (no bloquean el lanzamiento)

- **OG image en PNG:** `public/og-image.svg` es vectorial; algunos previsualizadores (WhatsApp/Facebook)
  renderizan mejor **PNG/JPG**. Exporta el SVG a `og-image.png` (1200×630) y actualiza el `<meta og:image>`
  en `apps/landing/src/layouts/Layout.astro`.
- **Notificación de leads:** hoy el lead solo se guarda en BD (`apps/api/.../create-lead.use-case.ts` tiene un
  TODO). Integra un correo/WhatsApp al equipo de ventas cuando definas el proveedor.
- **Analítica:** agrega el pixel de Meta y Google Analytics/Tag Manager en `Layout.astro` para medir
  conversiones de los anuncios.
- **Logo definitivo:** los SVG están generados en código (wordmark con tipografía Poppins). Un diseñador
  puede vectorizar el wordmark a trazos para piezas impresas.
