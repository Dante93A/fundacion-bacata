/**
 * GET /api/instagram  — Cloudflare Pages Function
 *
 * Devuelve las últimas publicaciones de Instagram en JSON:
 *   { items: [{ id, caption, type, image, permalink, timestamp }] }
 *
 * Requiere (Configuración del proyecto en Cloudflare Pages):
 *   - KV namespace enlazado como  IG_KV
 *   - Variable secreta           IG_TOKEN  (token de larga duración, solo la primera vez)
 *
 * El token se renueva solo: cada 7 días se llama a refresh_access_token y el
 * token nuevo se guarda en KV (los tokens de Instagram vencen a los 60 días).
 * La respuesta se cachea 1 hora en KV para no gastar el límite de la API.
 */

const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
const LIMIT = 12;
const FEED_TTL = 3600;            // segundos que se cachea el feed
const REFRESH_EVERY_MS = 7 * 864e5; // renovar token cada 7 días

export async function onRequestGet({ env, waitUntil }) {
  if (!env.IG_KV) return json({ error: "IG_KV no está configurado" }, 503);

  const cached = await env.IG_KV.get("feed");
  if (cached) return new Response(cached, { headers: headers() });

  const token = (await env.IG_KV.get("token")) || env.IG_TOKEN;
  if (!token) return json({ error: "Falta IG_TOKEN" }, 503);

  const last = Number((await env.IG_KV.get("token_refreshed_at")) || 0);
  if (Date.now() - last > REFRESH_EVERY_MS) waitUntil(refreshToken(env, token));

  const url = `https://graph.instagram.com/me/media?fields=${FIELDS}&limit=${LIMIT}&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.log("Instagram API error", res.status, await res.text());
    return json({ error: "Instagram no respondió" }, 502);
  }

  const data = await res.json();
  const items = (data.data || []).map((m) => ({
    id: m.id,
    caption: m.caption || "",
    type: m.media_type,
    image: m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url,
    permalink: m.permalink,
    timestamp: m.timestamp,
  })).filter((m) => m.image);

  const body = JSON.stringify({ items });
  waitUntil(env.IG_KV.put("feed", body, { expirationTtl: FEED_TTL }));
  return new Response(body, { headers: headers() });
}

async function refreshToken(env, token) {
  try {
    const r = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`
    );
    const j = await r.json();
    if (j.access_token) {
      await env.IG_KV.put("token", j.access_token);
      await env.IG_KV.put("token_refreshed_at", String(Date.now()));
    } else {
      console.log("No se pudo renovar el token", JSON.stringify(j));
    }
  } catch (err) {
    console.log("Error renovando token", err);
  }
}

function headers() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=900",
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers(), "Cache-Control": "no-store" } });
}
