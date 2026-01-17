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

async function init() {
    const loader = document.getElementById('loading-screen');
    try {
        // Iniciamos la carga de la rutina
        const res = await fetch(API_URL + "?getRoutine=true");
        db = await res.json();

        // Configuramos la interfaz
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

        renderNav();
        renderDia(diaVisualIdx);

        // Una vez todo renderizado, quitamos el loader con un pequeño delay para suavidad
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

    // --- SECCIÓN DE CALENTAMIENTO ---
    let html = `        
        <div class="flex items-center gap-2 py-2">
            <div class="h-[1px] flex-1 bg-white/5"></div>
            <span class="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">Rutina del día</span>
            <div class="h-[1px] flex-1 bg-white/5"></div>
        </div>
    `;

    // --- SECCIÓN DE EJERCICIOS ---
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
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-[10px] font-bold text-gray-600 border border-white/5">${s}º</div>
                    <input type="number" placeholder="Kg" class="val-peso" data-ex="${i}" data-s="${s}">
                    <input type="number" placeholder="Reps" class="val-reps" data-ex="${i}" data-s="${s}">
                </div>
            `;
        }

        return `
            <div class="card p-6" id="card-${i}" data-day="${idx}" data-ex="${i}" data-ex-name="${String(active.nombre || ex.nombre || '').replace(/"/g, '&quot;')}">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex gap-4 items-center">
                        <button onclick="toggleLock(${i})" id="btn-lock-${i}" class="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-gray-500 transition-all">
                            <i class="fas fa-lock-open"></i>
                        </button>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-white text-base leading-tight">${active.nombre}</h3>
                                ${(active.record && Number(active.record.peso) > 0) ? `<div class="record-badge"><i class=\"fas fa-crown\"></i> PR: ${active.record.peso}kg</div>` : ''}
                                ${isAlt ? `<div class="alt-badge"><i class=\"fas fa-arrows-rotate\"></i> ALT</div>` : ''}
                                <button onclick="abrirModalNota(${idx}, ${i})" class="btn-note ${hasUserNote ? 'has-note' : ''}" title="Nota + foto">
                                    <i class="fas fa-pen"></i>
                                </button>
                                ${(active.nota) ? `
                                    <button onclick="toggleNota(${i})" id="btn-nota-${i}" class="btn-nota text-sm" title="Tips del ejercicio">
                                        <i class="fas fa-lightbulb"></i>
                                    </button>
                                ` : ''}
                                ${alts.length ? `
                                    <button onclick="abrirModalAlternativas(${idx}, ${i})" class="btn-alt text-sm" title="Cambiar por alternativa">
                                        <i class="fas fa-arrows-rotate"></i>
                                    </button>
                                ` : ''}
                            </div>
                            <p class="text-[10px] text-lime-300/80 font-bold uppercase tracking-widest mt-1">${active.repeticiones || (active.duracion_segundos ? active.duracion_segundos + 's' : '')} objetivo</p>
                        </div>
                    </div>
                    ${active.video ? `<a href="${active.video}" target="_blank" class="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl"><i class="fab fa-youtube"></i></a>` : ''}
                </div>

                ${active.nota ? `
                    <div id="nota-${i}" class="nota-badge">
                        <p class="text-[11px] text-orange-200 leading-relaxed italic">
                            <span class="font-bold text-orange-400 uppercase text-[9px]">Tips:</span> ${active.nota}
                        </p>
                    </div>
                ` : ''}

                <div class="space-y-3">${rows}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
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
    document.getElementById('selectorRutina').value = idx; // Sincroniza el selector
    renderNav();
    renderDia(diaVisualIdx);
}

async function enviarDatos() {
    const btn = document.getElementById('saveBtn');
    const selector = document.getElementById('selectorRutina');
    const idxRutinaVisual = parseInt(selector.value);
    // Guardamos como "hoy" aunque estés viendo otra rutina
    const nombreDiaCalendario = db.semana[diaRegistroIdx].dia;

    const data = [];
    const slotsToClear = new Set();
    let recordSuperado = false;

    document.querySelectorAll('.exercise-locked').forEach(card => {
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

        // Limpiar notas locales de los ejercicios guardados (para empezar limpio la próxima sesión)
        clearNotesForSlots([...slotsToClear]);

        if (recordSuperado) {
            btn.innerHTML = `<i class="fas fa-crown"></i> ¡RÉCORD GUARDADO!`;
            btn.classList.replace('bg-lime-500', 'bg-amber-500');
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, zIndex: 10000 });
        } else {
            btn.innerHTML = `<i class="fas fa-check-double"></i> ¡LISTO!`;
            btn.classList.replace('bg-lime-500', 'bg-emerald-600');
        }

        // --- EN LUGAR DE RELOAD, RESETEAMOS LA UI ---
        setTimeout(() => {
            limpiarDespuesDeGuardar();
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
    // 1. Desbloquear todas las tarjetas
    document.querySelectorAll('.exercise-locked').forEach(card => {
        card.classList.remove('exercise-locked');
        // Resetear el icono del candado (buscamos el botón de lock dentro de la card)
        const btnLock = card.querySelector('button[id^="btn-lock-"]');
        if (btnLock) btnLock.innerHTML = '<i class="fas fa-lock-open"></i>';
    });

    // 2. Limpiar todos los inputs de peso y reps
    document.querySelectorAll('.val-peso, .val-reps').forEach(input => {
        input.value = "";
    });

    // 3. (Opcional) Actualizar el historial en segundo plano para que se vea lo nuevo
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
        location.reload(); // Recargamos para que aparezca en el historial
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

init();