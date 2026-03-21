#Minerva Hernandez Godinez
# -*- coding: utf-8 -*-

import sys
import io
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os
import re
import requests
import pandas as pd
import streamlit as st
import streamlit.components.v1 as components
from lxml import html
from datetime import datetime
#hola
# --- CONFIGURACIÓN DE PÁGINA ---
st.set_page_config(page_title="XPath AI con Cohere", page_icon="AI", layout="wide")

# --- SESIÓN ---
if "history" not in st.session_state:
    st.session_state.history = []

st.title("XPath Optimizer con Cohere")

# --- FUNCIONES DE OPTIMIZACIÓN LOCAL ---
def logic_optimizer(xpath: str) -> str:
    """Simplificación basica sin IA."""
    simplified = re.sub(r"^/html/body/", "//", xpath)
    simplified = re.sub(r"/div\[\d+\]/div\[\d+\]", "//div", simplified)
    return simplified

# ===== IA CLIENT (Cohere) =====
class AIClient:
    def __init__(self):
        self.model = os.getenv("AI_MODEL", "command-r-08-2024")
        self.client = None
        self._error = None
        self._init_client()

    def _get_api_key(self, env_name: str, secret_name: str = None) -> str:
        """Obtiene la API key: primero variable de entorno, luego Streamlit secrets."""
        key = os.getenv(env_name, "").strip()
        if not key and secret_name and hasattr(st, "secrets") and st.secrets:
            key = (st.secrets.get(secret_name) or "").strip()
        return key or ""

    def _init_client(self):
        try:
            api_key = self._get_api_key("COHERE_API_KEY", "COHERE_API_KEY")
            if not api_key:
                self._error = "Falta COHERE_API_KEY. Añádela en .streamlit/secrets.toml o variables de entorno."
                return
            import cohere
            self.client = cohere.Client(api_key)
        except Exception as e:
            self.client = None
            self._error = str(e)

    @property
    def ready(self):
        return self.client is not None and self.model

    def generate_test_cases(self, text: str, idioma: str = "es") -> str:
        """Genera XPaths optimizados con Cohere."""
        if not self.ready:
            raise RuntimeError("IA no configurada correctamente.")
        system = (
            f"Eres un analista de pruebas. Realiza un XPath con buenas practicas en {idioma}. "
            "Genera XPaths de bajo mantenimiento, utiles para automatizacion. "
            "Da ejemplos para Katalon, Cypress y Robot Framework."
        )
        truncated = text[:25000]
        prompt = system + "\n\nDOCUMENTO:\n" + truncated
        resp = self.client.chat(model=self.model, message=prompt)
        return getattr(resp, "text", "") or getattr(resp, "response", "") or str(resp)


def _parse_test_cases_to_dataframe(raw: str) -> pd.DataFrame:
    """Convierte la respuesta de la IA (CSV con ;) en DataFrame."""
    text = raw.strip()
    for pattern in (r"```(?:csv)?\s*\n?(.*?)\n?```", r"```\s*\n?(.*?)\n?```"):
        m = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if m:
            text = m.group(1).strip()
    try:
        from io import StringIO
        df = pd.read_csv(StringIO(text), sep=";", encoding="utf-8", quoting=1, on_bad_lines="skip")
    except Exception:
        df = pd.DataFrame(columns=["ID", "Nombre del caso", "Pasos", "Resultado esperado", "Prioridad"])
        df.loc[0] = ["TC01", "Caso generado", raw[:200], "Verificar segun documento", "Media"]
    return df

# --- INTERFAZ DE USUARIO ---
col1, col2 = st.columns(2)
with col1:
    xpath_input = st.text_input("XPath original:", placeholder="/html/body/div[1]/div[2]/ul/li[5]/a")
with col2:
    url_input = st.text_input("URL de validacion (opcional):", placeholder="https://google.com")

if st.button("Ejecutar Optimizacion"):
    if not xpath_input:
        st.error("Escribe un XPath primero.")
    else:
        new_xpath = ""
        explanation = ""
        val_status = "No validado"

        try:
            # --- Conexión automática con Cohere ---
            ai_client = AIClient()
            if not ai_client.ready:
                st.error(ai_client._error or "Cohere no esta configurado correctamente.")
                st.stop()

            # Usamos Cohere para generar el XPath optimizado
            res = ai_client.generate_test_cases(xpath_input)

            # --- Parseo ---
            if "XPATH:" in res:
                parts = res.split("EXPLICACION:")
                new_xpath = parts[0].replace("XPATH:", "").strip()
                explanation = parts[1].strip() if len(parts) > 1 else "Optimizado con exito."
            else:
                new_xpath = res

            # --- Validacion Real ---
            if url_input:
                try:
                    r = requests.get(url_input, headers={"User-Agent": "Mozilla/5.0"}, timeout=5)
                    tree = html.fromstring(r.content)
                    matches = len(tree.xpath(new_xpath))
                    val_status = f"Encontrado {matches}" if matches > 0 else "0 coincidencias"
                except Exception:
                    val_status = "Error de conexion"

            # --- Guardar Historial ---
            st.session_state.history.append({
                "Hora": datetime.now().strftime("%H:%M"),
                "Motor": "Cohere",
                "Resultado": new_xpath,
                "Validacion": val_status
            })

            # --- Mostrar Resultados ---
            st.subheader("Resultado")
            st.code(new_xpath, language="xpath")

            components.html(
                f"""
                <button onclick="navigator.clipboard.writeText('{new_xpath}')"
                style="background-color: #2e7d32; color: white; border: none;
                padding: 10px 20px; border-radius: 5px; cursor: pointer;
                font-weight: bold;">COPIAR XPATH</button>
                """,
                height=50
            )

            st.info(f"Analisis: {explanation}")
            if url_input:
                st.write(f"Estado en la Web: {val_status}")

        except Exception as e:
            st.error(f"Error critico: {e}")

# --- HISTORIAL ---
st.markdown("---")
if st.session_state.history:
    st.subheader("Historial de Consultas")
    df = pd.DataFrame(st.session_state.history)
    st.table(df)
    csv = df.to_csv(index=False).encode("utf-8")
    st.download_button("Descargar CSV", csv, "reporte_xpath.csv", "text/csv")
