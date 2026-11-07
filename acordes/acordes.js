/*
  Acordes: buscador con teclado, tarjetas de "Mis acordes" y tabla de mayores/menores.
  Usa el sonido compartido de ../canciones/sonido.js.
*/
(() => {
  "use strict";

  const { NOMBRES, posicion, frecuenciaDePosicion, tocar, guardar, leer, octavaDe } = window.Piano;

  const LETRAS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const TIPOS = [
    { id: "mayor", nombre: "mayor", sufijo: "", intervalos: [0, 4, 7] },
    { id: "menor", nombre: "menor", sufijo: "m", intervalos: [0, 3, 7] },
    { id: "7", nombre: "séptima", sufijo: "7", intervalos: [0, 4, 7, 10] },
    { id: "maj7", nombre: "séptima mayor", sufijo: "maj7", intervalos: [0, 4, 7, 11] },
    { id: "m7", nombre: "menor séptima", sufijo: "m7", intervalos: [0, 3, 7, 10] },
    { id: "sus2", nombre: "sus2", sufijo: "sus2", intervalos: [0, 2, 7] },
    { id: "sus4", nombre: "sus4", sufijo: "sus4", intervalos: [0, 5, 7] },
    { id: "dim", nombre: "disminuido", sufijo: "dim", intervalos: [0, 3, 6] },
    { id: "aug", nombre: "aumentado", sufijo: "aug", intervalos: [0, 4, 8] },
  ];
  const CLAVE = "acordes:seleccion";
  const TECHO = posicion("SI", 4); // los acordes del buscador entran en la 3ra y 4ta octava
  const BLANCAS = [0, 2, 4, 5, 7, 9, 11];

  const nombreDe = (pos) => NOMBRES[pos % 12];
  const octavaDePos = (pos) => Math.floor(pos / 12) + 1;
  const tipoPorId = (id) => TIPOS.find((t) => t.id === id) || TIPOS[0];

  // Notas del acorde, empezando en la 3ra octava. Cada inversión sube la nota más grave.
  function armarAcorde(raiz, tipo, inversion) {
    let notas = tipo.intervalos.map((i) => posicion(NOMBRES[raiz], 3) + i);
    for (let k = 0; k < inversion; k++) {
      notas.sort((a, b) => a - b);
      notas[0] += 12;
    }
    notas.sort((a, b) => a - b);
    if (notas[notas.length - 1] > TECHO) notas = notas.map((n) => n - 12);
    return notas;
  }

  // <p class="oct3">SI</p> -> número de nota (ver Piano.posicion)
  function posicionDeNota(p) {
    const m = p.textContent.trim().toUpperCase().match(/^(DO|RE|MI|FA|SOL|LA|SI)(#|B)?/);
    const octava = Number(octavaDe(p));
    if (!m || !octava) return null;
    const alteracion = m[2] === "#" ? 1 : m[2] === "B" ? -1 : 0;
    return posicion(m[1], octava) + alteracion;
  }

  function crearNota(pos) {
    const p = document.createElement("p");
    p.className = "oct" + octavaDePos(pos);
    p.textContent = nombreDe(pos);
    return p;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const selRaiz = document.getElementById("raiz");
    const selTipo = document.getElementById("tipo");
    const selInversion = document.getElementById("inversion");
    const nombre = document.getElementById("nombre");
    const cifrado = document.getElementById("cifrado");
    const listaNotas = document.getElementById("notas");
    const teclado = document.getElementById("teclado");

    NOMBRES.forEach((n, i) => selRaiz.add(new Option(`${n} (${LETRAS[i]})`, i)));
    TIPOS.forEach((t) => selTipo.add(new Option(t.nombre, t.id)));

    /* ---------- Teclado ---------- */

    let rango = null;
    let teclas = new Map();

    function dibujarTeclado(desde, hasta) {
      rango = `${desde}-${hasta}`;
      teclas = new Map();
      teclado.replaceChildren();
      const totalBlancas = (hasta - desde + 1) * 7;
      let blanca = 0;

      for (let oct = desde; oct <= hasta; oct++) {
        for (let semitono = 0; semitono < 12; semitono++) {
          const pos = (oct - 1) * 12 + semitono;
          const tecla = document.createElement("button");
          tecla.type = "button";
          tecla.dataset.pos = pos;
          tecla.title = `${NOMBRES[semitono]} · ${oct}ª octava`;
          tecla.setAttribute("aria-label", tecla.title);

          if (BLANCAS.includes(semitono)) {
            tecla.className = "tecla blanca";
            if (semitono === 0) {
              const marca = document.createElement("span");
              marca.className = "referencia";
              marca.textContent = `DO${oct}`;
              tecla.append(marca);
            }
            blanca++;
          } else {
            tecla.className = "tecla negra";
            tecla.style.left = `${(blanca / totalBlancas) * 100}%`;
            tecla.style.width = `${(0.6 / totalBlancas) * 100}%`;
          }
          teclas.set(pos, tecla);
          teclado.append(tecla);
        }
      }
    }

    function marcarTeclas(posiciones) {
      const octavas = posiciones.map(octavaDePos);
      const desde = Math.min(3, ...octavas);
      const hasta = Math.max(4, ...octavas);
      if (rango !== `${desde}-${hasta}`) dibujarTeclado(desde, hasta);

      teclas.forEach((t) => t.classList.remove("marcada", "oct1", "oct2", "oct3", "oct4", "oct5"));
      posiciones.forEach((pos) => teclas.get(pos)?.classList.add("marcada", "oct" + octavaDePos(pos)));
    }

    function iluminar(pos, demora = 0) {
      setTimeout(() => {
        const tecla = teclas.get(pos);
        if (!tecla) return;
        tecla.classList.remove("sonando");
        void tecla.offsetWidth;
        tecla.classList.add("sonando");
      }, demora * 1000);
    }

    /* ---------- Acorde mostrado ---------- */

    let actuales = [];

    function sonar(posiciones, arpegio = false) {
      const separacion = arpegio ? 0.2 : 0;
      tocar(posiciones.map(frecuenciaDePosicion), { separacion });
      posiciones.forEach((pos, i) => iluminar(pos, i * separacion));
    }

    function mostrar({ titulo, cifra, posiciones }) {
      actuales = posiciones;
      nombre.textContent = titulo;
      cifrado.textContent = cifra || "";
      cifrado.hidden = !cifra;
      listaNotas.replaceChildren(...posiciones.map(crearNota));
      marcarTeclas(posiciones);
    }

    function seleccionarTarjeta(tarjeta) {
      document.querySelectorAll(".tarjeta-acorde.seleccionada")
        .forEach((t) => t.classList.remove("seleccionada"));
      tarjeta?.classList.add("seleccionada");
    }

    function desdeControles({ conSonido = false } = {}) {
      const raiz = Number(selRaiz.value);
      const tipo = tipoPorId(selTipo.value);

      // La 3ra inversión solo existe en acordes de 4 notas.
      [...selInversion.options].forEach((o) => { o.disabled = Number(o.value) >= tipo.intervalos.length; });
      if (Number(selInversion.value) >= tipo.intervalos.length) selInversion.value = "0";
      const inversion = Number(selInversion.value);

      const posiciones = armarAcorde(raiz, tipo, inversion);
      const textoInversion = inversion ? ` · ${selInversion.selectedOptions[0].textContent.toLowerCase()}` : "";
      const bajo = inversion ? "/" + LETRAS[posiciones[0] % 12] : "";

      mostrar({
        titulo: `${NOMBRES[raiz]} ${tipo.nombre}${textoInversion}`,
        cifra: LETRAS[raiz] + tipo.sufijo + bajo,
        posiciones,
      });
      seleccionarTarjeta(document.querySelector(`.tarjeta-acorde[data-raiz="${raiz}"][data-tipo="${tipo.id}"]`));
      guardar(CLAVE, { raiz, tipo: tipo.id, inversion });
      if (conSonido) sonar(posiciones);
    }

    /* ---------- Tarjetas ---------- */

    document.querySelectorAll(".grilla-acordes[data-tipo]").forEach((grilla) => {
      const tipo = tipoPorId(grilla.dataset.tipo);
      NOMBRES.forEach((n, raiz) => {
        const tarjeta = document.createElement("div");
        tarjeta.className = "tarjeta-acorde";
        tarjeta.dataset.raiz = raiz;
        tarjeta.dataset.tipo = tipo.id;

        const titulo = document.createElement("h3");
        titulo.textContent = `${n} ${tipo.nombre}`;
        const acorde = document.createElement("div");
        acorde.className = "nota-acorde";
        acorde.append(...armarAcorde(raiz, tipo, 0).map(crearNota));
        const cifra = document.createElement("span");
        cifra.className = "cifrado";
        cifra.textContent = LETRAS[raiz] + tipo.sufijo;

        tarjeta.append(titulo, acorde, cifra);
        grilla.append(tarjeta);
      });
    });

    document.querySelectorAll(".tarjeta-acorde").forEach((tarjeta) => {
      tarjeta.setAttribute("role", "button");
      tarjeta.tabIndex = 0;
    });

    function activarTarjeta(tarjeta) {
      if (tarjeta.dataset.raiz !== undefined) {
        // Acorde de la tabla: se carga en el buscador.
        selRaiz.value = tarjeta.dataset.raiz;
        selTipo.value = tarjeta.dataset.tipo;
        selInversion.value = "0";
        desdeControles({ conSonido: true });
        return;
      }
      // Acorde propio ("Mis acordes"): se muestra tal cual está escrito.
      const posiciones = [...tarjeta.querySelectorAll(".nota-acorde p")]
        .map(posicionDeNota)
        .filter((pos) => pos !== null);
      mostrar({ titulo: tarjeta.querySelector("h3")?.textContent || "Acorde", cifra: "", posiciones });
      seleccionarTarjeta(tarjeta);
      sonar(posiciones);
    }

    document.querySelector(".listas").addEventListener("click", (e) => {
      const tarjeta = e.target.closest(".tarjeta-acorde");
      if (tarjeta) activarTarjeta(tarjeta);
    });
    document.querySelector(".listas").addEventListener("keydown", (e) => {
      const tarjeta = e.target.closest(".tarjeta-acorde");
      if (tarjeta && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        activarTarjeta(tarjeta);
      }
    });

    /* ---------- Controles ---------- */

    [selRaiz, selTipo, selInversion].forEach((sel) =>
      sel.addEventListener("change", () => desdeControles({ conSonido: true })));

    document.getElementById("btn-tocar").addEventListener("click", () => sonar(actuales));
    document.getElementById("btn-arpegio").addEventListener("click", () => sonar(actuales, true));

    teclado.addEventListener("click", (e) => {
      const tecla = e.target.closest(".tecla");
      if (tecla) sonar([Number(tecla.dataset.pos)]);
    });

    /* ---------- Estado inicial ---------- */

    const guardado = leer(CLAVE, null);
    if (guardado) {
      selRaiz.value = String(guardado.raiz ?? 0);
      selTipo.value = tipoPorId(guardado.tipo).id;
      selInversion.value = String(guardado.inversion ?? 0);
    }
    if (!selRaiz.value) selRaiz.value = "0";
    desdeControles();
  });
})();
