// ============================================================================
// SIMULADOR INTERACTIVO: CERRADURA MORTISE DE 3 EJES + SOLUCIONES DE EMERGENCIA
// ============================================================================

const state = {
  actuatorExtension: 1.0,
  isActuatorMoving: false,
  railPosition: 0.0,
  isRailMoving: false,
  isStressTesting: false,
  autoDemoRunning: false,
  autoDemoAbort: false,
  showXray: true,
  showForces: true,
  showLabels: true,
};

// Estado del Laboratorio de Emergencia (Vista 2)
const emState = {
  currentSol: 1, // 1 = Pasador+Llave/Guaya, 2 = Bornes Batería 12V, 3 = Leva Excéntrica 90°
  isAnimating: false,
  isReleased: false,
  rodOffsetPx: 0,      // 0 = Extendido arriba (trabado), 70 = Retraído
  bridgeOffsetPx: 0,   // 0 = Arriba (bloqueando riel), 70 = Abajo (riel libre)
  railOffsetPx: 0,     // 0 = Cerrado, 185 = Abierto
  pinOffsetPx: 0,      // 0 = Insertado, 38 = Retirado por guaya
  keyAngleDeg: 0,      // 0 a 90 grados
  batteryOffsetPx: 95, // 95 = Separada, 52 = Conectada a los bornes
  camAngleDeg: 0,      // 0 a 90 grados
};

const dom = {
  // Navegación entre vistas
  tabBtnMain: document.getElementById('tabBtnMain'),
  tabBtnEmergency: document.getElementById('tabBtnEmergency'),
  btnJumpToEmergency: document.getElementById('btnJumpToEmergency'),
  viewMain: document.getElementById('viewMain'),
  viewEmergency: document.getElementById('viewEmergency'),

  // Vista 1: Simulador Principal
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

  // Vista 2: Simulador de Emergencia
  solTabBtns: [
    document.getElementById('solTab1'),
    document.getElementById('solTab2'),
    document.getElementById('solTab3'),
  ],
  solStageTitle: document.getElementById('solStageTitle'),
  solNarrative: document.getElementById('solNarrative'),
  solStatusPill: document.getElementById('solStatusPill'),

  emSlidingRail: document.getElementById('emSlidingRail'),
  emActuatorRodGroup: document.getElementById('emActuatorRodGroup'),
  emBridgeAndShaftsGroup: document.getElementById('emBridgeAndShaftsGroup'),
  emReturnSprings: document.getElementById('emReturnSprings'),
  emMotorLed: document.getElementById('emMotorLed'),
  emActuatorFooterText: document.getElementById('emActuatorFooterText'),

  sol1MechanismLayer: document.getElementById('sol1MechanismLayer'),
  sol2MechanismLayer: document.getElementById('sol2MechanismLayer'),
  sol3MechanismLayer: document.getElementById('sol3MechanismLayer'),

  emQuickReleasePin: document.getElementById('emQuickReleasePin'),
  emKeyCylinder: document.getElementById('emKeyCylinder'),
  emPinStatusText: document.getElementById('emPinStatusText'),
  emBatteryPack: document.getElementById('emBatteryPack'),
  emEccentricCamGroup: document.getElementById('emEccentricCamGroup'),

  emSidebarTitle: document.getElementById('emSidebarTitle'),
  emSidebarDesc: document.getElementById('emSidebarDesc'),
  btnTriggerEmergencyRelease: document.getElementById('btnTriggerEmergencyRelease'),
  btnResetEmergencySim: document.getElementById('btnResetEmergencySim'),

  emStatPower: document.getElementById('emStatPower'),
  emStatRod: document.getElementById('emStatRod'),
  emStatShafts: document.getElementById('emStatShafts'),
  emStatCost: document.getElementById('emStatCost'),
};

const MAX_RETRACT_PX = 72;
const MAX_RAIL_SLIDE_PX = 210;

