# Fundación Ecológica Bacatá — sitio web

Sitio estático (HTML, CSS y JS sin frameworks), listo para **Cloudflare Pages** (gratis).
Tiene una sola función de servidor (`/api/instagram`) para mostrar el feed de Instagram sin exponer el token.

```
bacata-web/
├── public/                  ← lo que se publica
│   ├── index.html           Inicio, redes (Instagram + Facebook + YouTube) y contacto
│   ├── quienes-somos.html   Propósito, misión, visión, valores, servicios, experiencia,
│   │                        cultura ambiental, pedagogía, ecoladrillos
│   ├── historia.html
│   ├── huerta.html          Huerta comunitaria Cassandra (paso a paso)
│   ├── biblioteca.html      Nuestro inicio, actividades, Ambiente y Ciudadanía
│   ├── servicio-social.html Objetivos, reglamento, plantas invasoras, socialización, juegos
│   ├── galeria.html         Biblioteca, huerta, servicio social (con visor de fotos)
│   ├── 404.html
│   ├── _headers             Cabeceras de seguridad y caché para Cloudflare
│   └── assets/css, assets/js
├── functions/api/instagram.js   Pages Function: feed de Instagram con token auto-renovable
├── tools/localizar_imagenes.py  Descarga las imágenes de Wix al proyecto
└── wrangler.toml
```

## 1. Verlo en local

Sin Instagram (solo el sitio):

```bash
cd public && python3 -m http.server 8080
# abre http://localhost:8080
```

Con la función de Instagram (necesitas Node):

```bash
npx wrangler pages dev
```

Si la función no está configurada, la sección de Instagram muestra un botón a la cuenta en vez de la grilla, así que el sitio nunca se ve roto.

## 2. Sacar las imágenes de Wix (recomendado antes de publicar)

Por ahora las imágenes se cargan desde el CDN de Wix (`static.wixstatic.com`). Si la fundación cancela Wix, pueden dejar de verse. Para copiarlas al proyecto:

```bash
python3 tools/localizar_imagenes.py
```

El script descarga cada imagen a `public/assets/img/` y reescribe los HTML. Después revisa la etiqueta `og:image` de cada página y ponle la URL completa con el dominio final, por ejemplo `https://febacata.org/assets/img/...`.

## 3. Publicar en Cloudflare Pages

**Opción A, con Git (recomendada):** sube esta carpeta a un repositorio de GitHub. En Cloudflare ve a *Workers & Pages → Create → Pages → Connect to Git*, elige el repo y usa estos valores:
- Build command: *(vacío)*
- Build output directory: `public`

Cada `git push` publica automáticamente.

**Opción B, por comando:**

```bash
npx wrangler pages deploy
```

**Dominio:** en el proyecto de Pages ve a *Custom domains*, agrega `febacata.org` (o el dominio que tengan) y sigue los pasos de DNS.

## 4. Activar el feed de Instagram

Requisito: la cuenta **@bacata_fundacion_ecologica** debe ser **profesional** (Empresa o Creador) y pública.

1. Entra a <https://developers.facebook.com/apps>, crea una app de tipo **Business** y agrega el producto **Instagram → API setup with Instagram login**.
2. En *Generate access tokens*, agrega la cuenta de Instagram. Quien administra la cuenta tiene que iniciar sesión y aceptar. Luego copia el **token de larga duración**, que dura 60 días.
3. Crea el KV y pega el `id` que te devuelve en `wrangler.toml`:
   ```bash
   npx wrangler kv namespace create IG_KV
   ```
   Si publicaste con Git, enlázalo también en el panel: *Settings → Bindings → KV namespace*, con el nombre `IG_KV`.
4. Guarda el token como secreto:
   ```bash
   npx wrangler pages secret put IG_TOKEN
   ```
   También puedes hacerlo desde el panel, en *Settings → Variables and secrets*, como tipo **Secret**.
5. Vuelve a publicar y prueba `https://tu-dominio/api/instagram`. Debe devolver JSON con `items`.

La función renueva el token sola cada 7 días y guarda el nuevo en KV. Mientras el sitio reciba al menos una visita cada 60 días, el token no vence. Si algún día vence, repite el paso 4.

## 5. Facebook

La sección usa el **Page Plugin oficial** de Meta, que es un iframe y no necesita tokens. Solo funciona si `fundacionecologicabacata.febacata` es una **Página** de Facebook y no un perfil personal. Si es un perfil, el recuadro sale vacío: crea una Página y cambia la URL `FB` en `index.html`.

## 6. Formulario de contacto

El formulario funciona sin servidor usando **Web3Forms**, que es gratis:

1. En <https://web3forms.com> escribe `fundacion@febacata.org` y te llega una *Access Key* al correo.
2. Pégala en `public/assets/js/main.js`, en `CONFIG.web3formsKey`.

Mientras no la pongas, el botón "Enviar" abre el programa de correo del visitante con el mensaje ya escrito.

## Pendientes de contenido

- **Ecoladrillos:** la página del sitio Wix estaba vacía y quedó marcada como "Contenido en preparación" en `quienes-somos.html`.
- **Visión:** el texto original decía "para el año 2021". Se quitó la fecha; confirma con la fundación la redacción actual.
- Las láminas de *Cultura ambiental*, *Pedagogía* y *Juegos* son imágenes con texto. Para que Google las lea, conviene pasar ese texto a HTML.
