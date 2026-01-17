// URL de tu implementación de Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbzUd4jj4F0QX9tnbmfo_sFKwaozRst1Z9bgv6s6l2IjUn4kDYxUFLTZgT15fdiuqhWm/exec';

let db = null;
let diaActualIdx = 0;
let miGrafico = null;

const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

let historialCompleto = []; // Variable global para guardar los datos sin filtrar

// --- UX helpers ---
const DRAFT_KEY = 'mariofit_draft_v1';

function showToast(message, type = 'info', title = '') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMsg');
    const t = document.getElementById('toastTitle');
    const icon = document.getElementById('toastIcon');
    if (!toast || !msg || !t || !icon) return;

    const map = {
        info:  { c: 'text-blue-400',  i: 'fa-info-circle',  ttl: 'Info' },
        ok:    { c: 'text-emerald-400', i: 'fa-check-circle', ttl: 'Listo' },
        warn:  { c: 'text-amber-400', i: 'fa-triangle-exclamation', ttl: 'Atención' },
        error: { c: 'text-red-400', i: 'fa-circle-xmark', ttl: 'Error' }
    };

    const cfg = map[type] || map.info;
    icon.className = `mt-0.5 ${cfg.c}`;
    icon.innerHTML = `<i class="fas ${cfg.i}"></i>`;
    t.innerText = title || cfg.ttl;
    msg.innerText = message;

    toast.classList.remove('hidden');
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(() => hideToast(), 3200);
}

function hideToast() {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.classList.add('hidden');
}

function loadDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}'); }
    catch { return {}; }
}

function saveDraft(draft) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); }
    catch { /* ignore */ }
}

