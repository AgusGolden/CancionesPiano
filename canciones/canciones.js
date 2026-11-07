/*
  Canciones: sonido + modo práctica.

  - Click en una nota (o acorde): suena y queda marcada como "nota actual".
  - Espacio / → : siguiente nota.   ← : nota anterior.   M : activar/silenciar sonido.
  - Una nota "×3" se avanza 3 veces (la etiqueta muestra 1/3, 2/3, 3/3).
  - Las secciones "xN" se recorren N veces (el cartel muestra la vuelta, ej. 1/2).
  - Click en una octava de la barra superior: resalta solo esa octava.
  - La posición se guarda por canción, así podés seguir donde quedaste.

  Necesita sonido.js (cargado antes). No hace falta tocar nada de este
  archivo para agregar canciones: ver default.html.
*/
(() => {
  "use strict";

  const { guardar, leer, octavaDe, frecuencia, tocar } = window.Piano;

  const SELECTOR_PASO = "article > p, article > .nota-acorde";
  const CLAVE_POSICION = "canciones:posicion:" + location.pathname;
  const movimientoSuave = !matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Notas ---------- */

  // "FA# (x2)" -> "FA#" + etiqueta "×2"
  function formatearRepeticion(p) {
    const m = p.textContent.match(/^(.*?)\s*\(x(\d+)\)\s*$/i);
    if (!m) return;
    p.textContent = m[1];
    const veces = document.createElement("span");
    veces.className = "veces";
    veces.textContent = "×" + m[2];
    veces.title = `Tocar ${m[2]} veces`;
    p.dataset.veces = m[2];
    p.append(veces);
  }

  // Cuántas veces se toca una nota o acorde (en un acorde, la mayor repetición).
  const vecesDe = (notas) => Math.max(1, ...notas.map((p) => Number(p.dataset.veces) || 1));

  /* ---------- Inicio ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    const contenido = document.querySelector(".content-notas");
    if (!contenido) return;

    contenido.querySelectorAll("article p").forEach(formatearRepeticion);

    // Cada nota suelta o acorde es un "paso"; una nota "×3" son 3 pasos seguidos.
    // Las secciones xN se recorren N veces.
    const frecuencias = new Map();
    const golpesDe = new Map();
    const pasos = [];
    contenido.querySelectorAll(":scope > section").forEach((seccion) => {
      const cartel = seccion.querySelector(":scope > .repeticion");
      const veces = parseInt((cartel?.textContent.match(/\d+/) || ["1"])[0], 10) || 1;
      const elementos = [...seccion.querySelectorAll(SELECTOR_PASO)];

      elementos.forEach((el) => {
        const notas = el.matches(".nota-acorde") ? [...el.querySelectorAll("p")] : [el];
        frecuencias.set(el, notas.map(frecuencia).filter(Boolean));
        golpesDe.set(el, vecesDe(notas));
      });

      for (let vuelta = 1; vuelta <= veces; vuelta++) {
        elementos.forEach((el) => {
          const golpes = golpesDe.get(el);
          for (let golpe = 1; golpe <= golpes; golpe++) {
            pasos.push({ el, seccion, cartel, vuelta, veces, golpe, golpes });
          }
        });
      }
    });

    // Etiqueta "×3" de la nota: muestra "1/3", "2/3"... mientras es la actual.
    function marcarGolpe(el, golpe) {
      el.querySelectorAll(".veces").forEach((span) => {
        const total = span.closest("p").dataset.veces;
        span.textContent = golpe ? `${Math.min(golpe, total)}/${total}` : `×${total}`;
      });
    }

    /* --- Barra de práctica --- */

    const barra = document.createElement("div");
    barra.className = "barra-practica";
    barra.setAttribute("role", "toolbar");
    barra.setAttribute("aria-label", "Controles de práctica");
    barra.innerHTML = `
      <button type="button" data-accion="subir" title="Subir la página">⇡</button>
      <button type="button" data-accion="anterior" title="Nota anterior (←)">◀</button>
      <button type="button" data-accion="siguiente" class="principal" title="Siguiente nota (Espacio o →)">
        ▶ <span class="etiqueta">Siguiente</span>
      </button>
      <span class="estado" aria-live="polite"></span>
      <button type="button" data-accion="reiniciar" title="Volver al principio">⟲</button>
      <button type="button" data-accion="sonido" title="Activar / silenciar sonido (M)"></button>
      <button type="button" data-accion="bajar" title="Bajar la página">⇣</button>`;
    document.body.append(barra);

    const estado = barra.querySelector(".estado");
    const botonSonido = barra.querySelector('[data-accion="sonido"]');

    const titulo = document.querySelector("header h1");
    if (titulo) {
      const ayuda = document.createElement("p");
      ayuda.className = "ayuda";
      ayuda.innerHTML =
        "Tocá una nota para escucharla. <kbd>Espacio</kbd> / <kbd>→</kbd> siguiente · " +
        "<kbd>←</kbd> anterior · <kbd>M</kbd> sonido";
      titulo.after(ayuda);
    }

    function actualizarBotonSonido() {
      botonSonido.textContent = Piano.activo ? "🔊" : "🔇";
      botonSonido.setAttribute("aria-pressed", String(!Piano.activo));
    }

    /* --- Navegación por pasos --- */

    let actual = -1;

    function irA(indice, { sonar = true, desplazar = true, bloque = "nearest" } = {}) {
      const anterior = pasos[actual];
      if (anterior) {
        anterior.el.classList.remove("actual", "golpe");
        marcarGolpe(anterior.el, 0);
        anterior.seccion.classList.remove("seccion-actual");
        if (anterior.cartel) delete anterior.cartel.dataset.vuelta;
      }

      actual = Math.max(-1, Math.min(indice, pasos.length - 1));
      guardar(CLAVE_POSICION, actual);

      const paso = pasos[actual];
      if (!paso) {
        estado.textContent = `${pasos.length} pasos`;
        return;
      }

      paso.el.classList.add("actual");
      if (paso.golpes > 1) {
        marcarGolpe(paso.el, paso.golpe);
        // Pequeño "rebote" para que se note cada vez que se repite la misma nota.
        void paso.el.offsetWidth;
        paso.el.classList.add("golpe");
      }
      paso.seccion.classList.add("seccion-actual");
      if (paso.cartel && paso.veces > 1) paso.cartel.dataset.vuelta = `${paso.vuelta}/${paso.veces}`;
      estado.textContent = actual === pasos.length - 1
        ? `Fin · ${actual + 1}/${pasos.length}`
        : `${actual + 1}/${pasos.length}`;

      if (sonar) tocar(frecuencias.get(paso.el));
      if (desplazar) {
        paso.el.scrollIntoView({ block: bloque, behavior: movimientoSuave ? "smooth" : "auto" });
      }
    }

    const siguiente = () => irA(Math.min(actual + 1, pasos.length - 1));
    const anteriorPaso = () => { if (actual > 0) irA(actual - 1); };
    const desplazarPagina = (sentido) =>
      window.scrollBy({ top: sentido * window.innerHeight * 0.6, behavior: movimientoSuave ? "smooth" : "auto" });

    const acciones = {
      siguiente,
      anterior: anteriorPaso,
      reiniciar: () => {
        irA(-1);
        window.scrollTo({ top: 0, behavior: movimientoSuave ? "smooth" : "auto" });
      },
      sonido: () => {
        Piano.activo = !Piano.activo;
        actualizarBotonSonido();
      },
      subir: () => desplazarPagina(-1),
      bajar: () => desplazarPagina(1),
    };

    // Evita que los botones queden con foco al usar el mouse
    // (si no, la barra espaciadora volvería a "apretar" el último botón).
    const sinFoco = (e) => e.preventDefault();
    barra.addEventListener("mousedown", sinFoco);
    barra.addEventListener("click", (e) => {
      const boton = e.target.closest("button[data-accion]");
      if (boton) acciones[boton.dataset.accion]();
    });

    // Click en una nota: si la sección se repite, mantiene la vuelta actual.
    function seleccionar(el) {
      const vuelta = pasos[actual]?.el.closest("section") === el.closest("section")
        ? pasos[actual].vuelta
        : 1;
      const indice = pasos.findIndex((p) => p.el === el && p.vuelta === vuelta && p.golpe === 1);
      irA(indice >= 0 ? indice : pasos.findIndex((p) => p.el === el), { desplazar: false });
    }

    contenido.addEventListener("click", (e) => {
      const el = e.target.closest(SELECTOR_PASO);
      if (el) seleccionar(el);
    });

    /* --- Filtro por octava (barra superior) --- */

    const filtro = new Set();
    const leyenda = document.querySelectorAll(".header-octavas p");

    function aplicarFiltro() {
      contenido.querySelectorAll("article p").forEach((p) => {
        p.classList.toggle("atenuada", filtro.size > 0 && !filtro.has(octavaDe(p)));
      });
    }

    leyenda.forEach((item) => {
      item.setAttribute("role", "button");
      item.tabIndex = 0;
      item.title = "Resaltar solo esta octava";
      item.setAttribute("aria-pressed", "false");
      item.addEventListener("mousedown", sinFoco);
      item.addEventListener("click", () => {
        const oct = octavaDe(item);
        if (filtro.has(oct)) filtro.delete(oct); else filtro.add(oct);
        item.setAttribute("aria-pressed", String(filtro.has(oct)));
        aplicarFiltro();
      });
    });

    /* --- Teclado --- */

    document.addEventListener("keydown", (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const enfocado = e.target.closest?.('button, input, textarea, select, [role="button"]');

      if (enfocado && (e.key === " " || e.key === "Enter")) {
        // Octavas con foco de teclado (Tab): Enter/Espacio las activa.
        if (enfocado.matches('[role="button"]') && !enfocado.matches("button")) {
          e.preventDefault();
          enfocado.click();
        }
        return;
      }

      switch (e.key) {
        case " ":
        case "ArrowRight":
          e.preventDefault();
          siguiente();
          break;
        case "ArrowLeft":
          e.preventDefault();
          anteriorPaso();
          break;
        case "m":
        case "M":
          acciones.sonido();
          break;
      }
    });

    /* --- Estado inicial --- */

    actualizarBotonSonido();
    const guardada = Number(leer(CLAVE_POSICION, -1));
    irA(Number.isInteger(guardada) ? guardada : -1, { sonar: false, desplazar: guardada >= 0, bloque: "center" });
  });
})();
