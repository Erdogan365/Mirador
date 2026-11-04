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

  // Zonas / Frentes Informativos Estratégicos
  zones: [
    {
      id: "norte",
      name: "Zona Norte",
      sector: "Fonavi / Óvalo Pavletich / Vía Colectora",
      status: "Bloqueo Parcial",
      statusType: "restringido", // 'bloqueo', 'restringido', 'libre'
      reporter: "Móvil 01 - Fonavi",
      // Sala pública y gratuita en Jitsi Meet
      jitsiRoom: "ParoHuanuco_ZonaNorte_Oficial",
      activeStream: true,
      description: "Vía de salida a Tingo María con tránsito de mototaxis lento por bloqueo intermitente."
    },
    {
      id: "centro",
      name: "Zona Centro",
      sector: "Plaza de Armas / Mercado Central / Jr. Dos de Mayo",
      status: "Marcha en Avance",
      statusType: "bloqueo",
      reporter: "Móvil 02 - Prensa Popular",
      jitsiRoom: "ParoHuanuco_ZonaCentro_Oficial",
      activeStream: true,
      description: "Comerciantes cerraron puestos en Mercado Central. Columna de manifestantes rumbo a la Plaza."
    },
    {
      id: "sur",
      name: "Zona Sur",
      sector: "Cayhuayna / Puente San Sebastián / UDH - UNHEVAL",
      status: "Bloqueo Total",
      statusType: "bloqueo",
      reporter: "Móvil 03 - Pillco Marca",
      jitsiRoom: "ParoHuanuco_ZonaSur_Oficial",
      activeStream: true,
      description: "Puente San Sebastián y Óvalo de Cayhuayna completamente cerrados por piquetes de huelga."
    }
  ],

  // Puntos Georreferenciados para el Mapa de Bloqueos (Leaflet)
  mapPoints: [
    {
      id: "pt-1",
      title: "Óvalo de Cayhuayna",
      zoneId: "sur",
      lat: -9.9575,
      lng: -76.2418,
      status: "bloqueo", // 'bloqueo' | 'restringido' | 'libre' | 'camara'
      statusLabel: "Bloqueo Total",
      time: "10:32 AM",
      description: "Cierre total con piedras, troncos y llantas en llamas. No hay pase para autos ni motos.",
      hasLiveCamera: true,
      roomName: "ParoHuanuco_ZonaSur_Oficial"
    },
    {
      id: "pt-2",
      title: "Puente San Sebastián",
      zoneId: "sur",
      lat: -9.9392,
      lng: -76.2447,
      status: "bloqueo",
      statusLabel: "Bloqueo Total",
      time: "10:28 AM",
      description: "Piquete de huelguistas impide el paso vehicular entre Huánuco y Pillco Marca. Solo pase peatonal.",
      hasLiveCamera: false
    },
    {
      id: "pt-3",
      title: "Óvalo Pavletich / Frente Fonavi II",
      zoneId: "norte",
      lat: -9.9142,
      lng: -76.2341,
      status: "restringido",
      statusLabel: "Paso Restringido",
      time: "10:20 AM",
      description: "Mototaxistas bloquean parcialmente el carril de salida hacia Tingo María. Pase cada 30 minutos.",
      hasLiveCamera: true,
      roomName: "ParoHuanuco_ZonaNorte_Oficial"
    },
    {
      id: "pt-4",
      title: "Mercado Modelo y Mercado Central",
      zoneId: "centro",
      lat: -9.9287,
      lng: -76.2405,
      status: "bloqueo",
      statusLabel: "Cierre Comercial / Marcha",
      time: "10:15 AM",
      description: "Puertas cerradas al 100%. Concentración de gremios en Jr. San Martín y Huallayco.",
      hasLiveCamera: false
    },
    {
      id: "pt-5",
      title: "Puente Calicanto",
      zoneId: "centro",
      lat: -9.9325,
      lng: -76.2389,
      status: "restringido",
      statusLabel: "Resguardo Policial",
      time: "10:05 AM",
      description: "Contingente policial apostado. Se permite únicamente cruce a pie. Tráfico vehicular desviado.",
      hasLiveCamera: true,
      roomName: "ParoHuanuco_ZonaCentro_Oficial"
    },
    {
      id: "pt-6",
      title: "Vía Colectora (Pillco Marca)",
      zoneId: "sur",
      lat: -9.9520,
      lng: -76.2370,
      status: "libre",
      statusLabel: "Vía Habilitada",
      time: "09:50 AM",
      description: "Tránsito fluido para vehículos menores por calles secundarias hacia Marabamba.",
      hasLiveCamera: false
    },
    {
      id: "pt-7",
      title: "Plaza de Armas de Huánuco",
      zoneId: "centro",
      lat: -9.9306,
      lng: -76.2422,
      status: "restringido",
      statusLabel: "Concentración Pacífica",
      time: "09:40 AM",
      description: "Llegada paulatina de delegaciones con banderolas y megáfonos frente a la prefectura.",
      hasLiveCamera: true,
      roomName: "ParoHuanuco_ZonaCentro_Oficial"
    }
  ],

  // Minuto a Minuto Informativo (Feed de Estado)
  liveFeed: [
    {
      id: "feed-1",
      time: "10:35 AM",
      zoneId: "sur",
      zoneName: "Zona Sur",
      type: "urgente",
      tag: "BLOQUEO TOTAL",
      text: "Llegan más contingentes de manifestantes al Óvalo de Cayhuayna. Suspensión total del tránsito en el acceso a la universidad.",
      source: "Equipo Móvil 3"
    },
    {
      id: "feed-2",
      time: "10:28 AM",
      zoneId: "centro",
      zoneName: "Zona Centro",
      type: "transito",
      tag: "COMERCIO CERRADO",
      text: "Comerciantes de los jirones Huallayco y Dos de Mayo acatan el paro de manera preventiva para evitar disturbios.",
      source: "Reportero Centro"
    },
    {
      id: "feed-3",
      time: "10:15 AM",
      zoneId: "norte",
      zoneName: "Zona Norte",
      type: "oficial",
      tag: "VÍA COLECTORA",
      text: "Se habilitó paso provisional de mototaxis por la vía alterna de Las Moras hacia el norte.",
      source: "Coordinación Barrial"
    },
    {
      id: "feed-4",
      time: "10:02 AM",
      zoneId: "centro",
      zoneName: "Zona Centro",
      type: "comunidad",
      tag: "TRANSPORTE PÚBLICO",
      text: "Líneas de colectivos hacia Amarilis han suspendido sus rutas temporalmente. Pasajeros se desplazan a pie.",
      source: "Reporte Ciudadano"
    },
    {
      id: "feed-5",
      time: "09:45 AM",
      zoneId: "sur",
      zoneName: "Zona Sur",
      type: "transito",
      tag: "PUENTE SAN SEBASTIÁN",
      text: "Cierre de puente con vehículos varados en dirección a Ambo y Lima. Se solicita a conductores no avanzar.",
      source: "Prensa Local"
    }
  ],

  // Mensajes de Chat de Bienvenida / Historial Inicial
  chatHistory: {
    norte: [
      { user: "Carlos M.", text: "¿Hay pase hacia el aeropuerto o está cerrado el óvalo?", time: "10:18 AM" },
      { user: "Vecino Fonavi", text: "Solo mototaxis por calles interiores, la pista central tiene llantas.", time: "10:22 AM" }
    ],
    centro: [
      { user: "Rosa_Hco", text: "¿Los bancos de la Plaza de Armas están atendiendo?", time: "10:10 AM" },
      { user: "Marco T.", text: "Cerraron las rejas hace media hora por seguridad.", time: "10:14 AM" }
    ],
    sur: [
      { user: "Estudiante_UNHEVAL", text: "¿Se puede cruzar el puente San Sebastián caminando?", time: "10:25 AM" },
      { user: "Pillco_Alerta", text: "A pie sí con cuidado, pero para autos y motos nada.", time: "10:29 AM" }
    ]
  }
};

