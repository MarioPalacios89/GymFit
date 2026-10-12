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


const WARMUP_CHECK_KEY = 'mariofit_warmup_check_v12';
const SELECTED_WEEK_KEY = 'mariofit_selected_week_v12';
const ROUTINE_CACHE_PREFIX = 'mariofit_routine_cache_v12';
const EXERCISE_COLLAPSE_KEY = 'mariofit_exercise_collapse_v12';
let semanaActiva = Number(localStorage.getItem(SELECTED_WEEK_KEY) || 1);
let rutinaSourceMeta = { source: 'init', updatedAt: null, week: semanaActiva };


const LOAD_PLANNER_STEP_KEY = 'mariofit_load_planner_step_v1';
let loadPlannerContext = null; // { dayIdx, exIdx }

let restTimerState = {
    total: 0,
    remaining: 0,
    interval: null,
    paused: false,
    label: ''
};

function parseSeriesRange(value) {
    const nums = String(value ?? '').match(/\d+/g)?.map(Number) || [];
    if (!nums.length) return { min: 0, max: 0 };
    if (nums.length === 1) return { min: nums[0], max: nums[0] };
    return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]) };
}

function buildFallbackWarmupSets(ex = {}) {
    const range = parseSeriesRange(ex.calentamiento_series);
    const templates = {
        1: [['60%', '6-10']],
        2: [['50%', '6-10'], ['70%', '4-6']],
        3: [['45%', '6-10'], ['65%', '4-6'], ['85%', '3-4']],
        4: [['45%', '6-10'], ['60%', '4-6'], ['75%', '3-5'], ['85%', '2-4']]
    };
    const plan = templates[Math.min(range.max, 4)] || [];
    return plan.map(([pct, reps], index) => ({
        set: `C${index + 1}`,
        tipo: 'calentamiento',
        porcentaje_carga: pct,
        repeticiones: reps,
        opcional: index + 1 > range.min
    }));
}

function getExerciseSetPlan(ex = {}) {
    const configured = Array.isArray(ex.sets) ? ex.sets : [];
    let warmups = configured.filter(s => String(s?.tipo || '').toLowerCase() === 'calentamiento');
    let workSets = configured.filter(s => String(s?.tipo || '').toLowerCase() !== 'calentamiento');

    if (!warmups.length) warmups = buildFallbackWarmupSets(ex);
    if (!workSets.length) {
        const amount = Number(ex.series || 0);
        workSets = Array.from({ length: amount }, (_, index) => ({
            set: index + 1,
            tipo: index === amount - 1 ? 'ultima_serie' : 'serie_previa',
            rpe: null
        }));
    }

    return [...warmups, ...workSets];
}

function isWarmupSet(set = {}) {
    return String(set?.tipo || '').toLowerCase() === 'calentamiento';
}

function normalizeSeriesLabel(value, type = '') {
    const raw = String(value ?? '').trim();
    if (String(type).toLowerCase() === 'calentamiento') return raw.toUpperCase().startsWith('C') ? raw.toUpperCase() : `C${raw}`;
    return raw || '1';
}

function parseRpeValues(value) {
    const values = String(value ?? '')
        .replace(',', '.')
        .match(/\d+(?:\.\d+)?/g)
        ?.map(Number)
        .filter(number => Number.isFinite(number) && number >= 0 && number <= 10) || [];

    if (!values.length) return null;

    return {
        min: Math.min(...values),
        max: Math.max(...values)
    };
}

function getReserveRepsMeta(rpeValue) {
    const parsed = parseRpeValues(rpeValue);
    if (!parsed) return null;

    const minReserveRaw = Math.max(0, 10 - parsed.max);
    const maxReserveRaw = Math.max(0, 10 - parsed.min);

    const minReserve = Math.floor(minReserveRaw);
    const maxReserve = Math.ceil(maxReserveRaw);

    let text = '';
    let compact = '';

    if (minReserve === maxReserve) {
        if (minReserve === 0) {
            text = 'Fallo técnico';
            compact = '0 reps más';
        } else if (minReserve === 1) {
            text = '1 repetición limpia más';
            compact = '1 rep más';
        } else {
            text = `${minReserve} repeticiones limpias más`;
            compact = `${minReserve} reps más`;
        }
    } else if (minReserve === 0) {
        text = `0-${maxReserve} repeticiones limpias más`;
        compact = `0-${maxReserve} reps más`;
    } else {
        text = `${minReserve}-${maxReserve} repeticiones limpias más`;
        compact = `${minReserve}-${maxReserve} reps más`;
    }

    let level = 'effort-controlled';
    let icon = 'fa-feather-pointed';

    if (parsed.max >= 10) {
        level = 'effort-failure';
        icon = 'fa-fire-flame-curved';
    } else if (parsed.max >= 9) {
        level = 'effort-hard';
        icon = 'fa-bolt';
    } else if (parsed.max >= 8) {
        level = 'effort-demanding';
        icon = 'fa-gauge-high';
    }

    return {
        text,
        compact,
        level,
        icon,
        minReserve,
        maxReserve
    };
}

function getSetGuidance(set = {}, ex = {}) {
    if (isWarmupSet(set)) {
        const pct = set.porcentaje_carga
            ? `${set.porcentaje_carga} carga`
            : 'Carga progresiva';
        const reps = set.repeticiones || 'sin fatiga';
        const warmupSummary = `${pct} · ${reps} reps${set.opcional ? ' · opcional' : ''}`;

        return {
            text: warmupSummary,
            compact: warmupSummary,
            level: 'effort-warmup',
            icon: 'fa-temperature-arrow-up',
            technique: ''
        };
    }

    const reserveMeta = getReserveRepsMeta(set.rpe);
    const technique = String(set.tecnica || '').trim();

    return {
        text: reserveMeta?.text || (ex.repeticiones ? `Completa ${ex.repeticiones} repeticiones con técnica limpia.` : 'Mantén una técnica controlada.'),
        compact: reserveMeta?.compact || '',
        level: reserveMeta?.level || 'effort-neutral',
        icon: reserveMeta?.icon || 'fa-circle-check',
        technique
    };
}

function renderEffortGuide() {
    return `
        <details class="effort-guide mb-6">
            <summary>
                <span class="effort-guide-summary-icon"><i class="fas fa-gauge-high"></i></span>
                <span class="effort-guide-summary-copy">
                    <strong>Guía rápida de esfuerzo</strong>
                    <small>Lee cada serie según las repeticiones limpias que todavía podrías hacer</small>
                </span>
                <span class="effort-guide-chevron"><i class="fas fa-chevron-down"></i></span>
            </summary>

            <div class="effort-guide-content">
                <div class="effort-guide-grid">
                    <div class="effort-guide-item controlled">
                        <strong>3-4 más</strong>
                        <span>Serie controlada</span>
                    </div>
                    <div class="effort-guide-item demanding">
                        <strong>2 más</strong>
                        <span>Serie exigente</span>
                    </div>
                    <div class="effort-guide-item hard">
                        <strong>1 más</strong>
                        <span>Muy cerca del fallo</span>
                    </div>
                    <div class="effort-guide-item failure">
                        <strong>0 más</strong>
                        <span>Fallo técnico</span>
                    </div>
                </div>

                <p class="effort-guide-note">
                    <i class="fas fa-circle-info"></i>
                    Cuenta únicamente repeticiones con recorrido y técnica correctos. Una repetición con rebote, ayuda o recorrido incompleto no cuenta como disponible.
                </p>
            </div>
        </details>
    `;
}

