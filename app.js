// URL de tu implementación de Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbzUd4jj4F0QX9tnbmfo_sFKwaozRst1Z9bgv6s6l2IjUn4kDYxUFLTZgT15fdiuqhWm/exec';

let db = null;
// diaRegistroIdx: día real del calendario (para guardar en historial)
// diaVisualIdx: rutina que se está mostrando/editando
let diaRegistroIdx = 0;
let diaVisualIdx = 0;
let miGrafico = null;

const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

let historialCompleto = []; // Variable global para guardar los datos sin filtrar

// --- Alternativas de ejercicios (si una máquina está ocupada) ---
const ALT_KEY = 'mariofit_alt_v1';

// --- Notas por ejercicio (texto + foto base64) ---
const NOTE_KEY = 'mariofit_notes_v1';

let modoConversion = 'lb-to-kg'; // Estado inicial
const ENERGY_MODE_KEY = 'mariofit_energy_mode_v1';
let energyMode = 'normal';

function loadNotes() {
    try { return JSON.parse(localStorage.getItem(NOTE_KEY) || '{}'); }
    catch { return {}; }
}

function saveNotes(notes) {
    try { localStorage.setItem(NOTE_KEY, JSON.stringify(notes)); }
    catch { /* ignore */ }
}

function getNoteForSlot(dayIdx, exIdx) {
    const notes = loadNotes();
    const key = slotKey(dayIdx, exIdx);
    return notes?.[key] || null; // { text, photo, updatedAt, exerciseName }
}

function setNoteForSlot(dayIdx, exIdx, payload) {
    const notes = loadNotes();
    const key = slotKey(dayIdx, exIdx);
    if (!payload || (!payload.text && !payload.photo)) {
        delete notes[key];
    } else {
        notes[key] = {
            text: payload.text || '',
            photo: payload.photo || '',
            updatedAt: new Date().toISOString(),
            exerciseName: payload.exerciseName || ''
        };
    }
    saveNotes(notes);
}

function clearNotesForSlots(slotKeys) {
    const notes = loadNotes();
    let changed = false;
    slotKeys.forEach(k => {
        if (notes[k]) { delete notes[k]; changed = true; }
    });
    if (changed) saveNotes(notes);
}

function loadAlt() {
    try { return JSON.parse(localStorage.getItem(ALT_KEY) || '{}'); }
    catch { return {}; }
}

function saveAlt(alt) {
    try { localStorage.setItem(ALT_KEY, JSON.stringify(alt)); }
    catch { /* ignore */ }
}


function loadEnergyState() {
    try { return JSON.parse(localStorage.getItem(ENERGY_MODE_KEY) || '{}'); }
    catch { return {}; }
}

function saveEnergyState(state) {
    try { localStorage.setItem(ENERGY_MODE_KEY, JSON.stringify(state)); }
    catch { /* ignore */ }
}

function getEnergyKeyForDay(dayName) {
    return String(dayName || '').trim() || 'default';
}

function getEnergyModeForDay(dayName) {
    const state = loadEnergyState();
    return state[getEnergyKeyForDay(dayName)] || 'normal';
}

function setEnergyMode(mode) {
    const dayName = db?.semana?.[diaVisualIdx]?.dia;
    if (!dayName) return;
    const state = loadEnergyState();
    state[getEnergyKeyForDay(dayName)] = mode;
    saveEnergyState(state);
    energyMode = mode;
    renderDia(diaVisualIdx);
}

function syncEnergyModeForCurrentDay() {
    const dayName = db?.semana?.[diaVisualIdx]?.dia;
    energyMode = getEnergyModeForDay(dayName);
}

function getPrimaryGroup(ex = {}) {
    const groups = Array.isArray(ex?.grupos) ? ex.grupos : [];
    return groups[0] || 'general';
}

function formatGroupName(group = '') {
    const map = {
        pecho: 'Pecho',
        pecho_superior: 'Pecho sup.',
        triceps: 'Tríceps',
        hombro: 'Hombro',
        hombro_anterior: 'H. anterior',
        deltoide_lateral: 'H. lateral',
        deltoide_posterior: 'H. posterior',
        dorsal: 'Dorsal',
        espalda_media: 'Espalda',
        trapecio_medio: 'Trapecio',
        biceps: 'Bíceps',
        braquial: 'Braquial',
        antebrazo: 'Antebrazo',
        cuadriceps: 'Cuádriceps',
        isquios: 'Isquios',
        gluteo: 'Glúteo',
        gluteo_medio: 'Glúteo medio',
        pantorrilla: 'Pantorrilla',
        erectores: 'Erectores',
        core: 'Core'
    };
    return map[group] || String(group || 'General').replace(/_/g, ' ');
}

function getExerciseIconClass(ex = {}) {
    const primary = getPrimaryGroup(ex);
    const map = {
        pecho: 'fa-shield-heart',
        pecho_superior: 'fa-shield-heart',
        triceps: 'fa-bolt',
        hombro: 'fa-dumbbell',
        hombro_anterior: 'fa-dumbbell',
        deltoide_lateral: 'fa-arrows-left-right-to-line',
        deltoide_posterior: 'fa-rotate-left',
        dorsal: 'fa-up-long',
        espalda_media: 'fa-grip-lines',
        trapecio_medio: 'fa-grip-lines',
        biceps: 'fa-hand-fist',
        braquial: 'fa-hand-back-fist',
        antebrazo: 'fa-hand',
        cuadriceps: 'fa-person-running',
        isquios: 'fa-person-walking',
        gluteo: 'fa-mountain',
        gluteo_medio: 'fa-mountain-sun',
        pantorrilla: 'fa-shoe-prints',
        erectores: 'fa-ruler-vertical',
        core: 'fa-circle-dot',
        general: 'fa-bullseye'
    };
    return map[primary] || map.general;
}

function getExerciseAccentClass(ex = {}) {
    const primary = getPrimaryGroup(ex);
    const map = {
        pecho: 'accent-chest',
        pecho_superior: 'accent-chest',
        triceps: 'accent-arms',
        hombro: 'accent-shoulders',
        hombro_anterior: 'accent-shoulders',
        deltoide_lateral: 'accent-shoulders',
        deltoide_posterior: 'accent-shoulders',
        dorsal: 'accent-back',
        espalda_media: 'accent-back',
        trapecio_medio: 'accent-back',
        biceps: 'accent-arms',
        braquial: 'accent-arms',
        antebrazo: 'accent-arms',
        cuadriceps: 'accent-legs',
        isquios: 'accent-legs',
        gluteo: 'accent-legs',
        gluteo_medio: 'accent-legs',
        pantorrilla: 'accent-legs',
        erectores: 'accent-back',
        core: 'accent-core'
    };
    return map[primary] || 'accent-default';
}

function getGroupChips(ex = {}, max = 2) {
    return (Array.isArray(ex?.grupos) ? ex.grupos : [])
        .slice(0, max)
        .map(g => `<span class="muscle-chip ${getExerciseAccentClass({ grupos: [g] })}">${formatGroupName(g)}</span>`)
        .join('');
}

function getDayFocusIcon(day = {}) {
    const text = `${day?.enfoque || ''} ${day?.dia || ''}`.toLowerCase();
    if (text.includes('push') || text.includes('pecho')) return 'fa-shield-heart';
    if (text.includes('pull') || text.includes('espalda')) return 'fa-up-long';
    if (text.includes('pierna') || text.includes('glúteo') || text.includes('gluteo')) return 'fa-person-running';
    if (text.includes('core')) return 'fa-circle-dot';
    return 'fa-bolt';
}

function getEnergyMeta(ex = {}) {
    const mode = energyMode || 'normal';
    const role = String(ex?.rol || '').toLowerCase();
    const fatigue = String(ex?.fatiga || '').toLowerCase();

    if (mode === 'full') {
        if (role === 'ancla') return { label: 'foco fuerte', cls: 'energy-pill power', card: '' };
        return { label: '', cls: '', card: '' };
    }

    if (mode === 'normal') {
        if (role === 'ancla') return { label: 'prioridad', cls: 'energy-pill essential', card: '' };
        if (role === 'base') return { label: 'estable', cls: 'energy-pill important', card: '' };
        return { label: '', cls: '', card: '' };
    }

    // low
    if (role === 'ancla') return { label: 'esencial', cls: 'energy-pill essential', card: 'energy-card-essential' };
    if (role === 'base') return { label: 'importante', cls: 'energy-pill important', card: 'energy-card-important' };
    if (role === 'core' && fatigue !== 'alta') return { label: 'útil', cls: 'energy-pill useful', card: 'energy-card-useful' };
    return { label: 'opcional', cls: 'energy-pill optional', card: 'energy-card-optional' };
}


