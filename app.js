// URL de tu implementación de Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbzUd4jj4F0QX9tnbmfo_sFKwaozRst1Z9bgv6s6l2IjUn4kDYxUFLTZgT15fdiuqhWm/exec';

    let db = null;
    let diaActual = 0;
    let miGrafico = null;

    async function init() {
        try {
            const res = await fetch(API_URL + "?getRoutine=true");
            db = await res.json();
            document.getElementById('sub-meta').innerText = db.perfil.objetivo.replace(/_/g, ' ');
            renderNav();
            renderDia(0);
        } catch (e) { console.error("Error al iniciar:", e); }
    }

    function renderNav() {
        const nav = document.getElementById('dayNav');
        nav.innerHTML = db.semana.map((d, i) => `
            <button onclick="cambiarDia(${i})" class="day-btn flex-shrink-0 px-6 py-3 rounded-2xl bg-slate-800/50 text-xs font-bold uppercase tracking-wider text-gray-400 ${i===0?'active':''}">
                ${d.dia}
            </button>
        `).join('');
    }

    function renderDia(idx) {
        const container = document.getElementById('mainContent');
        const dia = db.semana[idx];
        
        let html = `
            <div class="card p-5 border-orange-500/20 bg-orange-500/5">
                <h4 class="text-orange-400 font-bold text-xs mb-3 uppercase tracking-widest flex items-center gap-2">
                    <i class="fas fa-fire"></i> Calentamiento sugerido
                </h4>
                <div class="space-y-2">
                    ${db.calentamiento.map(w => `
                        <div class="flex justify-between text-sm py-1 border-b border-white/5">
                            <span class="text-gray-300">${w.nombre}</span>
                            <span class="text-orange-300 font-mono font-bold">${w.reps}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        html += dia.ejercicios.map((ex, i) => {
            let setsHTML = '';
            for(let s=1; s<=(ex.series || 3); s++) {
                setsHTML += `
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-gray-500 border border-white/5">${s}</div>
                        <input type="number" placeholder="Peso kg" class="flex-1 val-peso" data-name="${ex.nombre}" data-s="${s}">
                        <input type="number" placeholder="Reps" class="flex-1 val-reps" data-name="${ex.nombre}" data-s="${s}">
                    </div>
                `;
            }

            return `
                <div class="card p-6" id="card-${i}">
                    <div class="flex justify-between items-start mb-5">
                        <div class="flex gap-4 items-center">
                            <input type="checkbox" onchange="document.getElementById('card-${i}').classList.toggle('exercise-done')" class="w-6 h-6 rounded-lg accent-emerald-500 bg-slate-900 border-slate-700">
                            <div>
                                <h3 class="font-bold text-white text-lg">${ex.nombre}</h3>
                                <span class="text-[10px] text-blue-400 uppercase font-bold tracking-tighter">${ex.repeticiones} REPS OBJETIVO</span>
                            </div>
                        </div>
                        ${ex.video ? `<a href="${ex.video}" target="_blank" class="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl"><i class="fab fa-youtube text-lg"></i></a>` : ''}
                    </div>
                    <div class="space-y-3">${setsHTML}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    function cambiarDia(idx) {
        diaActual = idx;
        document.querySelectorAll('.day-btn').forEach((b, i) => i === idx ? b.classList.add('active') : b.classList.remove('active'));
        renderDia(idx);
    }

    // LÓGICA DEL MODAL
    function abrirModal() {
        document.getElementById('modalProgreso').classList.add('active');
        initChart();
    }
    function cerrarModal() {
        document.getElementById('modalProgreso').classList.remove('active');
    }

    async function registrarPeso() {
        const peso = prompt("Introduce tu peso actual (kg):");
        if(peso) {
            await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ tipo: "PESO_CORPORAL", valor: peso }) });
            alert("Peso guardado correctamente.");
        }
    }

    async function enviarDatos() {
        const btn = document.getElementById('saveBtn');
        const data = [];
        document.querySelectorAll('.val-peso').forEach(p => {
            if(p.value) {
                const reps = document.querySelector(`.val-reps[data-name="${p.dataset.name}"][data-s="${p.dataset.s}"]`).value;
                data.push({ nombre: p.dataset.name, serie: p.dataset.s, peso: p.value, reps: reps });
            }
        });

        if(data.length === 0) return alert("Anota al menos una serie.");
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> GUARDANDO...`;
        await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ dia: db.semana[diaActual].dia, ejercicios: data }) });
        btn.innerHTML = `<i class="fas fa-check"></i> ¡ENTRENO GUARDADO!`;
        setTimeout(() => init(), 2000);
    }

    function initChart() {
        const ctx = document.getElementById('chartProgreso').getContext('2d');
        if(miGrafico) miGrafico.destroy();
        miGrafico = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['L', 'M', 'X', 'J', 'V', 'S'],
                datasets: [{
                    label: 'Peso Corporal',
                    data: [104, 103.5, 103, 102.8, 102.5, 102],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true, tension: 0.4
                }]
            },
            options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: 'rgba(255,255,255,0.05)' } } } }
        });
    }

    init();