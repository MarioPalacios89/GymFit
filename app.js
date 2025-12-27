// URL de tu implementación de Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbzUd4jj4F0QX9tnbmfo_sFKwaozRst1Z9bgv6s6l2IjUn4kDYxUFLTZgT15fdiuqhWm/exec';

let db = null;
let diaActualIdx = 0;
let miGrafico = null;

const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

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

        diaActualIdx = db.semana.findIndex(d => d.dia === hoyNombre);
        if(diaActualIdx === -1) diaActualIdx = 0; 

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
    container.innerHTML = `<div class="text-center p-10"><i class="fas fa-spinner fa-spin text-blue-500"></i></div>`;
    
    try {
        const res = await fetch(API_URL + "?getHistory=true&t=" + new Date().getTime());
        const data = await res.json();
        
        if (!data || data.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center py-10 text-[10px] font-bold uppercase tracking-widest">Sin registros</p>`;
            return;
        }

        // 1. Agrupar por Sesión (Fecha/Día)
        const sesiones = data.reduce((acc, reg) => {
            const sesionKey = `${reg.fecha} - ${reg.dia}`;
            if (!acc[sesionKey]) acc[sesionKey] = {};
            
            // 2. Agrupar por Ejercicio dentro de la sesión
            if (!acc[sesionKey][reg.ejercicio]) acc[sesionKey][reg.ejercicio] = [];
            acc[sesionKey][reg.ejercicio].push(reg);
            
            return acc;
        }, {});

        container.innerHTML = Object.keys(sesiones).map((sesion, sIdx) => {
            const ejercicios = sesiones[sesion];
            
            return `
                <div class="history-accordion" id="acc-${sIdx}">
                    <div class="accordion-header" onclick="toggleAccordion(${sIdx})">
                        <div>
                            <p class="text-[9px] text-blue-500 font-black uppercase tracking-[0.15em]">${sesion.split(' - ')[1]}</p>
                            <p class="text-white font-bold text-sm">${sesion.split(' - ')[0]}</p>
                        </div>
                        <i class="fas fa-chevron-down chevron text-xs"></i>
                    </div>
                    
                    <div class="accordion-content" id="content-${sIdx}">
                        ${Object.keys(ejercicios).map(nombreEx => {
                            // ORDENAR LAS SERIES: S1, S2, S3...
                            const seriesOrdenadas = ejercicios[nombreEx].sort((a, b) => a.serie - b.serie);
                            
                            return `
                                <div class="exercise-group">
                                    <p class="text-white text-[11px] font-bold mb-1">${nombreEx}</p>
                                    <div class="tag-container">
                                        ${seriesOrdenadas.map(s => `
                                            <div class="data-tag">
                                                <span class="tag-label">S${s.serie}:</span>
                                                <span class="tag-weight">${s.peso}k</span>
                                                <span>×</span>
                                                <span>${s.reps}</span>
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
    } catch (e) {
        container.innerHTML = `<p class="text-red-400 text-center py-10 text-xs">Error de datos</p>`;
    }
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

    // --- SECCIÓN DE CALENTAMIENTO ---
    let html = `
        <div class="card p-6 border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                    <i class="fas fa-fire-alt"></i>
                </div>
                <div>
                    <h4 class="text-orange-400 font-black text-xs uppercase tracking-widest">Calentamiento</h4>
                    <p class="text-[9px] text-gray-500 uppercase">Preparación articular y activación</p>
                </div>
            </div>
            <div class="space-y-2">
                ${db.calentamiento.map(w => `
                    <div class="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                        <span class="text-gray-300 text-xs font-medium">${w.nombre}</span>
                        <span class="text-orange-400 font-mono font-bold text-[11px] bg-orange-500/5 px-2 py-1 rounded-lg">
                            ${w.series ? w.series + 'x' : ''}${w.reps || w.duracion_segundos + 's'}
                        </span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="flex items-center gap-2 py-2">
            <div class="h-[1px] flex-1 bg-white/5"></div>
            <span class="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">Rutina del día</span>
            <div class="h-[1px] flex-1 bg-white/5"></div>
        </div>
    `;

    // --- SECCIÓN DE EJERCICIOS ---
    html += dia.ejercicios.map((ex, i) => {
        let rows = '';
        const numSeries = ex.series || 3;

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
            <div class="card p-6" id="card-${i}">
                <div class="flex justify-between items-start mb-6">
                    <div class="flex gap-4 items-center">
                        <button onclick="toggleLock(${i})" id="btn-lock-${i}" class="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-gray-500 transition-all active:scale-90">
                            <i class="fas fa-lock-open"></i>
                        </button>
                        <div>
                            <h3 class="font-bold text-white text-base leading-tight">${ex.nombre}</h3>
                            <p class="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">${ex.repeticiones || ex.duracion_segundos + 's'} objetivo</p>
                        </div>
                    </div>
                    ${ex.video ? `<a href="${ex.video}" target="_blank" class="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl"><i class="fab fa-youtube"></i></a>` : ''}
                </div>
                <div class="space-y-3">${rows}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function toggleLock(idx) {
    const card = document.getElementById(`card-${idx}`);
    const btn = document.getElementById(`btn-lock-${idx}`);
    if (!card.classList.contains('exercise-locked')) {
        card.classList.add('exercise-locked');
        btn.innerHTML = '<i class="fas fa-lock text-emerald-400"></i>';
    } else {
        card.classList.remove('exercise-locked');
        btn.innerHTML = '<i class="fas fa-lock-open"></i>';
    }
}

function cambiarDia(idx) {
    diaActualIdx = idx;
    renderNav();
    renderDia(idx);
}

async function enviarDatos() {
const btn = document.getElementById('saveBtn');
    const data = [];
    
    document.querySelectorAll('.exercise-locked').forEach(card => {
        card.querySelectorAll('.val-peso').forEach(p => {
            const exIdx = p.dataset.ex;
            const s = p.dataset.s;
            const r = card.querySelector(`.val-reps[data-ex="${exIdx}"][data-s="${s}"]`).value;
            if(p.value) data.push({ nombre: db.semana[diaActualIdx].ejercicios[exIdx].nombre, serie: s, peso: p.value, reps: r });
        });
    });

    if(data.length === 0) return alert("Primero bloquea (check verde) los ejercicios que terminaste.");

    // EFECTO CARGANDO EN BOTÓN
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ENVIANDO A SHEETS...`;
    btn.classList.add('opacity-80');

    try {
        await fetch(API_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify({ dia: db.semana[diaActualIdx].dia, ejercicios: data }) 
        });
        
        btn.innerHTML = `<i class="fas fa-check-double"></i> ¡TODO GUARDADO!`;
        btn.classList.replace('bg-blue-600', 'bg-emerald-600');
        
        setTimeout(() => {
            location.reload();
        }, 1500);
    } catch(e) {
        btn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ERROR`;
        btn.disabled = false;
    }
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

init();