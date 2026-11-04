/**
 * DATA & CONFIGURACIÓN DEL MONITOR CIUDADANO EN VIVO
 * Puedes editar este archivo o vincularlo a un Google Sheets / JSON externo.
 */

const APP_CONFIG = {
  eventName: "PARO REGIONAL HUÁNUCO",
  city: "Huánuco, Perú",
  
  // Coordenadas iniciales del mapa (Huánuco centro)
  mapCenter: [-9.9306, -76.2422],
  mapInitialZoom: 14,

  // Intervalo de recarga automática si se usa fuente remota (en milisegundos)
  autoRefreshInterval: 30000,

  // Enlace para reporte ciudadano por WhatsApp (reemplazar con el número del equipo)
  whatsappCoordinationNumber: "51999999999", 
  whatsappPresetMessage: "Hola, deseo reportar una incidencia confirmada para el mapa:",

  // Alerta Crítica Global de Emergencia (Aparece en banner y modal popup)
  urgentAlert: {
    id: "alert-001",
    active: true,
    title: "🚨 BLOQUEO TOTAL EN ÓVALO DE CAYHUAYNA Y PUENTE SAN SEBASTIÁN",
    message: "Manifestantes colocan montículos de tierra y llantas. Tránsito suspendido en ambas direcciones de la Carretera Central. Se sugiere desvío peatonal con precaución.",
    location: "Óvalo Cayhuayna / Puente San Sebastián",
    time: "10:35 AM",
    severity: "critical", // 'critical', 'warning', 'info'
    showModalOnLoad: true // Desplegar modal al abrir
  },

  // Zonas / Frentes Territoriales (Para Chat y Organización)
  zones: [
    {
      id: "norte",
      name: "Zona Norte",
      sector: "Fonavi / Óvalo Pavletich / Vía Colectora",
      status: "Bloqueo Parcial",
      statusType: "restringido",
      minnitRoom: "ParoHuanucoNorte"
    },
    {
      id: "centro",
      name: "Zona Centro",
      sector: "Plaza de Armas / Mercado Central / Jr. Dos de Mayo",
      status: "Marcha en Avance",
      statusType: "bloqueo",
      minnitRoom: "ParoHuanucoCentro"
    },
    {
      id: "sur",
      name: "Zona Sur",
      sector: "Cayhuayna / Puente San Sebastián / UDH - UNHEVAL",
      status: "Bloqueo Total",
      statusType: "bloqueo",
      minnitRoom: "ParoHuanucoSur"
    }
  ],

  // Transmisiones en Vivo de la Ciudadanía (Comienza VACÍO, solo aparecen los que la gente inicia o comparte)
  citizenStreams: [],

  // Puntos Georreferenciados para el Mapa de Bloqueos (Comienza VACÍO, los usuarios los ingresan, editan y retiran)
  mapPoints: [],

  // Minuto a Minuto Informativo (Feed en Vivo de la Ciudadanía)
  liveFeed: [],

  // Mensajes de Chat Iniciales
  chatHistory: {}
};

