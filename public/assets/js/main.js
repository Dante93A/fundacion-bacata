/* Fundación Ecológica Bacatá — interacciones del sitio */
(function () {
  "use strict";

  /* ================= CONFIGURACIÓN ================= */
  var CONFIG = {
    // Endpoint del feed de Instagram (Cloudflare Pages Function en /functions/api/instagram.js)
    instagramApi: "/api/instagram",
    instagramUrl: "https://www.instagram.com/bacata_fundacion_ecologica/",
    // Formulario de contacto: clave gratuita de https://web3forms.com (llega al correo de la fundación).
    // Mientras diga REEMPLAZAR, el formulario abre el correo del visitante como respaldo.
    web3formsKey: "REEMPLAZAR_CON_ACCESS_KEY_DE_WEB3FORMS",
    correo: "fundacion@febacata.org"
  };

  /* ================= Menú móvil ================= */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("nav-principal");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var abierto = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!abierto));
      nav.classList.toggle("abierto", !abierto);
      document.body.classList.toggle("menu-abierto", !abierto);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a") && window.matchMedia("(max-width: 1300px)").matches) {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("abierto");
        document.body.classList.remove("menu-abierto");
      }
    });
  }

  /* ================= Animación al hacer scroll ================= */
  var aparecer = document.querySelectorAll(".aparecer");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -60px 0px" });
    aparecer.forEach(function (el) { io.observe(el); });
  } else {
    aparecer.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ================= Lightbox de galerías ================= */
  var lb = document.createElement("div");
  lb.className = "lightbox";
  lb.setAttribute("role", "dialog");
  lb.setAttribute("aria-modal", "true");
  lb.setAttribute("aria-label", "Visor de imágenes");
  lb.innerHTML =
    '<button class="cerrar" aria-label="Cerrar">×</button>' +
    '<button class="ant" aria-label="Anterior">‹</button>' +
    '<img alt="">' +
    '<button class="sig" aria-label="Siguiente">›</button>' +
    '<p class="pie"></p>';
  document.body.appendChild(lb);
  var lbImg = lb.querySelector("img");
  var lbPie = lb.querySelector(".pie");
  var grupo = [], idx = 0, ultimoFoco = null;

  function mostrar(i) {
    idx = (i + grupo.length) % grupo.length;
    var b = grupo[idx];
    lbImg.src = b.getAttribute("data-full");
    lbImg.alt = b.querySelector("img").alt || "";
    lbPie.textContent = b.getAttribute("data-caption") || "";
    var multiple = grupo.length > 1;
    lb.querySelector(".ant").hidden = !multiple;
    lb.querySelector(".sig").hidden = !multiple;
  }
  function cerrar() {
    lb.classList.remove("abierto");
    lbImg.removeAttribute("src");
    document.body.style.overflow = "";
    if (ultimoFoco) ultimoFoco.focus();
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-full]");
    if (!b) return;
    var gal = b.closest(".galeria");
    grupo = gal ? Array.prototype.slice.call(gal.querySelectorAll("[data-full]")) : [b];
    ultimoFoco = b;
    mostrar(grupo.indexOf(b));
    lb.classList.add("abierto");
    document.body.style.overflow = "hidden";
    lb.querySelector(".cerrar").focus();
  });
  lb.querySelector(".cerrar").addEventListener("click", cerrar);
  lb.querySelector(".ant").addEventListener("click", function () { mostrar(idx - 1); });
  lb.querySelector(".sig").addEventListener("click", function () { mostrar(idx + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) cerrar(); });
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("abierto")) return;
    if (e.key === "Escape") cerrar();
    if (e.key === "ArrowLeft") mostrar(idx - 1);
    if (e.key === "ArrowRight") mostrar(idx + 1);
  });

  /* ================= Feed de Instagram ================= */
  var igGrid = document.getElementById("ig-feed");
  if (igGrid) {
    var esc = function (s) {
      return String(s || "").replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    };
    var iconoVideo = '<svg class="tipo" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
    var iconoAlbum = '<svg class="tipo" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
    var vacio = function () {
      igGrid.outerHTML =
        '<div class="ig-vacio"><p>Mira nuestras publicaciones más recientes en Instagram.</p>' +
        '<a class="btn btn-verde" href="' + CONFIG.instagramUrl + '" target="_blank" rel="noopener">Ver @bacata_fundacion_ecologica</a></div>';
    };
    fetch(CONFIG.instagramApi, { headers: { Accept: "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var items = (data && data.items) || [];
        if (!items.length) return vacio();
        igGrid.innerHTML = items.slice(0, 9).map(function (m) {
          var alt = esc((m.caption || "Publicación de Instagram").slice(0, 120));
          var icono = m.type === "VIDEO" ? iconoVideo : m.type === "CAROUSEL_ALBUM" ? iconoAlbum : "";
          return '<a href="' + esc(m.permalink) + '" target="_blank" rel="noopener">' +
            '<img src="' + esc(m.image) + '" alt="' + alt + '" loading="lazy">' + icono + "</a>";
        }).join("");
      })
      .catch(vacio);
  }

  /* ================= Formulario de contacto ================= */
  var form = document.getElementById("form-contacto");
  if (form) {
    var estado = form.querySelector(".estado");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.querySelector('[name="botcheck"]').checked) return;
      var datos = new FormData(form);
      var sinClave = CONFIG.web3formsKey.indexOf("REEMPLAZAR") === 0;

      if (sinClave) {
        var asunto = encodeURIComponent("Mensaje desde la web - " + (datos.get("nombre") || ""));
        var cuerpo = encodeURIComponent(
          "Nombre: " + datos.get("nombre") + "\nCorreo: " + datos.get("email") +
          "\nTeléfono: " + (datos.get("telefono") || "") + "\n\n" + datos.get("mensaje"));
        window.location.href = "mailto:" + CONFIG.correo + "?subject=" + asunto + "&body=" + cuerpo;
        return;
      }

      datos.append("access_key", CONFIG.web3formsKey);
      datos.append("subject", "Nuevo mensaje desde la web de Fundación Bacatá");
      datos.append("from_name", "Web Fundación Bacatá");
      var boton = form.querySelector("button[type=submit]");
      boton.disabled = true;
      estado.className = "estado";
      estado.textContent = "Enviando…";
      fetch("https://api.web3forms.com/submit", { method: "POST", body: datos })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j.success) throw new Error(j.message);
          form.reset();
          estado.className = "estado ok";
          estado.textContent = "¡Gracias por tu mensaje!";
        })
        .catch(function () {
          estado.className = "estado error";
          estado.textContent = "No pudimos enviar el mensaje. Escríbenos a " + CONFIG.correo;
        })
        .then(function () { boton.disabled = false; });
    });
  }
})();
