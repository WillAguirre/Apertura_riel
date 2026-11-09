// ============================================================================
// SIMULADOR INTERACTIVO: CERRADURA MORTISE DE 3 EJES + ACTUADOR LINEAL EN RIEL
// ============================================================================

const state = {
  // 1.0 = Actuador extendido (3 ejes dentro del riel -> BLOQUEADO)
  // 0.0 = Actuador retraído (3 ejes fuera del riel -> DESBLOQUEADO)
  actuatorExtension: 1.0,
  isActuatorMoving: false,

  // 0.0 = Riel cerrado y alineado con los 3 ejes
  // 1.0 = Riel desplazado (abierto, 220px a la derecha)
  railPosition: 0.0,
  isRailMoving: false,

  // Prueba de esfuerzo cortante (cuando intentan forzar el riel bloqueado)
  isStressTesting: false,

  // Modo demostración automática
  autoDemoRunning: false,
  autoDemoAbort: false,

  // Opciones de vista
  showXray: true,
  showForces: true,
  showLabels: true,
};

// Elementos del DOM
const dom = {
  movingAssemblyGroup: document.getElementById('movingAssemblyGroup'),
  slidingRailGroup: document.getElementById('slidingRailGroup'),
  solidCoverOverlay: document.getElementById('solidCoverOverlay'),
  forceVectorsLayer: document.getElementById('forceVectorsLayer'),
  technicalLabelsLayer: document.getElementById('technicalLabelsLayer'),

  actuatorForceVector: document.getElementById('actuatorForceVector'),
  actuatorForceLine: document.getElementById('actuatorForceLine'),
  actuatorForceTitle: document.getElementById('actuatorForceTitle'),
  actuatorForceSub: document.getElementById('actuatorForceSub'),
  shearForceVectors: document.getElementById('shearForceVectors'),
  railMotionVector: document.getElementById('railMotionVector'),
  motorLed: document.getElementById('motorLed'),
  railAlignMarker: document.getElementById('railAlignMarker'),

  systemStatusBanner: document.getElementById('systemStatusBanner'),
  systemStatusText: document.getElementById('systemStatusText'),
  stepNarrative: document.getElementById('stepNarrative'),

  btnLock: document.getElementById('btnLock'),
  btnUnlock: document.getElementById('btnUnlock'),
  railPositionSlider: document.getElementById('railPositionSlider'),
  railPosLabel: document.getElementById('railPosLabel'),
  btnSlideRail: document.getElementById('btnSlideRail'),
  btnStressTest: document.getElementById('btnStressTest'),
  btnAutoDemo: document.getElementById('btnAutoDemo'),

  toggleXrayBtn: document.getElementById('toggleXrayBtn'),
  toggleForcesBtn: document.getElementById('toggleForcesBtn'),
  toggleLabelsBtn: document.getElementById('toggleLabelsBtn'),

  metricStroke: document.getElementById('metricStroke'),
  barStroke: document.getElementById('barStroke'),
  metricActuatorForce: document.getElementById('metricActuatorForce'),
  metricShearLoad: document.getElementById('metricShearLoad'),
  metricActuatorStress: document.getElementById('metricActuatorStress'),

  stepCards: [
    document.getElementById('stepCard1'),
    document.getElementById('stepCard2'),
    document.getElementById('stepCard3'),
    document.getElementById('stepCard4'),
  ],
};

// Constantes cinemáticas SVG
const MAX_RETRACT_PX = 72; // Desplazamiento vertical hacia abajo al desbloquear (libera el riel)
const MAX_RAIL_SLIDE_PX = 210; // Desplazamiento horizontal del riel al abrirse

function setActiveStepCard(stepNumber) {
  dom.stepCards.forEach((card, idx) => {
    card.classList.toggle('active', idx + 1 === stepNumber);
  });
}

