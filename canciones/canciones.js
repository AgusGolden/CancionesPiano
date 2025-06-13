document.addEventListener("DOMContentLoaded", () => {
  // Espera a que todo el HTML esté cargado antes de ejecutar el script

  const notas = document.querySelectorAll(".header-octavas p, article p");
  // Selecciona todos los elementos <p> dentro de .header-octavas y <article>

  notas.forEach(nota => {
    // Itera sobre cada una de esas notas

    nota.addEventListener("click", () => {
      // Le agrega un evento "click" a cada nota

      nota.classList.toggle("activa");
      // Si la nota ya tiene la clase 'activa', se la quita; si no la tiene, se la agrega.
      // Esto permite que la nota quede "marcada" visualmente.

      void nota.offsetHeight;
      // Forza un "reflow" (se usa a veces para reiniciar animaciones CSS, aunque aquí no es necesario)

      const texto = nota.textContent.trim().split(" ")[0];
      // Obtiene el texto interno de la nota, por ejemplo "DO#" o "LA", ignorando espacios.

      const nombre = texto.replace("#", "s");
      // Reemplaza "#" por "s" para hacer coincidir con nombres de archivos (DO# -> DOs)

      const audio = new Audio(`sounds/${nombre}.wav`);
      // Crea un nuevo objeto de audio usando el archivo correspondiente en la carpeta 'sounds'

      audio.play().catch(err => console.warn("Error al reproducir:", err));
      // Reproduce el sonido. Si ocurre un error (por ejemplo, archivo no encontrado), lo muestra por consola.
    });
  });
});
