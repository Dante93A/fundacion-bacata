/* Fundación Ecológica Bacatá — interacciones del sitio */
(function () {
  "use strict";

  /* ================= CONFIGURACIÓN ================= */
  var CONFIG = {
    // Endpoint del feed de Instagram (Cloudflare Pages Function en /functions/api/instagram.js)
    instagramApi: "/api/instagram",
    instagramUrl: "https://www.instagram.com/fundacionecologicabacataf/",
    // Formulario "Súmate": URL de la aplicación web de Google Apps Script que guarda
    // cada registro en la hoja de cálculo (ver tools/google-apps-script.gs).
    // Mientras diga REEMPLAZAR, el botón Enviar abre el correo del visitante como respaldo.
    hojaUrl: "https://script.google.com/macros/s/AKfycbwPXv10m2qLsYCQFV1fxwM9q3GqDvvLoFzd51kLAAZ3WLWCPTGJg9Sz2IUs9yVZbBo6/exec",
    correo: "febacata@yahoo.es"
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

  /* ================= Facebook (Page Plugin) ================= */
  // Solo se muestra la tarjeta de la página (nombre, foto, seguidores y botón Seguir):
  // Facebook ya no muestra las publicaciones a quien no ha iniciado sesión.
  // El iframe de Facebook no se adapta solo: se arma con el ancho real del contenedor
  // (entre 180 y 500 px, límites del plugin) y se rehace si cambia el tamaño de la pantalla.
  var fbBox = document.getElementById("fb-feed");
  if (fbBox) {
    var fbAncho = 0, fbTimer = null;
    var pintarFb = function () {
      var ancho = Math.max(180, Math.min(500, Math.floor(fbBox.clientWidth)));
      if (Math.abs(ancho - fbAncho) < 20) return;
      fbAncho = ancho;
      var params = new URLSearchParams({
        href: fbBox.getAttribute("data-page"), tabs: "", width: ancho, height: 150,
        small_header: "false", adapt_container_width: "true", hide_cover: "false",
        show_facepile: "false", locale: "es_LA"
      });
      fbBox.innerHTML = '<iframe title="Publicaciones de Facebook de la Fundación Ecológica Bacatá" loading="lazy" ' +
        'width="' + ancho + '" height="150" scrolling="no" allow="encrypted-media; clipboard-write; web-share" ' +
        'src="https://www.facebook.com/plugins/page.php?' + params.toString() + '"></iframe>';
    };
    pintarFb();
    window.addEventListener("resize", function () { clearTimeout(fbTimer); fbTimer = setTimeout(pintarFb, 250); });
  }

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
        '<a class="btn btn-verde" href="' + CONFIG.instagramUrl + '" target="_blank" rel="noopener">Ver @fundacionecologicabacataf</a></div>';
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


  /* ================= Formulario "Súmate" (ayudante / organización) ================= */
  var form = document.getElementById("form-contacto");
  if (form) {
    var estado = form.querySelector(".estado");
    var bloques = form.querySelectorAll("fieldset[data-tipo]");

    function tipoActual() {
      var r = form.querySelector('input[name="tipo"]:checked');
      return r ? r.value : "Ayudante";
    }
    function cambiarTipo() {
      var t = tipoActual();
      bloques.forEach(function (fs) {
        var activo = fs.getAttribute("data-tipo") === t;
        fs.hidden = !activo;
        fs.disabled = !activo; // los campos ocultos no se validan ni se envían
      });
      estado.textContent = "";
      estado.className = "estado";
    }
    form.querySelectorAll('input[name="tipo"]').forEach(function (r) { r.addEventListener("change", cambiarTipo); });
    form.addEventListener("input", function () {
      if (estado.classList.contains("error")) { estado.textContent = ""; estado.className = "estado"; }
    });
    cambiarTipo();

    // Teléfono: solo números, espacios, +, guiones y paréntesis; entre 7 y 15 dígitos.
    form.querySelectorAll('input[type="tel"]').forEach(function (tel) {
      tel.addEventListener("input", function () {
        var limpio = tel.value.replace(/[^0-9+()\- ]/g, "");
        if (limpio !== tel.value) tel.value = limpio;
        tel.setCustomValidity("");
      });
    });
    function validarExtra() {
      var ok = true;
      form.querySelectorAll("fieldset:not([disabled]) input[type=\"tel\"]").forEach(function (tel) {
        var digitos = tel.value.replace(/\D/g, "").length;
        tel.setCustomValidity(digitos >= 7 && digitos <= 15 ? "" : "Escribe un número de teléfono válido (entre 7 y 15 números).");
        if (tel.validity.customError) ok = false;
      });
      // Campos obligatorios que solo tienen espacios en blanco
      form.querySelectorAll("fieldset:not([disabled]) [required], textarea[required]").forEach(function (c) {
        if (c.type === "checkbox") return;
        var vacio = c.value.trim() === "";
        if (c.type !== "tel") c.setCustomValidity(vacio ? "Este campo es obligatorio." : "");
        if (vacio) ok = false;
      });
      return ok;
    }
    form.addEventListener("input", function (e) {
      if (e.target.type !== "tel") e.target.setCustomValidity && e.target.setCustomValidity("");
    });

    function recolectar() {
      var fd = new FormData(form);
      var datos = {};
      fd.forEach(function (valor, clave) {
        if (clave === "botcheck") return;
        datos[clave] = datos[clave] ? datos[clave] + ", " + valor : String(valor).trim();
      });
      return datos;
    }

    function respaldoCorreo(d) {
      var etiquetas = {
        tipo: "Tipo", nombre: "Nombre", organizacion: "Organización", tipo_org: "Tipo de organización",
        contacto: "Persona de contacto", cargo: "Cargo", email: "Correo", telefono: "Teléfono",
        barrio: "Barrio / localidad", disponibilidad: "Disponibilidad", intereses: "Intereses",
        web: "Web / red social", propuesta: "Propuesta", mensaje: "Mensaje"
      };
      var lineas = Object.keys(etiquetas).filter(function (k) { return d[k]; })
        .map(function (k) { return etiquetas[k] + ": " + d[k]; });
      var quien = d.organizacion || d.nombre || "";
      window.location.href = "mailto:" + CONFIG.correo +
        "?subject=" + encodeURIComponent("Súmate (" + d.tipo + ") - " + quien) +
        "&body=" + encodeURIComponent(lineas.join("\n"));
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.querySelector('[name="botcheck"]').checked) return;
      validarExtra();
      if (!form.checkValidity()) {
        form.reportValidity();
        estado.className = "estado error";
        estado.textContent = "Revisa los campos marcados con *.";
        return;
      }
      var datos = recolectar();
      if (CONFIG.hojaUrl.indexOf("REEMPLAZAR") === 0) { respaldoCorreo(datos); return; }

      var boton = form.querySelector("button[type=submit]");
      boton.disabled = true;
      estado.className = "estado";
      estado.textContent = "Enviando…";
      fetch(CONFIG.hojaUrl, { method: "POST", body: new URLSearchParams(datos) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || "error");
          var tipo = tipoActual();
          form.reset();
          form.querySelector('input[name="tipo"][value="' + tipo + '"]').checked = true;
          cambiarTipo();
          estado.className = "estado ok";
          estado.textContent = tipo === "Organización"
            ? "¡Gracias! Recibimos los datos de tu organización y te contactaremos pronto."
            : "¡Gracias por querer ayudar! Te contactaremos pronto.";
        })
        .catch(function () {
          estado.className = "estado error";
          estado.textContent = "No pudimos enviar el formulario. Escríbenos a " + CONFIG.correo;
        })
        .then(function () { boton.disabled = false; });
    });
  }
})();