function formatKg(v) {
    const n = Number(v);
    if (!isFinite(n)) return '';
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

function getAdvisorBadgeClass(status = '') {
    const s = String(status || '').toUpperCase();
    if (s === 'SUBIR') return 'advisor-badge up';
    if (s === 'MANTENER') return 'advisor-badge hold';
    if (s === 'CONSOLIDAR') return 'advisor-badge build';
    if (s === 'REPS') return 'advisor-badge reps';
    return 'advisor-badge muted';
}

function applyAdvisorStart(exIdx) {
    const ex = getActiveExercise(diaVisualIdx, exIdx)?.activeEx || db?.semana?.[diaVisualIdx]?.ejercicios?.[exIdx];
    const startKg = Number(ex?.advisor?.start_kg);
    if (!isFinite(startKg) || startKg <= 0) return;
    document.querySelectorAll(`.val-peso[data-ex="${exIdx}"]`).forEach((input) => {
        if (!input.value) input.value = startKg;
    });
}

function renderAdvisorBlock(ex, exIdx) {
    const a = ex?.advisor;
    if (!a || !a.enabled || !a.start_kg || !a.top_set_kg) return '';
    const cleanSessions = Number(a.clean_sessions || 0);
    return `
        <div class="advisor-box">
            <div class="advisor-top">
                <div class="advisor-title-wrap">
                    <div class="advisor-heading-line">
                        <span class="advisor-kicker">Top Set Advisor</span>
                        <span class="${getAdvisorBadgeClass(a.status)}">${String(a.status_label || a.status || '').replace('_',' ')}</span>
                    </div>
                    <button class="advisor-cta" onclick="applyAdvisorStart(${exIdx})">
                        <i class="fas fa-wand-magic-sparkles"></i>
                        <span>Usar inicio</span>
                    </button>
                </div>
            </div>
            <div class="advisor-grid">
                <div class="advisor-stat">
                    <span class="advisor-label">Inicio hoy</span>
                    <strong>${formatKg(a.start_kg)} kg</strong>
                </div>
                <div class="advisor-stat">
                    <span class="advisor-label">Top set</span>
                    <strong>${formatKg(a.top_set_kg)} kg</strong>
                </div>
                <div class="advisor-stat">
                    <span class="advisor-label">Salto</span>
                    <strong>${formatKg(a.step_kg)} kg</strong>
                </div>
                <div class="advisor-stat">
                    <span class="advisor-label">Base limpia</span>
                    <strong>${cleanSessions} sesiones</strong>
                </div>
            </div>
            ${a.note ? `<p class="advisor-note"><i class="fas fa-circle-info"></i><span>${a.note}</span></p>` : ''}
        </div>
    `;
}

function getDayEssentials(day = {}) {
    return (day?.ejercicios || [])
        .filter(ex => ['ancla', 'base'].includes(String(ex?.rol || '').toLowerCase()))
        .slice(0, 3)
        .map(ex => ex.nombre);
}

function renderEnergyPanel(day = {}) {
    const essentials = getDayEssentials(day);
    const hints = {
        full: 'Día con energía alta. Empuja fuerte y completa el volumen completo.',
        normal: 'Día estándar. Prioriza anclas y mantén técnica limpia en el resto.',
        low: 'Día pesado o cansado. Cumple esenciales primero y corta opcionales si hace falta.'
    };
    const labels = { full: 'Full', normal: 'Normal', low: 'Baja' };
    return `
        <div class="hero-panel mb-6">
            <div class="hero-top">
                <div class="hero-icon-wrap ${getExerciseAccentClass({ grupos: [getPrimaryGroup(day?.ejercicios?.[0] || {})] })}">
                    <i class="fas ${getDayFocusIcon(day)}"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <p class="hero-kicker">${day?.dia || 'Hoy'}</p>
                    <h2 class="hero-title">${day?.enfoque || 'Sesión'}</h2>
                    <p class="hero-sub">${(day?.ejercicios || []).length} ejercicios · ${day?.ejercicios?.reduce((acc, ex) => acc + Number(ex?.series || 0), 0) || 0} series programadas</p>
                </div>
            </div>
            <div class="hero-energy mt-4">
                <div>
                    <p class="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">Modo energía</p>
                    <p class="text-[11px] text-gray-300 mt-1 leading-relaxed">${hints[energyMode] || hints.normal}</p>
                </div>
                <div class="energy-switches mt-3">
                    ${['full','normal','low'].map(mode => `
                        <button onclick="setEnergyMode('${mode}')" class="energy-switch ${energyMode === mode ? 'active' : ''}">${labels[mode]}</button>
                    `).join('')}
                </div>
            </div>
            ${essentials.length ? `
                <div class="hero-focus mt-4">
                    <p class="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">Bloque clave</p>
                    <div class="hero-focus-list mt-2">
                        ${essentials.map(name => `<span class="focus-pill">${name}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function slotKey(dayIdx, exIdx) {
    // estable y legible (evita depender del nombre del ejercicio)
    return `${dayIdx}__${exIdx}`;
}

function getAlternativesFor(baseEx) {
    // soporta varias formas de nombre de campo
    return (
        baseEx?.alternativas ||
        baseEx?.alternatives ||
        baseEx?.opciones ||
        []
    );
}

function getActiveExercise(dayIdx, exIdx) {
    const baseEx = db?.semana?.[dayIdx]?.ejercicios?.[exIdx];
    const alts = getAlternativesFor(baseEx);
    const state = loadAlt();
    const key = slotKey(dayIdx, exIdx);
    const selectedName = state?.[key] || null; // guardamos por nombre

    if (!baseEx) return { baseEx: null, activeEx: null, isAlt: false, alts: [] };
    if (!alts?.length || !selectedName || selectedName === '__BASE__') {
        return { baseEx, activeEx: baseEx, isAlt: false, alts };
    }

    const found = alts.find(a => (a?.nombre || a?.name) === selectedName);
    const activeEx = found ? { ...baseEx, ...found, nombre: (found.nombre || found.name) } : baseEx;
    return { baseEx, activeEx, isAlt: !!found, alts };
}

async function loadRoutineDb() {
    try {
        const localRes = await fetch('v8.json?t=' + Date.now());
        if (localRes.ok) {
            const localDb = await localRes.json();
            if (localDb?.semana?.length) return localDb;
        }
    } catch (e) {
        console.warn('No se pudo cargar v8.json local:', e);
    }

    const res = await fetch(API_URL + "?getRoutine=true");
    return await res.json();
}

const RECOVERY_TRACKER_KEY = 'mariofit_recovery_tracker_v1';
let recoveryState = {
    choices: [],
    selectedDays: [],
    available: [],
    missedDays: [],
    applied: false,
    totalSets: 0,
    reason: ''
};
let __recoverySelection = [];

function getRecoveryConfig() {
    return db?.feature_recuperacion || {};
}

function ymdLocal(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function fromYmdLocal(ymd) {
    const [y, m, d] = String(ymd || '').split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

function addDaysLocal(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function getDayNameByDate(date) {
    return diasSemana[date.getDay()];
}

function isTrainingDayName(dayName) {
    return !!db?.semana?.some(d => d.dia === dayName);
}

function getDayIndexByName(dayName) {
    return db?.semana?.findIndex(d => d.dia === dayName) ?? -1;
}

function loadRecoveryTracker() {
    try {
        const parsed = JSON.parse(localStorage.getItem(RECOVERY_TRACKER_KEY) || '{}');
        return {
            statuses: parsed?.statuses || {},
            lastSyncDate: parsed?.lastSyncDate || null
        };
    } catch {
        return { statuses: {}, lastSyncDate: null };
    }
}

function saveRecoveryTracker(tracker) {
    try { localStorage.setItem(RECOVERY_TRACKER_KEY, JSON.stringify(tracker)); }
    catch { /* ignore */ }
}

function syncRecoveryTracker() {
    const tracker = loadRecoveryTracker();
    const todayYmd = ymdLocal();

    if (!tracker.lastSyncDate) {
        tracker.lastSyncDate = todayYmd;
        saveRecoveryTracker(tracker);
        return tracker;
    }

    let cursor = addDaysLocal(fromYmdLocal(tracker.lastSyncDate), 1);
    const yesterday = addDaysLocal(fromYmdLocal(todayYmd), -1);

    while (cursor <= yesterday) {
        const dayName = getDayNameByDate(cursor);
        const key = ymdLocal(cursor);

        if (isTrainingDayName(dayName) && !tracker.statuses[key]) {
            tracker.statuses[key] = 'missed';
        }
        cursor = addDaysLocal(cursor, 1);
    }

    tracker.lastSyncDate = todayYmd;
    saveRecoveryTracker(tracker);
    return tracker;
}

function markTodayRecoveryStatus(status) {
    const tracker = syncRecoveryTracker();
    tracker.statuses[ymdLocal()] = status;
    tracker.lastSyncDate = ymdLocal();
    saveRecoveryTracker(tracker);
}


function getRecoveryDayChoices() {
    const cfg = getRecoveryConfig();
    const maxMissed = Number(cfg.max_dias_perdidos || 2);
    const today = fromYmdLocal(ymdLocal());
    const choices = [];
    let cursor = addDaysLocal(today, -1);

    while (cursor >= addDaysLocal(today, -10) && choices.length < 6) {
        const dayName = getDayNameByDate(cursor);
        if (!isTrainingDayName(dayName)) {
            cursor = addDaysLocal(cursor, -1);
            continue;
        }

        choices.push({
            fecha: ymdLocal(cursor),
            dia: dayName,
            idx: getDayIndexByName(dayName),
            blocked: (cfg.nunca_recuperar_dias || []).includes(dayName),
            helper: (cfg.nunca_recuperar_dias || []).includes(dayName)
                ? 'No se ofrece recuperación para este día.'
                : `Puedes seleccionar hasta ${maxMissed} día(s) perdidos.`
        });

        cursor = addDaysLocal(cursor, -1);
    }

    return choices;
}

function fatigueScore(ex) {
    const map = { baja: 1, media: 2, alta: 3 };
    return map[String(ex?.fatiga || '').toLowerCase()] || 99;
}

function getRecoveryTargetDayName() {
    return db?.semana?.[diaVisualIdx]?.dia || db?.semana?.[diaRegistroIdx]?.dia || '';
}

function buildRecoveryPlan(selectedDays = []) {
    const cfg = getRecoveryConfig();
    const currentDay = getRecoveryTargetDayName();
    if (!cfg?.enabled || !currentDay) {
        return { choices: getRecoveryDayChoices(), selectedDays: [], available: [], missedDays: [], applied: false, totalSets: 0, reason: 'disabled' };
    }

    const picked = Array.isArray(selectedDays) ? selectedDays.filter(Boolean) : [];
    if (!picked.length) {
        return { choices: getRecoveryDayChoices(), selectedDays: [], available: [], missedDays: [], applied: false, totalSets: 0, reason: 'manual_pending' };
    }

    const maxMissed = Number(cfg.max_dias_perdidos || 2);
    if (picked.length > maxMissed) {
        return { choices: getRecoveryDayChoices(), selectedDays: picked.slice(0, maxMissed), available: [], missedDays: picked.slice(0, maxMissed), applied: false, totalSets: 0, reason: 'too_many_selected' };
    }

    if (picked.some(d => (cfg.nunca_recuperar_dias || []).includes(d.dia) || d.blocked)) {
        return { choices: getRecoveryDayChoices(), selectedDays: picked, available: [], missedDays: picked, applied: false, totalSets: 0, reason: 'includes_blocked_day' };
    }

    const available = [];
    let totalSets = 0;
    const maxExercises = Number(cfg.max_ejercicios_totales || 4);
    const maxPerMissedDay = Number(cfg.max_ejercicios_por_dia_perdido || 2);
    const maxSets = Number(cfg.max_series_totales || 8);
    const maxSetsPerExercise = Number(cfg.max_series_por_ejercicio || 2);

    picked.forEach((missedDay) => {
        const dayObj = db?.semana?.[missedDay.idx];
        if (!dayObj?.ejercicios?.length) return;

        const compatible = dayObj.ejercicios
            .filter(ex => ex?.recuperacion?.habilitado)
            .filter(ex => (ex?.recuperacion?.compatible_en || []).includes(currentDay))
            .sort((a, b) => {
                const prioDiff = Number(b?.recuperacion?.prioridad || 0) - Number(a?.recuperacion?.prioridad || 0);
                if (prioDiff !== 0) return prioDiff;
                return fatigueScore(a) - fatigueScore(b);
            })
            .slice(0, maxPerMissedDay);

        compatible.forEach((ex, index) => {
            const series = Math.min(Number(ex?.recuperacion?.series || 2), maxSetsPerExercise);
            if (available.length >= maxExercises) return;
            if (totalSets + series > maxSets) return;

            available.push({
                id: `rec-${missedDay.fecha}-${index}-${available.length}`,
                nombre: ex.nombre,
                series,
                repeticiones: ex?.recuperacion?.repeticiones || ex.repeticiones,
                origenDia: missedDay.dia,
                origenFecha: missedDay.fecha,
                video: ex.video || '',
                nota: ex?.recuperacion?.nota || ex.nota || '',
                rol: ex.rol || 'complementario',
                grupos: Array.isArray(ex.grupos) ? ex.grupos : []
            });

            totalSets += series;
        });
    });

    return {
        choices: getRecoveryDayChoices(),
        selectedDays: picked,
        available,
        missedDays: picked,
        applied: available.length > 0,
        totalSets,
        reason: available.length ? '' : 'no_compatible_exercises'
    };
}

async function recomputeRecoveryPlan({ preserveApplied = false } = {}) {
    const prevApplied = !!recoveryState?.applied;
    const selectedDays = Array.isArray(recoveryState?.selectedDays) ? recoveryState.selectedDays : [];
    recoveryState = buildRecoveryPlan(selectedDays);
    if (preserveApplied && recoveryState.available.length) {
        recoveryState.applied = prevApplied;
    }
    return recoveryState;
}

function getRecoveryReasonText(reason) {
    const map = {
        manual_pending: 'Toca elegir manualmente qué día(s) faltaste. El sistema solo agregará accesorios recuperables al día actual.',
        too_many_selected: 'Solo puedes recuperar como máximo 2 días. Si faltaste más que eso, hoy toca retomar normal.',
        includes_blocked_day: 'Si faltaste sábado, no se ofrece recuperación. Ese día se deja limpio.',
        no_compatible_exercises: 'Sí hubo faltas, pero hoy no conviene meter recuperación por cruce de fatiga.'
    };
    return map[reason] || '';
}

function clearManualRecovery() {
    recoveryState = buildRecoveryPlan([]);
    renderDia(diaVisualIdx);
}

function abrirModalRecoveryPicker() {
    const modal = document.getElementById('modalRecoveryPicker');
    const list = document.getElementById('mrp-list');
    const help = document.getElementById('mrp-help');
    if (!modal || !list || !help) return;

    const cfg = getRecoveryConfig();
    const choices = getRecoveryDayChoices();
    __recoverySelection = (recoveryState?.selectedDays || []).map(d => d.fecha);

    const maxMissed = Number(cfg.max_dias_perdidos || 2);
    help.textContent = `Selecciona hasta ${maxMissed} día(s) anteriores al día actual. Se agregarán a la rutina que estás viendo. Sábado no se puede recuperar.`;

    if (!choices.length) {
        list.innerHTML = `<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-[11px] text-gray-300">No hay días anteriores disponibles para elegir.</div>`;
    } else {
        list.innerHTML = choices.map(day => renderRecoveryChoiceItem(day)).join('');
    }

    modal.classList.remove('hidden');
}

function cerrarModalRecoveryPicker() {
    const modal = document.getElementById('modalRecoveryPicker');
    if (!modal) return;
    modal.classList.add('hidden');
}

function renderRecoveryChoiceItem(day) {
    const selected = __recoverySelection.includes(day.fecha);
    const disabled = !!day.blocked;
    const stateClasses = disabled
        ? 'opacity-45 cursor-not-allowed border-white/10 bg-white/5'
        : selected
            ? 'border-lime-400/40 bg-lime-400/10'
            : 'border-white/10 bg-white/5';

    return `
        <button type="button" ${disabled ? 'disabled' : ''} onclick="toggleRecoveryDaySelection('${day.fecha}')"
            class="w-full text-left rounded-2xl border p-4 transition-all ${stateClasses}">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <p class="text-white text-sm font-black">${day.dia}</p>
                    <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">${day.fecha}</p>
                </div>
                <div class="shrink-0 w-8 h-8 rounded-xl border flex items-center justify-center ${selected ? 'border-lime-400 bg-lime-400 text-[#061009]' : 'border-white/10 text-gray-400 bg-black/20'}">
                    <i class="fas ${selected ? 'fa-check' : 'fa-plus'}"></i>
                </div>
            </div>
            <p class="text-[11px] mt-3 ${disabled ? 'text-red-300' : 'text-gray-300'}">${day.helper || ''}</p>
        </button>
    `;
}

function toggleRecoveryDaySelection(fecha) {
    const cfg = getRecoveryConfig();
    const maxMissed = Number(cfg.max_dias_perdidos || 2);
    const choices = getRecoveryDayChoices();
    const chosen = choices.find(x => x.fecha === fecha);
    if (!chosen || chosen.blocked) return;

    if (__recoverySelection.includes(fecha)) {
        __recoverySelection = __recoverySelection.filter(x => x !== fecha);
    } else {
        if (__recoverySelection.length >= maxMissed) {
            alert(`Solo puedes seleccionar máximo ${maxMissed} días.`);
            return;
        }
        __recoverySelection.push(fecha);
    }

    const list = document.getElementById('mrp-list');
    if (list) list.innerHTML = choices.map(day => renderRecoveryChoiceItem(day)).join('');
}

function confirmarRecoveryPicker() {
    const choices = getRecoveryDayChoices();
    const picked = choices.filter(day => __recoverySelection.includes(day.fecha));
    recoveryState = buildRecoveryPlan(picked);
    cerrarModalRecoveryPicker();
    renderDia(diaVisualIdx);
}

function toggleRecoveryPlan(forceValue = null) {
    if (!recoveryState?.available?.length) return;
    recoveryState.applied = typeof forceValue === 'boolean' ? forceValue : !recoveryState.applied;
    renderDia(diaVisualIdx);
}

function toggleRecoveryLock(recId) {
    const card = document.getElementById(`recovery-card-${recId}`);
    const btn = document.getElementById(`btn-recovery-lock-${recId}`);
    if (!card || !btn) return;

    if (!card.classList.contains('recovery-locked')) {
        card.classList.add('recovery-locked', 'exercise-locked');
        btn.innerHTML = '<i class="fas fa-lock text-emerald-400"></i>';
    } else {
        card.classList.remove('recovery-locked', 'exercise-locked');
        btn.innerHTML = '<i class="fas fa-lock-open"></i>';
    }
}

function renderRecoveryBanner() {
    const selectedDays = recoveryState?.selectedDays || [];
    const targetDay = getRecoveryTargetDayName();
    const reasonText = getRecoveryReasonText(recoveryState?.reason || '');
    const selectedText = selectedDays.length
        ? selectedDays.map(d => d.dia).join(' + ')
        : 'Aún no seleccionaste faltas';

    return `
        <div class="card p-5 mb-6 border border-lime-400/20 bg-lime-400/5">
            <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                    <p class="text-[9px] text-lime-400 font-black uppercase tracking-[0.25em]">Recuperación manual</p>
                    <h3 class="text-white text-sm font-black mt-1">Elige qué día(s) faltaste antes del día actual</h3>
                    <p class="text-[11px] text-gray-300 mt-2 leading-relaxed">
                        Selecciona hasta 2 días previos y el sistema agregará solo complementarios compatibles a esta pantalla: <span class="text-lime-300 font-black">${targetDay}</span>.
                    </p>
                    <p class="text-[11px] text-lime-300 mt-2 font-bold">Seleccionado: ${selectedText}</p>
                    ${reasonText ? `<p class="text-[11px] text-gray-300 mt-2 leading-relaxed">${reasonText}</p>` : ''}
                    ${recoveryState?.available?.length ? `<p class="text-[11px] text-sky-300 mt-2 leading-relaxed">Listo: ${recoveryState.available.length} ejercicio(s) / ${recoveryState.totalSets} series.</p>` : ''}
                    ${energyMode === 'low' ? `<p class="text-[11px] text-amber-300 mt-2 leading-relaxed">Modo baja energía activo: prioriza el bloque clave del día y usa la recuperación solo si todavía te sientes sólido.</p>` : ''}
                </div>
                <div class="shrink-0 flex flex-col gap-2">
                    <button onclick="abrirModalRecoveryPicker()" class="px-4 py-3 rounded-2xl bg-lime-500 text-[#061009] text-[10px] font-black uppercase tracking-widest">
                        ${selectedDays.length ? 'Cambiar' : 'Elegir'}
                    </button>
                    ${selectedDays.length ? `<button onclick="clearManualRecovery()" class="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest">Limpiar</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderRecoverySection() {
    if (!recoveryState?.applied || !recoveryState?.available?.length) return '';

    const cards = recoveryState.available.map((ex) => {
        let rows = '';
        for (let s = 1; s <= Number(ex.series || 2); s++) {
            rows += `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-[10px] font-bold text-gray-600 border border-white/5">${s}º</div>
                    <input type="number" placeholder="Kg" class="rec-peso" data-rec-id="${ex.id}" data-s="${s}">
                    <input type="number" placeholder="Reps" class="rec-reps" data-rec-id="${ex.id}" data-s="${s}">
                </div>
            `;
        }

        const recAccent = getExerciseAccentClass({ grupos: [getPrimaryGroup({ grupos: ex.grupos || [] })] });
        const recIcon = getExerciseIconClass({ grupos: ex.grupos || [] });
        return `
            <div class="card p-6 relative border border-sky-400/20 bg-sky-400/5 recovery-card ${recAccent}" id="recovery-card-${ex.id}" data-rec-id="${ex.id}">
                <div class="flex justify-between items-start mb-4 gap-3">
                    <div class="flex gap-4 items-start flex-1 min-w-0">
                        <button onclick="toggleRecoveryLock('${ex.id}')" id="btn-recovery-lock-${ex.id}" class="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-gray-500 transition-all shrink-0">
                            <i class="fas fa-lock-open"></i>
                        </button>
                        <div class="exercise-icon-bubble ${recAccent}">
                            <i class="fas ${recIcon}"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <h3 class="font-bold text-white text-base leading-tight truncate">${ex.nombre}</h3>
                                <div class="text-[8px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider bg-sky-400/10 text-sky-300 border border-sky-400/20">recup</div>
                            </div>
                            <p class="text-[10px] text-sky-300/80 font-bold uppercase tracking-widest mt-1">${ex.repeticiones} objetivo · viene de ${ex.origenDia}</p>
                        </div>
                    </div>
                    ${ex.video ? `<a href="${ex.video}" target="_blank" class="w-10 h-10 flex items-center justify-center bg-white/5 text-red-500 rounded-xl border border-white/5"><i class="fab fa-youtube"></i></a>` : ''}
                </div>
                ${ex.nota ? `
                    <div class="nota-badge active !block">
                        <p class="text-[11px] text-orange-200 leading-relaxed italic">
                            <span class="font-bold text-orange-400 uppercase text-[9px]">Tip:</span> ${ex.nota}
                        </p>
                    </div>
                ` : ''}
                <div class="space-y-3 mt-4">${rows}</div>
            </div>
        `;
    }).join('');

    return `
        <div class="mt-4 mb-6">
            <div class="flex items-center gap-2 py-2">
                <div class="h-[1px] flex-1 bg-sky-400/20"></div>
                <span class="text-[10px] text-sky-300 font-bold uppercase tracking-[0.2em]">Complementarios por faltas</span>
                <div class="h-[1px] flex-1 bg-sky-400/20"></div>
            </div>
            <div class="space-y-6 mt-4">${cards}</div>
        </div>
    `;
}

async function init() {
    const loader = document.getElementById('loading-screen');
    try {
        db = await loadRoutineDb();

        const hoyNombre = diasSemana[new Date().getDay()];
        document.getElementById('label-hoy').innerText = hoyNombre;
        document.getElementById('sub-meta').innerText = db.perfil.objetivo.replace(/_/g, ' ');

        const selector = document.getElementById('selectorRutina');
        selector.innerHTML = db.semana.map((d, i) =>
            `<option value="${i}" ${d.dia === hoyNombre ? 'selected' : ''}>Rutina ${d.dia}</option>`
        ).join('');

        diaRegistroIdx = db.semana.findIndex(d => d.dia === hoyNombre);
        if (diaRegistroIdx === -1) diaRegistroIdx = 0;
        diaVisualIdx = diaRegistroIdx;
        syncEnergyModeForCurrentDay();

        recoveryState = buildRecoveryPlan([]);

        renderNav();
        renderDia(diaVisualIdx);

        setTimeout(() => {
            loader.classList.add('hidden-load');
        }, 800);

    } catch (e) {
        console.error("Error init:", e);
        document.querySelector('#loading-screen p').innerText = "Error de conexión. Reintenta.";
        document.querySelector('#loading-screen p').classList.replace('text-gray-500', 'text-red-500');
    }
}

// Close modals with ESC
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    try { cerrarModalAlternativas(); } catch { }
    try { cerrarModalRecoveryPicker(); } catch { }
});

// --- NUEVA FUNCIÓN DE HISTORIAL ---
async function cargarHistorial() {
    const container = document.getElementById('tablaHistorial');
    container.innerHTML = `<div class="text-center p-10"><i class="fas fa-spinner fa-spin text-lime-400 text-2xl"></i></div>`;

    try {
        const res = await fetch(API_URL + "?getHistory=true&t=" + new Date().getTime());
        historialCompleto = await res.json();

        renderizarHistorial("TODOS"); // Carga inicial
    } catch (e) {
        container.innerHTML = `<p class="text-red-400 text-center py-10 text-xs">Error de datos</p>`;
    }
}

function renderizarHistorial(filtroDia) {
    const container = document.getElementById('tablaHistorial');

    // Crear la barra de filtros
    const diasFiltro = ["TODOS", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    let htmlFiltros = `<div class="filter-scroll">`;
    diasFiltro.forEach(d => {
        htmlFiltros += `<button onclick="renderizarHistorial('${d}')" class="filter-chip ${filtroDia === d ? 'active' : ''}">${d}</button>`;
    });
    htmlFiltros += `</div>`;

    // Filtrar datos
    const datosFiltrados = filtroDia === "TODOS"
        ? historialCompleto
        : historialCompleto.filter(r => r.dia === filtroDia);

    if (datosFiltrados.length === 0) {
        container.innerHTML = htmlFiltros + `<p class="text-gray-600 text-center py-20 text-[10px] font-bold uppercase tracking-widest">No hay registros para este día</p>`;
        return;
    }

    // Agrupar por Sesión
    const sesiones = datosFiltrados.reduce((acc, reg) => {
        const sesionKey = `${reg.fecha} - ${reg.dia}`;
        if (!acc[sesionKey]) acc[sesionKey] = {};
        if (!acc[sesionKey][reg.ejercicio]) acc[sesionKey][reg.ejercicio] = [];
        acc[sesionKey][reg.ejercicio].push(reg);
        return acc;
    }, {});

    let htmlContenido = Object.keys(sesiones).map((sesion, sIdx) => {
        const ejercicios = sesiones[sesion];
        return `
            <div class="history-accordion mb-3" id="acc-${sIdx}">
                <div class="accordion-header p-4 flex justify-between items-center" onclick="toggleAccordion(${sIdx})">
                    <div>
                        <p class="text-[9px] text-lime-400 font-black uppercase tracking-widest">${sesion.split(' - ')[1]}</p>
                        <p class="text-white font-bold text-sm">${sesion.split(' - ')[0]}</p>
                    </div>
                    <i class="fas fa-chevron-down chevron text-[10px]"></i>
                </div>
                <div class="accordion-content px-4" id="content-${sIdx}">
                    ${Object.keys(ejercicios).map(nombreEx => {
            const series = ejercicios[nombreEx].sort((a, b) => a.serie - b.serie);
            return `
                            <div class="exercise-group mb-2">
                                ${(() => {
                    // const noteObj = series.find(x => (x.nota && String(x.nota).trim()) || (x.foto && String(x.foto).trim()));
                    const noteObj = series.find(x =>
                        (x.nota && String(x.nota).trim()) ||
                        (x.fotoUrl && String(x.fotoUrl).trim()) ||
                        (x.foto && String(x.foto).trim()) // compat viejo base64
                    );

                    if (!noteObj) {
                        return `<p class="text-gray-300 text-[10px] font-bold mb-2 uppercase tracking-tighter">${nombreEx}</p>`;
                    }

                    const payload = {
                        ejercicio: nombreEx,
                        sesion,
                        nota: noteObj.nota || '',
                        foto: noteObj.fotoUrl || noteObj.foto || '' // usa URL si existe
                    };
                    const payloadStr = JSON.stringify(payload).replace(/"/g, '&quot;');
                    return `
                                        <div class="flex items-center justify-between gap-2 mb-2">
                                            <p class="text-gray-300 text-[10px] font-bold uppercase tracking-tighter">${nombreEx}</p>
                            <button class="btn-note has-note flex items-center gap-2" title="Ver nota" onclick="abrirModalNotaHistorial(${payloadStr})">
  <i class="fas fa-note-sticky"></i>
  ${payload.foto ? `<span class="w-6 h-6 rounded-lg overflow-hidden border border-lime-400/20">
    <img src="${payload.foto}" class="w-full h-full object-cover"/>
  </span>` : ''}
</button>
                                        </div>
                                    `;
                })()}
                                <div class="tag-container">
                                    ${series.map((s, idx) => `
                                        <div class="data-tag ${idx === 0 && sIdx === 0 ? 'last-record' : ''}">
                                            <span class="tag-label">S${s.serie}</span>
                                            <span class="tag-weight font-black">${s.peso}kg</span>
                                            <span class="text-[8px] opacity-40">x</span>
                                            <span class="text-white">${s.reps}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = htmlFiltros + htmlContenido;
}

// Función para abrir/cerrar el acordeón
function toggleAccordion(index) {
    const content = document.getElementById(`content-${index}`);
    const wrapper = document.getElementById(`acc-${index}`);

    // Cerrar otros si prefieres (opcional)
    // document.querySelectorAll('.accordion-content').forEach(el => el.classList.remove('active'));

    content.classList.toggle('active');
    wrapper.classList.toggle('open');
}

function renderNav() {
    const nav = document.getElementById('dayNav');
    nav.innerHTML = db.semana.map((d, i) => `
            <button onclick="cambiarDia(${i})" class="day-btn flex-shrink-0 px-7 py-3 rounded-2xl bg-slate-800 text-xs font-black uppercase tracking-widest text-white ${i === diaVisualIdx ? 'active' : ''}">
                ${obtenerInicialDia(d.dia)}
            </button>
        `).join('');
}

/**
 * Devuelve la inicial en mayúscula de un día de la semana.
 * Si el día es "miércoles" (con o sin tilde) devuelve "X".
 */
function obtenerInicialDia(dia) {
    if (!dia) return '';
    const limpio = dia.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (limpio === 'miercoles' || limpio.startsWith('miercoles')) return 'X';
    return (limpio.charAt(0) || '').toUpperCase();
}

function renderDia(idx) {
    const container = document.getElementById('mainContent');
    const dia = db.semana[idx];
    syncEnergyModeForCurrentDay();

    let html = `        
        <div class="flex items-center gap-2 py-2">
            <div class="h-[1px] flex-1 bg-white/5"></div>
            <span class="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">Rutina del día</span>
            <div class="h-[1px] flex-1 bg-white/5"></div>
        </div>
    `;

    html += renderEnergyPanel(dia);
    html += renderRecoveryBanner();

    html += dia.ejercicios.map((ex, i) => {
        const v = getActiveExercise(idx, i);
        const active = v.activeEx || ex;
        const userNote = getNoteForSlot(idx, i);
        const hasUserNote = !!(userNote && ((userNote.text && userNote.text.trim()) || userNote.photo));
        const alts = v.alts || [];
        const isAlt = v.isAlt;
        let rows = '';
        const numSeries = active.series || ex.series || 3;

        for (let s = 1; s <= numSeries; s++) {
            rows += `
                <div class="exercise-set-row">
                    <div class="series-index">${s}º</div>
                    <input type="number" placeholder="Kg" class="val-peso" data-ex="${i}" data-s="${s}">
                    <input type="number" placeholder="Reps" class="val-reps" data-ex="${i}" data-s="${s}">
                </div>
            `;
        }

        const energyMeta = getEnergyMeta(active);
        const accentClass = getExerciseAccentClass(active);
        const iconClass = getExerciseIconClass(active);
        const groupChips = getGroupChips(active);

        return `
            <div class="card exercise-card p-6 relative ${accentClass} ${energyMeta.card || ''}" id="card-${i}" data-day="${idx}" data-ex="${i}" data-ex-name="${String(active.nombre || ex.nombre || '').replace(/"/g, '&quot;')}">
                <div class="exercise-card-head mb-4">
                    <div class="exercise-card-main">
                        <button onclick="toggleLock(${i})" id="btn-lock-${i}" class="exercise-lock-btn w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-gray-500 transition-all shrink-0">
                            <i class="fas fa-lock-open"></i>
                        </button>

                        <div class="exercise-icon-bubble ${accentClass}">
                            <i class="fas ${iconClass}"></i>
                        </div>

                        <div class="exercise-card-content min-w-0 flex-1">
                            <h3 class="exercise-name font-bold text-white text-base leading-tight">${active.nombre}</h3>
                            <div class="exercise-badges-row">
                                ${(active.record && Number(active.record.peso) > 0) ? `<div class="record-badge"><i class="fas fa-crown"></i> ${active.record.peso}kg</div>` : ''}
                                ${isAlt ? `<div class="ex-badge ex-badge--alt">ALT</div>` : ''}
                                ${active.rol ? `<div class="ex-badge ${active.rol === 'ancla' ? 'ex-badge--ancla' : 'ex-badge--base'}">${active.rol}</div>` : ''}
                                ${energyMeta.label ? `<div class="${energyMeta.cls}">${energyMeta.label}</div>` : ''}
                            </div>
                            ${active.repeticiones || active.duracion_segundos ? `<p class="exercise-target text-[10px] text-lime-300/80 font-bold uppercase tracking-widest mt-2">${active.repeticiones || active.duracion_segundos + 's'} objetivo</p>` : ''}
                            ${groupChips ? `<div class="muscle-chip-row mt-2">${groupChips}</div>` : ''}
                        </div>
                    </div>

                    <div class="exercise-card-actions ml-2 shrink-0">
                        <button onclick="abrirAcciones(${idx}, ${i})" class="exercise-menu-btn w-10 h-10 flex items-center justify-center bg-white/5 text-gray-400 rounded-xl border border-white/5" aria-label="Acciones" style="touch-action:manipulation">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>

                ${renderAdvisorBlock(active, i)}

                ${active.nota ? `
                    <div id="nota-${i}" class="nota-badge hidden">
                        <p class="text-[11px] text-orange-200 leading-relaxed italic">
                            <span class="font-bold text-orange-400 uppercase text-[9px]">Tips:</span> ${active.nota}
                        </p>
                    </div>
                ` : ''}

                <div class="space-y-3">${rows}</div>
            </div>
        `;
    }).join('');

    html += renderRecoverySection();

    container.innerHTML = html;
}

// === Acciones del ejercicio — bottom sheet global ===
function abrirAcciones(dayIdx, exIdx) {
    const v = getActiveExercise(dayIdx, exIdx);
    const ex = v?.activeEx || db?.semana?.[dayIdx]?.ejercicios?.[exIdx];
    if (!ex) return;

    const notes = loadNotes();
    const hasNote = !!notes[slotKey(dayIdx, exIdx)];
    const alts = v?.alts || [];

    document.getElementById('mac-title').textContent = ex.nombre;
    document.getElementById('mac-sub').textContent =
        ex.repeticiones
            ? `Objetivo: ${ex.repeticiones}`
            : (ex.duracion_segundos ? `${ex.duracion_segundos} seg` : '');

    const items = [];

    items.push(`
        <button onclick="cerrarAcciones(); abrirModalNota(${dayIdx}, ${exIdx})"
            class="acc-action-btn ${hasNote ? 'has-data' : ''}">
            <span class="acc-action-icon" style="color:${hasNote ? '#fbbf24' : '#94a3b8'}">
                <i class="fas fa-pen"></i>
            </span>
            <span class="acc-action-body">
                <strong>Mi Nota</strong>
                <span>${hasNote ? 'Ya tienes una nota — editar o ver' : 'Agrega texto o foto a este ejercicio'}</span>
            </span>
            ${hasNote ? '<span class="acc-action-badge">Guardada</span>' : '<i class="fas fa-chevron-right acc-action-chev"></i>'}
        </button>`);

    if (ex.nota) {
        items.push(`
        <button onclick="cerrarAcciones(); toggleNota(${exIdx})"
            class="acc-action-btn">
            <span class="acc-action-icon" style="color:#fcd34d">
                <i class="fas fa-lightbulb"></i>
            </span>
            <span class="acc-action-body">
                <strong>Tips de Técnica</strong>
                <span>Consejos para ejecutar este ejercicio</span>
            </span>
            <i class="fas fa-chevron-right acc-action-chev"></i>
        </button>`);
    }

    if (alts.length) {
        items.push(`
        <button onclick="cerrarAcciones(); abrirModalAlternativas(${dayIdx}, ${exIdx})"
            class="acc-action-btn">
            <span class="acc-action-icon" style="color:#a3e635">
                <i class="fas fa-arrows-rotate"></i>
            </span>
            <span class="acc-action-body">
                <strong>Alternativas</strong>
                <span>${alts.length} ejercicio${alts.length !== 1 ? 's' : ''} alternativo${alts.length !== 1 ? 's' : ''} disponible${alts.length !== 1 ? 's' : ''}</span>
            </span>
            <i class="fas fa-chevron-right acc-action-chev"></i>
        </button>`);
    }

    if (ex.video) {
        items.push(`
        <a href="${ex.video}" target="_blank" onclick="cerrarAcciones()"
            class="acc-action-btn">
            <span class="acc-action-icon" style="color:#f87171">
                <i class="fab fa-youtube"></i>
            </span>
            <span class="acc-action-body">
                <strong>Ver Video</strong>
                <span>Tutorial en YouTube</span>
            </span>
            <i class="fas fa-chevron-right acc-action-chev"></i>
        </a>`);
    }

    document.getElementById('mac-list').innerHTML = items.join('');
    document.getElementById('modalAcciones').classList.remove('hidden');
}

function cerrarAcciones() {
    document.getElementById('modalAcciones').classList.add('hidden');
}

function toggleNota(idx) {
    const notaDiv = document.getElementById(`nota-${idx}`);
    const btnNota = document.getElementById(`btn-nota-${idx}`);

    if (notaDiv.classList.contains('active')) {
        notaDiv.classList.remove('active');
        btnNota.classList.remove('active');
    } else {
        notaDiv.classList.add('active');
        btnNota.classList.add('active');
    }
}

// --- Modal Nota (texto + foto) ---
let __noteCtx = null; // { mode: 'edit'|'view', dayIdx, exIdx, title, readonly, payload }

function abrirModalNota(dayIdx, exIdx) {
    const modal = document.getElementById('modalNota');
    if (!modal) return;

    const v = getActiveExercise(dayIdx, exIdx);
    const active = v.activeEx || v.baseEx;
    const title = active?.nombre || 'Ejercicio';

    __noteCtx = { mode: 'edit', dayIdx, exIdx, title };

    const note = getNoteForSlot(dayIdx, exIdx) || { text: '', photo: '' };

    document.getElementById('mn-title').textContent = title;
    document.getElementById('mn-sub').textContent = 'Agrega una nota y/o una foto (se verá en tu historial).';

    const ta = document.getElementById('mn-text');
    ta.value = note.text || '';
    ta.removeAttribute('readonly');

    // Mostrar/ocultar preview
    setPreviewNota(note.photo || '');

    // Habilitar botones de edición
    setNotaModoEdicion(true);

    modal.classList.remove('hidden');
}

function abrirModalNotaHistorial({ ejercicio, sesion, nota, foto }) {
    const modal = document.getElementById('modalNota');
    if (!modal) return;

    __noteCtx = { mode: 'view', title: ejercicio };

    document.getElementById('mn-title').textContent = ejercicio;
    document.getElementById('mn-sub').textContent = `Historial: ${sesion}`;

    const ta = document.getElementById('mn-text');
    ta.value = nota || '';
    ta.setAttribute('readonly', 'readonly');

    setPreviewNota(foto || '');
    setNotaModoEdicion(false);

    modal.classList.remove('hidden');
}

function cerrarModalNota() {
    const modal = document.getElementById('modalNota');
    if (!modal) return;
    modal.classList.add('hidden');
    __noteCtx = null;
}

function setNotaModoEdicion(enabled) {
    // Muestra/oculta acciones de adjuntar/quitar y el botón guardar
    const actionButtons = document.querySelectorAll('#modalNota .note-actions');
    if (!actionButtons.length) return;

    // Primera note-actions = adjuntar/quitar
    if (actionButtons[0]) actionButtons[0].style.display = enabled ? 'flex' : 'none';
    // Segunda note-actions = cancelar/guardar
    if (actionButtons[1]) {
        const guardar = actionButtons[1].querySelector('.note-btn.primary');
        if (guardar) guardar.style.display = enabled ? 'block' : 'none';
    }
}

function seleccionarFotoNota() {
    const file = document.getElementById('mn-file');
    if (!file) return;
    file.value = '';
    file.click();
}

function limpiarFotoNota() {
    setPreviewNota('');
}

function setPreviewNota(dataUrl) {
    const preview = document.getElementById('mn-preview');
    const img = document.getElementById('mn-img');
    if (!preview || !img) return;

    if (!dataUrl) {
        preview.classList.add('hidden');
        img.removeAttribute('src');
        preview.dataset.photo = '';
        return;
    }
    preview.classList.remove('hidden');
    img.src = dataUrl;
    preview.dataset.photo = dataUrl;
}

// Compresión simple: max 720px, JPG 0.78
async function fileToCompressedDataUrl(file, maxSize = 720, quality = 0.78) {
    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = dataUrl;
    });

    let { width, height } = img;
    const scale = Math.min(1, maxSize / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', quality);
}

// Listener para input file (1 vez)
document.getElementById('mn-file')?.addEventListener('change', async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    try {
        const compressed = await fileToCompressedDataUrl(file);
        setPreviewNota(compressed);
    } catch (err) {
        console.error(err);
        alert('No se pudo cargar la foto.');
    }
});

function guardarNotaEjercicio() {
    if (!__noteCtx || __noteCtx.mode !== 'edit') return;
    const { dayIdx, exIdx } = __noteCtx;
    const ta = document.getElementById('mn-text');
    const preview = document.getElementById('mn-preview');
    const text = (ta?.value || '').trim();
    const photo = preview?.dataset?.photo || '';

    const activeName = getActiveExercise(dayIdx, exIdx)?.activeEx?.nombre || '';
    setNoteForSlot(dayIdx, exIdx, { text, photo, exerciseName: activeName });

    // Refrescar solo el día visible para actualizar el icono
    if (dayIdx === diaVisualIdx) renderDia(diaVisualIdx);
    cerrarModalNota();
}

// --- Modal Alternativas ---
let __pendingAlt = null; // { dayIdx, exIdx }

function abrirModalAlternativas(dayIdx, exIdx) {
    const modal = document.getElementById('modalAlternativas');
    if (!modal) return;

    const base = db?.semana?.[dayIdx]?.ejercicios?.[exIdx];
    const alts = getAlternativesFor(base);
    if (!base || !alts.length) return;

    __pendingAlt = { dayIdx, exIdx };

    const title = document.getElementById('ma-title');
    const sub = document.getElementById('ma-sub');
    const list = document.getElementById('ma-list');

    const state = loadAlt();
    const key = slotKey(dayIdx, exIdx);
    const selectedName = state?.[key] || '__BASE__';

    if (title) title.textContent = base.nombre || 'Ejercicio';
    if (sub) sub.textContent = 'Elige una alternativa (si la máquina está ocupada).';

    const items = [];

    // Opción base
    items.push(renderAltItem({
        label: base.nombre,
        meta: base.repeticiones || (base.duracion_segundos ? base.duracion_segundos + 's' : ''),
        selected: selectedName === '__BASE__',
        onClick: `elegirAlternativa(${dayIdx}, ${exIdx}, "__BASE__")`
    }));

    // Alternativas
    alts.forEach((a) => {
        const nombre = a?.nombre || a?.name;
        if (!nombre) return;
        items.push(renderAltItem({
            label: nombre,
            meta: a?.repeticiones || (a?.duracion_segundos ? a.duracion_segundos + 's' : ''),
            selected: String(selectedName).toLowerCase() === String(nombre).toLowerCase(),
            onClick: `elegirAlternativa(${dayIdx}, ${exIdx}, ${JSON.stringify(nombre)})`
        }));
    });

    if (list) list.innerHTML = items.join('');
    modal.classList.remove('hidden');
}

function cerrarModalAlternativas() {
    const modal = document.getElementById('modalAlternativas');
    if (!modal) return;
    modal.classList.add('hidden');
    __pendingAlt = null;
}

function elegirAlternativa(dayIdx, exIdx, nombre) {
    const state = loadAlt();
    const key = slotKey(dayIdx, exIdx);
    if (nombre === '__BASE__' || !nombre) state[key] = '__BASE__';
    else state[key] = nombre;
    saveAlt(state);

    // Si estaba bloqueado, lo desbloqueamos (cambió el ejercicio)
    const card = document.getElementById(`card-${exIdx}`);
    const btn = document.getElementById(`btn-lock-${exIdx}`);
    if (card) card.classList.remove('exercise-locked');
    if (btn) btn.innerHTML = '<i class="fas fa-lock-open"></i>';

    cerrarModalAlternativas();

    // Re-render solo si estamos viendo ese día
    if (dayIdx === diaVisualIdx) {
        renderDia(diaVisualIdx);
    }
}

function renderAltItem({ label, meta, selected, onClick }) {
    return `
        <button class="alt-item ${selected ? 'selected' : ''}" onclick='${onClick}'>
            <div class="alt-left">
                <div class="alt-dot">${selected ? '<i class=\"fas fa-check\"></i>' : '<i class=\"fas fa-circle\"></i>'}</div>
                <div class="alt-txt">
                    <div class="alt-name">${label}</div>
                    <div class="alt-meta">${meta || '—'}</div>
                </div>
            </div>
            <i class="fas fa-chevron-right alt-chev"></i>
        </button>
    `;
}

function toggleLock(idx) {
    const card = document.getElementById(`card-${idx}`);
    const btn = document.getElementById(`btn-lock-${idx}`);

    // Obtenemos los datos del ejercicio ACTIVO del día VISUAL (corrige el bug al ver otro día)
    const ejercicioData = getActiveExercise(diaVisualIdx, idx).activeEx || db.semana[diaVisualIdx].ejercicios[idx];
    const recordAnterior = ejercicioData.record ? ejercicioData.record.peso : 0;

    if (!card.classList.contains('exercise-locked')) {
        // --- ACTIVAR BLOQUEO ---
        card.classList.add('exercise-locked');
        btn.innerHTML = '<i class="fas fa-lock text-emerald-400"></i>';

        // Lógica de detección de Récord Personal
        let maxPesoIngresado = 0;
        const inputsPeso = card.querySelectorAll('.val-peso');

        inputsPeso.forEach(input => {
            const valor = parseFloat(input.value) || 0;
            if (valor > maxPesoIngresado) maxPesoIngresado = valor;
        });

        // Si el peso máximo de hoy supera el récord histórico... ¡FIESTA!
        if (maxPesoIngresado > recordAnterior && recordAnterior > 0) {
            dispararCelebracion();
            console.log("¡Nuevo récord detectado!");
        }

    } else {
        // --- DESACTIVAR BLOQUEO ---
        card.classList.remove('exercise-locked');
        btn.innerHTML = '<i class="fas fa-lock-open"></i>';
    }
}

function dispararCelebracion() {
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#fbbf24', '#9AFF00', '#ffffff', '#10b981'],
        ticks: 200
    });
}

function cambiarDia(idx) {
    diaVisualIdx = idx;
    syncEnergyModeForCurrentDay();
    recoveryState = buildRecoveryPlan(recoveryState?.selectedDays || []);
    document.getElementById('selectorRutina').value = idx; // Sincroniza el selector
    renderNav();
    renderDia(diaVisualIdx);
}

async function enviarDatos() {
    const btn = document.getElementById('saveBtn');
    const selector = document.getElementById('selectorRutina');
    const idxRutinaVisual = parseInt(selector.value);
    const nombreDiaCalendario = db.semana[diaRegistroIdx].dia;

    const data = [];
    const slotsToClear = new Set();
    let recordSuperado = false;

    document.querySelectorAll('.exercise-locked').forEach(card => {
        if (card.classList.contains('recovery-locked')) return;

        const pInput = card.querySelector('.val-peso');
        if (!pInput) return;

        const exIdx = Number(pInput.dataset.ex);
        const exData = getActiveExercise(idxRutinaVisual, exIdx).activeEx || db.semana[idxRutinaVisual].ejercicios[exIdx];
        const prActual = parseFloat(exData?.record?.peso) || 0;

        const note = getNoteForSlot(idxRutinaVisual, exIdx);
        const notaTxt = note?.text || '';
        const fotoB64 = note?.photo || '';

        card.querySelectorAll('.val-peso').forEach(p => {
            const s = p.dataset.s;
            const r = card.querySelector(`.val-reps[data-ex="${exIdx}"][data-s="${s}"]`).value;

            if (p.value) {
                const pesoIngresado = parseFloat(p.value);
                if (pesoIngresado > prActual && prActual > 0) recordSuperado = true;

                data.push({
                    nombre: exData.nombre,
                    serie: s,
                    peso: p.value,
                    reps: r,
                    nota: notaTxt,
                    foto: fotoB64
                });
                slotsToClear.add(slotKey(idxRutinaVisual, exIdx));
            }
        });
    });

    document.querySelectorAll('.recovery-locked').forEach(card => {
        const recId = card.dataset.recId;
        const recEx = recoveryState.available.find(x => x.id === recId);
        if (!recEx) return;

        card.querySelectorAll('.rec-peso').forEach(p => {
            const s = p.dataset.s;
            const r = card.querySelector(`.rec-reps[data-rec-id="${recId}"][data-s="${s}"]`)?.value || '';

            if (p.value) {
                const extraNote = `Recuperación inteligente de ${recEx.origenDia}${recEx.nota ? ` | ${recEx.nota}` : ''}`;
                data.push({
                    nombre: `${recEx.nombre} [RECUP ${recEx.origenDia}]`,
                    serie: s,
                    peso: p.value,
                    reps: r,
                    nota: extraNote,
                    foto: ''
                });
            }
        });
    });

    if (data.length === 0) return alert("Bloquea los ejercicios realizados.");

    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> GUARDANDO...`;

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ dia: nombreDiaCalendario, ejercicios: data })
        });

        clearNotesForSlots([...slotsToClear]);
        markTodayRecoveryStatus('trained');
        recoveryState = buildRecoveryPlan([]);

        if (recordSuperado) {
            btn.innerHTML = `<i class="fas fa-crown"></i> ¡RÉCORD GUARDADO!`;
            btn.classList.replace('bg-lime-500', 'bg-amber-500');
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, zIndex: 10000 });
        } else {
            btn.innerHTML = `<i class="fas fa-check-double"></i> ¡LISTO!`;
            btn.classList.replace('bg-lime-500', 'bg-emerald-600');
        }

        setTimeout(() => {
            limpiarDespuesDeGuardar();
            renderDia(diaVisualIdx);
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            btn.classList.remove('bg-emerald-600', 'bg-amber-500');
            btn.classList.add('bg-lime-500');
            btn.classList.remove('opacity-80');
        }, 3000);

    } catch (e) {
        btn.innerHTML = `ERROR AL GUARDAR`;
        btn.disabled = false;
    }
}