function setSaveEnabled(enabled) {
    const btn = document.getElementById('saveBtn');
    if (!btn) return;
    btn.disabled = !enabled;
    btn.classList.toggle('opacity-60', !enabled);
    btn.classList.toggle('cursor-not-allowed', !enabled);
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

        diaActualIdx = db.semana.findIndex(d => d.dia === hoyNombre);
        if (diaActualIdx === -1) diaActualIdx = 0;

        renderNav();
        renderDia(diaActualIdx);

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

// --- NUEVA FUNCIÓN DE HISTORIAL ---
async function cargarHistorial() {
    const container = document.getElementById('tablaHistorial');
    container.innerHTML = `<div class="text-center p-10"><i class="fas fa-spinner fa-spin text-blue-500 text-2xl"></i></div>`;

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
                        <p class="text-[9px] text-blue-500 font-black uppercase tracking-widest">${sesion.split(' - ')[1]}</p>
                        <p class="text-white font-bold text-sm">${sesion.split(' - ')[0]}</p>
                    </div>
                    <i class="fas fa-chevron-down chevron text-[10px]"></i>
                </div>
                <div class="accordion-content px-4" id="content-${sIdx}">
                    ${Object.keys(ejercicios).map(nombreEx => {
            const series = ejercicios[nombreEx].sort((a, b) => a.serie - b.serie);
            return `
                            <div class="exercise-group mb-2">
                                <p class="text-gray-300 text-[10px] font-bold mb-2 uppercase tracking-tighter">${nombreEx}</p>
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
            <button onclick="cambiarDia(${i})" class="day-btn flex-shrink-0 px-7 py-3 rounded-2xl bg-slate-800 text-xs font-black uppercase tracking-widest text-white ${i === diaActualIdx ? 'active' : ''}">
                ${d.dia}
            </button>
        `).join('');
}

function renderDia(idx) {
    const container = document.getElementById('mainContent');
    const dia = db.semana[idx];

    // Enable/disable save depending on locked exercises
    setSaveEnabled(document.querySelectorAll('.exercise-locked').length > 0);

    // --- SECCIÓN DE CALENTAMIENTO ---
    let html = `        
        <div class="flex items-center gap-2 py-2">
            <div class="h-[1px] flex-1 bg-white/5"></div>
            <span class="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">Rutina del día</span>
            <div class="h-[1px] flex-1 bg-white/5"></div>
        </div>
    `;

    // --- SECCIÓN DE EJERCICIOS ---
    const draft = loadDraft();
    const draftKeyBase = `${dia.dia}__${idx}`;

    html += dia.ejercicios.map((ex, i) => {
        let rows = '';
        const numSeries = ex.series || 3;

        for (let s = 1; s <= numSeries; s++) {
            const dk = `${draftKeyBase}__${i}__${s}`;
            const d = draft[dk] || {};
            rows += `
                <div class="series-row">
                    <div class="series-label">${s}º</div>
                    <input type="number" inputmode="decimal" step="0.5" min="0" placeholder="Kg" class="val-peso" data-ex="${i}" data-s="${s}" value="${d.peso ?? ''}">
                    <input type="number" inputmode="numeric" step="1" min="0" placeholder="Reps" class="val-reps" data-ex="${i}" data-s="${s}" value="${d.reps ?? ''}">
                </div>
            `;
        }

        return `
            <div class="card p-6" id="card-${i}" data-ex-name="${ex.nombre}">
                <div class="exercise-header flex justify-between items-start mb-4 cursor-pointer" onclick="toggleCollapse(${i})">
                    <div class="flex gap-4 items-center">
                        <button onclick="event.stopPropagation(); toggleLock(${i})" id="btn-lock-${i}" class="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-gray-500 transition-all">
                            <i class="fas fa-lock-open"></i>
                        </button>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-white text-base leading-tight">${ex.nombre}</h3>
                                ${ex.record.peso > 0 ? `<div class="record-badge"><i class="fas fa-crown"></i> PR: ${ex.record.peso}kg</div>` : ''}
                                ${ex.nota ? `
                                    <button onclick="event.stopPropagation(); toggleNota(${i})" id="btn-nota-${i}" class="btn-nota text-sm">
                                        <i class="fas fa-sticky-note"></i>
                                    </button>
                                ` : ''}
                            </div>
                            <p class="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">${ex.repeticiones || ex.duracion_segundos + 's'} objetivo</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        ${ex.video ? `<a href="${ex.video}" target="_blank" class="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl" onclick="event.stopPropagation()"><i class="fab fa-youtube"></i></a>` : ''}
                        <i class="fas fa-chevron-down text-gray-500 text-[10px] collapse-chevron"></i>
                    </div>
                </div>

                ${ex.nota ? `
                    <div id="nota-${i}" class="nota-badge">
                        <p class="text-[11px] text-orange-200 leading-relaxed italic">
                            <span class="font-bold text-orange-400 uppercase text-[9px]">Tips:</span> ${ex.nota}
                        </p>
                    </div>
                ` : ''}

                <div class="exercise-body">
                    <div class="grid grid-cols-3 gap-2 px-1 mb-2">
                        <div></div>
                        <div class="text-[9px] text-gray-500 font-black uppercase tracking-widest text-center">Kg</div>
                        <div class="text-[9px] text-gray-500 font-black uppercase tracking-widest text-center">Reps</div>
                    </div>
                    <div class="space-y-3">${rows}</div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    // Bind input events (draft + save enabled state)
    wireInputsForDraft(draftKeyBase);
}

function toggleCollapse(idx) {
    const card = document.getElementById(`card-${idx}`);
    if (!card) return;
    // don't collapse when clicking lock button or note button
    card.classList.toggle('exercise-collapsed');
}

function wireInputsForDraft(draftKeyBase) {
    const draft = loadDraft();
    const container = document.getElementById('mainContent');
    if (!container) return;

    container.querySelectorAll('input.val-peso, input.val-reps').forEach(inp => {
        inp.addEventListener('input', (e) => {
            const ex = e.target.dataset.ex;
            const s = e.target.dataset.s;
            const key = `${draftKeyBase}__${ex}__${s}`;
            const card = document.getElementById(`card-${ex}`);
            const peso = card?.querySelector(`.val-peso[data-ex="${ex}"][data-s="${s}"]`)?.value || '';
            const reps = card?.querySelector(`.val-reps[data-ex="${ex}"][data-s="${s}"]`)?.value || '';
            draft[key] = { peso, reps };
            saveDraft(draft);

            // enable save if there is at least one locked card
            setSaveEnabled(document.querySelectorAll('.exercise-locked').length > 0);
        });

        // Enter jumps to next input
        inp.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const inputs = Array.from(container.querySelectorAll('input.val-peso, input.val-reps'));
            const idx = inputs.indexOf(e.target);
            const next = inputs[idx + 1];
            if (next) next.focus();
        });
    });
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

function toggleLock(idx) {
    const card = document.getElementById(`card-${idx}`);
    const btn = document.getElementById(`btn-lock-${idx}`);
    
    // Obtenemos los datos del ejercicio actual desde el objeto db
    const ejercicioData = db.semana[diaActualIdx].ejercicios[idx];
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

        showToast('Ejercicio marcado como realizado. Puedes guardar el día cuando termines.', 'ok', 'Bloqueado');

    } else {
        // --- DESACTIVAR BLOQUEO ---
        card.classList.remove('exercise-locked');
        btn.innerHTML = '<i class="fas fa-lock-open"></i>';
        showToast('Ejercicio desbloqueado.', 'info');
    }

    setSaveEnabled(document.querySelectorAll('.exercise-locked').length > 0);
}

function dispararCelebracion() {
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#fbbf24', '#3b82f6', '#ffffff', '#10b981'],
        ticks: 200
    });
}

function cambiarDia(idx) {
    diaActualIdx = idx;
    document.getElementById('selectorRutina').value = idx; // Sincroniza el selector
    renderNav();
    renderDia(idx);
}

async function enviarDatos() {
    const btn = document.getElementById('saveBtn');
    const selector = document.getElementById('selectorRutina');
    const idxRutinaVisual = parseInt(selector.value);
    const nombreDiaCalendario = db.semana[diaActualIdx].dia; 

    const data = [];
    let recordSuperado = false;

    document.querySelectorAll('.exercise-locked').forEach(card => {
        const pInput = card.querySelector('.val-peso');
        if(!pInput) return;
        
        const exIdx = pInput.dataset.ex;
        const exData = db.semana[idxRutinaVisual].ejercicios[exIdx];
        const prActual = parseFloat(exData.record.peso) || 0;

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
                    reps: r 
                });
            }
        });
    });

    if (data.length === 0) {
        showToast('Primero marca (candado) los ejercicios que realizaste.', 'warn', 'Falta bloquear');
        return;
    }

    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> GUARDANDO...`;

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ dia: nombreDiaCalendario, ejercicios: data })
        });

        if (recordSuperado) {
            btn.innerHTML = `<i class="fas fa-crown"></i> ¡RÉCORD GUARDADO!`;
            btn.classList.replace('bg-blue-600', 'bg-amber-500');
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, zIndex: 10000 });
        } else {
            btn.innerHTML = `<i class="fas fa-check-double"></i> ¡LISTO!`;
            btn.classList.replace('bg-blue-600', 'bg-emerald-600');
        }

        // --- EN LUGAR DE RELOAD, RESETEAMOS LA UI ---
        setTimeout(() => {
            limpiarDespuesDeGuardar();
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            btn.classList.remove('bg-emerald-600', 'bg-amber-500');
            btn.classList.add('bg-blue-600');
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
        if(btnLock) btnLock.innerHTML = '<i class="fas fa-lock-open"></i>';
    });

    // 2. Limpiar todos los inputs de peso y reps
    document.querySelectorAll('.val-peso, .val-reps').forEach(input => {
        input.value = "";
    });

    // 2.1 Limpiar borrador local
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }

    // 3. (Opcional) Actualizar el historial en segundo plano para que se vea lo nuevo
    if(typeof cargarHistorial === "function") {
        cargarHistorial(); 
    }
    
    showToast('Entrenamiento sincronizado correctamente.', 'ok', 'Guardado');
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
            datasets: [{ data: [104, 103, 102.5, 102, 101.5], borderColor: '#3b82f6', tension: 0.4, fill: true, backgroundColor: 'rgba(59, 130, 246, 0.05)', pointRadius: 0 }]
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
    const diaActual = db.semana[diaActualIdx].dia;

    if (!motivo) {
        showToast('Escribe un motivo breve para guardarlo en el historial.', 'warn', 'Falta motivo');
        return;
    }

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

        showToast('Nota de inactividad guardada en el historial.', 'ok', 'Registrado');
        cerrarModalReporte();
        location.reload(); // Recargamos para que aparezca en el historial
    } catch (e) {
        showToast('No se pudo guardar la nota. Reintenta.', 'error');
        btn.disabled = false;
        btn.innerText = "Guardar Nota";
    }
}

function intercambiarRutina(nuevoIdx) {
    // Al cambiar la rutina, actualizamos el contenido pero mantenemos el día de registro
    // Es decir, si hoy es Lunes pero elijo Martes, se guardará como: "Fecha de hoy, Día: Lunes, Ejercicio: (del martes)"
    renderDia(parseInt(nuevoIdx));
    
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
    lista.innerHTML = `<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-blue-500"></i><p class="text-[9px] text-gray-500 mt-2 uppercase font-bold">Consultando base de datos...</p></div>`;
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
                        <i class="fas fa-history text-blue-500 text-[9px]"></i>
                        ${ejercicio}
                    </p>
                    <div class="pl-4 border-l border-blue-500/20">
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