// Actualiza la posición geométrica en el SVG y la telemetría
function renderScene(extraRailShakePx = 0) {
  // 1. Posición vertical del conjunto móvil (Actuador + Puente + 3 Ejes)
  // extension = 1 -> y = 0 (dentro del riel)
  // extension = 0 -> y = +72px (retraído dentro de la caja Mortise)
  const yOffset = (1 - state.actuatorExtension) * MAX_RETRACT_PX;
  dom.movingAssemblyGroup.setAttribute('transform', `translate(0, ${yOffset.toFixed(2)})`);

  // 2. Posición horizontal del riel corredizo
  const xOffset = state.railPosition * MAX_RAIL_SLIDE_PX + extraRailShakePx;
  dom.slidingRailGroup.setAttribute('transform', `translate(${xOffset.toFixed(2)}, 0)`);

  // Indicador de alineación de cavidades
  const isAligned = state.railPosition < 0.02;
  dom.railAlignMarker.setAttribute('fill', isAligned ? '#22c55e' : '#f59e0b');

  // 3. Telemetría de carrera
  const strokeMm = Math.round(state.actuatorExtension * 65);
  const pctStroke = Math.round(state.actuatorExtension * 100);
  dom.barStroke.style.width = `${pctStroke}%`;

  const isLocked = state.actuatorExtension > 0.95;
  const isUnlocked = state.actuatorExtension < 0.05;

  if (isLocked) {
    dom.metricStroke.textContent = `65 / 65 mm (3 Ejes Insertados)`;
  } else if (isUnlocked) {
    dom.metricStroke.textContent = `0 / 65 mm (3 Ejes Retraídos)`;
  } else {
    dom.metricStroke.textContent = `${strokeMm} / 65 mm (En tránsito)`;
  }

  // 4. Etiqueta del slider de riel
  const railPct = Math.round(state.railPosition * 100);
  dom.railPositionSlider.value = railPct;
  dom.railPosLabel.textContent =
    railPct === 0 ? '0% (Cerrado y Alineado)' : `${railPct}% (Abierto)`;

  // 5. Botones Habilitados / Deshabilitados
  const busy = state.isActuatorMoving || state.isRailMoving || state.isStressTesting;
  dom.btnLock.disabled = busy || isLocked;
  dom.btnUnlock.disabled = busy || isUnlocked;

  // 6. Actualizar vectores y estados visuales
  if (state.isStressTesting) {
    dom.systemStatusBanner.dataset.state = 'stress';
    dom.systemStatusText.textContent = 'EMPUJE FORZADO: 3 EJES SOPORTAN 100% DE CARGA';
    dom.actuatorForceVector.setAttribute('opacity', '0');
    dom.shearForceVectors.setAttribute('opacity', '1');
    dom.railMotionVector.setAttribute('opacity', '0');
    dom.motorLed.setAttribute('fill', '#22c55e');

    dom.metricActuatorForce.textContent = '0 N (Motor Apagado · Sin Esfuerzo)';
    dom.metricShearLoad.textContent = '4,500 N (1,500 N por cada eje de acero)';
    dom.metricActuatorStress.textContent = '0% (Cero transmisión axial al actuador)';
    setActiveStepCard(3);
  } else if (state.isActuatorMoving) {
    dom.systemStatusBanner.dataset.state = 'moving';
    dom.actuatorForceVector.setAttribute('opacity', '1');
    dom.shearForceVectors.setAttribute('opacity', '0.25');
    dom.railMotionVector.setAttribute('opacity', '0');
    dom.motorLed.setAttribute('fill', '#38bdf8');

    dom.metricActuatorForce.textContent = '120 N (Solo deslizando los 3 ejes · 18 W)';
    dom.metricShearLoad.textContent = '0 N (Movimiento libre sin fricción de riel)';
    dom.metricActuatorStress.textContent = '0% (Uso exclusivo para bloqueo/desbloqueo)';
    setActiveStepCard(2);
  } else if (isLocked) {
    dom.systemStatusBanner.dataset.state = 'locked';
    dom.systemStatusText.textContent = 'RIEL BLOQUEADO (3 EJES MORTISE ACTIVOS)';
    dom.actuatorForceVector.setAttribute('opacity', '0');
    dom.shearForceVectors.setAttribute('opacity', '1');
    dom.railMotionVector.setAttribute('opacity', '0');
    dom.motorLed.setAttribute('fill', '#22c55e');

    dom.metricActuatorForce.textContent = '0 N (En reposo · 0 W)';
    dom.metricShearLoad.textContent = 'Listo (3 ejes en posición de bloqueo)';
    dom.metricActuatorStress.textContent = '0% (Actuador aislado mecánicamente)';
    setActiveStepCard(3);
  } else if (isUnlocked) {
    dom.systemStatusBanner.dataset.state = 'unlocked';
    dom.systemStatusText.textContent =
      state.railPosition > 0.02
        ? 'RIEL EN APERTURA (DESLIZAMIENTO LIBRE)'
        : 'RIEL DESBLOQUEADO (LISTO PARA ABRIR)';
    dom.actuatorForceVector.setAttribute('opacity', '0');
    dom.shearForceVectors.setAttribute('opacity', '0');
    dom.railMotionVector.setAttribute('opacity', '1');
    dom.motorLed.setAttribute('fill', '#22c55e');

    dom.metricActuatorForce.textContent = '0 N (En reposo · 0 W)';
    dom.metricShearLoad.textContent = '0 N (Ejes fuera del riel)';
    dom.metricActuatorStress.textContent = '0% (Actuador en reposo)';
    setActiveStepCard(state.railPosition > 0.02 ? 4 : 1);
  }
}