// Utilidad de animación suave con Promesa
function animateValue({ from, to, duration, onUpdate }) {
  return new Promise((resolve) => {
    const start = performance.now();
    function frame(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
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

function waitMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================================
// CAMBIO ENTRE PESTAÑAS PRINCIPALES (SISTEMA PRINCIPAL vs EMERGENCIA)
// ============================================================================
function switchMainTab(targetViewId) {
  const isMain = targetViewId === 'viewMain';
  dom.viewMain.classList.toggle('active', isMain);
  dom.viewEmergency.classList.toggle('active', !isMain);
  dom.tabBtnMain.classList.toggle('active', isMain);
  dom.tabBtnEmergency.classList.toggle('active', !isMain);
}

dom.tabBtnMain.addEventListener('click', () => switchMainTab('viewMain'));
dom.tabBtnEmergency.addEventListener('click', () => switchMainTab('viewEmergency'));
dom.btnJumpToEmergency.addEventListener('click', () => switchMainTab('viewEmergency'));

// ============================================================================
// LÓGICA VISTA 1: SISTEMA PRINCIPAL
// ============================================================================
function setActiveStepCard(stepNumber) {
  dom.stepCards.forEach((card, idx) => {
    card.classList.toggle('active', idx + 1 === stepNumber);
  });
}

function renderScene(extraRailShakePx = 0) {
  const yOffset = (1 - state.actuatorExtension) * MAX_RETRACT_PX;
  dom.movingAssemblyGroup.setAttribute('transform', `translate(0, ${yOffset.toFixed(2)})`);

  const xOffset = state.railPosition * MAX_RAIL_SLIDE_PX + extraRailShakePx;
  dom.slidingRailGroup.setAttribute('transform', `translate(${xOffset.toFixed(2)}, 0)`);

  const isAligned = state.railPosition < 0.02;
  dom.railAlignMarker.setAttribute('fill', isAligned ? '#16a34a' : '#f59e0b');

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

  const railPct = Math.round(state.railPosition * 100);
  dom.railPositionSlider.value = railPct;
  dom.railPosLabel.textContent =
    railPct === 0 ? '0% (Cerrado y Alineado)' : `${railPct}% (Abierto)`;

  const busy = state.isActuatorMoving || state.isRailMoving || state.isStressTesting;
  dom.btnLock.disabled = busy || isLocked;
  dom.btnUnlock.disabled = busy || isUnlocked;

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

async function unlockRail() {
  if (state.isActuatorMoving || state.isRailMoving || state.actuatorExtension <= 0.01) return;
  state.isActuatorMoving = true;

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

async function lockRail() {
  if (state.isActuatorMoving || state.isRailMoving || state.actuatorExtension >= 0.99) return;

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

async function triggerStressTest() {
  if (state.isActuatorMoving || state.isRailMoving || state.isStressTesting) return;

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

async function toggleRailSlide() {
  if (state.isActuatorMoving || state.isRailMoving || state.isStressTesting) return;

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
    if (state.actuatorExtension < 0.95) {
      await lockRail();
      if (state.autoDemoAbort) break;
      await waitMs(1000);
    }
    if (state.autoDemoAbort) break;
    await triggerStressTest();
    if (state.autoDemoAbort) break;
    await waitMs(1400);

    if (state.autoDemoAbort) break;
    await unlockRail();
    if (state.autoDemoAbort) break;
    await waitMs(900);

    if (state.autoDemoAbort) break;
    await toggleRailSlide();
    if (state.autoDemoAbort) break;
    await waitMs(1500);

    if (state.autoDemoAbort) break;
    await lockRail();
    if (state.autoDemoAbort) break;
    await waitMs(1800);
  }

  state.autoDemoRunning = false;
  dom.btnAutoDemo.classList.remove('running');
  dom.btnAutoDemo.textContent = '▶️ Iniciar Demostración Automática (Modo Comunidad)';
}

dom.btnLock.addEventListener('click', () => lockRail());
dom.btnUnlock.addEventListener('click', () => unlockRail());
dom.btnSlideRail.addEventListener('click', () => toggleRailSlide());
dom.btnStressTest.addEventListener('click', () => triggerStressTest());
dom.btnAutoDemo.addEventListener('click', () => runAutoDemoLoop());

dom.railPositionSlider.addEventListener('input', (e) => {
  if (state.isActuatorMoving || state.isRailMoving) return;
  if (state.actuatorExtension > 0.1) {
    e.target.value = 0;
    triggerStressTest();
    return;
  }
  state.railPosition = parseFloat(e.target.value) / 100;
  renderScene();
});

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

// ============================================================================
// LÓGICA VISTA 2: LABORATORIO DE APERTURA MANUAL DE EMERGENCIA (3 SOLUCIONES)
// ============================================================================

const SOLUTIONS_META = {
  1: {
    title: 'Solución 1: Pasador de Desacople Rápido con Bombín de Llave / Guaya + Resortes',
    narrativeLocked:
      'En un apagón, el vástago del actuador queda congelado arriba, pero al retirar el pasador rojo con llave/guaya, el puente y los 3 ejes caen solos.',
    narrativeReleased:
      '¡Desacoplado! El pasador salió del vástago; los 3 ejes bajaron por gravedad/resorte mientras el vástago del actuador siguió arriba sin forzarse.',
    sidebarTitle: 'Probar Solución 1: Pasador + Llave/Guaya',
    btnLabel: '🔑 1. Girar Llave / Tirar Guaya y Abrir Riel',
    cost: '~$4.00 USD (Ferretería local)',
  },
  2: {
    title: 'Solución 2: Bornes Externos de Emergencia para Batería de 9V / 12V',
    narrativeLocked:
      'Como el actuador no carga el peso del riel, basta acercar una batería portátil de 12V/9V a los dos contactos externos durante 1.4 segundos.',
    narrativeReleased:
      '¡Energizado desde afuera! La batería portátil alimentó el actuador por 1.4 s, retrajo los 3 ejes normalmente y liberó el riel.',
    sidebarTitle: 'Probar Solución 2: Bornes Batería 12V',
    btnLabel: '🔋 1. Conectar Batería 12V en Bornes y Abrir Riel',
    cost: '~$1.50 USD (2 Bornes + Diodo)',
  },
  3: {
    title: 'Solución 3: Leva Excéntrica Manual en Acople Telescópico (Estilo Mortise)',
    narrativeLocked:
      'El puente descansa sobre una leva excéntrica. Al girarla 90° manualmente con llave hexagonal, la altura de apoyo baja y esconde los 3 ejes.',
    narrativeReleased:
      '¡Leva girada 90°! El punto de apoyo descendió y los 3 ejes se retrajeron en la caja Mortise sin mover el tornillo sinfín del actuador.',
    sidebarTitle: 'Probar Solución 3: Leva Excéntrica 90°',
    btnLabel: '🔧 1. Girar Leva Excéntrica 90° y Abrir Riel',
    cost: '~$5.00 USD (Leva mecanizada)',
  },
};

function renderEmergencyScene() {
  const meta = SOLUTIONS_META[emState.currentSol];

  // Mostrar únicamente la capa de la solución activa
  dom.sol1MechanismLayer.setAttribute('opacity', emState.currentSol === 1 ? '1' : '0');
  dom.sol2MechanismLayer.setAttribute('opacity', emState.currentSol === 2 ? '1' : '0');
  dom.sol3MechanismLayer.setAttribute('opacity', emState.currentSol === 3 ? '1' : '0');

  // Resortes visibles en Solución 1 y 3
  dom.emReturnSprings.setAttribute('opacity', emState.currentSol === 2 ? '0.2' : '1');

  // Transformaciones geométricas
  dom.emActuatorRodGroup.setAttribute('transform', `translate(0, ${emState.rodOffsetPx.toFixed(1)})`);
  dom.emBridgeAndShaftsGroup.setAttribute(
    'transform',
    `translate(0, ${emState.bridgeOffsetPx.toFixed(1)})`
  );
  dom.emSlidingRail.setAttribute('transform', `translate(${emState.railOffsetPx.toFixed(1)}, 0)`);

  // Solución 1: Pasador y Llave
  dom.emQuickReleasePin.setAttribute(
    'transform',
    `translate(${emState.pinOffsetPx.toFixed(1)}, 0)`
  );
  dom.emKeyCylinder.setAttribute(
    'transform',
    `translate(55, 86) rotate(${emState.keyAngleDeg.toFixed(1)})`
  );
  dom.emPinStatusText.textContent =
    emState.pinOffsetPx > 15 ? 'Pasador: DESACOPLADO' : 'Pasador: ACOPLADO';

  // Solución 2: Batería externa
  dom.emBatteryPack.setAttribute(
    'transform',
    `translate(${emState.batteryOffsetPx.toFixed(1)}, 68)`
  );

  // Solución 3: Leva excéntrica
  dom.emEccentricCamGroup.setAttribute(
    'transform',
    `translate(485, 292) rotate(${emState.camAngleDeg.toFixed(1)})`
  );

  // Textos y estados
  dom.solStageTitle.textContent = meta.title;
  dom.emSidebarTitle.textContent = meta.sidebarTitle;
  dom.btnTriggerEmergencyRelease.textContent = meta.btnLabel;
  dom.emStatCost.textContent = meta.cost;

  dom.btnTriggerEmergencyRelease.disabled = emState.isAnimating || emState.isReleased;
  dom.btnResetEmergencySim.disabled = emState.isAnimating || !emState.isReleased;

  if (emState.isReleased) {
    dom.solStatusPill.dataset.status = 'released';
    dom.solStatusPill.textContent = '✅ RIEL ABIERTO MANUALMENTE CON ÉXITO';
    dom.emStatShafts.textContent = 'Retraídos (Riel Abierto)';
    dom.emStatShafts.className = 'highlight-green';

    if (emState.currentSol === 2) {
      dom.emStatPower.textContent = '12 V (Batería Portátil Externa)';
      dom.emStatPower.className = 'highlight-green';
      dom.emStatRod.textContent = '0 mm (Retraído con batería)';
      dom.emMotorLed.setAttribute('fill', '#22c55e');
      dom.emActuatorFooterText.textContent = 'ACTUADOR ENERGIZADO POR BORNES DE EMERGENCIA';
    } else {
      dom.emStatPower.textContent = '0 V (Sin Electricidad)';
      dom.emStatPower.className = 'highlight-rose';
      dom.emStatRod.textContent = '65 mm (Sigue arriba sin forzarse)';
      dom.emMotorLed.setAttribute('fill', '#ef4444');
      dom.emActuatorFooterText.textContent =
        'VÁSTAGO INMÓVIL ARRIBA · PUENTE DESACOPLADO ABAJO';
    }
  } else {
    dom.solStatusPill.dataset.status = 'locked-blackout';
    dom.solStatusPill.textContent = '⚡ APAGÓN ACTIVO: ACTUADOR SIN ENERGÍA (0V)';
    dom.emStatPower.textContent = '0 V (Apagón / Sin Red)';
    dom.emStatPower.className = 'highlight-rose';
    dom.emStatRod.textContent = '65 mm (Trabado por sinfín)';
    dom.emStatShafts.textContent = 'Insertados (Riel Bloqueado)';
    dom.emStatShafts.className = 'highlight-rose';
    dom.emMotorLed.setAttribute('fill', '#ef4444');
    dom.emActuatorFooterText.textContent = 'ACTUADOR SIN ENERGÍA (HUSILLO TRABADO / INMÓVIL)';
  }
}

function selectEmergencySolution(solNumber) {
  if (emState.isAnimating) return;
  emState.currentSol = solNumber;
  emState.isReleased = false;
  emState.rodOffsetPx = 0;
  emState.bridgeOffsetPx = 0;
  emState.railOffsetPx = 0;
  emState.pinOffsetPx = 0;
  emState.keyAngleDeg = 0;
  emState.batteryOffsetPx = 95;
  emState.camAngleDeg = 0;

  dom.solTabBtns.forEach((btn, idx) => {
    btn.classList.toggle('active', idx + 1 === solNumber);
  });

  dom.solNarrative.textContent = SOLUTIONS_META[solNumber].narrativeLocked;
  renderEmergencyScene();
}

async function runEmergencyReleaseAnimation() {
  if (emState.isAnimating || emState.isReleased) return;
  emState.isAnimating = true;
  renderEmergencyScene();

  if (emState.currentSol === 1) {
    // Paso 1: Girar llave 90° y retirar el pasador rojo con la guaya
    dom.solNarrative.textContent =
      'Paso 1: Girando la llave de emergencia... La guaya retira el pasador transversal del vástago.';
    await animateValue({
      from: 0,
      to: 1,
      duration: 750,
      onUpdate: (t) => {
        emState.keyAngleDeg = t * 90;
        emState.pinOffsetPx = t * 38;
        renderEmergencyScene();
      },
    });

    // Paso 2: El puente y los 3 ejes caen por gravedad + resortes (el vástago sigue en 0)
    dom.solNarrative.textContent =
      'Paso 2: ¡Puente liberado! Los 3 ejes descienden por gravedad y resortes aunque el vástago del actuador siga trabado arriba.';
    await animateValue({
      from: 0,
      to: 70,
      duration: 850,
      onUpdate: (val) => {
        emState.bridgeOffsetPx = val;
        renderEmergencyScene();
      },
    });
  } else if (emState.currentSol === 2) {
    // Paso 1: Acercar la batería de 12V a los bornes externos
    dom.solNarrative.textContent =
      'Paso 1: Conectando batería portátil de 12V/9V a los dos bornes externos de emergencia...';
    await animateValue({
      from: 95,
      to: 46,
      duration: 650,
      onUpdate: (val) => {
        emState.batteryOffsetPx = val;
        renderEmergencyScene();
      },
    });

    dom.emMotorLed.setAttribute('fill', '#22c55e');
    dom.solNarrative.textContent =
      'Paso 2: ¡Pulso eléctrico de 1.4 s! El actuador retrae el vástago y los 3 ejes sin esfuerzo.';
    await animateValue({
      from: 0,
      to: 70,
      duration: 1150,
      onUpdate: (val) => {
        emState.rodOffsetPx = val;
        emState.bridgeOffsetPx = val;
        renderEmergencyScene();
      },
    });
  } else if (emState.currentSol === 3) {
    // Paso 1: Girar la leva excéntrica 90° mientras el puente baja simultáneamente
    dom.solNarrative.textContent =
      'Paso 1: Girando la leva excéntrica 90° con llave manual... El apoyo desciende y baja los 3 ejes sin mover el actuador.';
    await animateValue({
      from: 0,
      to: 1,
      duration: 1050,
      onUpdate: (t) => {
        emState.camAngleDeg = t * 90;
        emState.bridgeOffsetPx = t * 70;
        renderEmergencyScene();
      },
    });
  }

  // Paso Final común: Deslizar el riel hacia la derecha (apertura manual exitosa)
  dom.solNarrative.textContent =
    'Paso 3: Con los 3 ejes fuera de las cavidades, el riel se desliza y abre manualmente sin obstáculos.';
  await animateValue({
    from: 0,
    to: 185,
    duration: 1000,
    onUpdate: (val) => {
      emState.railOffsetPx = val;
      renderEmergencyScene();
    },
  });

  emState.isReleased = true;
  emState.isAnimating = false;
  dom.solNarrative.textContent = SOLUTIONS_META[emState.currentSol].narrativeReleased;
  renderEmergencyScene();
}

async function resetEmergencySimulation() {
  if (emState.isAnimating || !emState.isReleased) return;
  emState.isAnimating = true;
  renderEmergencyScene();

  dom.solNarrative.textContent = 'Cerrando el riel y reacoplando el sistema a su posición original...';

  await animateValue({
    from: emState.railOffsetPx,
    to: 0,
    duration: 750,
    onUpdate: (val) => {
      emState.railOffsetPx = val;
      renderEmergencyScene();
    },
  });

  const startRod = emState.rodOffsetPx;
  const startBridge = emState.bridgeOffsetPx;
  const startPin = emState.pinOffsetPx;
  const startKey = emState.keyAngleDeg;
  const startBat = emState.batteryOffsetPx;
  const startCam = emState.camAngleDeg;

  await animateValue({
    from: 1,
    to: 0,
    duration: 850,
    onUpdate: (t) => {
      emState.rodOffsetPx = startRod * t;
      emState.bridgeOffsetPx = startBridge * t;
      emState.pinOffsetPx = startPin * t;
      emState.keyAngleDeg = startKey * t;
      emState.batteryOffsetPx = 95 - (95 - startBat) * t;
      emState.camAngleDeg = startCam * t;
      renderEmergencyScene();
    },
  });

  emState.isReleased = false;
  emState.isAnimating = false;
  dom.solNarrative.textContent = SOLUTIONS_META[emState.currentSol].narrativeLocked;
  renderEmergencyScene();
}

dom.solTabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const sol = parseInt(btn.dataset.sol, 10);
    selectEmergencySolution(sol);
  });
});

dom.btnTriggerEmergencyRelease.addEventListener('click', () => runEmergencyReleaseAnimation());
dom.btnResetEmergencySim.addEventListener('click', () => resetEmergencySimulation());

// Inicializar ambas vistas
renderScene();
renderEmergencyScene();
