from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(
    page_title="Sistema de Bloqueo de Riel | Cerradura Mortise de 3 Ejes",
    page_icon="🔒",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Ajustar el contenedor de Streamlit a fondo claro y sin márgenes innecesarios
st.markdown(
    """
    <style>
      .stApp {
        background-color: #f1f5f9;
      }
      .block-container {
        padding-top: 0.5rem !important;
        padding-bottom: 0rem !important;
        padding-left: 0.5rem !important;
        padding-right: 0.5rem !important;
        max-width: 100% !important;
      }
      header[data-testid="stHeader"] {
        background: transparent;
        height: 1.5rem;
      }
      footer {
        display: none;
      }
    </style>
    """,
    unsafe_allow_html=True,
)


def build_standalone_html() -> str:
    base_dir = Path(__file__).parent
    html_content = (base_dir / "index.html").read_text(encoding="utf-8")
    css_content = (base_dir / "styles.css").read_text(encoding="utf-8")
    js_content = (base_dir / "app.js").read_text(encoding="utf-8")

    # Incrustar CSS y JS directamente dentro del HTML para que funcione en el iframe de Streamlit
    # y también como archivo único descargable para tablets.
    html_content = html_content.replace(
        '<link rel="stylesheet" href="styles.css" />',
        f"<style>\n{css_content}\n</style>",
    )
    html_content = html_content.replace(
        '<script src="app.js"></script>',
        f"<script>\n{js_content}\n</script>",
    )
    return html_content


embedded_html = build_standalone_html()
components.html(embedded_html, height=1020, scrolling=True)
