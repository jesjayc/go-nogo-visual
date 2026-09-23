/* SEQUÊNCIAS */
const SEQ_TRIAL = ["G", "G", "G", "N", "G", "G", "G", "N", "G", "G", "G", "N", "G", "G", "N", "G", "G", "G", "G", "G"];
const SEQ_OFICIAL = ["G","G","G","G","N","G","N","G","G","N","G","G","G","G","G","G","N","G","G","G","G","N","G","G","G","G","G","G","N","G","G","G","G","G","N","G","G","G","N","G","G","G","N","G","N","N","G","N","G","G","G","G","G","N","G","G","G","G","G","G","G","G","G","N","G","G","N","N","N","G","G","G","N","G","G","G","N","G","G","G","N","G","G","N","G","G","G","G","G","N","G","G","G","G","N","N","G","N","G","G","N","N","G","G","G","G","G","G","N","G","G","G","N","G","G","G","G","G","N","G","N","G","N","G","G","N","N","G","G","G","G","G","G","G","G","N","G","G","N","G","G","N","G","N","N","G","G","G","G","G","N","G","G","G","G","G","N","G","G","G","N","G","G","G","N","G","G","G","G","N","G","G","G","G","G","G","N","G","N","N","G","G","N","G","N","G","G","N","G","G","G","G","G","G","N","N","N","G","G","G","G","G","N","G","N","G","G","N","G","G","G","G","N","N","G","G","G","G","G","G","N","G","G","G","G","G","N","G","G","G","G","G","G","N","G","G","N","G","G","G","G","G","G","N","G","G","N","G","G","G","G","N","G","G","G","G","G","G","N","G","N","N","G","G","G","G","G","N","N","G","G","N","G","G","G","G","G","N","G","G","G","G","G","G","N","N","G","G","G","G","G","G","G","G","N","G","G","G","G","G"];

let state = {
    idx: 0, logs: [], active: false, start: 0, reacted: false,
    seq: [], isOfficial: false, isRunning: false, lockNavigation: false,
    aborted: false
};

const ABORT_CODE = "0001";
let abortBuffer = "";
let abortBufferTimer = null;

const area = document.getElementById('stimulus-area');
const cross = document.getElementById('fixation-cross');
const btnOfficial = document.getElementById('btn-start-official');

const show = id => {
    document.querySelectorAll('.screen, .full-black-screen').forEach(s => {
        s.classList.add('hidden');
        s.classList.remove('active');
    });
    const target = document.getElementById(id);
    target.classList.remove('hidden');
    target.classList.add('active');
};

const runTest = (seq, isOfficial) => {
    if (state.isRunning || state.lockNavigation) return;
    state.isRunning = true;
    state.idx = 0; state.logs = []; state.seq = seq; state.isOfficial = isOfficial;
    state.aborted = false;

    show('screen-test');
    cross.style.display = 'block';
    area.style.display = 'none';

    setTimeout(cycle, 1500);
};

/* REAÇÃO (PRESSIONAR) */
window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    if (document.getElementById('screen-test').classList.contains('active')) {
        if (state.active && !state.reacted) {
            e.preventDefault();
            state.reacted = true;
            record(Date.now() - state.start);
            area.style.display = 'none';
            cross.style.display = 'block';
        }
    }
});

/* NAVEGAÇÃO (SOLTAR) */
window.addEventListener('keyup', (e) => {
    if (e.code !== 'Space' || state.isRunning || state.lockNavigation) return;

    const intro = document.getElementById('screen-intro').classList.contains('active');
    const post = document.getElementById('screen-post-trial').classList.contains('active');

    if (intro) runTest(SEQ_TRIAL, false);
    else if (post) runTest(SEQ_OFICIAL, true);
});

/* BOTÕES */
document.getElementById('btn-trial').onclick = () => runTest(SEQ_TRIAL, false);
btnOfficial.onclick = () => runTest(SEQ_OFICIAL, true);
document.getElementById('btn-submit-est').onclick = () => { show('screen-results'); };
document.getElementById('btn-download-csv').onclick = downloadCSV;

function cycle() {
    if (state.aborted) return;
    if (state.idx >= state.seq.length) return finish();
    state.reacted = false;
    state.active = true;
    cross.style.display = 'none';
    area.className = state.seq[state.idx] === 'G' ? 'stimulus-go' : 'stimulus-nogo';
    area.style.display = 'block';
    state.start = Date.now();

    setTimeout(() => {
        if (state.aborted) return;
        area.style.display = 'none';
        if (!state.reacted) record(null);
        state.active = false;
        cross.style.display = 'block';
        setTimeout(() => { if (state.aborted) return; state.idx++; cycle(); }, 1500);
    }, 500);
}

function record(rt) {
    const type = state.seq[state.idx];
    let status = type === 'G' ? (rt ? "A" : "O") : (rt ? "E" : "OK");
    state.logs.push({ type, rt, status });
}

function finish() {
    state.isRunning = false;
    state.active = false;

    if (state.isOfficial) {
        show('screen-estimation');
    } else {
        startCoolDown(); // Inicia trava de 10s antes do oficial
    }
}

function abortTest() {
    if (!state.isRunning) return;
    state.aborted = true;
    state.isRunning = false;
    state.active = false;
    area.style.display = 'none';
    cross.style.display = 'none';
    if (!state.logs.length) {
        location.reload();
        return;
    }
    show('screen-results');
}

window.addEventListener('keydown', (e) => {
    if (e.key.length !== 1 || !/[a-z0-9]/i.test(e.key)) return;
    abortBuffer = (abortBuffer + e.key.toLowerCase()).slice(-ABORT_CODE.length);
    clearTimeout(abortBufferTimer);
    abortBufferTimer = setTimeout(() => { abortBuffer = ""; }, 2000);
    if (abortBuffer === ABORT_CODE) {
        abortBuffer = "";
        abortTest();
    }
});

/* LÓGICA DA TRAVA DE 10 SEGUNDOS */
function startCoolDown() {
    state.lockNavigation = true;
    show('screen-post-trial');
    
    let timer = 10;
    btnOfficial.disabled = true;
    btnOfficial.style.opacity = "0.5";
    btnOfficial.innerText = `AGUARDE (${timer})`;

    const countdown = setInterval(() => {
        timer--;
        btnOfficial.innerText = `AGUARDE (${timer})`;
        
        if (timer <= 0) {
            clearInterval(countdown);
            state.lockNavigation = false;
            btnOfficial.disabled = false;
            btnOfficial.style.opacity = "1";
            btnOfficial.innerText = "ESPAÇO"; // Volta ao texto original
        }
    }, 1000);
}

function downloadCSV() {
    const timeEstimation = document.getElementById('input-time-est')?.value || '';
    const fields = ['indice', 'tipo_estimulo', 'tempo_reacao_ms', 'status', 'estimativa_tempo_min'];
    const rows = state.logs.map((l, i) => [
        i + 1,
        l.type === 'G' ? 'Go' : 'No-Go',
        l.rt ?? '',
        l.status,
        timeEstimation
    ]);
    const headerRow = ['campo', ...rows.map((_, i) => i + 1)];
    const fieldRows = fields.map((field, fi) => [field, ...rows.map(row => row[fi])]);
    const csv = [headerRow, ...fieldRows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados-go-nogo-visual-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}