function updateSetCompletionState(row) {
    if (!row) return false;

    const weightInput = row.querySelector('.val-peso, .rec-peso');
    const repsInput = row.querySelector('.val-reps, .rec-reps');
    const completed = Boolean(weightInput?.value && repsInput?.value);

    row.classList.toggle('set-completed', completed);
    return completed;
}

function updateSessionProgress(root = document) {
    const rows = [...root.querySelectorAll('.exercise-set-row-wrapper.work-set')];
    const completed = rows.filter(updateSetCompletionState).length;
    const total = rows.length;

    root.querySelectorAll('.exercise-set-row-wrapper.warmup-set').forEach(updateSetCompletionState);

    const text = root.querySelector('#sessionProgressText');
    const bar = root.querySelector('#sessionProgressBar');

    if (text) text.textContent = `${completed}/${total}`;
    if (bar) bar.style.width = total ? `${Math.round((completed / total) * 100)}%` : '0%';
}

function initializeWorkoutUx(root) {
    if (!root) return;

    if (!root.dataset.workoutUxBound) {
        root.addEventListener('input', (event) => {
            if (!event.target.matches('.val-peso, .val-reps, .rec-peso, .rec-reps')) return;

            updateSetCompletionState(event.target.closest('.exercise-set-row-wrapper'));
            updateSessionProgress(root);
        });

        root.dataset.workoutUxBound = 'true';
    }

    requestAnimationFrame(() => {
        updateSessionProgress(root);
        root.classList.remove('routine-enter');
        void root.offsetWidth;
        root.classList.add('routine-enter');
    });
}


function parsePercentageValue(value) {
    const match = String(value ?? '').replace(',', '.').match(/\d+(?:\.\d+)?/);
    const number = match ? Number(match[0]) : NaN;
    return Number.isFinite(number) ? number : null;
}

function roundLoadToStep(value, step = 2.5) {
    const safeValue = Number(value);
    const safeStep = Number(step);

    if (!Number.isFinite(safeValue) || safeValue <= 0) return 0;
    if (!Number.isFinite(safeStep) || safeStep <= 0) return Number(safeValue.toFixed(2));

    return Number((Math.round(safeValue / safeStep) * safeStep).toFixed(2));
}

