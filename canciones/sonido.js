/*
  Sonido de piano compartido (canciones y acordes).
  Se genera en el navegador: no necesita archivos de audio.
*/
window.Piano = (() => {
  "use strict";

  // La "1ra Octava" de la página equivale a la octava 2 del piano
  // (teclado de 61 teclas: DO2 a DO7, el DO central es la 3ra octava).
  // Si las notas suenan muy agudas o graves, cambiá este número.
  const DESFASE_OCTAVA = 1;

  const NOMBRES = ["DO", "DO#", "RE", "RE#", "MI", "FA", "FA#", "SOL", "SOL#", "LA", "LA#", "SI"];
  const SEMITONOS = { DO: 0, RE: 2, MI: 4, FA: 5, SOL: 7, LA: 9, SI: 11 };
  const CLAVE_SONIDO = "canciones:sonido";

  // localStorage puede fallar (modo privado, etc.): nunca debe romper la página.
  const guardar = (clave, valor) => {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin guardado */ }
  };
  const leer = (clave, porDefecto) => {
    try {
      const valor = localStorage.getItem(clave);
      return valor === null ? porDefecto : JSON.parse(valor);
    } catch { return porDefecto; }
  };

  /* ---------- Notas ---------- */

  const octavaDe = (el) => (el.className.match(/\boct(\d)\b/) || [])[1];

  // Número de nota: DO de la 1ra octava = 0, DO# = 1 ... SI de la 5ta octava = 59.
  const posicion = (nombre, octava) => (octava - 1) * 12 + NOMBRES.indexOf(nombre);

  const frecuenciaDePosicion = (pos) => {
    const midi = pos + (DESFASE_OCTAVA + 2) * 12;
    return 440 * 2 ** ((midi - 69) / 12);
  };

  // <p class="oct4">FA#</p> -> frecuencia en Hz (o null si no es una nota)
  function frecuencia(p) {
    const nota = p.textContent.trim().toUpperCase().match(/^(DO|RE|MI|FA|SOL|LA|SI)(#|B)?/);
    const octava = octavaDe(p);
    if (!nota || !octava) return null;
    const alteracion = nota[2] === "#" ? 1 : nota[2] === "B" ? -1 : 0;
    return frecuenciaDePosicion((Number(octava) - 1) * 12 + SEMITONOS[nota[1]] + alteracion);
  }

  /* ---------- Sintetizador ---------- */

  let ctx = null;
  let salida = null;
  let activo = leer(CLAVE_SONIDO, true);

  function contextoAudio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const compresor = ctx.createDynamicsCompressor();
      salida = ctx.createGain();
      salida.gain.value = 0.8;
      salida.connect(compresor);
      compresor.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Toca varias frecuencias juntas, o de a una si se pasa "separacion" (segundos).
  function tocar(frecuencias, { separacion = 0 } = {}) {
    if (!activo || !frecuencias.length) return;
    const ac = contextoAudio();
    if (!ac) return;

    const duracion = 1.8;
    const volumen = 0.35 / Math.sqrt(separacion ? 1 : frecuencias.length);

    frecuencias.forEach((f, i) => {
      const t = ac.currentTime + i * separacion;

      const envolvente = ac.createGain();
      envolvente.gain.setValueAtTime(0.0001, t);
      envolvente.gain.exponentialRampToValueAtTime(volumen, t + 0.01);
      envolvente.gain.exponentialRampToValueAtTime(volumen * 0.4, t + 0.3);
      envolvente.gain.exponentialRampToValueAtTime(0.0001, t + duracion);

      // El brillo se apaga con el tiempo, como en un piano.
      const filtro = ac.createBiquadFilter();
      filtro.type = "lowpass";
      filtro.frequency.setValueAtTime(Math.min(f * 8, 12000), t);
      filtro.frequency.exponentialRampToValueAtTime(Math.max(f * 1.5, 300), t + duracion);

      filtro.connect(envolvente);
      envolvente.connect(salida);

      [[1, 1], [2, 0.45], [3, 0.2], [4, 0.1]].forEach(([armonico, ganancia]) => {
        const osc = ac.createOscillator();
        osc.type = armonico === 1 ? "triangle" : "sine";
        osc.frequency.value = f * armonico;
        const g = ac.createGain();
        g.gain.value = ganancia;
        osc.connect(g);
        g.connect(filtro);
        osc.start(t);
        osc.stop(t + duracion);
      });
    });
  }

  return {
    NOMBRES,
    guardar,
    leer,
    octavaDe,
    posicion,
    frecuencia,
    frecuenciaDePosicion,
    tocar,
    get activo() { return activo; },
    set activo(valor) {
      activo = Boolean(valor);
      guardar(CLAVE_SONIDO, activo);
    },
  };
})();
