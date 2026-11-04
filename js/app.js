/**
 * MONITOR CIUDADANO EN VIVO - LÓGICA PRINCIPAL DE LA APLICACIÓN
 * Manejo de Mapa Leaflet, Jitsi Meet Embed, Feed en Vivo y Chat Zonal
 */

document.addEventListener("DOMContentLoaded", () => {
  // Estado global de la aplicación
  const state = {
    currentView: "mapa",
    currentZoneId: APP_CONFIG.zones[0]?.id || "norte",
    currentChatZoneId: "general",
    currentChatFilter: "all",
    activeMapFilter: "all",
    soundEnabled: true,
    map: null,
    markersLayer: null,
    userLocationMarker: null,
    mapPoints: loadSavedIncidents(),
    streams: [],
    currentStreamId: null,
    currentPlayingStreamId: null,
    chatMessages: [],
    myClientId: "usr_" + Math.random().toString(36).substring(2, 8),
    tempPickerMarker: null,
    isPickingLocationOnMap: false
  };

  let switchView = function(viewName) {};

  // =========================================================================
  // 1. INICIALIZACIÓN
  // =========================================================================
  function initApp() {
    try { updateClock(); setInterval(updateClock, 30000); } catch (e) { console.warn("Clock error:", e); }
    try { initNavigation(); } catch (e) { console.warn("Nav error:", e); }
    try { initAlertTicker(); } catch (e) { console.warn("Alert ticker error:", e); }
    try { initCitizenStreams(); } catch (e) { console.warn("Citizen streams error:", e); }
    try { initWebSocketSync(); } catch (e) { console.warn("WebSocket sync error:", e); }
    try { initIncidentReporting(); } catch (e) { console.warn("Incident reporting error:", e); }
    try { initMap(); } catch (e) { console.warn("Map error:", e); }
    try { initLiveFeed(); } catch (e) { console.warn("Feed error:", e); }
    try { initChat(); } catch (e) { console.warn("Chat error:", e); }
    try { initAudioSystem(); } catch (e) { console.warn("Audio error:", e); }
    try { setupWhatsAppButton(); } catch (e) { console.warn("WA btn error:", e); }

    // Si hay una alerta crítica activa y configurada para mostrarse al inicio
    if (APP_CONFIG.urgentAlert?.active && APP_CONFIG.urgentAlert?.showModalOnLoad) {
      setTimeout(() => {
        openAlertModal(APP_CONFIG.urgentAlert);
        if (state.soundEnabled) {
          playAlertSound();
        }
      }, 700);
    }
  }

  // =========================================================================
  // 2. NAVEGACIÓN Y PESTAÑAS (Mobile & Desktop)
  // =========================================================================
  function initNavigation() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const bottomNavButtons = document.querySelectorAll(".bottom-nav-item");

    switchView = function(viewName) {
      state.currentView = viewName;

      // Actualizar paneles
      document.querySelectorAll(".view-panel").forEach(panel => {
        panel.classList.remove("active-view");
      });
      const activePanel = document.getElementById(`view-${viewName}`);
      if (activePanel) {
        activePanel.classList.add("active-view");
      }

      // Actualizar botones superiores
      tabButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.view === viewName);
      });

      // Actualizar barra inferior móvil
      bottomNavButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.view === viewName);
      });

      // Acciones específicas al entrar a una vista
      if (viewName === "mapa" && state.map) {
        setTimeout(() => {
          state.map.invalidateSize();
        }, 150);
      } else if (viewName === "envivo") {
        renderCitizenStreamsList();
      }
    }

    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    bottomNavButtons.forEach(btn => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    // Botón de refresco general
    const btnRefresh = document.getElementById("btn-refresh");
    const refreshIcon = document.getElementById("refresh-icon");
    if (btnRefresh) {
      btnRefresh.addEventListener("click", () => {
        refreshIcon.classList.add("spin-anim");
        renderMapPoints();
        renderLiveFeed();
        updateClock();
        setTimeout(() => refreshIcon.classList.remove("spin-anim"), 800);
      });
    }
  }

  // =========================================================================
  // 3. SISTEMA DE ALERTAS Y SONIDO
  // =========================================================================
  let audioCtx = null;

  function initAudioSystem() {
    const btnSoundToggle = document.getElementById("btn-sound-toggle");
    const soundIcon = document.getElementById("sound-icon");

    // Revisar preferencia guardada
    const savedSound = localStorage.getItem("monitor_sound_enabled");
    if (savedSound !== null) {
      state.soundEnabled = savedSound === "true";
    }
    updateSoundIcon(soundIcon);

    if (btnSoundToggle) {
      btnSoundToggle.addEventListener("click", () => {
        state.soundEnabled = !state.soundEnabled;
        localStorage.setItem("monitor_sound_enabled", state.soundEnabled);
        updateSoundIcon(soundIcon);
        if (state.soundEnabled) {
          playAlertSound();
        }
      });
    }
  }

  function updateSoundIcon(icon) {
    if (!icon) return;
    if (state.soundEnabled) {
      icon.className = "fa-solid fa-volume-high";
      icon.style.color = "#ffffff";
    } else {
      icon.className = "fa-solid fa-volume-xmark";
      icon.style.color = "#fca5a5";
    }
  }

  // Generador de sonido sintético de alerta de emergencia usando Web Audio API
  function playAlertSound() {
    if (!state.soundEnabled) return;
    try {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;
      // Primer pitido agudo
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(440, now + 0.15);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.16);

      // Segundo pitido
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(980, now + 0.18);
      osc2.frequency.exponentialRampToValueAtTime(490, now + 0.35);
      gain2.gain.setValueAtTime(0.25, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.36);
    } catch (e) {
      console.warn("Audio Context no soportado o bloqueado por el navegador:", e);
    }
  }

  function initAlertTicker() {
    const tickerText = document.getElementById("ticker-text");
    const btnOpenAlert = document.getElementById("btn-open-alert");
    const urgent = APP_CONFIG.urgentAlert;

    if (urgent && urgent.active) {
      tickerText.textContent = `${urgent.time} - ${urgent.title}: ${urgent.message}`;
      tickerText.addEventListener("click", () => openAlertModal(urgent));
      if (btnOpenAlert) {
        btnOpenAlert.addEventListener("click", () => openAlertModal(urgent));
      }
    } else {
      document.getElementById("urgent-ticker").style.display = "none";
    }

    // Modal de Alerta
    const alertModal = document.getElementById("alert-modal");
    const btnCloseAlert = document.getElementById("btn-modal-close");
    const btnGoToMap = document.getElementById("btn-modal-gotomap");

    if (btnCloseAlert) {
      btnCloseAlert.addEventListener("click", () => alertModal.classList.add("hidden"));
    }

    if (btnGoToMap) {
      btnGoToMap.addEventListener("click", () => {
        alertModal.classList.add("hidden");
        // Cambiar a la vista mapa y filtrar o centrar
        const tabMap = document.querySelector('.tab-btn[data-view="mapa"]');
        if (tabMap) tabMap.click();
      });
    }

    alertModal.addEventListener("click", (e) => {
      if (e.target === alertModal) {
        alertModal.classList.add("hidden");
      }
    });
  }

  function openAlertModal(alertData) {
    const modal = document.getElementById("alert-modal");
    document.getElementById("modal-alert-title").textContent = alertData.title;
    document.getElementById("modal-alert-time").innerHTML = `<i class="fa-regular fa-clock"></i> Reportado: ${alertData.time}`;
    document.getElementById("modal-alert-body").textContent = alertData.message;
    document.getElementById("modal-alert-location").innerHTML = `<i class="fa-solid fa-location-dot"></i> <span>Ubicación: ${alertData.location}</span>`;
    modal.classList.remove("hidden");
  }

  // =========================================================================
  // 4. MAPA INTERACTIVO (LEAFLET + OPENSTREETMAP)
  // =========================================================================
  function initMap() {
    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    // Crear instancia de Leaflet
    state.map = L.map("map", {
      zoomControl: true,
      attributionControl: true
    }).setView(APP_CONFIG.mapCenter, APP_CONFIG.mapInitialZoom);

    // Capas 100% públicas y gratuitas que NO requieren API Key ni bloquean por 'file://'
    // Esri ArcGIS World Street Map (Calles ultra detalladas sin bloqueo 403)
    const esriStreets = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom'
    });

    // Esri ArcGIS World Imagery (Vista aérea / Satelital)
    const esriSatellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
    });

    // Esri Topográfico (Alternativa de relieve y vías)
    const esriTopo = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; USGS, Esri, TCI'
    });

    // Activar capa de calles por defecto
    esriStreets.addTo(state.map);

    // Selector de capas (Calles / Satelital / Topográfico)
    const baseMaps = {
      "🗺️ Calles (Esri)": esriStreets,
      "🛰️ Satelital": esriSatellite,
      "🏔️ Topográfico": esriTopo
    };
    L.control.layers(baseMaps, null, { position: "topright" }).addTo(state.map);

    state.markersLayer = L.layerGroup().addTo(state.map);

    // Evento de clic en el mapa: modo marcador o pop-up rápido para reportar incidente
    state.map.on("click", (e) => {
      if (state.isPickingLocationOnMap) {
        if (typeof window.handleMapPickerClick === "function") {
          window.handleMapPickerClick(e.latlng);
        }
      } else {
        const popup = L.popup({ className: "quick-report-map-popup" })
          .setLatLng(e.latlng)
          .setContent(`
            <div style="text-align:center; padding: 4px;">
              <strong style="color:#0f172a; font-size:0.8rem; display:block; margin-bottom:5px;">📍 Punto Seleccionado</strong>
              <button class="btn-popup-sm btn-popup-edit" style="width:100%; margin:0; cursor:pointer;" onclick="window.reportIncidentAt(${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)})">
                <i class="fa-solid fa-circle-plus"></i> Reportar Incidente Aquí
              </button>
            </div>
          `)
          .openOn(state.map);
      }
    });

    // Renderizar los marcadores iniciales
    renderMapPoints();

    // Configurar filtros del mapa
    const filterButtons = document.querySelectorAll(".filter-chip");
    filterButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.activeMapFilter = btn.dataset.filter;
        renderMapPoints();
      });
    });

    // Botón de geolocalización del usuario
    const btnGeolocate = document.getElementById("btn-geolocate");
    if (btnGeolocate) {
      btnGeolocate.addEventListener("click", handleUserGeolocation);
    }

    // Toggle de la leyenda flotante
    const legendToggle = document.getElementById("legend-toggle");
    const legendContent = document.getElementById("legend-content");
    const legendChevron = document.getElementById("legend-chevron");
    if (legendToggle && legendContent) {
      legendToggle.addEventListener("click", () => {
        const isHidden = legendContent.style.display === "none";
        legendContent.style.display = isHidden ? "flex" : "none";
        legendChevron.className = isHidden ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down";
      });
    }
  }

  function createCustomMarkerIcon(status, hasCamera) {
    let iconClass = "marker-bloqueo";
    let iconInner = '<i class="fa-solid fa-road-barrier"></i>';

    if (hasCamera) {
      iconClass = "marker-camara";
      iconInner = '<i class="fa-solid fa-video"></i>';
    } else if (status === "restringido") {
      iconClass = "marker-restringido";
      iconInner = '<i class="fa-solid fa-triangle-exclamation"></i>';
    } else if (status === "libre") {
      iconClass = "marker-libre";
      iconInner = '<i class="fa-solid fa-check"></i>';
    }

    return L.divIcon({
      className: `custom-map-marker ${iconClass}`,
      html: iconInner,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18]
    });
  }

  function loadSavedIncidents() {
    try {
      const saved = localStorage.getItem("monitor_map_points_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    try {
      localStorage.removeItem("monitor_map_points");
    } catch (e) {}
    return [];
  }

  function renderMapPoints() {
    if (!state.map || !state.markersLayer) return;

    state.markersLayer.clearLayers();

    const points = Array.isArray(state.mapPoints) ? state.mapPoints : [];
    let counts = { all: points.length, bloqueo: 0, restringido: 0, libre: 0, camara: 0 };

    points.forEach(pt => {
      if (pt.status === "bloqueo") counts.bloqueo++;
      if (pt.status === "restringido") counts.restringido++;
      if (pt.status === "libre") counts.libre++;
      if (pt.hasLiveCamera) counts.camara++;

      // Evaluar filtro activo
      let match = false;
      if (state.activeMapFilter === "all") match = true;
      else if (state.activeMapFilter === "bloqueo" && pt.status === "bloqueo") match = true;
      else if (state.activeMapFilter === "restringido" && pt.status === "restringido") match = true;
      else if (state.activeMapFilter === "libre" && pt.status === "libre") match = true;
      else if (state.activeMapFilter === "camara" && pt.hasLiveCamera) match = true;

      if (!match) return;

      const marker = L.marker([pt.lat, pt.lng], {
        icon: createCustomMarkerIcon(pt.status, pt.hasLiveCamera)
      });

      // Contenido del Popup con acciones de Edición y Retiro
      let tagClass = "tag-bloqueo";
      if (pt.status === "restringido") tagClass = "tag-restringido";
      if (pt.status === "libre") tagClass = "tag-libre";

      let cameraAction = "";
      if (pt.hasLiveCamera && pt.zoneId) {
        cameraAction = `
          <button class="btn-popup-live" onclick="window.viewZoneStream('${pt.zoneId}')">
            <i class="fa-solid fa-video"></i> Ver Cámara en Vivo
          </button>
        `;
      }

      const popupHtml = `
        <div class="map-popup-body">
          <h4>${escapeHtml(pt.title)}</h4>
          <span class="point-status-tag ${tagClass}">${pt.statusLabel}</span>
          <span style="font-size:0.7rem; color:#94a3b8; display:block; margin: 3px 0 6px;">Hora: ${pt.time}</span>
          <p>${escapeHtml(pt.description)}</p>
          ${cameraAction}
          <div class="popup-actions-bar">
            <button class="btn-popup-sm btn-popup-edit" onclick="window.editIncidentById('${pt.id}')">
              <i class="fa-solid fa-pen-to-square"></i> Editar Estado
            </button>
            <button class="btn-popup-sm btn-popup-delete" onclick="window.deleteIncidentById('${pt.id}')">
              <i class="fa-solid fa-trash-can"></i> Retirar
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      state.markersLayer.addLayer(marker);
    });

    // Actualizar contadores numéricos en la interfaz
    document.getElementById("count-all").textContent = counts.all;
    document.getElementById("count-bloqueos").textContent = counts.bloqueo;
    document.getElementById("count-restringidos").textContent = counts.restringido;
    document.getElementById("count-libres").textContent = counts.libre;
    document.getElementById("count-camaras").textContent = counts.camara;

    // Renderizar tarjetas de puntos debajo del mapa
    renderPointsSummaryCards();
  }

  function renderPointsSummaryCards() {
    const container = document.getElementById("points-cards-container");
    if (!container) return;

    container.innerHTML = "";
    const points = Array.isArray(state.mapPoints) ? state.mapPoints : [];

    if (points.length === 0) {
      container.innerHTML = `
        <div class="points-empty-notice">
          <i class="fa-solid fa-map-location-dot"></i>
          <p>No hay incidentes reportados en este momento</p>
          <span>Usa el botón <strong>"Reportar Incidente"</strong> para registrar una vía en tiempo real.</span>
        </div>
      `;
      return;
    }

    points.forEach(pt => {
      let tagClass = "tag-bloqueo";
      if (pt.status === "restringido") tagClass = "tag-restringido";
      if (pt.status === "libre") tagClass = "tag-libre";

      const card = document.createElement("div");
      card.className = "point-card";
      card.innerHTML = `
        <div class="point-card-top">
          <span class="point-status-tag ${tagClass}">${pt.statusLabel}</span>
          <span class="point-time"><i class="fa-regular fa-clock"></i> ${pt.time}</span>
        </div>
        <div class="point-title">${escapeHtml(pt.title)}</div>
        <div class="point-desc">${escapeHtml(pt.description)}</div>
        <div class="point-action-hint">
          <i class="fa-solid fa-crosshairs"></i> Toca para enfocar en mapa
        </div>
        <div class="point-card-actions">
          <button class="btn-card-action btn-card-edit" onclick="event.stopPropagation(); window.editIncidentById('${pt.id}')">
            <i class="fa-solid fa-pen-to-square"></i> Editar Estado
          </button>
          <button class="btn-card-action btn-card-delete" onclick="event.stopPropagation(); window.deleteIncidentById('${pt.id}')">
            <i class="fa-solid fa-trash-can"></i> Retirar
          </button>
        </div>
      `;

      card.addEventListener("click", () => {
        if (!state.map) return;
        state.map.flyTo([pt.lat, pt.lng], 16, { animate: true, duration: 1.2 });
        state.markersLayer.eachLayer(layer => {
          if (layer.getLatLng && 
              Math.abs(layer.getLatLng().lat - pt.lat) < 0.0001 && 
              Math.abs(layer.getLatLng().lng - pt.lng) < 0.0001) {
            layer.openPopup();
          }
        });
        document.getElementById("map").scrollIntoView({ behavior: "smooth", block: "center" });
      });

      container.appendChild(card);
    });
  }

  function handleUserGeolocation() {
    if (!navigator.geolocation) {
      alert("La geolocalización no está soportada en tu navegador.");
      return;
    }

    const btn = document.getElementById("btn-geolocate");
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Localizando...`;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        if (state.userLocationMarker) {
          state.map.removeLayer(state.userLocationMarker);
        }

        const userIcon = L.divIcon({
          className: "custom-map-marker",
          html: '<div style="width:16px; height:16px; background:#38bdf8; border:3px solid white; border-radius:50%; box-shadow:0 0 10px #38bdf8;"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        state.userLocationMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(state.map);
        state.userLocationMarker.bindPopup("<b>📍 Tu ubicación actual</b><br>Verifica qué tan cerca estás de los bloqueos.").openPopup();

        state.map.flyTo([userLat, userLng], 15);
        btn.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Mi ubicación`;
      },
      (err) => {
        console.warn("Error de geolocalización:", err);
        alert("No se pudo obtener tu ubicación. Por favor, asegúrate de activar los permisos de GPS en tu celular.");
        btn.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Mi ubicación`;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // =========================================================================
  // 5. CÁMARAS Y TRANSMISIONES CIUDADANAS (DINÁMICO)
  // =========================================================================
  function initCitizenStreams() {
    loadSavedStreams();
    initStreamCreationModal();

    // Controles de pantalla completa
    const btnFullscreen = document.getElementById("btn-fullscreen-stream");
    const streamContainer = document.getElementById("stream-container");
    if (btnFullscreen && streamContainer) {
      btnFullscreen.addEventListener("click", () => {
        if (!document.fullscreenElement) {
          if (streamContainer.requestFullscreen) {
            streamContainer.requestFullscreen();
          } else if (streamContainer.webkitRequestFullscreen) {
            streamContainer.webkitRequestFullscreen();
          }
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          }
        }
      });
    }

    // Botones para abrir modal de transmisión
    const btnStart = document.getElementById("btn-start-stream");
    const btnTrigger = document.getElementById("btn-trigger-stream-modal");
    if (btnStart) btnStart.addEventListener("click", openStreamCreatorModal);
    if (btnTrigger) btnTrigger.addEventListener("click", openStreamCreatorModal);

    // Botones para finalizar transmisión (en header y footer de la tarjeta)
    const btnEnd = document.getElementById("btn-end-stream");
    const btnEndFooter = document.getElementById("btn-end-stream-footer");
    if (btnEnd) btnEnd.addEventListener("click", () => endCurrentStream());
    if (btnEndFooter) btnEndFooter.addEventListener("click", () => endCurrentStream());

    renderCitizenStreamsList();
  }

  function loadSavedStreams() {
    try {
      const saved = localStorage.getItem("monitor_citizen_streams");
      if (saved) {
        state.streams = JSON.parse(saved);
      } else {
        state.streams = Array.isArray(APP_CONFIG.citizenStreams) ? [...APP_CONFIG.citizenStreams] : [];
      }
      state.myActiveStreamId = localStorage.getItem("monitor_my_stream_id") || null;

      // Detectar si el usuario abrió un enlace compartido con transmisión (URL Params)
      const urlParams = new URLSearchParams(window.location.search);
      const sharedRoom = urlParams.get("room");
      const sharedLoc = urlParams.get("loc");
      const sharedUrl = urlParams.get("url");

      if (sharedRoom || sharedUrl) {
        const sharedId = "shared-" + (sharedRoom || "social");
        const exists = state.streams.some(s => s.id === sharedId || (sharedRoom && s.room === sharedRoom));
        if (!exists) {
          const newShared = {
            id: sharedId,
            location: sharedLoc || "Punto de Movilización",
            author: "Reportero en el lugar",
            time: "En directo",
            type: sharedUrl ? "social" : "camera",
            room: sharedRoom || null,
            url: sharedUrl || null
          };
          state.streams.unshift(newShared);
          state.currentStreamId = sharedId;
        }
      }
    } catch (e) {
      state.streams = [];
    }
  }

  // =========================================================================
  // SINCRONIZACIÓN WEBSOCKETS EN TIEMPO REAL (CELULAR <-> PC Y EN VIVO)
  // =========================================================================
  const MQTT_TOPICS = {
    streams: "mirador_udh_paro/citizen_streams_v1",
    incidents: "mirador_udh_paro/incidents_v1",
    chat: "mirador_udh_paro/chat_v1"
  };

  const MQTT_SYNC = {
    host: "broker.emqx.io",
    port: 8084,
    path: "/mqtt",
    client: null,
    connected: false,
    pendingStreamsPayload: null,
    pendingIncidentsPayload: null
  };

  function initWebSocketSync() {
    if (typeof Paho === "undefined") {
      console.warn("Librería Paho MQTT no encontrada, operando en modo local.");
      return;
    }

    try {
      const clientId = "mirador_" + Math.random().toString(16).substring(2, 10);
      MQTT_SYNC.client = new Paho.MQTT.Client(MQTT_SYNC.host, MQTT_SYNC.port, MQTT_SYNC.path, clientId);

      MQTT_SYNC.client.onConnectionLost = function(responseObject) {
        MQTT_SYNC.connected = false;
        const wsBadge = document.getElementById("chat-ws-status");
        if (wsBadge) wsBadge.textContent = "Reconectando...";
        if (responseObject.errorCode !== 0) {
          console.warn("WebSocket reconectando en 4s...", responseObject.errorMessage);
          setTimeout(initWebSocketSync, 4000);
        }
      };

      MQTT_SYNC.client.onMessageArrived = function(message) {
        try {
          const topic = message.destinationName;
          const payload = JSON.parse(message.payloadString);

          // 1. TRANSMISIONES EN VIVO
          if (topic === MQTT_TOPICS.streams && Array.isArray(payload)) {
            const currentStr = JSON.stringify(state.streams || []);
            const newStr = JSON.stringify(payload);
            if (currentStr !== newStr) {
              state.streams = payload;
              try { localStorage.setItem("monitor_citizen_streams", newStr); } catch (e) { }
              renderCitizenStreamsList();
            }
          }
          // 2. INCIDENTES Y BLOQUEOS DE VÍAS
          else if (topic === MQTT_TOPICS.incidents && Array.isArray(payload)) {
            const currentStr = JSON.stringify(state.mapPoints || []);
            const newStr = JSON.stringify(payload);
            if (currentStr !== newStr) {
              state.mapPoints = payload;
              try { localStorage.setItem("monitor_map_points", newStr); } catch (e) { }
              renderMapPoints();
              if (state.soundEnabled) playAlertSound();
            }
          }
          // 3. CHAT COMUNITARIO EN VIVO
          else if (topic === MQTT_TOPICS.chat && payload && payload.text) {
            handleIncomingChatMessage(payload);
          }
        } catch (err) {
          console.warn("Mensaje MQTT no es JSON:", err);
        }
      };

      MQTT_SYNC.client.connect({
        useSSL: true,
        timeout: 10,
        keepAliveInterval: 30,
        onSuccess: function() {
          MQTT_SYNC.connected = true;
          console.log("🟢 WebSockets en Vivo Conectado a la Red.");
          const wsBadge = document.getElementById("chat-ws-status");
          if (wsBadge) wsBadge.textContent = "En Vivo";

          MQTT_SYNC.client.subscribe(MQTT_TOPICS.streams, { qos: 1 });
          MQTT_SYNC.client.subscribe(MQTT_TOPICS.incidents, { qos: 1 });
          MQTT_SYNC.client.subscribe(MQTT_TOPICS.chat, { qos: 1 });

          // Despachar payloads pendientes si los hubiera
          if (MQTT_SYNC.pendingStreamsPayload) {
            broadcastStreamsViaWebSocket();
            MQTT_SYNC.pendingStreamsPayload = null;
          }
          if (MQTT_SYNC.pendingIncidentsPayload) {
            broadcastIncidentsViaWebSocket();
            MQTT_SYNC.pendingIncidentsPayload = null;
          }
        },
        onFailure: function(err) {
          MQTT_SYNC.connected = false;
          const wsBadge = document.getElementById("chat-ws-status");
          if (wsBadge) wsBadge.textContent = "Sin Conexión";
          console.warn("Fallo al conectar WebSocket, reintentando...", err);
          setTimeout(initWebSocketSync, 5000);
        }
      });
    } catch (e) {
      console.warn("Error en initWebSocketSync:", e);
    }
  }

  function broadcastStreamsViaWebSocket() {
    const payload = JSON.stringify(state.streams || []);
    if (MQTT_SYNC.client && MQTT_SYNC.connected) {
      try {
        const msg = new Paho.MQTT.Message(payload);
        msg.destinationName = MQTT_TOPICS.streams;
        msg.retained = true;
        msg.qos = 1;
        MQTT_SYNC.client.send(msg);
      } catch (err) {
        console.warn("Error enviando streams por WebSocket:", err);
      }
    } else {
      MQTT_SYNC.pendingStreamsPayload = payload;
    }
  }

  function broadcastIncidentsViaWebSocket() {
    const payload = JSON.stringify(state.mapPoints || []);
    if (MQTT_SYNC.client && MQTT_SYNC.connected) {
      try {
        const msg = new Paho.MQTT.Message(payload);
        msg.destinationName = MQTT_TOPICS.incidents;
        msg.retained = true; // Retenido para que cualquier nuevo visitante reciba los puntos actualizados
        msg.qos = 1;
        MQTT_SYNC.client.send(msg);
      } catch (err) {
        console.warn("Error enviando incidentes por WebSocket:", err);
      }
    } else {
      MQTT_SYNC.pendingIncidentsPayload = payload;
    }
  }

  function broadcastChatMessageViaWebSocket(chatMsg) {
    if (MQTT_SYNC.client && MQTT_SYNC.connected) {
      try {
        const msg = new Paho.MQTT.Message(JSON.stringify(chatMsg));
        msg.destinationName = MQTT_TOPICS.chat;
        msg.qos = 1;
        MQTT_SYNC.client.send(msg);
      } catch (err) {
        console.warn("Error enviando chat por WebSocket:", err);
      }
    }
  }

  function saveStreams() {
    try {
      localStorage.setItem("monitor_citizen_streams", JSON.stringify(state.streams || []));
    } catch (e) { }
    broadcastStreamsViaWebSocket();
  }

  function renderCitizenStreamsList() {
    const listContainer = document.getElementById("active-streams-list");
    const streamsBar = document.getElementById("active-streams-bar");
    const placeholder = document.getElementById("no-streams-placeholder");
    const mediaHolder = document.getElementById("stream-media-holder");
    const btnShareWa = document.getElementById("btn-share-stream-wa");
    const btnFullscreen = document.getElementById("btn-fullscreen-stream");
    const btnEnd = document.getElementById("btn-end-stream");
    const btnEndFooter = document.getElementById("btn-end-stream-footer");

    if (listContainer) listContainer.innerHTML = "";

    // Si NO hay transmisiones activas
    if (!state.streams || state.streams.length === 0) {
      if (streamsBar) streamsBar.style.display = "none";
      if (placeholder) placeholder.classList.remove("hidden");
      if (mediaHolder) mediaHolder.innerHTML = "";
      
      const titleEl = document.getElementById("current-stream-title");
      if (titleEl) titleEl.textContent = "SIN SEÑAL EN VIVO";
      const locEl = document.getElementById("current-stream-location");
      if (locEl) locEl.textContent = "Esperando señal ciudadana";
      const authorEl = document.getElementById("current-stream-author");
      if (authorEl) authorEl.textContent = "--";
      const timeEl = document.getElementById("current-stream-time");
      if (timeEl) timeEl.textContent = "";

      // Ocultar botones de reproducción/acciones cuando no hay en vivo
      if (btnShareWa) btnShareWa.style.display = "none";
      if (btnFullscreen) btnFullscreen.style.display = "none";
      if (btnEnd) btnEnd.style.display = "none";
      if (btnEndFooter) btnEndFooter.style.display = "none";
      return;
    }

    // Si hay transmisiones creadas por la gente
    if (streamsBar) streamsBar.style.display = "block";
    if (placeholder) placeholder.classList.add("hidden");
    if (btnShareWa) btnShareWa.style.display = "inline-flex";
    if (btnFullscreen) btnFullscreen.style.display = "inline-flex";
    if (btnEnd) btnEnd.style.display = "inline-flex";
    if (btnEndFooter) btnEndFooter.style.display = "inline-flex";

    if (listContainer) {
      state.streams.forEach((stream, index) => {
        const btn = document.createElement("button");
        const isActive = state.currentStreamId === stream.id || (!state.currentStreamId && index === 0);
        btn.className = `btn-stream-pill ${isActive ? "active" : ""}`;
        btn.dataset.streamId = stream.id;

        btn.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="stream-pill-live"><i class="fa-solid fa-circle live-blink"></i> EN VIVO</span>
            <span class="pill-close-btn" title="Cerrar esta señal" onclick="event.stopPropagation(); window.closeStreamById('${stream.id}')">&times;</span>
          </div>
          <span class="stream-pill-title">${escapeHtml(stream.location)}</span>
          <span class="stream-pill-author">por ${escapeHtml(stream.author || "Vecino")}</span>
        `;

        btn.addEventListener("click", () => {
          if (state.currentStreamId !== stream.id) {
            document.querySelectorAll(".btn-stream-pill").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            playCitizenStream(stream.id, true);
          }
        });

        listContainer.appendChild(btn);
      });
    }

    // Reproducir la primera si no hay una seleccionada (sin forzar recarga si ya está reproduciendo)
    const targetId = state.currentStreamId || state.streams[0].id;
    playCitizenStream(targetId, false);
  }

  function playCitizenStream(streamId, forceReload = false) {
    if (!state.streams) return;
    const stream = state.streams.find(s => s.id === streamId);
    if (!stream) return;

    state.currentStreamId = streamId;

    const isMyStream = state.myActiveStreamId === stream.id;
    const titleEl = document.getElementById("current-stream-title");
    const locEl = document.getElementById("current-stream-location");
    const authorEl = document.getElementById("current-stream-author");
    const timeEl = document.getElementById("current-stream-time");

    if (isMyStream && (stream.type === "vdo" || stream.room)) {
      if (titleEl) titleEl.textContent = "TU CÁMARA EN VIVO";
      if (locEl) locEl.textContent = `🔴 Transmitiendo desde: ${stream.location}`;
    } else {
      if (titleEl) titleEl.textContent = stream.location.toUpperCase();
      if (locEl) locEl.textContent = `📍 ${stream.location}`;
    }

    if (authorEl) authorEl.textContent = stream.author || "Ciudadano en el punto";
    if (timeEl) timeEl.textContent = `• Iniciado: ${stream.time}`;

    const btnShareWa = document.getElementById("btn-share-stream-wa");
    const mediaHolder = document.getElementById("stream-media-holder");
    const placeholder = document.getElementById("no-streams-placeholder");
    const btnEnd = document.getElementById("btn-end-stream");
    const btnEndFooter = document.getElementById("btn-end-stream-footer");
    const btnFullscreen = document.getElementById("btn-fullscreen-stream");

    if (placeholder) placeholder.classList.add("hidden");

    if (btnEnd) btnEnd.style.display = "inline-flex";
    if (btnEndFooter) btnEndFooter.style.display = "inline-flex";
    if (btnFullscreen) btnFullscreen.style.display = "inline-flex";

    // Configurar enlace directo de WhatsApp para compartir este stream
    if (btnShareWa) {
      btnShareWa.style.display = "inline-flex";
      const baseUrl = window.location.origin + window.location.pathname;
      let shareParam = "";
      if (stream.room) {
        shareParam = `?room=${encodeURIComponent(stream.room)}&loc=${encodeURIComponent(stream.location)}`;
      } else if (stream.url) {
        shareParam = `?url=${encodeURIComponent(stream.url)}&loc=${encodeURIComponent(stream.location)}`;
      }
      const directLiveUrl = baseUrl + shareParam;
      const waText = encodeURIComponent(`🔴 EN VIVO desde ${stream.location}: Sintoniza la transmisión aquí 👉 ${directLiveUrl}`);
      btnShareWa.href = `https://wa.me/?text=${waText}`;
    }

    // SI YA ESTÁ REPRODUCIENDO ESTE MISMO STREAM Y EL IFRAME EXISTE, NO REINICIAR NI DESTRUIR EL REPRODUCTOR
    const hasIframe = mediaHolder?.querySelector("iframe");
    if (!forceReload && state.currentPlayingStreamId === streamId && hasIframe) {
      return; // Mantener la señal corriendo sin ningún segundo de interrupción
    }

    state.currentPlayingStreamId = streamId;

    if (!mediaHolder) return;
    mediaHolder.innerHTML = "";

    // Renderizar Transmisión 100% IN-APP (Sin salir de la web)
    if (stream.type === "vdo" || stream.type === "screenshare" || stream.room) {
      if (isMyStream) {
        // Modo Emisor In-App: La cámara o pantalla se activa directo sin pedir selección en inglés
        embedVdoNinjaBroadcaster(mediaHolder, stream.room, stream.author, stream.facing || "back", stream.type === "screenshare");
      } else {
        // Modo Espectador In-App: Ve la señal recibida en grande con fondo adaptativo
        embedVdoNinjaViewer(mediaHolder, stream.room);
      }
    } else if (stream.url && stream.url.includes("youtu")) {
      embedYouTubeLive(mediaHolder, stream.url);
    } else if (stream.url && (stream.url.includes("facebook") || stream.url.includes("fb.watch"))) {
      embedFacebookLive(mediaHolder, stream.url);
    } else {
      embedGenericLive(mediaHolder, stream.url);
    }
  }

  // Emisor In-App (Cámara o Pantalla, automático sin pantallas en inglés)
  function embedVdoNinjaBroadcaster(container, roomName, author, facing = "back", isScreen = false) {
    container.innerHTML = "";
    const iframe = document.createElement("iframe");
    const modeParam = isScreen ? "&screenshare" : "&webcam";
    const facingParam = isScreen ? "" : `&facing=${facing}`;
    // &webcam o &screenshare junto con &autostart omite la pantalla de selección en inglés
    iframe.src = `https://vdo.ninja/?push=${roomName}${modeParam}&autostart${facingParam}&lang=es&quality=2&bitrate=1200&audiobitrate=64&cleanoutput=1&label=${encodeURIComponent(author || "Reportero")}`;
    iframe.allow = "camera; microphone; fullscreen; display-capture; autoplay";
    iframe.allowFullscreen = true;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    container.appendChild(iframe);
  }

  // Visor de Cámara In-App (Los espectadores ven el video ampliado al máximo con blur ambiental)
  function embedVdoNinjaViewer(container, roomName) {
    container.innerHTML = "";
    const iframe = document.createElement("iframe");
    // &blur llena los laterales de videos verticales con desenfoque dinámico y &scale=100 maximiza el tamaño
    iframe.src = `https://vdo.ninja/?view=${roomName}&autoplay=1&cleanoutput=1&controls=1&blur&scale=100&lang=es`;
    iframe.allow = "autoplay; camera; microphone; fullscreen; display-capture; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    container.appendChild(iframe);
  }

  function embedYouTubeLive(container, url) {
    container.innerHTML = "";
    let videoId = "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length >= 11) {
      videoId = match[2].substring(0, 11);
    }
    const embedSrc = videoId 
      ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0` 
      : url;

    const iframe = document.createElement("iframe");
    iframe.src = embedSrc;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    container.appendChild(iframe);
  }

  function embedFacebookLive(container, url) {
    container.innerHTML = "";
    const encodedUrl = encodeURIComponent(url);
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&autoplay=true`;
    iframe.allow = "autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    container.appendChild(iframe);
  }

  function embedGenericLive(container, url) {
    container.innerHTML = `
      <div class="stream-generic-box">
        <h4><i class="fa-solid fa-satellite-dish"></i> Transmisión en Directo</h4>
        <p>Reproduciendo señal en vivo directamente en la plataforma.</p>
        <iframe src="${url}" allow="autoplay; fullscreen" style="width:100%; height:100%; border:none;"></iframe>
      </div>
    `;
  }

  function initStreamCreationModal() {
    const modal = document.getElementById("stream-creator-modal");
    const btnClose = document.getElementById("btn-close-creator-modal");
    const btnCancel = document.getElementById("btn-cancel-create-stream");
    const form = document.getElementById("form-create-stream");
    const inputLocation = document.getElementById("stream-input-location");
    const inputUrl = document.getElementById("stream-input-url");
    const inputAuthor = document.getElementById("stream-input-author");
    const selectCamera = document.getElementById("stream-select-camera");
    const radioInputs = document.querySelectorAll('input[name="stream_mode"]');
    const groupUrl = document.getElementById("group-stream-url");
    const groupCamera = document.getElementById("group-camera-facing");

    if (btnClose) btnClose.addEventListener("click", closeStreamCreatorModal);
    if (btnCancel) btnCancel.addEventListener("click", closeStreamCreatorModal);
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeStreamCreatorModal();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeStreamCreatorModal();
    });

    // Alternar modo de transmisión
    radioInputs.forEach(radio => {
      radio.addEventListener("change", () => {
        document.querySelectorAll(".radio-card").forEach(c => c.classList.remove("active"));
        radio.closest(".radio-card")?.classList.add("active");
        if (radio.value === "social") {
          groupUrl?.classList.remove("hidden");
          groupCamera?.classList.add("hidden");
          if (inputUrl) inputUrl.required = true;
        } else if (radio.value === "screenshare") {
          groupUrl?.classList.add("hidden");
          groupCamera?.classList.add("hidden");
          if (inputUrl) inputUrl.required = false;
        } else {
          groupUrl?.classList.add("hidden");
          groupCamera?.classList.remove("hidden");
          if (inputUrl) inputUrl.required = false;
        }
      });
    });

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const location = inputLocation ? inputLocation.value.trim() : "";
        const author = (inputAuthor && inputAuthor.value.trim()) || "Vecino / Reportero";
        const selectedRadio = document.querySelector('input[name="stream_mode"]:checked');
        const mode = selectedRadio ? selectedRadio.value : "vdo";
        const url = inputUrl ? inputUrl.value.trim() : "";
        const cameraFacing = selectCamera ? selectCamera.value : "back";

        if (!location) return;

        const streamId = "stream-" + Date.now();
        const timeNow = getCurrentTimeFormatted();

        let newStream = {
          id: streamId,
          location: location,
          author: author,
          time: timeNow,
          type: mode,
          facing: cameraFacing
        };

        if (mode === "vdo" || mode === "screenshare") {
          // Generar sala única de cámara o pantalla
          const randomId = Math.random().toString(36).substring(2, 8);
          const cleanLoc = location.replace(/[^a-zA-Z0-9]/g, "");
          newStream.room = `ParoHco_${cleanLoc}_${randomId}`;
        } else {
          if (!url) return;
          newStream.url = url;
        }

        // Guardar como mi transmisión activa local
        if (!Array.isArray(state.streams)) state.streams = [];
        state.streams.unshift(newStream);
        state.myActiveStreamId = streamId;
        try {
          localStorage.setItem("monitor_my_stream_id", streamId);
        } catch (err) {}
        saveStreams();

        // Agregar reporte automático al Minuto a Minuto
        addLiveFeedItem({
          time: timeNow,
          zoneId: "centro",
          zoneName: location,
          type: "urgente",
          tag: "EN VIVO",
          text: `Se inició una nueva transmisión en directo desde: ${location} por ${author}.`,
          source: author
        });

        closeStreamCreatorModal();
        form.reset();

        // Cambiar a la vista de En Vivo y sintonizar inmediatamente IN-APP
        const tabEnvivo = document.querySelector('.tab-btn[data-view="envivo"]');
        if (tabEnvivo) tabEnvivo.click();

        state.currentStreamId = streamId;
        renderCitizenStreamsList();
      });
    }
  }

  function openStreamCreatorModal() {
    const modal = document.getElementById("stream-creator-modal");
    if (modal) {
      modal.classList.remove("hidden");
      setTimeout(() => {
        document.getElementById("stream-input-location")?.focus();
      }, 100);
    }
  }

  function closeStreamCreatorModal() {
    const modal = document.getElementById("stream-creator-modal");
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  function endCurrentStream(streamIdToClose = null) {
    const targetId = streamIdToClose || state.currentStreamId;
    const stream = state.streams.find(s => s.id === targetId);
    if (!stream) return;

    if (confirm(`¿Deseas dar por terminada y retirar la transmisión en vivo de "${stream.location}"?`)) {
      state.streams = state.streams.filter(s => s.id !== targetId);
      if (state.myActiveStreamId === targetId) {
        state.myActiveStreamId = null;
        localStorage.removeItem("monitor_my_stream_id");
      }
      saveStreams();

      // Agregar reporte al Minuto a Minuto
      addLiveFeedItem({
        time: getCurrentTimeFormatted(),
        zoneId: "centro",
        zoneName: stream.location,
        type: "oficial",
        tag: "SEÑAL CONCLUIDA",
        text: `El reportero finalizó la transmisión en directo desde: ${stream.location}.`,
        source: stream.author || "Reportero"
      });

      state.currentStreamId = state.streams[0]?.id || null;
      renderCitizenStreamsList();
    }
  }

  // Función global para cerrar desde el botón de la píldora
  window.closeStreamById = function(streamId) {
    endCurrentStream(streamId);
  };

  function addLiveFeedItem(item) {
    if (!APP_CONFIG.liveFeed) APP_CONFIG.liveFeed = [];
    APP_CONFIG.liveFeed.unshift(item);
    renderLiveFeed();
  }

  function renderZoneContextFeed(zoneId) {
    const container = document.getElementById("zone-feed-list");
    if (!container) return;

    container.innerHTML = "";
    const items = APP_CONFIG.liveFeed.filter(f => f.zoneId === zoneId);

    if (items.length === 0) {
      container.innerHTML = `<div style="font-size:0.75rem; color:#94a3b8; padding:8px;">Sin incidencias recientes registradas en esta zona.</div>`;
      return;
    }

    items.forEach(item => {
      const div = document.createElement("div");
      div.className = `zone-feed-item ${item.type === "urgente" ? "alert-item" : ""}`;
      div.innerHTML = `
        <span class="zone-feed-time">${item.time}</span>
        <div><strong>[${item.tag}]</strong> ${item.text}</div>
      `;
      container.appendChild(div);
    });
  }

  // Función global expuesta para saltar desde un popup del mapa a la cámara
  window.viewZoneStream = function(zoneId) {
    const tabEnvivo = document.querySelector('.tab-btn[data-view="envivo"]');
    if (tabEnvivo) tabEnvivo.click();

    setTimeout(() => {
      const zoneBtn = document.querySelector(`.btn-zone-card[data-zone-id="${zoneId}"]`);
      if (zoneBtn) zoneBtn.click();
    }, 200);
  };

  // =========================================================================
  // 6. MINUTO A MINUTO (FEED GENERAL)
  // =========================================================================
  function initLiveFeed() {
    // Llenar select de filtro por zonas
    const select = document.getElementById("feed-zone-filter");
    if (select) {
      select.innerHTML = '<option value="all">Todas las Zonas</option>';
      APP_CONFIG.zones.forEach(z => {
        select.innerHTML += `<option value="${z.id}">${z.name}</option>`;
      });

      select.addEventListener("change", () => {
        renderLiveFeed(select.value);
      });
    }

    renderLiveFeed();
  }

  function renderLiveFeed(filterZone = "all") {
    const container = document.getElementById("timeline-container");
    if (!container) return;

    container.innerHTML = "";
    const filteredFeed = APP_CONFIG.liveFeed.filter(item => {
      return filterZone === "all" || item.zoneId === filterZone;
    });

    document.getElementById("feed-count").textContent = filteredFeed.length;

    filteredFeed.forEach(item => {
      const entry = document.createElement("article");
      entry.className = `timeline-entry type-${item.type}`;

      entry.innerHTML = `
        <div class="timeline-entry-header">
          <div class="timeline-tags">
            <span class="tag-badge tag-${item.type}">${item.tag}</span>
            <span class="timeline-zone-name">${item.zoneName}</span>
          </div>
          <span class="timeline-time"><i class="fa-regular fa-clock"></i> ${item.time}</span>
        </div>
        <div class="timeline-text">${item.text}</div>
        <div class="timeline-source">
          <i class="fa-solid fa-user-check"></i> Fuente: ${item.source}
        </div>
      `;

      container.appendChild(entry);
    });
  }

  // =========================================================================
  // 7. REPORTE CIUDADANO DE INCIDENTES / ESTADO DE VÍA (SINCRONIZADO)
  // =========================================================================
  const HUANUCO_KNOWN_PLACES = [
    { name: "Puente Calicanto", lat: -9.9325, lng: -76.2389, zone: "centro" },
    { name: "Óvalo de Cayhuayna", lat: -9.9575, lng: -76.2418, zone: "sur" },
    { name: "Puente San Sebastián", lat: -9.9392, lng: -76.2447, zone: "centro" },
    { name: "Óvalo Esteban Pavletich (Fonavi II)", lat: -9.9142, lng: -76.2341, zone: "norte" },
    { name: "Plaza de Armas de Huánuco", lat: -9.9306, lng: -76.2422, zone: "centro" },
    { name: "Mercado Modelo (Jr. Huallayco)", lat: -9.9287, lng: -76.2405, zone: "centro" },
    { name: "Vía Colectora (Pillco Marca)", lat: -9.9520, lng: -76.2370, zone: "sur" },
    { name: "Puente Tingo / Las Moras", lat: -9.9220, lng: -76.2480, zone: "centro" },
    { name: "Carretera Central - Salida a Ambo / Lima", lat: -9.9650, lng: -76.2450, zone: "sur" },
    { name: "Carretera Central - Salida a Tingo María", lat: -9.9050, lng: -76.2300, zone: "norte" },
    { name: "UNHEVAL (Puerta Principal)", lat: -9.9555, lng: -76.2485, zone: "sur" },
    { name: "UDH (Campus La Esperanza)", lat: -9.9020, lng: -76.2250, zone: "norte" },
    { name: "Alameda de la República", lat: -9.9340, lng: -76.2415, zone: "centro" },
    { name: "Malecón Daniel Alomía Robles", lat: -9.9350, lng: -76.2410, zone: "centro" },
    { name: "Puente Señor de Burgos (Amarilis)", lat: -9.9270, lng: -76.2330, zone: "centro" },
    { name: "Puente Huallaga (Salida Amarilis)", lat: -9.9200, lng: -76.2310, zone: "norte" }
  ];

  function findNearestKnownPlace(lat, lng) {
    let nearest = null;
    let minDist = Infinity;
    HUANUCO_KNOWN_PLACES.forEach(place => {
      const dLat = place.lat - lat;
      const dLng = place.lng - lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (dist < minDist) {
        minDist = dist;
        nearest = { place, distance: dist };
      }
    });
    return nearest;
  }

  function autoAssignZoneByCoords(lat, lng) {
    const selectZone = document.getElementById("incident-select-zone");
    if (!selectZone) return;
    if (lat < -9.945) {
      selectZone.value = "sur";
    } else if (lat > -9.920) {
      selectZone.value = "norte";
    } else {
      selectZone.value = "centro";
    }
  }

  function updateCoordPreview(lat, lng, label = null) {
    const box = document.getElementById("incident-coord-preview");
    const text = document.getElementById("incident-coord-text");
    const btnClear = document.getElementById("btn-clear-coords");
    if (!box || !text) return;

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      box.classList.add("coord-locked");
      const labelStr = label ? ` (${label})` : "";
      text.innerHTML = `<strong>Ubicación fijada:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}${labelStr}`;
      if (btnClear) btnClear.classList.remove("hidden");
    } else {
      box.classList.remove("coord-locked");
      text.textContent = "Selecciona un lugar o márcalo en el mapa";
      if (btnClear) btnClear.classList.add("hidden");
    }
  }

  function placeTempPickerMarker(lat, lng) {
    if (!state.map) return;
    if (state.tempPickerMarker) {
      state.tempPickerMarker.setLatLng([lat, lng]);
    } else {
      state.tempPickerMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: "temp-picker-marker",
          html: '<div class="picker-pin"><i class="fa-solid fa-location-dot"></i></div>',
          iconSize: [38, 38],
          iconAnchor: [19, 38]
        }),
        draggable: true
      }).addTo(state.map);

      state.tempPickerMarker.on("dragend", (e) => {
        const pos = e.target.getLatLng();
        const latInput = document.getElementById("incident-input-lat");
        const lngInput = document.getElementById("incident-input-lng");
        if (latInput) latInput.value = pos.lat.toFixed(6);
        if (lngInput) lngInput.value = pos.lng.toFixed(6);
        autoAssignZoneByCoords(pos.lat, pos.lng);
        const nearest = findNearestKnownPlace(pos.lat, pos.lng);
        updateCoordPreview(pos.lat, pos.lng, nearest && nearest.distance < 0.003 ? nearest.place.name : null);
      });
    }
  }

  function clearTempPickerMarker() {
    if (state.tempPickerMarker && state.map) {
      state.map.removeLayer(state.tempPickerMarker);
      state.tempPickerMarker = null;
    }
  }

  function initIncidentReporting() {
    const btnOpen = document.getElementById("btn-open-incident-modal");
    const modal = document.getElementById("incident-modal");
    const btnClose = document.getElementById("btn-close-incident-modal");
    const btnCancel = document.getElementById("btn-cancel-incident");
    const form = document.getElementById("form-report-incident");
    const inputTitle = document.getElementById("incident-input-title");
    const selectZone = document.getElementById("incident-select-zone");
    const inputDesc = document.getElementById("incident-input-desc");
    const inputAuthor = document.getElementById("incident-input-author");
    const hiddenId = document.getElementById("incident-edit-id");
    const btnSubmit = document.getElementById("btn-submit-incident");
    const btnPickMap = document.getElementById("btn-incident-pick-on-map");
    const btnCancelPicker = document.getElementById("btn-cancel-map-picker");
    const btnClearCoords = document.getElementById("btn-clear-coords");
    const btnGps = document.getElementById("btn-incident-use-gps");
    const latInput = document.getElementById("incident-input-lat");
    const lngInput = document.getElementById("incident-input-lng");
    const radioStatus = document.querySelectorAll('input[name="incident_status"]');

    if (btnOpen) {
      btnOpen.addEventListener("click", () => {
        if (hiddenId) hiddenId.value = "";
        const modalTitle = modal?.querySelector(".modal-header h3");
        if (modalTitle) modalTitle.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Reportar Incidente / Estado de Vía`;
        if (btnSubmit) btnSubmit.innerHTML = `<i class="fa-solid fa-bullhorn"></i> Publicar Reporte en Tiempo Real`;
        form?.reset();
        document.querySelectorAll("#incident-modal .radio-card").forEach(c => c.classList.remove("active"));
        document.getElementById("card-status-bloqueo")?.classList.add("active");
        if (latInput) latInput.value = "";
        if (lngInput) lngInput.value = "";
        updateCoordPreview(null, null);
        clearTempPickerMarker();
        modal?.classList.remove("hidden");
        setTimeout(() => inputTitle?.focus(), 100);
      });
    }

    const closeModal = () => {
      modal?.classList.add("hidden");
      clearTempPickerMarker();
    };

    if (btnClose) btnClose.addEventListener("click", closeModal);
    if (btnCancel) btnCancel.addEventListener("click", closeModal);
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
    }

    radioStatus.forEach(radio => {
      radio.addEventListener("change", () => {
        document.querySelectorAll("#incident-modal .radio-card").forEach(c => c.classList.remove("active"));
        radio.closest(".radio-card")?.classList.add("active");
      });
    });

    // Marcar punto directamente en el mapa
    if (btnPickMap) {
      btnPickMap.addEventListener("click", () => {
        state.isPickingLocationOnMap = true;
        modal?.classList.add("hidden");
        switchView("mapa");

        const banner = document.getElementById("map-picker-banner");
        if (banner) banner.classList.remove("hidden");
        document.body.classList.add("map-picking-active");

        const curLat = parseFloat(latInput?.value);
        const curLng = parseFloat(lngInput?.value);
        if (!isNaN(curLat) && !isNaN(curLng) && state.map) {
          state.map.setView([curLat, curLng], 16);
          placeTempPickerMarker(curLat, curLng);
        } else if (state.map) {
          state.map.setView(APP_CONFIG.mapCenter, 15);
        }
      });
    }

    if (btnCancelPicker) {
      btnCancelPicker.addEventListener("click", () => {
        state.isPickingLocationOnMap = false;
        document.body.classList.remove("map-picking-active");
        const banner = document.getElementById("map-picker-banner");
        if (banner) banner.classList.add("hidden");
        modal?.classList.remove("hidden");
      });
    }

    if (btnClearCoords) {
      btnClearCoords.addEventListener("click", () => {
        if (latInput) latInput.value = "";
        if (lngInput) lngInput.value = "";
        clearTempPickerMarker();
        updateCoordPreview(null, null);
      });
    }

    // Autocompletado inteligente con lista de puntos críticos de Huánuco
    if (inputTitle) {
      inputTitle.addEventListener("input", () => {
        const val = inputTitle.value.trim().toLowerCase();
        if (!val) return;
        const match = HUANUCO_KNOWN_PLACES.find(p => p.name.toLowerCase() === val || (val.length > 5 && p.name.toLowerCase().includes(val)));
        if (match) {
          if (latInput) latInput.value = match.lat;
          if (lngInput) lngInput.value = match.lng;
          if (selectZone) selectZone.value = match.zone;
          placeTempPickerMarker(match.lat, match.lng);
          updateCoordPreview(match.lat, match.lng, match.name);
        }
      });
    }

    // Geolocalización del dispositivo con verificación de límites de Huánuco
    if (btnGps) {
      btnGps.addEventListener("click", () => {
        if (!navigator.geolocation) {
          alert("Tu navegador o dispositivo no soporta geolocalización.");
          return;
        }
        const origHtml = btnGps.innerHTML;
        btnGps.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Obteniendo GPS...`;
        btnGps.disabled = true;

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            btnGps.innerHTML = origHtml;
            btnGps.disabled = false;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            // Validación de coordenadas para el departamento de Huánuco
            const inHuanuco = (lat >= -10.3 && lat <= -9.6 && lng >= -76.6 && lng <= -75.9);
            if (!inHuanuco) {
              alert(`⚠️ Tu dispositivo/red reporta coordenadas (${lat.toFixed(4)}, ${lng.toFixed(4)}) fuera de Huánuco (posible conexión de internet con IP de Lima).\n\nTe recomendamos pulsar "Marcar en el mapa" para ubicar el incidente con exactitud sobre la calle correspondiente.`);
              return;
            }

            if (latInput) latInput.value = lat.toFixed(6);
            if (lngInput) lngInput.value = lng.toFixed(6);

            autoAssignZoneByCoords(lat, lng);
            placeTempPickerMarker(lat, lng);
            updateCoordPreview(lat, lng, "GPS Actual");

            if (state.map) {
              state.map.setView([lat, lng], 16);
            }
          },
          (err) => {
            btnGps.innerHTML = origHtml;
            btnGps.disabled = false;
            console.warn("GPS incidente error:", err);
            alert("No se pudo obtener la señal GPS de tu dispositivo.\n\nPuedes marcar el punto exacto tocando 'Marcar en el mapa'.");
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      });
    }

    // Envío del formulario
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const editingId = hiddenId ? hiddenId.value : "";
        const title = inputTitle ? inputTitle.value.trim() : "";
        const zoneId = selectZone ? selectZone.value : "centro";
        const desc = inputDesc ? inputDesc.value.trim() : "";
        const author = (inputAuthor && inputAuthor.value.trim()) || "Vecino en el punto";
        const statusSelected = document.querySelector('input[name="incident_status"]:checked');
        const status = statusSelected ? statusSelected.value : "bloqueo";

        if (!title || !desc) return;

        let statusLabel = "Bloqueo Total";
        if (status === "restringido") statusLabel = "Paso Restringido";
        if (status === "libre") statusLabel = "Vía Libre / Despejada";

        const timeNow = getCurrentTimeFormatted();

        // Determinar coordenadas exactas
        const rawLat = parseFloat(latInput?.value);
        const rawLng = parseFloat(lngInput?.value);

        let finalLat, finalLng;
        if (!isNaN(rawLat) && !isNaN(rawLng)) {
          finalLat = rawLat;
          finalLng = rawLng;
        } else {
          // Buscar coincidencia en lugares conocidos de Huánuco
          const match = HUANUCO_KNOWN_PLACES.find(p => title.toLowerCase().includes(p.name.toLowerCase()));
          if (match) {
            finalLat = match.lat;
            finalLng = match.lng;
          } else {
            // Centro de la zona como último recurso sin jitter arbitrario
            const zoneCenters = {
              centro: { lat: -9.9306, lng: -76.2422 },
              sur: { lat: -9.9575, lng: -76.2418 },
              norte: { lat: -9.9142, lng: -76.2341 }
            };
            const c = zoneCenters[zoneId] || zoneCenters.centro;
            finalLat = c.lat;
            finalLng = c.lng;
          }
        }

        if (editingId) {
          // Edición de reporte existente
          const existingIndex = state.mapPoints.findIndex(p => p.id === editingId);
          if (existingIndex !== -1) {
            state.mapPoints[existingIndex].title = title;
            state.mapPoints[existingIndex].zoneId = zoneId;
            state.mapPoints[existingIndex].status = status;
            state.mapPoints[existingIndex].statusLabel = statusLabel;
            state.mapPoints[existingIndex].description = `${desc} (Actualizado por: ${author})`;
            state.mapPoints[existingIndex].time = timeNow;
            state.mapPoints[existingIndex].lat = finalLat;
            state.mapPoints[existingIndex].lng = finalLng;
          }
        } else {
          // Creación de nuevo reporte georreferenciado
          const newPoint = {
            id: "pt-" + Date.now(),
            title: title,
            zoneId: zoneId,
            lat: finalLat,
            lng: finalLng,
            status: status,
            statusLabel: statusLabel,
            time: timeNow,
            description: `${desc} (Reportado por: ${author})`,
            hasLiveCamera: false
          };

          if (!Array.isArray(state.mapPoints)) state.mapPoints = [];
          state.mapPoints.unshift(newPoint);
        }

        try {
          localStorage.setItem("monitor_map_points_v2", JSON.stringify(state.mapPoints));
        } catch (err) {}

        broadcastIncidentsViaWebSocket();
        renderMapPoints();

        addLiveFeedItem({
          time: timeNow,
          zoneId: zoneId,
          zoneName: title,
          type: status === "bloqueo" ? "urgente" : (status === "restringido" ? "aviso" : "oficial"),
          tag: editingId ? `ACTUALIZADO: ${statusLabel.toUpperCase()}` : statusLabel.toUpperCase(),
          text: `${title}: ${desc}`,
          source: author
        });

        closeModal();
        form.reset();
        if (hiddenId) hiddenId.value = "";
        if (latInput) latInput.value = "";
        if (lngInput) lngInput.value = "";
        updateCoordPreview(null, null);
        clearTempPickerMarker();

        // Si estamos en la vista de mapa, volar al punto y abrir el popup
        switchView("mapa");
        if (state.map) {
          state.map.flyTo([finalLat, finalLng], 16, { animate: true, duration: 1 });
          setTimeout(() => {
            state.markersLayer?.eachLayer(layer => {
              if (layer.getLatLng && 
                  Math.abs(layer.getLatLng().lat - finalLat) < 0.0002 && 
                  Math.abs(layer.getLatLng().lng - finalLng) < 0.0002) {
                layer.openPopup();
              }
            });
          }, 1100);
        }
      });
    }
  }

  // Clic en el mapa cuando el modo marcador está activo
  window.handleMapPickerClick = function(latlng) {
    state.isPickingLocationOnMap = false;
    document.body.classList.remove("map-picking-active");

    const banner = document.getElementById("map-picker-banner");
    if (banner) banner.classList.add("hidden");

    placeTempPickerMarker(latlng.lat, latlng.lng);

    const latInput = document.getElementById("incident-input-lat");
    const lngInput = document.getElementById("incident-input-lng");
    if (latInput) latInput.value = latlng.lat.toFixed(6);
    if (lngInput) lngInput.value = latlng.lng.toFixed(6);

    autoAssignZoneByCoords(latlng.lat, latlng.lng);

    const nearest = findNearestKnownPlace(latlng.lat, latlng.lng);
    const titleInput = document.getElementById("incident-input-title");
    if (nearest && nearest.distance < 0.003 && titleInput && !titleInput.value.trim()) {
      titleInput.value = nearest.place.name;
    }

    updateCoordPreview(latlng.lat, latlng.lng, nearest && nearest.distance < 0.003 ? nearest.place.name : null);

    const modal = document.getElementById("incident-modal");
    if (modal) modal.classList.remove("hidden");
  };

  // Reportar directamente desde un punto clickeado en el mapa
  window.reportIncidentAt = function(lat, lng) {
    if (state.map) state.map.closePopup();
    const btnOpen = document.getElementById("btn-open-incident-modal");
    if (btnOpen) btnOpen.click();

    const latInput = document.getElementById("incident-input-lat");
    const lngInput = document.getElementById("incident-input-lng");
    if (latInput) latInput.value = lat;
    if (lngInput) lngInput.value = lng;

    autoAssignZoneByCoords(lat, lng);
    placeTempPickerMarker(lat, lng);

    const nearest = findNearestKnownPlace(lat, lng);
    const titleInput = document.getElementById("incident-input-title");
    if (nearest && nearest.distance < 0.003 && titleInput) {
      titleInput.value = nearest.place.name;
      updateCoordPreview(lat, lng, nearest.place.name);
    } else {
      updateCoordPreview(lat, lng, "Punto marcado");
    }
  };

  // Funciones globales expuestas para editar y retirar incidentes desde popups o tarjetas
  window.editIncidentById = function(pointId) {
    const pt = state.mapPoints.find(p => p.id === pointId);
    if (!pt) return;

    const modal = document.getElementById("incident-modal");
    const modalTitle = modal?.querySelector(".modal-header h3");
    const inputTitle = document.getElementById("incident-input-title");
    const selectZone = document.getElementById("incident-select-zone");
    const inputDesc = document.getElementById("incident-input-desc");
    const inputAuthor = document.getElementById("incident-input-author");
    const hiddenId = document.getElementById("incident-edit-id");
    const btnSubmit = document.getElementById("btn-submit-incident");
    const latInput = document.getElementById("incident-input-lat");
    const lngInput = document.getElementById("incident-input-lng");

    if (modalTitle) modalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Editar Incidente / Estado de Vía`;
    if (inputTitle) inputTitle.value = pt.title || "";
    if (selectZone) selectZone.value = pt.zoneId || "centro";
    if (inputDesc) inputDesc.value = pt.description ? pt.description.replace(/\s*\((Reportado|Actualizado) por:.*?\)/, "") : "";
    if (inputAuthor) inputAuthor.value = pt.author || "";
    if (hiddenId) hiddenId.value = pt.id;
    if (latInput) latInput.value = pt.lat;
    if (lngInput) lngInput.value = pt.lng;
    if (btnSubmit) btnSubmit.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios en Vivo`;

    updateCoordPreview(pt.lat, pt.lng, pt.title);
    placeTempPickerMarker(pt.lat, pt.lng);

    document.querySelectorAll("#incident-modal input[name=\"incident_status\"]").forEach(r => {
      r.checked = (r.value === pt.status);
      r.closest(".radio-card")?.classList.toggle("active", r.value === pt.status);
    });

    modal?.classList.remove("hidden");
  };

  window.deleteIncidentById = function(pointId) {
    const pt = state.mapPoints.find(p => p.id === pointId);
    if (!pt) return;

    if (confirm(`¿Deseas retirar el reporte de "${pt.title}"?\nLa vía quedará marcada como despejada y se actualizará para todos.`)) {
      state.mapPoints = state.mapPoints.filter(p => p.id !== pointId);
      clearTempPickerMarker();
      try {
        localStorage.setItem("monitor_map_points_v2", JSON.stringify(state.mapPoints));
      } catch (e) {}

      broadcastIncidentsViaWebSocket();
      renderMapPoints();

      addLiveFeedItem({
        time: getCurrentTimeFormatted(),
        zoneId: pt.zoneId || "centro",
        zoneName: pt.title,
        type: "oficial",
        tag: "VÍA HABILITADA / RETIRADA",
        text: `Se retiró el reporte de bloqueo en: ${pt.title}. Tránsito despejado.`,
        source: "Comunidad"
      });
    }
  };

  // =========================================================================
  // 8. CHAT CIUDADANO EN VIVO (WEBSOCKETS NATIVO)
  // =========================================================================
  function loadSavedChat() {
    try {
      const saved = localStorage.getItem("monitor_chat_history_v2");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: "msg-1", user: "Coordinación Huánuco", zoneId: "general", text: "Bienvenidos al chat ciudadano en vivo. Comparte reportes verificados del estado de vías.", time: "08:00 AM" }
    ];
  }

  function handleIncomingChatMessage(payload) {
    if (!payload || !payload.text) return;
    if (!Array.isArray(state.chatMessages)) state.chatMessages = [];

    const exists = state.chatMessages.some(m => m.id === payload.id);
    if (!exists) {
      state.chatMessages.push(payload);
      if (state.chatMessages.length > 120) state.chatMessages.shift();
      try {
        localStorage.setItem("monitor_chat_history_v2", JSON.stringify(state.chatMessages));
      } catch (e) {}
      renderChatMessages();
    }
  }

  function initChat() {
    state.chatMessages = loadSavedChat();
    state.currentChatFilter = "all";

    const tabsContainer = document.getElementById("chat-zone-tabs");
    const form = document.getElementById("chat-send-form");
    const inputUser = document.getElementById("chat-input-user");
    const inputMsg = document.getElementById("chat-input-message");
    const selectZone = document.getElementById("chat-select-zone");

    const savedAlias = localStorage.getItem("monitor_chat_alias");
    if (savedAlias && inputUser) inputUser.value = savedAlias;

    if (tabsContainer) {
      tabsContainer.innerHTML = "";
      const filterOptions = [
        { id: "all", name: "📢 Todos" },
        { id: "centro", name: "Zona Centro" },
        { id: "sur", name: "Zona Sur" },
        { id: "norte", name: "Zona Norte" }
      ];

      filterOptions.forEach(opt => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `chat-tab-chip ${opt.id === "all" ? "active" : ""}`;
        chip.textContent = opt.name;
        chip.addEventListener("click", () => {
          document.querySelectorAll(".chat-tab-chip").forEach(c => c.classList.remove("active"));
          chip.classList.add("active");
          state.currentChatFilter = opt.id;
          renderChatMessages();
        });
        tabsContainer.appendChild(chip);
      });
    }

    renderChatMessages();

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const user = (inputUser && inputUser.value.trim()) || "Ciudadano";
        const text = inputMsg ? inputMsg.value.trim() : "";
        const zoneId = selectZone ? selectZone.value : "general";

        if (!text) return;

        localStorage.setItem("monitor_chat_alias", user);

        const newMsg = {
          id: "msg-" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          user: user,
          zoneId: zoneId,
          text: text,
          time: getCurrentTimeFormatted(),
          senderId: state.myClientId
        };

        state.chatMessages.push(newMsg);
        try {
          localStorage.setItem("monitor_chat_history_v2", JSON.stringify(state.chatMessages));
        } catch (err) {}

        broadcastChatMessageViaWebSocket(newMsg);

        inputMsg.value = "";
        renderChatMessages();
      });
    }
  }

  function renderChatMessages() {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;

    container.innerHTML = "";

    const filter = state.currentChatFilter || "all";
    const messages = (state.chatMessages || []).filter(m => {
      if (filter === "all") return true;
      return m.zoneId === filter;
    });

    if (messages.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:24px; color:#94a3b8; font-size:0.8rem;">No hay mensajes en este canal aún. ¡Sé el primero en reportar!</div>`;
      return;
    }

    const zoneNames = {
      general: "General",
      centro: "Centro",
      sur: "Sur",
      norte: "Norte"
    };

    messages.forEach(msg => {
      const isMine = msg.senderId && msg.senderId === state.myClientId;
      const bubble = document.createElement("div");
      bubble.className = `chat-bubble ${isMine ? "mine" : "other"}`;

      bubble.innerHTML = `
        <div class="chat-bubble-header">
          <span class="chat-bubble-author">${escapeHtml(msg.user || "Vecino")}</span>
          <div>
            <span class="chat-bubble-zone">${zoneNames[msg.zoneId] || "Sector"}</span>
            <span class="chat-bubble-time">${msg.time}</span>
          </div>
        </div>
        <div class="chat-bubble-text">${escapeHtml(msg.text)}</div>
      `;

      container.appendChild(bubble);
    });

    container.scrollTop = container.scrollHeight;
  }

  // =========================================================================
  // 8. GUÍA Y ENLACES PARA REPORTEROS
  // =========================================================================
  function initReporterModal() {
    const modal = document.getElementById("reporter-modal");
    if (!modal) return;
    const linkGuide = document.getElementById("link-reporter-guide");
    const btnClose = document.getElementById("btn-close-reporter-modal");
    const btnOk = document.getElementById("btn-reporter-modal-ok");
    const linksContainer = document.getElementById("reporter-zones-links");

    if (linksContainer) {
      linksContainer.innerHTML = "";
      APP_CONFIG.zones.forEach(z => {
        const fullUrl = `https://meet.jit.si/${z.jitsiRoom}`;
        const div = document.createElement("div");
        div.className = "reporter-link-item";
        div.innerHTML = `
          <div>
            <strong>${z.name}:</strong> <span style="color:#94a3b8; font-size:0.7rem;">${z.jitsiRoom}</span>
          </div>
          <button class="btn-copy-link" data-url="${fullUrl}"><i class="fa-solid fa-copy"></i> Copiar Link</button>
        `;
        linksContainer.appendChild(div);
      });

      // Manejar copiado al portapapeles
      linksContainer.querySelectorAll(".btn-copy-link").forEach(btn => {
        btn.addEventListener("click", () => {
          navigator.clipboard.writeText(btn.dataset.url).then(() => {
            const prevText = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-check"></i> ¡Copiado!`;
            setTimeout(() => btn.innerHTML = prevText, 2000);
          });
        });
      });
    }

    function openModal() { modal?.classList.remove("hidden"); }
    function closeModal() { modal?.classList.add("hidden"); }

    if (linkGuide) linkGuide.addEventListener("click", (e) => { e.preventDefault(); openModal(); });
    if (btnClose) btnClose.addEventListener("click", closeModal);
    if (btnOk) btnOk.addEventListener("click", closeModal);
    modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  }

  // =========================================================================
  // 9. HELPERS Y UTILIDADES
  // =========================================================================
  function setupWhatsAppButton() {
    const btnWa = document.getElementById("btn-wa-report");
    if (!btnWa) return;
    const phone = APP_CONFIG.whatsappCoordinationNumber;
    const msg = encodeURIComponent(APP_CONFIG.whatsappPresetMessage);
    btnWa.href = `https://wa.me/${phone}?text=${msg}`;
  }

  function updateClock() {
    const timeNowEl = document.getElementById("time-now");
    if (timeNowEl) {
      timeNowEl.textContent = getCurrentTimeFormatted();
    }
  }

  function getCurrentTimeFormatted() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // Formato 12 horas
    return `${hours}:${minutes} ${ampm}`;
  }

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // Arrancar la app
  initApp();
});

