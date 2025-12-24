// URL de tu implementación de Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbzUd4jj4F0QX9tnbmfo_sFKwaozRst1Z9bgv6s6l2IjUn4kDYxUFLTZgT15fdiuqhWm/exec';

let db = null;
let diaActual = 0;

async function init() {
    try {
        const res = await fetch(API_URL);
        db = await res.json();
        document.getElementById('sub').innerText = db.perfil.objetivo;
        renderNav();
        renderCalentamiento();
        renderEjercicios(0);
    } catch (e) { 
        debugger;
        alert("Error cargando datos. Verifica la URL de la API."); }
}

function renderNav() {
    const nav = document.getElementById('dayNav');
    nav.innerHTML = db.semana.map((d, i) => `
                <button onclick="cambiarDia(${i})" class="day-btn ${i === 0 ? 'active' : ''} whitespace-nowrap px-6 py-2 rounded-xl bg-slate-800 text-sm font-bold transition-all">
                    ${d.dia.toUpperCase()}
                </button>
            `).join('');
}

function renderCalentamiento() {
    const container = document.getElementById('warmupSection');
    container.innerHTML = `
                <details class="glass-card mb-4 overflow-hidden border-orange-500/20">
                    <summary class="p-4 font-bold text-orange-400 flex justify-between items-center cursor-pointer">
                        <span><i class="fas fa-fire mr-2"></i> CALENTAMIENTO</span>
                        <i class="fas fa-chevron-down"></i>
                    </summary>
                    <div class="p-4 pt-0 space-y-2">
                        ${db.calentamiento.map(w => `
                            <div class="flex justify-between text-sm border-b border-white/5 pb-1">
                                <span class="text-gray-300">${w.nombre}</span>
                                <span class="text-orange-300 font-mono">${w.reps}</span>
                            </div>
                        `).join('')}
                    </div>
                </details>
            `;
}

function renderEjercicios(idx) {
    const list = document.getElementById('exerciseList');
    const dia = db.semana[idx];
    list.innerHTML = dia.ejercicios.map((ex, i) => {
        const series = ex.series || 3;
        let inputs = '';
        for (let s = 1; s <= series; s++) {
            inputs += `
                        <div class="grid grid-cols-3 gap-2 items-center">
                            <span class="text-[10px] text-gray-500 font-bold uppercase">Serie ${s}</span>
                            <input type="number" placeholder="kg" class="val-peso" data-name="${ex.nombre}" data-s="${s}">
                            <input type="number" placeholder="reps" class="val-reps" data-name="${ex.nombre}" data-s="${s}">
                        </div>
                    `;
        }

        return `
                    <div class="glass-card p-5 relative" id="card-${i}">
                        <div class="flex justify-between items-start mb-4">
                            <div class="flex gap-3 items-center">
                                <div class="custom-check" onclick="toggleDone(${i})">
                                    <i class="fas fa-check text-white text-xs"></i>
                                </div>
                                <div>
                                    <h3 class="font-bold text-lg leading-tight">${ex.nombre}</h3>
                                    <p class="text-[10px] text-blue-400 uppercase tracking-widest">${ex.tipo || 'Fuerza'}</p>
                                </div>
                            </div>
                            ${ex.video ? `<a href="${ex.video}" target="_blank" class="text-red-500 bg-red-500/10 p-2 rounded-lg"><i class="fab fa-youtube text-xl"></i></a>` : ''}
                        </div>
                        <div class="space-y-3">${inputs}</div>
                    </div>
                `;
    }).join('');
}

function toggleDone(idx) {
    const card = document.getElementById(`card-${idx}`);
    const check = card.querySelector('.custom-check');
    card.classList.toggle('exercise-done');
    check.classList.toggle('checked');
}

function cambiarDia(idx) {
    diaActual = idx;
    document.querySelectorAll('.day-btn').forEach((b, i) => i === idx ? b.classList.add('active') : b.classList.remove('active'));
    renderEjercicios(idx);
}

async function enviarDatos() {
    const btn = document.getElementById('saveBtn');
    const pesos = document.querySelectorAll('.val-peso');
    const dataFinal = [];

    pesos.forEach(p => {
        const nombre = p.dataset.name;
        const serie = p.dataset.s;
        const repsInput = document.querySelector(`.val-reps[data-name="${nombre}"][data-s="${serie}"]`);
        if (p.value || repsInput.value) {
            dataFinal.push({ nombre, serie, peso: p.value, reps: repsInput.value });
        }
    });

    if (dataFinal.length === 0) return alert("Escribe al menos un resultado.");

    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> GUARDANDO...`;
    btn.disabled = true;

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ dia: db.semana[diaActual].dia, ejercicios: dataFinal })
        });
        alert("¡Entrenamiento guardado!");
    } catch (e) { alert("Error al conectar."); }
    finally {
        btn.innerHTML = `<i class="fas fa-cloud-upload-alt"></i> GUARDAR SESIÓN`;
        btn.disabled = false;
    }
}

init();
