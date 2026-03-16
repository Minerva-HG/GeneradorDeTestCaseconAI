
# 🤖 AI Test Case & Script Generator (Cohere)

¡Automatiza tu flujo de trabajo de QA! Este programa desarrollado en **Python** utiliza la IA de **Cohere** para generar automáticamente Casos de Prueba (Test Cases) y scripts de automatización para **Katalon Studio**.

---

## 🚀 Características Principales

* **Conversión Multiformato:** Sube archivos PDF y conviértelos a TXT, DOCX (Word) o XLSX (Excel).
* **Generación de Test Cases:** Crea escenarios de prueba detallados en Excel a partir de tus requerimientos.
* **Scripts para Katalon:** Genera archivos `.groovy` listos para ser usados en Katalon Studio.
* **Chat con tus Documentos:** Realiza consultas específicas a la IA sobre el contenido del archivo cargado.
* **Flexible:** Compatible con cualquier modelo de IA (ajustable en el código).

---

## 🛠️ Requisitos e Instalación


---


* Instalar python 3.9 o superior 🐍
- Ejecutar los siguientes comandos 
```python
pip install streamlit pdfplumber PyPDF2 python-docx pandas openpyxl cohere
```
```python
pip install -U cohere
```
- Realizar un git clone
```python
git clone https://github.com/Minerva-HG/GeneradorDeTCconAI.git
```
---
- Abrir CMD (W+R)

- Abrir la ruta donde almacentaste el clone y ejecutar lo siguiente: 

```python
C:/users/user/clone>
streamlit run generarTCconAI.py
```
* En la carpeta .streamlit.zip, se debera descomprimir
* dentro esta un archivo con el nombre secrets.toml
ahí debes agregar tu APY_KEY de cohere

```python
COHERE_API_KEY="aqui va tu api key"
AI_MODEL = "command-r-08-2024"
```
* Lo puedes obtener gratis desde aqui :D 
https://dashboard.cohere.com/

---
## EXTRAS:

✅ Qué incluye este  generarTCconAI.py

Subida de PDF
Conversión a:

TXT
DOCX (Word)
XLSX (Excel)

IA opcional:


Compatible con cualquier AI (editando el código)

* Además puesdes preguntar a la AI (cohere), referente a tu documento
---

💻 Autora:

Minerva Godinez | QA Manual & Automation Testing
[LinkedIn](https://www.linkedin.com/in/avrenimhg/).
[Facebook](https://www.facebook.com/ateneamini).


---
## ¿Como usarlo?

1. Subir un archivo PDF o TXT
* Yo uso esta extension para los reportes de QA
![Subir]("\Imagenes\Bienvenida de Generador.png")
![Certificador QA]("\Imagenes\extension.png")
2. Al cargar se nos muestra la informacion del documento en un Json
3. Las opciones de convertir el archivo PDF a .txt, excel, o doc.
- [Tambien aplica para otros tipos de archivos]
4. ### ACTIVAR LA AI
5. Seleccionamos el checkbox
![Seleccionamos la AI]("\Imagenes\activar AI.png")
6. Se  nos habilita las siguientes opciones:
* Generar casos de pruebas
* Generar scripts para Katalon
7. La opcion de casos de pruebas nos va a dar un boton para descargar un archivo en excel
![TestCase]("\Imagenes\descarga excel.png")
8. La opcion de Generar script nos va dar un botón para descargar el .groovy
![TestCase]("Imagenes\script groovy.png")
9. Por ultimo, podemos preguntarle a la AI sobre el documento
![ask]("\Imagenes\preguntar a la AI.png"")


---

❤️ Apoyo a la Causa (Solidaridad)
Hola, soy Minerva. Hace poco mi hermana tuvo una cirugía de emergencia en su ojo derecho. Ha sido un gasto difícil para mi familia. Si este software te es de utilidad, te agradecería infinitamente cualquier apoyo económico (desde $1 USD) para ayudar a cubrir los gastos médicos.

Opción 1: GoFundMe - Ayúdame a no perder mi vista

Opción 2 (PayPal): paypal.me/MinervaHernandez945 (minializgodinez@gmail.com)

Opción 3 (BBVA): Cuenta 159 878 1864

---
** Dudas**
* Cualquier duda/sugerencia/etc puedes escribirme a cualquiera de mis redes sociales
y a mi correo: minializ@hotmail.com