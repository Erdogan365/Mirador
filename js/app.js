/**
 * MONITOR CIUDADANO EN VIVO - LÓGICA PRINCIPAL DE LA APLICACIÓN
 * Manejo de Mapa Leaflet, Jitsi Meet Embed, Feed en Vivo y Chat Zonal
 */

document.addEventListener("DOMContentLoaded", () => {
  // Estado global de la aplicación
  const state = {
    currentView: "mapa",
    currentZoneId: APP_CONFIG.zones[0]?.id || "norte",
    currentChatZoneId: APP_CONFIG.zones[0]?.id || "norte",
    activeMapFilter: "all",
    soundEnabled: true,
    map: null,
    markersLayer: null,
    userLocationMarker: null,
    jitsiApi: null,
    currentRoom: null,
    chatMessages: JSON.parse(JSON.stringify(APP_CONFIG.chatHistory))
  };

  // =========================================================================
  // 1. INICIALIZACIÓN
  // =========================================================================
  function initApp() {
    updateClock();
    setInterval(updateClock, 30000);

    initNavigation();
    initAlertTicker();
    initZoneButtons();
    initMap();
    initLiveFeed();
    initChat();
    initReporterModal();
    initAudioSystem();

    // Actualizar enlace de reporte de WhatsApp
    setupWhatsAppButton();

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

    function switchView(viewName) {
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
        loadZoneStream(state.currentZoneId);
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

  function renderMapPoints() {
    if (!state.map || !state.markersLayer) return;

    state.markersLayer.clearLayers();

    const points = APP_CONFIG.mapPoints;
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

      // Contenido del Popup
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
          <h4>${pt.title}</h4>
          <span class="point-status-tag ${tagClass}">${pt.statusLabel}</span>
          <span style="font-size:0.7rem; color:#94a3b8; display:block; margin: 3px 0 6px;">Hora: ${pt.time}</span>
          <p>${pt.description}</p>
          ${cameraAction}
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
    APP_CONFIG.mapPoints.forEach(pt => {
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
        <div class="point-title">${pt.title}</div>
        <div class="point-desc">${pt.description}</div>
        <div class="point-action-hint">
          <i class="fa-solid fa-crosshairs"></i> Toca para enfocar en mapa ${pt.hasLiveCamera ? '• 📹 Con transmisión' : ''}
        </div>
      `;

      card.addEventListener("click", () => {
        if (!state.map) return;
        state.map.flyTo([pt.lat, pt.lng], 16, { animate: true, duration: 1.2 });
        // Buscar el marcador correspondiente y abrir popup
        state.markersLayer.eachLayer(layer => {
          if (layer.getLatLng && 
              Math.abs(layer.getLatLng().lat - pt.lat) < 0.0001 && 
              Math.abs(layer.getLatLng().lng - pt.lng) < 0.0001) {
            layer.openPopup();
          }
        });
        // Scroll suave hacia el mapa en móviles
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
  // 5. CÁMARAS Y TRANSMISIÓN EN VIVO (JITSI MEET)
  // =========================================================================
  function initZoneButtons() {
    const container = document.getElementById("zone-buttons-container");
    if (!container) return;

    container.innerHTML = "";
    APP_CONFIG.zones.forEach(zone => {
      const btn = document.createElement("button");
      btn.className = `btn-zone-card ${zone.id === state.currentZoneId ? "active" : ""}`;
      btn.dataset.zoneId = zone.id;

      let statusDot = "🔴";
      if (zone.statusType === "restringido") statusDot = "🟡";
      if (zone.statusType === "libre") statusDot = "🟢";

      btn.innerHTML = `
        <div class="zone-card-title">
          <span>${zone.name}</span>
          <span class="zone-live-tag"><i class="fa-solid fa-circle live-blink"></i> EN VIVO</span>
        </div>
        <div class="zone-card-sub">${zone.sector}</div>
        <div style="font-size:0.7rem; font-weight:700; color:#cbd5e1; margin-top:2px;">
          ${statusDot} ${zone.status}
        </div>
      `;

      btn.addEventListener("click", () => {
        document.querySelectorAll(".btn-zone-card").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        loadZoneStream(zone.id);
      });

      container.appendChild(btn);
    });

    // Control de pantalla completa
    const btnFullscreen = document.getElementById("btn-fullscreen-stream");
    const streamContainer = document.getElementById("stream-container");
    if (btnFullscreen && streamContainer) {
      btnFullscreen.addEventListener("click", () => {
        if (!document.fullscreenElement) {
          streamContainer.requestFullscreen?.() || streamContainer.webkitRequestFullscreen?.();
        } else {
          document.exitFullscreen?.() || document.webkitExitFullscreen?.();
        }
      });
    }

    // Botón de recarga de sala
    const btnReload = document.getElementById("btn-reload-stream");
    if (btnReload) {
      btnReload.addEventListener("click", () => loadZoneStream(state.currentZoneId, true));
    }
  }

  // Cargar stream de Jitsi Meet por Zona
  function loadZoneStream(zoneId, forceReload = false) {
    const zone = APP_CONFIG.zones.find(z => z.id === zoneId);
    if (!zone) return;

    state.currentZoneId = zoneId;

    // Actualizar encabezados de la tarjeta
    document.getElementById("current-zone-name").textContent = zone.name.toUpperCase();
    const statusPill = document.getElementById("current-zone-status-pill");
    statusPill.textContent = zone.status;
    statusPill.className = `stream-meta-status tag-${zone.statusType}`;
    document.getElementById("current-zone-reporter").textContent = zone.reporter;

    // Actualizar botón para abrir en App de Jitsi
    const externalBtn = document.getElementById("btn-open-jitsi-external");
    const jitsiUrl = `https://meet.jit.si/${zone.jitsiRoom}`;
    externalBtn.href = jitsiUrl;

    // Si ya estamos en esta sala y no forzamos recarga, no reiniciar
    if (state.currentRoom === zone.jitsiRoom && !forceReload) {
      renderZoneContextFeed(zoneId);
      return;
    }

    state.currentRoom = zone.jitsiRoom;
    const jitsiContainer = document.getElementById("jitsi-meet-holder");
    jitsiContainer.innerHTML = "";

    // Destruir instancia previa de Jitsi API si existe
    if (state.jitsiApi) {
      try {
        state.jitsiApi.dispose();
      } catch (e) {
        console.warn("Error al cerrar sala Jitsi anterior:", e);
      }
      state.jitsiApi = null;
    }

    // Intentar inicializar con JitsiMeetExternalAPI si la librería cargó correctamente
    if (typeof JitsiMeetExternalAPI !== "undefined") {
      try {
        const domain = "meet.jit.si";
        const options = {
          roomName: zone.jitsiRoom,
          parentNode: jitsiContainer,
          width: "100%",
          height: "100%",
          configOverwrite: {
            startWithAudioMuted: true,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            toolbarButtons: [
              'microphone', 'camera', 'fullscreen', 'hangup', 'tileview', 'settings'
            ]
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_ALWAYS_VISIBLE: false
          }
        };

        state.jitsiApi = new JitsiMeetExternalAPI(domain, options);
      } catch (err) {
        console.warn("Fallo al inicializar Jitsi Meet API, aplicando iframe fallback:", err);
        useIframeFallback(jitsiContainer, zone.jitsiRoom);
      }
    } else {
      // Fallback nativo directo mediante iframe responsive
      useIframeFallback(jitsiContainer, zone.jitsiRoom);
    }

    // Renderizar noticias contextuales de la zona
    renderZoneContextFeed(zoneId);
  }

  function useIframeFallback(container, roomName) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.disableDeepLinking=true`;
    iframe.allow = "camera; microphone; fullscreen; display-capture; autoplay";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    container.appendChild(iframe);
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
  // 7. CHAT ZONAL COMUNITARIO
  // =========================================================================
  function initChat() {
    const tabsContainer = document.getElementById("chat-zone-tabs");
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("chat-user-name");
    const msgInput = document.getElementById("chat-message-text");

    // Recordar apodo guardado
    const savedNickname = localStorage.getItem("monitor_chat_nickname");
    if (savedNickname && userInput) {
      userInput.value = savedNickname;
    }

    // Generar chips para las zonas del chat
    if (tabsContainer) {
      tabsContainer.innerHTML = "";
      APP_CONFIG.zones.forEach(zone => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `chat-tab-chip ${zone.id === state.currentChatZoneId ? "active" : ""}`;
        chip.dataset.zoneId = zone.id;
        chip.textContent = `Chat ${zone.name}`;

        chip.addEventListener("click", () => {
          document.querySelectorAll(".chat-tab-chip").forEach(c => c.classList.remove("active"));
          chip.classList.add("active");
          state.currentChatZoneId = zone.id;
          renderChatMessages();
        });

        tabsContainer.appendChild(chip);
      });
    }

    // Envío de mensajes
    if (chatForm) {
      chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const nickname = userInput.value.trim();
        const text = msgInput.value.trim();

        if (!nickname || !text) return;

        localStorage.setItem("monitor_chat_nickname", nickname);

        const newMsg = {
          user: nickname,
          text: text,
          time: getCurrentTimeFormatted(),
          isMine: true
        };

        if (!state.chatMessages[state.currentChatZoneId]) {
          state.chatMessages[state.currentChatZoneId] = [];
        }

        state.chatMessages[state.currentChatZoneId].push(newMsg);
        msgInput.value = "";
        renderChatMessages();
      });
    }

    renderChatMessages();
  }

  function renderChatMessages() {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;

    container.innerHTML = "";
    const list = state.chatMessages[state.currentChatZoneId] || [];

    if (list.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:#64748b; font-size:0.75rem; margin-top:20px;">No hay mensajes aún en esta sala. Sé el primero en reportar.</div>`;
      return;
    }

    list.forEach(msg => {
      const msgDiv = document.createElement("div");
      msgDiv.className = `chat-msg ${msg.isMine ? "msg-mine" : ""}`;
      msgDiv.innerHTML = `
        <div class="chat-msg-header">
          <span class="chat-user">${escapeHtml(msg.user)}</span>
          <span class="chat-time">${msg.time}</span>
        </div>
        <div class="chat-text">${escapeHtml(msg.text)}</div>
      `;
      container.appendChild(msgDiv);
    });

    // Auto-scroll al fondo
    container.scrollTop = container.scrollHeight;
  }

  // =========================================================================
  // 8. GUÍA Y ENLACES PARA REPORTEROS
  // =========================================================================
  function initReporterModal() {
    const linkGuide = document.getElementById("link-reporter-guide");
    const modal = document.getElementById("reporter-modal");
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

