# 🚨 Monitor Ciudadano en Vivo - Sistema de Reportes y Bloqueos

Plataforma web táctica y en tiempo real diseñada para el monitoreo ciudadano de huelgas y movilizaciones. Funciona de manera **100% gratuita**, es **ultra-responsiva para celulares** (ideal para compartir por WhatsApp) y está lista para desplegarse en **GitHub Pages**.

---

## 🌟 Características Principales

1. **🗺️ Mapa Interactivo de Bloqueos (Leaflet + OpenStreetMap):**
   - Sin costos de API de Google Maps.
   - Marcadores en tiempo real con estados:
     - 🛑 **Bloqueo Total** (con animación de pulso de alerta).
     - ⚠️ **Paso Restringido / Marchas**.
     - ✅ **Vía Libre / Despejada**.
     - 📹 **Punto con Cámara en Vivo**.
   - Filtros rápidos por estado y botón **"Mi Ubicación"** (GPS del celular).
   - Tarjetas de acceso rápido: al tocar un punto, el mapa se desliza y abre el reporte detallado.

2. **📡 Cámaras en Vivo por Zonas (Jitsi Meet Embed):**
   - Salas organizadas por frentes (Zona Norte, Zona Centro, Zona Sur).
   - Sin límites de usuarios.
   - Botón de pantalla completa y enlace directo a la App móvil de Jitsi.
   - Modo guía para reporteros con un clic para copiar los enlaces directos.

3. **🚨 Sistema de Alertas Críticas (Ticker & Pop-up Emergente):**
   - Ticker rojo parpadeante en la cabecera.
   - Ventana emergente (modal) para avisos urgentes (ej. desvíos, contingentes policiales).
   - Alarma auditiva táctica integrada (Web Audio API) con botón de silenciar.

4. **⚡ Feed Minuto a Minuto:**
   - Cronología de reportes con etiquetas (`[BLOQUEO TOTAL]`, `[COMERCIO]`, `[OFICIAL]`).
   - Filtro por zonas.

5. **💬 Chat Comunitario Zonal:**
   - Cada zona cuenta con su propia sala para evitar la saturación.
   - Enlace directo a WhatsApp oficial para reportar incidentes con fotos o videos.

---

## 🚀 Despliegue en GitHub Pages (En 3 Minutos)

1. **Crea un repositorio en GitHub:**
   - Ve a [github.com/new](https://github.com/new) y ponle de nombre `reportes-en-vivo` (o el que gustes).
   - Déjalo como **Público**.
2. **Sube los archivos de esta carpeta:**
   - Sube: `index.html`, la carpeta `css/` y la carpeta `js/`.
3. **Activa GitHub Pages:**
   - En tu repositorio de GitHub, ve a **Settings** -> **Pages** (menú izquierdo).
   - En **Branch**, selecciona `main` y la carpeta `/ (root)`.
   - Haz clic en **Save**.
4. ¡Listo! En 1 minuto tendrás tu enlace activo:
   `https://tu-usuario.github.io/reportes-en-vivo/`
   Ese es el enlace que difundes por WhatsApp.

---

## 🛠️ Cómo Actualizar la Información en Vivo

Toda la información del sistema se controla en el archivo:
📁 **`js/data.js`**

### 1. Activar o Cambiar la Alerta Crítica Urgente:
En `urgentAlert`:
```javascript
urgentAlert: {
  active: true,
  title: "🚨 BLOQUEO TOTAL EN ÓVALO DE CAYHUAYNA",
  message: "Manifestantes colocan montículos de tierra. Tránsito suspendido.",
  location: "Óvalo Cayhuayna",
  time: "10:35 AM",
  showModalOnLoad: true // Para que salte el pop-up al abrir
}
```

### 2. Agregar o Modificar Puntos en el Mapa:
En `mapPoints`:
```javascript
{
  id: "pt-8",
  title: "Puente Calicanto",
  zoneId: "centro",
  lat: -9.9325,
  lng: -76.2389,
  status: "bloqueo", // Opciones: 'bloqueo', 'restringido', 'libre'
  statusLabel: "Bloqueo Total",
  time: "11:00 AM",
  description: "Tránsito peatonal únicamente.",
  hasLiveCamera: true
}
```
*(Puedes obtener las coordenadas de cualquier punto haciendo clic derecho en Google Maps y copiando los dos números de latitud y longitud).*

### 3. Agregar un Reporte al "Minuto a Minuto":
En `liveFeed`:
```javascript
{
  id: "feed-6",
  time: "11:05 AM",
  zoneId: "norte",
  zoneName: "Zona Norte",
  type: "urgente", // 'urgente', 'transito', 'oficial', 'comunidad'
  tag: "BLOQUEO TOTAL",
  text: "Piquete avanza hacia el óvalo pavletich.",
  source: "Reportero Móvil 1"
}
```

---

## 📱 Flujo de Trabajo Operativo para el Día del Paro

1. **Equipo de Coordinación:**
   - Mantienen abierto el archivo `data.js` (o suben commits rápidos desde la interfaz web de GitHub en sus celulares).
   - Reciben reportes por WhatsApp de los ciudadanos y aprueban los verificados.
2. **Reporteros Ciudadanos:**
   - Reciben el enlace de su zona:
     - Zona Norte: `https://meet.jit.si/ParoHuanuco_ZonaNorte_Oficial`
     - Zona Centro: `https://meet.jit.si/ParoHuanuco_ZonaCentro_Oficial`
     - Zona Sur: `https://meet.jit.si/ParoHuanuco_ZonaSur_Oficial`
   - Solo abren el enlace en el navegador de su teléfono o en la app de Jitsi Meet y encienden su cámara trasera.
3. **Población en General:**
   - Abre el link de GitHub Pages desde WhatsApp.
   - Revisa el mapa para saber por dónde caminar o movilizarse, mira las cámaras y lee el minuto a minuto.