function limpiarDespuesDeGuardar() {
    document.querySelectorAll('.exercise-locked, .recovery-locked').forEach(card => {
        card.classList.remove('exercise-locked', 'recovery-locked');

        const btnLock = card.querySelector('button[id^="btn-lock-"], button[id^="btn-recovery-lock-"]');
        if (btnLock) btnLock.innerHTML = '<i class="fas fa-lock-open"></i>';
    });

    document.querySelectorAll('.val-peso, .val-reps, .rec-peso, .rec-reps').forEach(input => {
        input.value = "";
    });

    if (typeof cargarHistorial === "function") {
        cargarHistorial();
    }

    alert("Entrenamiento sincronizado correctamente.");
}

function abrirModal() {
    document.getElementById('modalProgreso').classList.add('active');
    initChart();
    cargarHistorial(); // Cargar la tabla al abrir el modal
}

function cerrarModal() { document.getElementById('modalProgreso').classList.remove('active'); }

function initChart() {
    const ctx = document.getElementById('chartProgreso').getContext('2d');
    if (miGrafico) miGrafico.destroy();
    miGrafico = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['L', 'M', 'X', 'J', 'V'],
            datasets: [{ data: [104, 103, 102.5, 102, 101.5], borderColor: '#9AFF00', tension: 0.4, fill: true, backgroundColor: 'rgba(154, 255, 0, 0.06)', pointRadius: 0 }]
        },
        options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
    });
}

