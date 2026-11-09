# Sistema de Bloqueo de Riel por Cerradura Mortise de 3 Ejes (Actuador Lineal)

Animación interactiva en **HTML, CSS y JavaScript** diseñada para presentar a la comunidad el funcionamiento mecánico de un **sistema de apertura con bloqueo de riel mediante una cerradura tipo Mortise de 3 ejes accionada por un actuador lineal eléctrico**.

## Características principales de la simulación
- **Tema claro de alto contraste:** Ideal para proyectores comunitarios, tablets y pantallas móviles a plena luz.
- **Aislamiento de fuerza en el actuador lineal:** Demuestra visualmente cómo el actuador lineal emplea su fuerza **únicamente para insertar o retraer los 3 ejes**, mientras que el esfuerzo cortante ante intentos de apertura forzada es absorbido al **100% por los 3 ejes de acero y la caja Mortise (0 N sobre el motor del actuador)**.
- **Modo Demostración Automática (Comunidad):** Ejecuta un ciclo continuo explicando paso a paso la alineación, bloqueo, prueba de esfuerzo y apertura libre del riel.

---

## Cómo ver en tu Tablet sin ejecutar un servidor local

### Opción 1: Alojamiento gratuito en Streamlit Cloud ( vía GitHub )
El repositorio incluye [`streamlit_app.py`](streamlit_app.py) y [`requirements.txt`](requirements.txt) para usar **Streamlit Community Cloud** como alojamiento web gratuito:

1. Sube esta carpeta a un repositorio en tu cuenta de **GitHub**.
2. Entra a [share.streamlit.io](https://share.streamlit.io/) e inicia sesión con GitHub.
3. Haz clic en **Create app** y selecciona:
   - **Repository:** tu repositorio de GitHub
   - **Branch:** `main`
   - **Main file path:** `streamlit_app.py`
4. Haz clic en **Deploy**. Obtendrás un enlace público (`https://tu-app.streamlit.app`) que puedes abrir desde tu **tablet, celular o cualquier computador** en cualquier lugar sin encender tu PC.

### Opción 2: GitHub Pages (Directo desde el mismo repositorio)
Como el proyecto incluye [`index.html`](index.html), [`styles.css`](styles.css) y [`app.js`](app.js) en la raíz, también puedes activar **GitHub Pages** en *Settings → Pages → Deploy from branch (`main`)* y abrir el enlace directamente en el navegador de tu tablet.