function formatPlannerWeight(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '0';
    return Number.isInteger(number)
        ? String(number)
        : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function getPlannerStep() {
    const saved = Number(localStorage.getItem(LOAD_PLANNER_STEP_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : 2.5;
}

function getPlannerExercise() {
    if (!loadPlannerContext) return null;

    const { dayIdx, exIdx } = loadPlannerContext;
    return getActiveExercise(dayIdx, exIdx)?.activeEx
        || db?.semana?.[dayIdx]?.ejercicios?.[exIdx]
        || null;
}

function getExistingWorkWeight(dayIdx, exIdx) {
    const card = document.getElementById(`card-${exIdx}`);
    if (!card || Number(card.dataset.day) !== Number(dayIdx)) return null;

    const inputs = [...card.querySelectorAll('.val-peso[data-set-type="trabajo"]')];
    const value = inputs
        .map(input => Number(input.value))
        .find(number => Number.isFinite(number) && number > 0);

    return value || null;
}

function getSuggestedPlannerWeight(dayIdx, exIdx, exercise = {}) {
    const existing = getExistingWorkWeight(dayIdx, exIdx);
    if (existing) return existing;

    const advisorStart = Number(exercise?.advisor?.start_kg);
    if (Number.isFinite(advisorStart) && advisorStart > 0) return advisorStart;

    const record = getExerciseRecordMeta(exercise);
    if (record?.weight) return record.weight;

    return '';
}

function buildLoadPlan(exercise = {}, workWeight, step) {
    const target = Number(workWeight);
    if (!Number.isFinite(target) || target <= 0) return [];

    return getExerciseSetPlan(exercise).map((set, index) => {
        const warmup = isWarmupSet(set);
        const label = normalizeSeriesLabel(
            set.set ?? index + 1,
            warmup ? 'calentamiento' : 'trabajo'
        );

        if (!warmup) {
            return {
                label,
                type: 'work',
                phase: set.tipo === 'ultima_serie' ? 'Última efectiva' : 'Serie efectiva',
                percentage: 100,
                rawWeight: target,
                weight: roundLoadToStep(target, step),
                reps: exercise.repeticiones || '',
                optional: false,
                reserve: getReserveRepsMeta(set.rpe)?.compact || ''
            };
        }

        const percentage = parsePercentageValue(set.porcentaje_carga);
        const effectivePercentage = percentage ?? 50;
        const rawWeight = target * (effectivePercentage / 100);

        return {
            label,
            type: 'warmup',
            phase: set.opcional ? 'Aproximación opcional' : 'Aproximación',
            percentage: effectivePercentage,
            rawWeight,
            weight: roundLoadToStep(rawWeight, step),
            reps: set.repeticiones || '',
            optional: !!set.opcional,
            reserve: ''
        };
    });
}

function renderLoadPlanPreview(plan = []) {
    const preview = document.getElementById('lp-preview');
    const applyButton = document.getElementById('lp-apply');
    if (!preview || !applyButton) return;

    if (!plan.length) {
        preview.innerHTML = `
            <div class="load-planner-empty">
                <i class="fas fa-scale-balanced"></i>
                <strong>Ingresa un peso efectivo</strong>
                <span>Verás aquí la distribución de todas las series.</span>
            </div>
        `;
        applyButton.disabled = true;
        return;
    }

    applyButton.disabled = false;

    preview.innerHTML = `
        <div class="load-planner-summary">
            <span>Distribución sugerida</span>
            <strong>${plan.length} series</strong>
        </div>

        <div class="load-planner-list">
            ${plan.map(item => `
                <div class="load-plan-row ${item.type === 'work' ? 'work' : 'warmup'} ${item.optional ? 'optional' : ''}">
                    <div class="load-plan-index">
                        <strong>${item.label}</strong>
                        <small>${item.type === 'work' ? 'SET' : 'CAL'}</small>
                    </div>

                    <div class="load-plan-copy">
                        <strong>${item.phase}</strong>
                        <span>
                            ${item.type === 'warmup'
                                ? `${item.percentage}% del peso efectivo${item.reps ? ` · ${item.reps} reps` : ''}`
                                : `${item.reps ? `${item.reps} reps` : 'Rango efectivo'}${item.reserve ? ` · ${item.reserve}` : ''}`
                            }
                        </span>
                    </div>

                    <div class="load-plan-weight">
                        <strong>${formatPlannerWeight(item.weight)}</strong>
                        <span>kg</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function abrirPlanificadorCargas(dayIdx, exIdx) {
    const exercise = getActiveExercise(dayIdx, exIdx)?.activeEx
        || db?.semana?.[dayIdx]?.ejercicios?.[exIdx];

    if (!exercise) return;

    loadPlannerContext = { dayIdx, exIdx };

    const modal = document.getElementById('modalLoadPlanner');
    const title = document.getElementById('lp-title');
    const weightInput = document.getElementById('lp-work-weight');
    const stepSelect = document.getElementById('lp-step');
    const overwrite = document.getElementById('lp-overwrite');
    const recordReference = document.getElementById('lp-record-reference');

    if (!modal || !title || !weightInput || !stepSelect || !overwrite || !recordReference) return;

    title.textContent = exercise.nombre || 'Ejercicio';
    weightInput.value = getSuggestedPlannerWeight(dayIdx, exIdx, exercise);
    stepSelect.value = String(getPlannerStep());
    overwrite.checked = false;

    const recordReferenceHtml = renderPlannerRecordReference(exercise);
    recordReference.innerHTML = recordReferenceHtml;
    recordReference.classList.toggle('hidden', !recordReferenceHtml);

    actualizarVistaPlanificador();
    modal.classList.remove('hidden');

    requestAnimationFrame(() => {
        weightInput.focus();
        weightInput.select();
    });
}

function cerrarPlanificadorCargas() {
    document.getElementById('modalLoadPlanner')?.classList.add('hidden');
    loadPlannerContext = null;
}

function actualizarVistaPlanificador() {
    const exercise = getPlannerExercise();
    const weight = Number(document.getElementById('lp-work-weight')?.value);
    const step = Number(document.getElementById('lp-step')?.value) || 2.5;

    try {
        localStorage.setItem(LOAD_PLANNER_STEP_KEY, String(step));
    } catch { /* ignore */ }

    renderLoadPlanPreview(buildLoadPlan(exercise || {}, weight, step));
}

function aplicarPlanificadorCargas() {
    if (!loadPlannerContext) return;

    const { dayIdx, exIdx } = loadPlannerContext;
    const exercise = getPlannerExercise();
    const weight = Number(document.getElementById('lp-work-weight')?.value);
    const step = Number(document.getElementById('lp-step')?.value) || 2.5;
    const overwrite = !!document.getElementById('lp-overwrite')?.checked;
    const plan = buildLoadPlan(exercise || {}, weight, step);

    if (!plan.length) return;

    const card = document.getElementById(`card-${exIdx}`);
    if (!card || Number(card.dataset.day) !== Number(dayIdx)) {
        alert('El ejercicio visible cambió. Abre nuevamente el planificador.');
        cerrarPlanificadorCargas();
        return;
    }

    let applied = 0;
    let skipped = 0;

    plan.forEach(item => {
        const input = [...card.querySelectorAll('.val-peso')]
            .find(field => String(field.dataset.s) === String(item.label));

        if (!input) return;

        const hasValue = String(input.value || '').trim() !== '';
        if (hasValue && !overwrite) {
            skipped += 1;
            return;
        }

        input.value = formatPlannerWeight(item.weight);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        applied += 1;
    });

    updateSessionProgress(document.getElementById('mainContent'));

    const plannerButton = card.querySelector('.load-planner-inline-btn');
    if (plannerButton) {
        plannerButton.classList.add('applied');
        plannerButton.innerHTML = `
            <i class="fas fa-check"></i>
            <span>Pesos aplicados</span>
        `;
        setTimeout(() => {
            plannerButton.classList.remove('applied');
            plannerButton.innerHTML = `
                <i class="fas fa-scale-balanced"></i>
                <span>Planificar cargas</span>
            `;
        }, 1800);
    }

    cerrarPlanificadorCargas();

    if (skipped > 0) {
        console.info(`Planificador: ${applied} pesos aplicados y ${skipped} conservados.`);
    }
}

function getWarmupStateKey(day = {}) {
    const date = new Date();
    const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return `${db?.version || 'routine'}__${day?.dia || 'dia'}__${ymd}`;
}

function loadWarmupChecks(day = {}) {
    try {
        const all = JSON.parse(localStorage.getItem(WARMUP_CHECK_KEY) || '{}');
        return Array.isArray(all[getWarmupStateKey(day)]) ? all[getWarmupStateKey(day)] : [];
    } catch { return []; }
}

function saveWarmupChecks(day = {}, checks = []) {
    try {
        const all = JSON.parse(localStorage.getItem(WARMUP_CHECK_KEY) || '{}');
        all[getWarmupStateKey(day)] = checks;
        localStorage.setItem(WARMUP_CHECK_KEY, JSON.stringify(all));
    } catch { /* ignore */ }
}

function toggleWarmupCheck(index) {
    const day = db?.semana?.[diaVisualIdx];
    const checks = loadWarmupChecks(day);
    checks[index] = !checks[index];
    saveWarmupChecks(day, checks);
    renderDia(diaVisualIdx);
}

function setAllWarmupChecks(value) {
    const day = db?.semana?.[diaVisualIdx];
    const items = Array.isArray(db?.calentamiento) ? db.calentamiento : [];
    saveWarmupChecks(day, items.map(() => !!value));
    renderDia(diaVisualIdx);
}

function renderWarmupBlock(day = {}) {
    const items = Array.isArray(db?.calentamiento) ? db.calentamiento : [];
    if (!items.length) return '';
    const checks = loadWarmupChecks(day);
    const completed = items.filter((_, index) => !!checks[index]).length;
    const pct = Math.round((completed / items.length) * 100);

    return `
        <section class="warmup-panel mb-6">
            <div class="warmup-panel-head">
                <div class="warmup-heading">
                    <div class="warmup-icon"><i class="fas fa-fire-flame-curved"></i></div>
                    <div>
                        <p class="warmup-kicker">PREPARACIÓN</p>
                        <h3>Bloque de calentamiento</h3>
                        <p>${completed}/${items.length} completados · ${pct}%</p>
                    </div>
                </div>
                <button class="warmup-reset" onclick="setAllWarmupChecks(${completed !== items.length})">${completed === items.length ? 'Reiniciar' : 'Marcar todo'}</button>
            </div>
            <div class="warmup-progress"><span style="width:${pct}%"></span></div>
            <div class="warmup-list">
                ${items.map((item, index) => `
                    <button type="button" class="warmup-item ${checks[index] ? 'done' : ''}" onclick="toggleWarmupCheck(${index})">
                        <span class="warmup-check"><i class="fas ${checks[index] ? 'fa-check' : 'fa-circle'}"></i></span>
                        <span class="warmup-copy"><strong>${item.nombre}</strong><small>${item.reps || ''}</small></span>
                    </button>
                `).join('')}
            </div>
        </section>
    `;
}

function parseRestSeconds(value) {
    const text = String(value || '').toLowerCase();
    const nums = text.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
    if (!nums.length) return 90;
    const base = nums[0];
    if (text.includes('min')) return Math.round(base * 60);
    return Math.round(base);
}

function formatTimer(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const min = Math.floor(safe / 60);
    const sec = safe % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updateRestTimerUi() {
    const panel = document.getElementById('restTimerPanel');
    const value = document.getElementById('restTimerValue');
    const label = document.getElementById('restTimerLabel');
    const pause = document.getElementById('restTimerPause');
    if (!panel || !value || !label || !pause) return;
    value.textContent = formatTimer(restTimerState.remaining);
    label.textContent = restTimerState.label || 'Descanso entre series';
    pause.innerHTML = `<i class="fas ${restTimerState.paused ? 'fa-play' : 'fa-pause'}"></i>`;
    panel.classList.toggle('timer-finished', restTimerState.remaining <= 0);
}

function runRestTimer() {
    clearInterval(restTimerState.interval);
    restTimerState.interval = setInterval(() => {
        if (restTimerState.paused) return;
        restTimerState.remaining -= 1;
        updateRestTimerUi();
        if (restTimerState.remaining <= 0) {
            clearInterval(restTimerState.interval);
            restTimerState.interval = null;
            try { navigator.vibrate?.([180, 90, 180]); } catch { }
        }
    }, 1000);
}

function startRestTimerForExercise(exIdx) {
    const ex = getActiveExercise(diaVisualIdx, exIdx)?.activeEx || db?.semana?.[diaVisualIdx]?.ejercicios?.[exIdx];
    if (!ex) return;
    const seconds = parseRestSeconds(ex.descanso);
    restTimerState.total = seconds;
    restTimerState.remaining = seconds;
    restTimerState.paused = false;
    restTimerState.label = `${ex.nombre} · ${ex.descanso || 'descanso'}`;
    document.getElementById('restTimerPanel')?.classList.remove('hidden');
    updateRestTimerUi();
    runRestTimer();
}

function toggleRestTimerPause() {
    if (!restTimerState.remaining) return;
    restTimerState.paused = !restTimerState.paused;
    updateRestTimerUi();
}

function addRestTime(seconds = 30) {
    restTimerState.remaining += Number(seconds) || 0;
    document.getElementById('restTimerPanel')?.classList.remove('hidden');
    updateRestTimerUi();
    if (!restTimerState.interval) runRestTimer();
}

function stopRestTimer() {
    clearInterval(restTimerState.interval);
    restTimerState = { total: 0, remaining: 0, interval: null, paused: false, label: '' };
    document.getElementById('restTimerPanel')?.classList.add('hidden');
}

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


function parseRecordDateValue(value) {
    if (value === null || value === undefined || value === '') return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        const numericDate = new Date(value);
        return Number.isNaN(numericDate.getTime()) ? null : numericDate;
    }

    const raw = String(value).trim();
    if (!raw) return null;

    // Evita el cambio de día que puede producir Date al interpretar YYYY-MM-DD como UTC.
    const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
    if (ymd) {
        const [, year, month, day] = ymd;
        const localDate = new Date(Number(year), Number(month) - 1, Number(day));
        return Number.isNaN(localDate.getTime()) ? null : localDate;
    }

    const dmy = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if (dmy) {
        let [, day, month, year] = dmy;
        if (year.length === 2) year = `20${year}`;
        const localDate = new Date(Number(year), Number(month) - 1, Number(day));
        return Number.isNaN(localDate.getTime()) ? null : localDate;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRecordDate(value) {
    const date = parseRecordDateValue(value);
    if (!date) return '';

    return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    })
        .format(date)
        .replace(/\./g, '')
        .replace(/ de /g, ' ');
}

function getExerciseRecordMeta(exercise = {}) {
    const record = exercise?.record || exercise?.ultimo_record || exercise?.last_record || {};

    const weightCandidates = [
        record?.peso,
        record?.weight,
        record?.kg,
        record?.top_set_kg,
        exercise?.record_peso,
        exercise?.ultimo_peso,
        exercise?.last_weight
    ];

    const weight = weightCandidates
        .map(Number)
        .find(value => Number.isFinite(value) && value > 0);

    if (!weight) return null;

    const dateCandidates = [
        record?.fecha,
        record?.date,
        record?.fecha_record,
        record?.record_date,
        record?.fecha_logro,
        record?.achieved_at,
        record?.updatedAt,
        record?.updated_at,
        record?.createdAt,
        record?.created_at,
        exercise?.record_fecha,
        exercise?.fecha_record,
        exercise?.ultimo_record_fecha,
        exercise?.last_record_date,
        exercise?.advisor?.top_set_date
    ];

    const rawDate = dateCandidates.find(value => value !== null && value !== undefined && String(value).trim() !== '');
    const formattedDate = formatRecordDate(rawDate);

    return {
        weight,
        date: formattedDate,
        rawDate: rawDate || '',
        reps: record?.reps || record?.repeticiones || ''
    };
}

function renderRecordGuideTag(exercise = {}) {
    const record = getExerciseRecordMeta(exercise);
    if (!record) return '';

    const repsText = record.reps ? ` · ${record.reps} reps` : '';
    const dateText = record.date || 'fecha no disponible';

    return `
        <div class="record-guide-tag" title="Último peso récord registrado">
            <i class="fas fa-trophy"></i>
            <span class="record-guide-label">Último récord</span>
            <strong>${formatKg(record.weight)} kg${repsText}</strong>
            <span class="record-guide-date">
                <i class="far fa-calendar"></i>
                ${dateText}
            </span>
        </div>
    `;
}

function renderPlannerRecordReference(exercise = {}) {
    const record = getExerciseRecordMeta(exercise);
    if (!record) return '';

    return `
        <i class="fas fa-trophy"></i>
        <span>
            <small>Último récord</small>
            <strong>${formatKg(record.weight)} kg</strong>
        </span>
        <span class="load-planner-record-date">
            <i class="far fa-calendar"></i>
            ${record.date || 'fecha no disponible'}
        </span>
    `;
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
    document.querySelectorAll(`.val-peso[data-ex="${exIdx}"][data-set-type="trabajo"]`).forEach((input) => {
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
    const effectiveTotal = (day?.ejercicios || [])
        .reduce((acc, ex) => acc + getExerciseSetPlan(ex).filter(set => !isWarmupSet(set)).length, 0);
    const warmupTotal = (day?.ejercicios || [])
        .reduce((acc, ex) => acc + getExerciseSetPlan(ex).filter(isWarmupSet).length, 0);

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
                    <p class="hero-sub">${(day?.ejercicios || []).length} ejercicios · ${effectiveTotal} efectivas · ${warmupTotal} aproximación</p>
                </div>
            </div>

            <div class="session-progress mt-4">
                <div class="session-progress-head">
                    <span>Series efectivas registradas</span>
                    <strong id="sessionProgressText">0/${effectiveTotal}</strong>
                </div>
                <div class="session-progress-track">
                    <span id="sessionProgressBar"></span>
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

function getAlternativeName(alternative) {
    if (typeof alternative === 'string') return alternative;
    return alternative?.nombre || alternative?.name || '';
}

function getActiveExercise(dayIdx, exIdx) {
    const baseEx = db?.semana?.[dayIdx]?.ejercicios?.[exIdx];
    const alts = getAlternativesFor(baseEx);
    const state = loadAlt();
    const key = slotKey(dayIdx, exIdx);
    const selectedName = state?.[key] || null;

    if (!baseEx) return { baseEx: null, activeEx: null, isAlt: false, alts: [] };
    if (!alts?.length || !selectedName || selectedName === '__BASE__') {
        return { baseEx, activeEx: baseEx, isAlt: false, alts };
    }

    const found = alts.find(a => getAlternativeName(a) === selectedName);
    if (!found) return { baseEx, activeEx: baseEx, isAlt: false, alts };

    const activeEx = typeof found === 'string'
        ? { ...baseEx, nombre: found }
        : { ...baseEx, ...found, nombre: getAlternativeName(found) };

    return { baseEx, activeEx, isAlt: true, alts };
}

function getRoutineCacheKey(week = semanaActiva) {
    return `${ROUTINE_CACHE_PREFIX}__week_${Number(week) || 1}`;
}

function readRoutineCache(week = semanaActiva) {
    try {
        const raw = localStorage.getItem(getRoutineCacheKey(week));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.db?.semana?.length) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeRoutineCache(week = semanaActiva, routineDb) {
    if (!routineDb?.semana?.length) return null;
    const payload = {
        week: Number(week) || 1,
        updatedAt: new Date().toISOString(),
        version: routineDb.version || '',
        db: routineDb
    };
    try {
        localStorage.setItem(getRoutineCacheKey(week), JSON.stringify(payload));
    } catch (error) {
        console.warn('No se pudo guardar la rutina en localStorage:', error);
    }
    return payload;
}

function formatCacheDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date).replace(/\./g, '');
}

async function fetchRoutineFromApi(week = semanaActiva) {
    const params = new URLSearchParams({
        getRoutine: 'true',
        week: String(week),
        t: String(Date.now())
    });

    const res = await fetch(`${API_URL}?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store'
    });

    if (!res.ok) {
        throw new Error(`Error HTTP ${res.status} al cargar la rutina desde el API.`);
    }

    const apiDb = await res.json();

    if (!apiDb?.semana?.length) {
        throw new Error('El API respondió, pero no devolvió una rutina válida.');
    }

    return apiDb;
}

async function loadRoutineDb(week = semanaActiva, options = {}) {
    const force = !!options.force;
    const cached = readRoutineCache(week);

    if (!force && cached?.db) {
        rutinaSourceMeta = {
            source: 'localStorage',
            updatedAt: cached.updatedAt || null,
            week: Number(week) || 1,
            version: cached.version || cached.db?.version || ''
        };
        return cached.db;
    }

    try {
        const apiDb = await fetchRoutineFromApi(week);
        const saved = writeRoutineCache(week, apiDb);
        rutinaSourceMeta = {
            source: force ? 'forced_api' : 'api',
            updatedAt: saved?.updatedAt || new Date().toISOString(),
            week: Number(week) || 1,
            version: apiDb.version || ''
        };
        return apiDb;
    } catch (error) {
        if (cached?.db) {
            console.warn('API no disponible, usando rutina local:', error);
            rutinaSourceMeta = {
                source: 'localStorage_fallback',
                updatedAt: cached.updatedAt || null,
                week: Number(week) || 1,
                version: cached.version || cached.db?.version || ''
            };
            return cached.db;
        }
        throw error;
    }
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
        btn.classList.add('locked');
        btn.innerHTML = '<i class="fas fa-lock"></i>';
    } else {
        card.classList.remove('recovery-locked', 'exercise-locked');
        btn.classList.remove('locked');
        btn.innerHTML = '<i class="fas fa-lock-open"></i>';
    }

    updateSaveSelectionSummary();
}

function renderRecoveryBanner() {
    if (!getRecoveryConfig()?.enabled) return '';
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

function populateWeekSelector() {
    const selector = document.getElementById('selectorSemana');
    if (!selector) return;
    selector.innerHTML = Array.from({ length: 12 }, (_, index) => {
        const week = index + 1;
        return `<option value="${week}" ${week === semanaActiva ? 'selected' : ''}>Semana ${week}</option>`;
    }).join('');
}

function initializeRoutineUi() {
    const hoyNombre = diasSemana[new Date().getDay()];
    document.getElementById('label-hoy').innerText = hoyNombre;
    const objetivo = db?.perfil?.objetivo || 'Programa de entrenamiento';
    const cacheLabel = rutinaSourceMeta?.updatedAt
        ? ` · ${rutinaSourceMeta.source === 'localStorage' || rutinaSourceMeta.source === 'localStorage_fallback' ? 'local' : 'api'} ${formatCacheDate(rutinaSourceMeta.updatedAt)}`
        : '';
    document.getElementById('sub-meta').innerText = `${db?.version || `Semana ${semanaActiva}`} · ${objetivo}${cacheLabel}`.replace(/_/g, ' ');

    const selector = document.getElementById('selectorRutina');
    selector.innerHTML = db.semana.map((d, i) =>
        `<option value="${i}" ${d.dia === hoyNombre ? 'selected' : ''}>${d.dia} · ${d.enfoque || 'Rutina'}</option>`
    ).join('');

    diaRegistroIdx = db.semana.findIndex(d => d.dia === hoyNombre);
    if (diaRegistroIdx === -1) diaRegistroIdx = 0;
    diaVisualIdx = diaRegistroIdx;
    selector.value = String(diaVisualIdx);
    syncEnergyModeForCurrentDay();
    recoveryState = buildRecoveryPlan([]);
    renderNav();
    renderDia(diaVisualIdx);
}

async function init() {
    const loader = document.getElementById('loading-screen');
    try {
        populateWeekSelector();
        db = await loadRoutineDb(semanaActiva);
        const parsedWeek = Number(String(db?.version || '').match(/week_(\d+)/i)?.[1]);
        if (parsedWeek) semanaActiva = parsedWeek;
        populateWeekSelector();
        initializeRoutineUi();

        setTimeout(() => loader.classList.add('hidden-load'), 500);
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

function getSeriesSortValue(value) {
    const raw = String(value ?? '').trim().toUpperCase();
    const number = Number(raw.replace(/[^0-9.]/g, '')) || 0;
    return raw.startsWith('C') ? number - 100 : number;
}

function compareSeriesLabels(a, b) {
    return getSeriesSortValue(a?.serie) - getSeriesSortValue(b?.serie);
}

function formatSeriesDisplay(value) {
    const raw = String(value ?? '').trim().toUpperCase();
    return raw.startsWith('C') ? raw : `S${raw}`;
}

function formatSeriesLong(value) {
    const raw = String(value ?? '').trim().toUpperCase();
    return raw.startsWith('C') ? `Calentamiento ${raw.substring(1)}` : `Serie ${raw}`;
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
            const series = ejercicios[nombreEx].sort(compareSeriesLabels);
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
                                            <span class="tag-label">${formatSeriesDisplay(s.serie)}</span>
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


function getCollapseScopeKey(dayIdx = diaVisualIdx) {
    const version = String(db?.version || `week_${semanaActiva}`).replace(/\s+/g, '_');
    const dayName = db?.semana?.[dayIdx]?.dia || `day_${dayIdx}`;
    return `${version}__${dayName}__${dayIdx}`;
}

function loadExerciseCollapseState() {
    try { return JSON.parse(localStorage.getItem(EXERCISE_COLLAPSE_KEY) || '{}'); }
    catch { return {}; }
}

function saveExerciseCollapseState(state) {
    try { localStorage.setItem(EXERCISE_COLLAPSE_KEY, JSON.stringify(state)); }
    catch { /* ignore */ }
}

function isExerciseCollapsed(dayIdx, exIdx) {
    const state = loadExerciseCollapseState();
    const scope = getCollapseScopeKey(dayIdx);
    if (state?.[scope] && Object.prototype.hasOwnProperty.call(state[scope], String(exIdx))) {
        return !!state[scope][String(exIdx)];
    }
    // Por defecto dejamos abierto el primer ejercicio y colapsado el resto para reducir ruido visual.
    return Number(exIdx) !== 0;
}

function setExerciseCollapsed(dayIdx, exIdx, collapsed) {
    const state = loadExerciseCollapseState();
    const scope = getCollapseScopeKey(dayIdx);
    if (!state[scope]) state[scope] = {};
    state[scope][String(exIdx)] = !!collapsed;
    saveExerciseCollapseState(state);
}

function toggleExerciseCollapse(event, dayIdx, exIdx, explicitValue = null) {
    if (event) event.stopPropagation();
    const card = document.getElementById(`card-${exIdx}`);
    if (!card) return;

    const nextCollapsed = typeof explicitValue === 'boolean'
        ? explicitValue
        : !card.classList.contains('collapsed');

    card.classList.toggle('collapsed', nextCollapsed);
    setExerciseCollapsed(dayIdx, exIdx, nextCollapsed);

    const btn = document.getElementById(`btn-collapse-${dayIdx}-${exIdx}`);
    if (btn) {
        btn.setAttribute('aria-expanded', nextCollapsed ? 'false' : 'true');
        btn.title = nextCollapsed ? 'Expandir ejercicio' : 'Colapsar ejercicio';
        btn.innerHTML = `<i class="fas ${nextCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>`;
    }

    if (!nextCollapsed) {
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
    }
}

function setAllExerciseCollapse(dayIdx, collapsed) {
    const exercises = db?.semana?.[dayIdx]?.ejercicios || [];
    exercises.forEach((_, exIdx) => setExerciseCollapsed(dayIdx, exIdx, collapsed));
    renderDia(dayIdx);
}

function renderExerciseCollapseControls(dayIdx) {
    return `
        <div class="exercise-view-toolbar">
            <div>
                <strong>Vista compacta</strong>
                <span>Expande solo el ejercicio que vas a trabajar ahora.</span>
            </div>
            <div class="exercise-view-actions">
                <button type="button" onclick="setAllExerciseCollapse(${dayIdx}, false)">
                    <i class="fas fa-up-right-and-down-left-from-center"></i> Abrir
                </button>
                <button type="button" onclick="setAllExerciseCollapse(${dayIdx}, true)">
                    <i class="fas fa-down-left-and-up-right-to-center"></i> Colapsar
                </button>
            </div>
        </div>
    `;
}

function renderDia(idx) {
    const container = document.getElementById('mainContent');
    const dia = db.semana[idx];
    syncEnergyModeForCurrentDay();

    let html = `
        <div class="routine-divider">
            <span>Rutina del día</span>
        </div>
    `;

    if (!(dia.ejercicios || []).length) {
        html += `
            <section class="rest-day-panel">
                <div class="rest-day-icon"><i class="fas fa-moon"></i></div>
                <p class="rest-day-kicker">RECUPERACIÓN</p>
                <h2>${dia.dia}: día de descanso</h2>
                <p>Prioriza sueño, hidratación y movilidad suave. No necesitas completar el bloque de calentamiento ni registrar series.</p>
            </section>
        `;
        container.innerHTML = html;
        return;
    }

    html += renderEnergyPanel(dia);
    html += renderEffortGuide();
    html += renderWarmupBlock(dia);
    html += renderRecoveryBanner();
    html += renderExerciseCollapseControls(idx);

    html += (dia.ejercicios || []).map((ex, i) => {
        const v = getActiveExercise(idx, i);
        const active = v.activeEx || ex;
        const userNote = getNoteForSlot(idx, i);
        const hasUserNote = !!(userNote && ((userNote.text && userNote.text.trim()) || userNote.photo));
        const isAlt = v.isAlt;
        const setPlan = getExerciseSetPlan(active);

        const rows = setPlan.map((set, setIndex) => {
            const warmup = isWarmupSet(set);
            const setLabel = normalizeSeriesLabel(set.set ?? setIndex + 1, warmup ? 'calentamiento' : 'trabajo');
            const guidance = getSetGuidance(set, active);
            const workType = warmup ? 'calentamiento' : 'trabajo';
            return `
                <div class="exercise-set-row-wrapper ${warmup ? 'warmup-set' : 'work-set'} ${set.opcional ? 'optional-set' : ''}" style="--set-order:${setIndex}">
                    <div class="exercise-set-row">
                        <div class="series-index">
                            <strong>${setLabel}</strong>
                            <small>${warmup ? 'CAL' : 'SET'}</small>
                        </div>
                        <div class="set-input-field"><span>KG</span><input type="number" inputmode="decimal" placeholder="0" class="val-peso" data-ex="${i}" data-s="${setLabel}" data-set-type="${workType}"></div>
                        <div class="set-input-field"><span>REPS</span><input type="number" inputmode="numeric" placeholder="0" class="val-reps" data-ex="${i}" data-s="${setLabel}" data-set-type="${workType}"></div>
                        <button type="button" onclick="startRestTimerForExercise(${i})" class="set-timer-btn" aria-label="Iniciar descanso de ${active.descanso || '90 segundos'}"><i class="fas fa-stopwatch"></i></button>
                    </div>
                    <div class="set-guidance minimal ${guidance.level}">
                        <div class="set-meta-line">
                            <span class="set-kind">${warmup ? 'Aproximación' : (set.tipo === 'ultima_serie' ? 'Última serie' : 'Serie efectiva')}</span>
                            <span class="set-guidance-main">
                                <i class="fas ${guidance.icon}"></i>
                                ${guidance.compact || guidance.text}
                            </span>
                        </div>
                        ${guidance.technique ? `<span class="technique-chip"><i class="fas fa-wand-magic-sparkles"></i> ${guidance.technique}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        const energyMeta = getEnergyMeta(active);
        const accentClass = getExerciseAccentClass(active);
        const iconClass = getExerciseIconClass(active);
        const groupChips = getGroupChips(active);
        const effectiveCount = setPlan.filter(set => !isWarmupSet(set)).length;
        const warmupCount = setPlan.filter(isWarmupSet).length;
        const collapsed = isExerciseCollapsed(idx, i);
        const objectiveText = active.repeticiones || (active.duracion_segundos ? `${active.duracion_segundos}s` : 'Objetivo libre');
        const primaryGroup = formatGroupName(getPrimaryGroup(active));

        return `
            <div class="card exercise-card p-6 relative ${accentClass} ${energyMeta.card || ''} ${collapsed ? 'collapsed' : ''}" style="--card-order:${i}" id="card-${i}" data-day="${idx}" data-ex="${i}" data-save-selected="false" data-ex-name="${String(active.nombre || ex.nombre || '').replace(/"/g, '&quot;')}">
                <div class="exercise-card-head mb-2">
                    <div class="exercise-card-main">
                        <button onclick="toggleLock(${i})" id="btn-lock-${i}" class="exercise-lock-btn w-12 h-12 rounded-2xl" aria-label="Bloquear ejercicio completado">
                            <i class="fas fa-lock-open"></i>
                        </button>
                        <div class="exercise-icon-bubble ${accentClass}"><i class="fas ${iconClass}"></i></div>
                        <div class="exercise-card-content min-w-0 flex-1">
                            <h3 class="exercise-name">${active.nombre}</h3>
                            <div class="exercise-compact-line">
                                <span>${objectiveText}</span>
                                <span>${warmupCount} CAL + ${effectiveCount} SET</span>
                                <span>${primaryGroup}</span>
                            </div>
                        </div>
                    </div>
                    <div class="exercise-card-actions ml-2 shrink-0">
                        <button onclick="toggleExerciseCollapse(event, ${idx}, ${i})" id="btn-collapse-${idx}-${i}" class="exercise-collapse-btn" aria-label="Expandir o colapsar ejercicio" aria-expanded="${collapsed ? 'false' : 'true'}" title="${collapsed ? 'Expandir ejercicio' : 'Colapsar ejercicio'}">
                            <i class="fas ${collapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
                        </button>
                        <button onclick="abrirAcciones(${idx}, ${i})" class="exercise-menu-btn" aria-label="Acciones"><i class="fas fa-ellipsis-v"></i></button>
                    </div>
                </div>

                <div class="exercise-collapsed-preview" onclick="toggleExerciseCollapse(event, ${idx}, ${i}, false)">
                    <span><i class="fas ${iconClass}"></i> ${objectiveText}</span>
                    <span><i class="fas fa-layer-group"></i> ${warmupCount} CAL + ${effectiveCount} SET</span>
                    ${active.descanso ? `<span><i class="fas fa-clock"></i> ${active.descanso}</span>` : ''}
                </div>

                <div class="exercise-collapsible-content" id="exercise-body-${idx}-${i}">
                    <div class="exercise-save-state" id="save-state-${i}" aria-live="polite">
                        <span class="exercise-save-state-icon"><i class="fas fa-shield-check"></i></span>
                        <span class="exercise-save-state-copy">
                            <strong>Seleccionado para guardar</strong>
                            <small id="save-state-detail-${i}">Se incluirán las series con peso registrado</small>
                        </span>
                    </div>

                    <div class="exercise-meta-section">
                        <div class="exercise-badges-row">
                            ${renderRecordGuideTag(active)}
                            ${isAlt ? `<div class="ex-badge ex-badge--alt">ALT</div>` : ''}
                            ${active.rol ? `<div class="ex-badge ${active.rol === 'ancla' ? 'ex-badge--ancla' : 'ex-badge--base'}">${active.rol}</div>` : ''}
                            ${energyMeta.label ? `<div class="${energyMeta.cls}">${energyMeta.label}</div>` : ''}
                            <div class="ex-badge ex-badge--sets">${warmupCount} CAL + ${effectiveCount} SET</div>
                        </div>
                        ${active.repeticiones || active.duracion_segundos ? `<p class="exercise-target">${active.repeticiones || active.duracion_segundos + 's'} objetivo · descanso ${active.descanso || 'según sensación'}</p>` : ''}
                        ${groupChips ? `<div class="muscle-chip-row">${groupChips}</div>` : ''}
                    </div>

                    <button type="button"
                        class="load-planner-inline-btn"
                        onclick="abrirPlanificadorCargas(${idx}, ${i})">
                        <span class="load-planner-inline-icon"><i class="fas fa-scale-balanced"></i></span>
                        <span class="load-planner-inline-copy">
                            <strong>Planificar cargas</strong>
                            <small>Calcula aproximaciones desde tu peso efectivo</small>
                        </span>
                        <i class="fas fa-chevron-right"></i>
                    </button>

                    ${renderAdvisorBlock(active, i)}

                    ${active.nota ? `<div id="nota-${i}" class="nota-badge"><p><span>TIP TÉCNICO</span>${active.nota}</p></div>` : ''}
                    ${hasUserNote ? `<div class="saved-note-indicator"><i class="fas fa-note-sticky"></i> Nota personal guardada</div>` : ''}

                    <div class="exercise-sets-list">${rows}</div>
                </div>
            </div>
        `;
    }).join('');

    html += renderRecoverySection();
    container.innerHTML = html;
    initializeWorkoutUx(container);
    updateSaveSelectionSummary();
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
        <button onclick="cerrarAcciones(); abrirPlanificadorCargas(${dayIdx}, ${exIdx})"
            class="acc-action-btn">
            <span class="acc-action-icon" style="color:#7FBCEB">
                <i class="fas fa-scale-balanced"></i>
            </span>
            <span class="acc-action-body">
                <strong>Planificar cargas</strong>
                <span>Distribuye calentamientos desde el peso efectivo</span>
            </span>
            <i class="fas fa-chevron-right acc-action-chev"></i>
        </button>`);


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
    if (!notaDiv) return;
    notaDiv.classList.toggle('tip-collapsed');
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
        const nombre = getAlternativeName(a);
        if (!nombre) return;
        items.push(renderAltItem({
            label: nombre,
            meta: (typeof a === 'string' ? base.repeticiones : (a?.repeticiones || (a?.duracion_segundos ? a.duracion_segundos + 's' : base.repeticiones))),
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
    if (card) {
        card.classList.remove('exercise-locked');
        updateExerciseLockVisual(card, exIdx, false);
    }
    if (btn) btn.classList.remove('locked');
    updateSaveSelectionSummary();

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

function getSavableSetCount(card) {
    if (!card) return 0;

    return [...card.querySelectorAll('.val-peso')]
        .filter(input => String(input.value || '').trim() !== '')
        .length;
}

function updateExerciseLockVisual(card, idx, locked) {
    if (!card) return;

    const btn = document.getElementById(`btn-lock-${idx}`);
    const detail = document.getElementById(`save-state-detail-${idx}`);
    const savableSets = getSavableSetCount(card);

    card.dataset.saveSelected = locked ? 'true' : 'false';
    card.setAttribute('aria-selected', locked ? 'true' : 'false');

    if (btn) {
        btn.classList.toggle('locked', locked);
        btn.setAttribute('aria-pressed', locked ? 'true' : 'false');
        btn.setAttribute(
            'aria-label',
            locked
                ? 'Quitar ejercicio de la selección de guardado'
                : 'Seleccionar ejercicio para guardar'
        );
        btn.title = locked
            ? 'Quitar de guardado'
            : 'Bloquear y seleccionar para guardar';
        btn.innerHTML = locked
            ? '<i class="fas fa-lock"></i>'
            : '<i class="fas fa-lock-open"></i>';
    }

    if (detail) {
        if (!locked) {
            detail.textContent = 'Se incluirán las series con peso registrado';
        } else if (savableSets === 0) {
            detail.textContent = 'Bloqueado, pero aún no hay series con peso';
        } else {
            detail.textContent = `${savableSets} ${savableSets === 1 ? 'serie lista' : 'series listas'} para guardar`;
        }
    }
}

function updateSaveSelectionSummary() {
    const btn = document.getElementById('saveBtn');
    if (!btn || btn.disabled) return;

    const normalCount = document.querySelectorAll(
        '.exercise-card[data-save-selected="true"]:not(.recovery-locked)'
    ).length;
    const recoveryCount = document.querySelectorAll('.recovery-locked').length;
    const total = normalCount + recoveryCount;

    btn.dataset.selectedCount = String(total);

    if (total === 0) {
        btn.innerHTML = '<i class="fas fa-check-circle"></i> GUARDAR DÍA';
        return;
    }

    btn.innerHTML = `
        <i class="fas fa-lock"></i>
        GUARDAR ${total} ${total === 1 ? 'EJERCICIO' : 'EJERCICIOS'}
    `;
}

function toggleLock(idx) {
    const card = document.getElementById(`card-${idx}`);
    if (!card) return;

    const ejercicioData = getActiveExercise(diaVisualIdx, idx).activeEx
        || db.semana[diaVisualIdx].ejercicios[idx];
    const recordAnterior = ejercicioData.record ? ejercicioData.record.peso : 0;
    const shouldLock = !card.classList.contains('exercise-locked');

    if (shouldLock) {
        card.classList.add('exercise-locked');
        updateExerciseLockVisual(card, idx, true);

        let maxPesoIngresado = 0;
        const inputsPeso = card.querySelectorAll('.val-peso[data-set-type="trabajo"]');

        inputsPeso.forEach(input => {
            const valor = parseFloat(input.value) || 0;
            if (valor > maxPesoIngresado) maxPesoIngresado = valor;
        });

        if (maxPesoIngresado > recordAnterior && recordAnterior > 0) {
            dispararCelebracion();
            console.log("¡Nuevo récord detectado!");
        }
    } else {
        card.classList.remove('exercise-locked');
        updateExerciseLockVisual(card, idx, false);
    }

    updateSaveSelectionSummary();
}

function dispararCelebracion() {
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#d4a85f', '#86b58f', '#dfe8e2', '#5f8f75'],
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

    document.querySelectorAll('.exercise-card[data-save-selected="true"]').forEach(card => {
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
            const setType = p.dataset.setType || 'trabajo';
            const row = p.closest('.exercise-set-row-wrapper');
            const r = row?.querySelector('.val-reps')?.value || '';

            if (p.value) {
                const pesoIngresado = parseFloat(p.value);
                if (setType === 'trabajo' && pesoIngresado > prActual && prActual > 0) recordSuperado = true;

                data.push({
                    nombre: exData.nombre,
                    serie: s,
                    tipoSerie: setType,
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
        card.dataset.saveSelected = 'false';
        card.setAttribute('aria-selected', 'false');
        card.querySelector('.exercise-lock-btn')?.classList.remove('locked');

        const btnLock = card.querySelector('button[id^="btn-lock-"], button[id^="btn-recovery-lock-"]');
        if (btnLock) {
            btnLock.classList.remove('locked');
            btnLock.setAttribute('aria-pressed', 'false');
            btnLock.innerHTML = '<i class="fas fa-lock-open"></i>';
        }
    });

    updateSaveSelectionSummary();

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
            datasets: [{ data: [104, 103, 102.5, 102, 101.5], borderColor: '#86b58f', tension: 0.4, fill: true, backgroundColor: 'rgba(134, 181, 143, 0.08)', pointRadius: 0 }]
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


async function forzarActualizacionRutina() {
    const menu = document.getElementById('menuActions');
    if (menu) menu.classList.remove('show');

    const loader = document.getElementById('loading-screen');
    const loadingText = loader?.querySelector('p');
    loader?.classList.remove('hidden-load');
    if (loadingText) loadingText.textContent = `Forzando actualización de semana ${semanaActiva}...`;

    try {
        db = await loadRoutineDb(semanaActiva, { force: true });
        stopRestTimer();
        initializeRoutineUi();
        populateWeekSelector();
        const when = rutinaSourceMeta?.updatedAt ? formatCacheDate(rutinaSourceMeta.updatedAt) : 'ahora';
        alert(`Rutina actualizada desde Google correctamente (${when}).`);
    } catch (error) {
        console.error(error);
        alert('No se pudo forzar la actualización desde Google. Se mantiene la rutina local si ya existía.');
    } finally {
        setTimeout(() => loader?.classList.add('hidden-load'), 250);
    }
}

function limpiarCacheRutinaSemana() {
    try { localStorage.removeItem(getRoutineCacheKey(semanaActiva)); } catch { /* ignore */ }
}

async function cambiarSemana(value) {
    const nextWeek = Math.min(12, Math.max(1, Number(value) || 1));
    if (nextWeek === semanaActiva && db) return;

    const loader = document.getElementById('loading-screen');
    loader?.classList.remove('hidden-load');
    const loadingText = loader?.querySelector('p');
    if (loadingText) loadingText.textContent = `Cargando semana ${nextWeek}...`;

    try {
        semanaActiva = nextWeek;
        localStorage.setItem(SELECTED_WEEK_KEY, String(semanaActiva));
        db = await loadRoutineDb(semanaActiva);
        stopRestTimer();
        initializeRoutineUi();
        populateWeekSelector();
    } catch (error) {
        console.error(error);
        alert(`No se pudo cargar la semana ${nextWeek} desde el API. Revisa el endpoint y que acepte el parámetro week.`);
    } finally {
        setTimeout(() => loader?.classList.add('hidden-load'), 250);
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
                    <span class="text-gray-400 font-bold">${formatSeriesLong(s.serie)}</span>
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