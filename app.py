"""Puerta corrediza con bloqueo por solenoide · Reto EPM.

Muestra la simulación (index.html) a pantalla completa dentro de Streamlit.
Para desplegar: sube todos los archivos de esta carpeta a GitHub y, en
Streamlit Community Cloud, elige app.py como archivo principal.
"""
from pathlib import Path

import streamlit as st

st.set_page_config(
    page_title="Puerta corrediza con bloqueo por solenoide",
    page_icon="🔒",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# La simulación ocupa toda la ventana: sin márgenes ni barra superior de Streamlit.
st.html(
    """
    <style>
      header[data-testid="stHeader"], [data-testid="stToolbar"], footer { display: none !important; }
      [data-testid="stMainBlockContainer"], .block-container { padding: 0 !important; max-width: 100% !important; }
      [data-testid="stVerticalBlock"] { gap: 0 !important; }
      iframe { height: 100vh !important; height: 100dvh !important; width: 100% !important; border: 0; display: block; }
    </style>
    """
)

HTML_FILE = Path(__file__).parent / "index.html"

if not HTML_FILE.exists():
    st.error("No se encontró index.html. Debe estar en la misma carpeta que app.py.")
    st.stop()

if hasattr(st, "iframe"):  # Streamlit 1.56 o superior
    st.iframe(HTML_FILE, height=900)
else:  # versiones anteriores
    import streamlit.components.v1 as components

    components.html(HTML_FILE.read_text(encoding="utf-8"), height=900, scrolling=True)