// Utilidad de animación suave con Promesa
function animateValue({ from, to, duration, onUpdate }) {
  return new Promise((resolve) => {
    const start = performance.now();
    function frame(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // Easing suave (easeInOutCubic)
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const current = from + (to - from) * eased;
      onUpdate(current);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

// ============================================================================
// ACCIONES PRINCIPALES DEL SISTEMA
// ============================================================================

// 1. Desbloquear el Riel (El actuador lineal retrae los 3 ejes)
async function unlockRail() {
  if (state.isActuatorMoving || state.isRailMoving || state.actuatorExtension <= 0.01) return;
  state.isActuatorMoving = true;

  // Configurar flecha hacia abajo (retracción)
  dom.actuatorForceLine.setAttribute('y1', '330');
  dom.actuatorForceLine.setAttribute('y2', '415');
  dom.actuatorForceTitle.textContent = 'RETRACCIÓN DEL ACTUADOR LINEAL';
  dom.actuatorForceSub.textContent = 'Retira los 3 ejes para liberar el riel';
  dom.stepNarrative.textContent =
    'El actuador lineal se retrae únicamente para retirar los 3 ejes de las cavidades del riel.';

  await animateValue({
    from: state.actuatorExtension,
    to: 0.0,
    duration: 1350,
    onUpdate: (val) => {
      state.actuatorExtension = val;
      renderScene();
    },
  });

  state.isActuatorMoving = false;
  dom.stepNarrative.textContent =
    'Riel desbloqueado: los 3 ejes están dentro de la caja Mortise y el riel puede deslizarse libremente.';
  renderScene();
}

// 2. Bloquear el Riel (Si el riel está abierto, primero lo cierra/alinea y luego empuja los 3 ejes)
async function lockRail() {
  if (state.isActuatorMoving || state.isRailMoving || state.actuatorExtension >= 0.99) return;

  // Si el riel está desplazado, primero lo llevamos a 0 (alineación con los 3 ejes)
  if (state.railPosition > 0.01) {
    state.isRailMoving = true;
    dom.stepNarrative.textContent =
      'Cerrando el riel hasta alinear sus 3 cavidades con la cerradura Mortise...';
    setActiveStepCard(1);

    await animateValue({
      from: state.railPosition,
      to: 0.0,
      duration: 950,
      onUpdate: (val) => {
        state.railPosition = val;
        renderScene();
      },
    });
    state.isRailMoving = false;
  }

  state.isActuatorMoving = true;

  // Configurar flecha hacia arriba (empuje de bloqueo)
  dom.actuatorForceLine.setAttribute('y1', '415');
  dom.actuatorForceLine.setAttribute('y2', '330');
  dom.actuatorForceTitle.textContent = 'EMPUJE DEL ACTUADOR LINEAL';
  dom.actuatorForceSub.textContent = 'Inserta los 3 ejes en el riel sin sostener peso';
  dom.stepNarrative.textContent =
    'El actuador lineal empuja el puente sincronizador e inserta los 3 ejes de acero dentro del riel.';

  await animateValue({
    from: state.actuatorExtension,
    to: 1.0,
    duration: 1350,
    onUpdate: (val) => {
      state.actuatorExtension = val;
      renderScene();
    },
  });

  state.isActuatorMoving = false;
  dom.stepNarrative.textContent =
    '¡Riel bloqueado! Los 3 ejes Mortise impiden el movimiento; el actuador lineal queda en reposo (0 W).';
  renderScene();
}

// 3. Prueba de Esfuerzo / Empuje Forzado contra el Riel Bloqueado
async function triggerStressTest() {
  if (state.isActuatorMoving || state.isRailMoving || state.isStressTesting) return;

  // Si está desbloqueado, primero bloqueamos para demostrar cómo los 3 ejes detienen el riel
  if (state.actuatorExtension < 0.95) {
    await lockRail();
  }

  state.isStressTesting = true;
  dom.stepNarrative.textContent =
    'PRUEBA DE ESFUERZO: Intentando forzar el riel. Los 3 ejes Mortise absorben el 100% del impacto; el actuador recibe 0% de carga.';

  const start = performance.now();
  const duration = 1700;

  await new Promise((resolve) => {
    function shakeFrame(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // Vibración amortiguada simulando empuje horizontal contra los 3 pasadores de acero
      const shake = Math.sin(elapsed * 0.055) * 4.5 * (1 - t * 0.6);
      renderScene(shake);
      if (t < 1) {
        requestAnimationFrame(shakeFrame);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(shakeFrame);
  });

  state.isStressTesting = false;
  dom.stepNarrative.textContent =
    'Prueba superada: La cerradura Mortise de 3 ejes bloqueó el riel sin transmitir esfuerzo al motor del actuador.';
  renderScene(0);
}

// 4. Simular apertura / cierre suave del riel
async function toggleRailSlide() {
  if (state.isActuatorMoving || state.isRailMoving || state.isStressTesting) return;

  // Si el riel está bloqueado, mostrar qué pasa al intentar abrirlo (bloqueo físico real)
  if (state.actuatorExtension > 0.1) {
    await triggerStressTest();
    return;
  }

  state.isRailMoving = true;
  const target = state.railPosition < 0.5 ? 1.0 : 0.0;
  dom.stepNarrative.textContent =
    target > 0.5
      ? 'Deslizando el riel hacia la posición de apertura (los 3 ejes están retraídos)...'
      : 'Cerrando el riel y alineando las 3 cavidades con la cerradura Mortise...';

  await animateValue({
    from: state.railPosition,
    to: target,
    duration: 1200,
    onUpdate: (val) => {
      state.railPosition = val;
      renderScene();
    },
  });

  state.isRailMoving = false;
  dom.stepNarrative.textContent =
    target > 0.5
      ? 'Riel abierto por completo. El sistema de apertura permite el paso sin oposición del actuador.'
      : 'Riel cerrado y alineado. Listo para activar el actuador lineal y bloquear los 3 ejes.';
  renderScene();
}

// ============================================================================
// MODO DEMOSTRACIÓN AUTOMÁTICA (PARA PRESENTACIÓN COMUNITARIA)
// ============================================================================
function waitMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runAutoDemoLoop() {
  if (state.autoDemoRunning) {
    state.autoDemoAbort = true;
    state.autoDemoRunning = false;
    dom.btnAutoDemo.classList.remove('running');
    dom.btnAutoDemo.textContent = '▶️ Iniciar Demostración Automática (Modo Comunidad)';
    return;
  }

  state.autoDemoRunning = true;
  state.autoDemoAbort = false;
  dom.btnAutoDemo.classList.add('running');
  dom.btnAutoDemo.textContent = '⏹️ Detener Demostración Automática';

  while (state.autoDemoRunning && !state.autoDemoAbort) {
    // Paso 1: Asegurar bloqueado y mostrar prueba de fuerza en los 3 ejes
    if (state.actuatorExtension < 0.95) {
      await lockRail();
      if (state.autoDemoAbort) break;
      await waitMs(1000);
    }

    if (state.autoDemoAbort) break;
    await triggerStressTest();
    if (state.autoDemoAbort) break;
    await waitMs(1400);

    // Paso 2: Desbloquear retrayendo el actuador lineal
    if (state.autoDemoAbort) break;
    await unlockRail();
    if (state.autoDemoAbort) break;
    await waitMs(900);

    // Paso 3: Deslizar el riel (Apertura)
    if (state.autoDemoAbort) break;
    await toggleRailSlide();
    if (state.autoDemoAbort) break;
    await waitMs(1500);

    // Paso 4: Cerrar el riel y volver a bloquear con los 3 ejes
    if (state.autoDemoAbort) break;
    await lockRail();
    if (state.autoDemoAbort) break;
    await waitMs(1800);
  }

  state.autoDemoRunning = false;
  dom.btnAutoDemo.classList.remove('running');
  dom.btnAutoDemo.textContent = '▶️ Iniciar Demostración Automática (Modo Comunidad)';
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
dom.btnLock.addEventListener('click', () => lockRail());
dom.btnUnlock.addEventListener('click', () => unlockRail());
dom.btnSlideRail.addEventListener('click', () => toggleRailSlide());
dom.btnStressTest.addEventListener('click', () => triggerStressTest());
dom.btnAutoDemo.addEventListener('click', () => runAutoDemoLoop());

// Slider manual del riel
dom.railPositionSlider.addEventListener('input', (e) => {
  if (state.isActuatorMoving || state.isRailMoving) return;
  if (state.actuatorExtension > 0.1) {
    // No permite deslizar si los 3 ejes están dentro del riel
    e.target.value = 0;
    triggerStressTest();
    return;
  }
  state.railPosition = parseFloat(e.target.value) / 100;
  renderScene();
});

// Botones de visualización (Rayos X, Vectores, Etiquetas)
dom.toggleXrayBtn.addEventListener('click', () => {
  state.showXray = !state.showXray;
  dom.toggleXrayBtn.classList.toggle('active', state.showXray);
  dom.solidCoverOverlay.setAttribute('opacity', state.showXray ? '0' : '0.96');
});

dom.toggleForcesBtn.addEventListener('click', () => {
  state.showForces = !state.showForces;
  dom.toggleForcesBtn.classList.toggle('active', state.showForces);
  dom.forceVectorsLayer.setAttribute('opacity', state.showForces ? '1' : '0');
});

dom.toggleLabelsBtn.addEventListener('click', () => {
  state.showLabels = !state.showLabels;
  dom.toggleLabelsBtn.classList.toggle('active', state.showLabels);
  dom.technicalLabelsLayer.setAttribute('opacity', state.showLabels ? '1' : '0');
});

// Inicializar escena
renderScene();

// Cargar información de red local para compartir con otros dispositivos
async function loadNetworkInfo() {
  const box = document.getElementById('lanUrlList');
  if (!box) return;
  try {
    const res = await fetch('/api/network-info');
    if (!res.ok) throw new Error('No API');
    const data = await res.json();
    if (data.urls && data.urls.length > 0) {
      box.innerHTML = data.urls.map((u) => `<code>${u}</code>`).join('');
      return;
    }
  } catch (_) {
    // Fallback si se abre directamente o desde otro servidor
  }
  box.innerHTML = `<code>${window.location.origin}</code>`;
}

loadNetworkInfo();

