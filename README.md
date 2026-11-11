# Puerta corrediza con bloqueo por solenoide · Reto EPM

Simulación interactiva del sistema completo: riel en U, puerta en sándwich
(cemento · caucho · caucho · cemento), bloqueo por 3 pernos con solenoide y
activación por carga inalámbrica.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `app.py` | Aplicación de Streamlit. Muestra la simulación a pantalla completa. |
| `index.html` | La simulación (dibujo, estilos y animación en un solo archivo). |
| `requirements.txt` | Versión de Streamlit que instala Streamlit Cloud. |

Los tres archivos deben quedar juntos en la raíz del repositorio.

## Publicar en Streamlit Community Cloud

1. Crea un repositorio en GitHub y sube `app.py`, `index.html`, `requirements.txt` y este `README.md`
   (botón **Add file → Upload files**, arrastra los cuatro y pulsa **Commit changes**).
2. Entra a <https://share.streamlit.io>, pulsa **Create app** y elige el repositorio.
3. En **Main file path** escribe `app.py` y pulsa **Deploy**.

## Actualizar la simulación

Sube el nuevo `index.html` al repositorio reemplazando el anterior. Streamlit Cloud
detecta el cambio; recarga la página para verlo.

## Probar en tu computador (opcional)

```
pip install -r requirements.txt
streamlit run app.py
```