function abrirModalReporte() {
    document.getElementById('modalReporte').classList.remove('hidden');
}

function cerrarModalReporte() {
    document.getElementById('modalReporte').classList.add('hidden');
    document.getElementById('motivoInactividad').value = "";
}

async function enviarReporteInactividad() {
    const motivo = document.getElementById('motivoInactividad').value;
    const btn = document.getElementById('btnEnviarReporte');
    const diaActual = db.semana[diaRegistroIdx].dia;

    if (!motivo) return alert("Por favor escribe un motivo.");

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Guardando...`;

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                tipo: "INACTIVIDAD",
                dia: diaActual,
                motivo: motivo
            })
        });

        alert("Nota de inactividad guardada en el historial.");
        cerrarModalReporte();
        location.reload();
    } catch (e) {
        alert("Error al guardar");
        btn.disabled = false;
        btn.innerText = "Guardar Nota";
    }
}

function intercambiarRutina(nuevoIdx) {
    // Al cambiar la rutina, actualizamos el contenido pero mantenemos el día de registro
    // Es decir, si hoy es Lunes pero elijo Martes, se guardará como: "Fecha de hoy, Día: Lunes, Ejercicio: (del martes)"
    diaVisualIdx = parseInt(nuevoIdx);
    syncEnergyModeForCurrentDay();
    recoveryState = buildRecoveryPlan(recoveryState?.selectedDays || []);
    renderNav();
    renderDia(diaVisualIdx);

    // Feedback visual breve
    const selector = document.getElementById('selectorRutina');
    selector.classList.add('animate-pulse', 'border-blue-500');
    setTimeout(() => selector.classList.remove('animate-pulse', 'border-blue-500'), 1000);
}

function toggleResumen() {
    const sidebar = document.getElementById('sidebarResumen');
    const overlay = document.getElementById('overlaySidebar');

    if (sidebar.classList.contains('translate-x-full')) {
        sidebar.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);

        // Llamada a la base de datos
        generarResumenRápido();
    } else {
        sidebar.classList.add('translate-x-full');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

async function generarResumenRápido() {
    const lista = document.getElementById('listaResumen');
    const vacio = document.getElementById('resumenVacio');

    // Feedback visual de carga
    lista.innerHTML = `<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-lime-400"></i><p class="text-[9px] text-gray-500 mt-2 uppercase font-bold">Consultando base de datos...</p></div>`;
    if (vacio) vacio.classList.add('hidden');

    try {
        const response = await fetch(API_URL + "?getTodaySummary=true");
        const data = await response.json();

        if (data.length === 0) {
            lista.innerHTML = "";
            if (vacio) vacio.classList.remove('hidden');
            return;
        }

        // Agrupar por ejercicio ya que el historial viene por series sueltas
        const agrupado = data.reduce((acc, curr) => {
            if (!acc[curr.ejercicio]) acc[curr.ejercicio] = [];
            acc[curr.ejercicio].push(curr);
            return acc;
        }, {});

        lista.innerHTML = ""; // Limpiar spinner

        for (const [ejercicio, series] of Object.entries(agrupado)) {
            let seriesHtml = series.map(s => `
                <div class="flex justify-between items-center text-[10px] bg-white/5 p-2 rounded-lg border border-white/5 mb-1">
                    <span class="text-gray-400 font-bold">Serie ${s.serie}</span>
                    <span class="text-emerald-400 font-black">${s.peso}kg <span class="text-white/30">x</span> ${s.reps}</span>
                </div>
            `).join('');

            lista.innerHTML += `
                <div class="border-b border-white/5 pb-4 mb-4">
                    <p class="text-white text-[11px] font-bold mb-2 uppercase tracking-tighter flex items-center gap-2">
                        <i class="fas fa-history text-lime-400 text-[9px]"></i>
                        ${ejercicio}
                    </p>
                    <div class="pl-4 border-l border-lime-400/20">
                        ${seriesHtml}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        lista.innerHTML = `<p class="text-red-400 text-[10px] text-center">Error al conectar con la base de datos</p>`;
    }
}

// Función para abrir/cerrar el menú de opciones del header
function toggleMenuActions(event) {
    if (event) event.stopPropagation(); // Evita que el clic se propague
    const menu = document.getElementById('menuActions');
    menu.classList.toggle('show');
}

// Cerrar el menú automáticamente si haces clic en cualquier otro lugar de la pantalla
document.addEventListener('click', function(event) {
    const menu = document.getElementById('menuActions');
    const btn = document.getElementById('btnMainActions');
    
    if (menu && !menu.contains(event.target) && !btn.contains(event.target)) {
        menu.classList.remove('show');
    }
});

// Cerrar el menú al hacer scroll para que no flote sobre el contenido
window.addEventListener('scroll', () => {
    const menu = document.getElementById('menuActions');
    if (menu) menu.classList.remove('show');
});

function toggleConversor(event) {
    if (event) event.stopPropagation();
    const popup = document.getElementById('popupConversor');
    popup.classList.toggle('hidden');
    if (!popup.classList.contains('hidden')) {
        document.getElementById('inputVal').focus();
    }
}

function swapConversion() {
    const title = document.getElementById('convTitle');
    const labelIn = document.getElementById('labelInput');
    const labelOut = document.getElementById('labelOutput');
    const input = document.getElementById('inputVal');
    
    if (modoConversion === 'lb-to-kg') {
        modoConversion = 'kg-to-lb';
        title.innerText = "Kilos a Libras";
        labelIn.innerText = "Kilos";
        labelOut.innerText = "Libras (Resultado)";
    } else {
        modoConversion = 'lb-to-kg';
        title.innerText = "Libras a Kilos";
        labelIn.innerText = "Libras";
        labelOut.innerText = "Kilos (Resultado)";
    }
    input.value = "";
    document.getElementById('outputVal').innerText = "0.00";
}

function convertWeight() {
    const val = parseFloat(document.getElementById('inputVal').value) || 0;
    const output = document.getElementById('outputVal');
    
    if (modoConversion === 'lb-to-kg') {
        // 1 Lb = 0.453592 Kg
        output.innerText = (val * 0.453592).toFixed(2);
    } else {
        // 1 Kg = 2.20462 Lb
        output.innerText = (val * 2.20462).toFixed(2);
    }
}

// Cerrar al hacer clic fuera
document.addEventListener('click', (e) => {
    const popup = document.getElementById('popupConversor');
    if (popup && !popup.contains(e.target) && !e.target.closest('button')) {
        popup.classList.add('hidden');
    }
});

init();