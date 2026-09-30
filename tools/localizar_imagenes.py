#!/usr/bin/env python3
"""
Descarga todas las imágenes que el sitio carga desde Wix (static.wixstatic.com)
a public/assets/img/ y reescribe los HTML para usar las copias locales.

Así el sitio deja de depender de la cuenta de Wix.

Uso (desde la carpeta del proyecto):
    python3 tools/localizar_imagenes.py

Solo usa la librería estándar de Python 3.
"""
import os
import re
import sys
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(RAIZ, "public")
DESTINO = os.path.join(PUBLIC, "assets", "img")
PATRON = re.compile(r"https://static\.wixstatic\.com/media/([^/\"'\s)]+)/v1/fit/w_(\d+),h_\d+,q_\d+/[^\"'\s)]+")


def nombre_local(media_id, ancho):
    base, ext = os.path.splitext(media_id)
    base = re.sub(r"[^A-Za-z0-9_-]", "-", base)
    return f"{base}-w{ancho}{ext.lower() or '.jpg'}"


def main():
    os.makedirs(DESTINO, exist_ok=True)
    htmls = [f for f in os.listdir(PUBLIC) if f.endswith(".html")]
    urls = {}
    for f in htmls:
        with open(os.path.join(PUBLIC, f), encoding="utf-8") as fh:
            for m in PATRON.finditer(fh.read()):
                urls[m.group(0)] = nombre_local(m.group(1), m.group(2))

    print(f"{len(urls)} imágenes encontradas en {len(htmls)} páginas")
    fallidas = set()
    for i, (url, archivo) in enumerate(sorted(urls.items()), 1):
        ruta = os.path.join(DESTINO, archivo)
        if os.path.exists(ruta):
            continue
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=60) as r, open(ruta, "wb") as out:
                out.write(r.read())
            print(f"[{i}/{len(urls)}] {archivo}")
        except Exception as err:  # noqa: BLE001
            fallidas.add(url)
            print(f"[{i}/{len(urls)}] ERROR {url}: {err}", file=sys.stderr)

    for f in htmls:
        p = os.path.join(PUBLIC, f)
        with open(p, encoding="utf-8") as fh:
            s = fh.read()
        s = PATRON.sub(lambda m: m.group(0) if m.group(0) in fallidas else "assets/img/" + urls[m.group(0)], s)
        s = s.replace('<link rel="preconnect" href="https://static.wixstatic.com">\n', "")
        with open(p, "w", encoding="utf-8") as fh:
            fh.write(s)

    print("Listo." + (f" {len(fallidas)} fallaron y siguen apuntando a Wix; vuelve a ejecutar el script." if fallidas else ""))


if __name__ == "__main__":
    main()
