/* SEQUÊNCIAS */
const SEQ_TRIAL = ["G", "G", "G", "N", "G", "G", "G", "N", "G", "G", "G", "N", "G", "G", "N", "G", "G", "G", "G", "G"];
const SEQ_OFICIAL = ["G","G","G","G","N","G","N","G","G","N","G","G","G","G","G","G","N","G","G","G","G","N","G","G","G","G","G","G","N","G","G","G","G","G","N","G","G","G","N","G","G","G","N","G","N","N","G","N","G","G","G","G","G","N","G","G","G","G","G","G","G","G","G","N","G","G","N","N","N","G","G","G","N","G","G","G","N","G","G","G","N","G","G","N","G","G","G","G","G","N","G","G","G","G","N","N","G","N","G","G","N","N","G","G","G","G","G","G","N","G","G","G","N","G","G","G","G","G","N","G","N","G","N","G","G","N","N","G","G","G","G","G","G","G","G","N","G","G","N","G","G","N","G","N","N","G","G","G","G","G","N","G","G","G","G","G","N","G","G","G","N","G","G","G","N","G","G","G","G","N","G","G","G","G","G","G","N","G","N","N","G","G","N","G","N","G","G","N","G","G","G","G","G","G","N","N","N","G","G","G","G","G","N","G","N","G","G","N","G","G","G","G","N","N","G","G","G","G","G","G","N","G","G","G","G","G","N","G","G","G","G","G","G","N","G","G","N","G","G","G","G","G","G","N","G","G","N","G","G","G","G","N","G","G","G","G","G","G","N","G","N","N","G","G","G","G","G","N","N","G","G","N","G","G","G","G","G","N","G","G","G","G","G","G","N","N","G","G","G","G","G","G","G","G","N","G","G","G","G","G"];

let state = {
    participantId: '',
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
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
};

/* CONTROLE INICIAL E BOTÕES */
document.addEventListener('DOMContentLoaded', () => {
    const inputName = document.getElementById('participant-name-input');
    const btnSubmitName = document.getElementById('btn-submit-name');

    const submitName = () => {
        const val = inputName.value.trim();
        if (!val) {
            alert("Por favor, digite seu nome ou ID para começar o teste.");
            inputName.focus();
            return;
        }
        state.participantId = val;
        show('screen-intro');
    };

    if(btnSubmitName) btnSubmitName.addEventListener('click', submitName);
    if(inputName) inputName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitName();
    });

    document.getElementById('btn-trial').onclick = () => runTest(SEQ_TRIAL, false);
    btnOfficial.onclick = () => runTest(SEQ_OFICIAL, true);
    
    document.getElementById('btn-submit-est').onclick = () => {
        show('screen-results');
        sendResultsByEmail();
    };
    
    document.getElementById('btn-copy-bkp').onclick = copyToClipboard;
    document.getElementById('btn-exit').onclick = () => location.reload();
});


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
        startCoolDown(); 
    }
}

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
            btnOfficial.innerText = "ESPAÇO"; 
        }
    }, 1000);
}

// --- DISPARO DE EMAIL ---
async function sendResultsByEmail() {
    const statusText = document.getElementById('email-status-text');
    if(!statusText) return;
    statusText.textContent = '⏳ Enviando resultados para o servidor...';
    
    const timeEstimation = document.getElementById('input-time-est')?.value || '';
    const fields = ['indice', 'tipo_estimulo', 'tempo_reacao_ms', 'status', 'estimativa_tempo_min'];
    const rows = state.logs.map((l, i) => [
        i + 1,
        l.type === 'G' ? 'Go' : 'No-Go',
        l.rt ?? '',
        l.status,
        timeEstimation
    ]);
    
    const headerRow = fields.join(';');
    const csvContent = [headerRow, ...rows.map(r => r.join(';'))].join('\n');

    try {
        const response = await fetch('/api/enviar', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dadosCSV: csvContent,
                participante: state.participantId
            })
        });

        if (response.ok) {
            statusText.innerHTML = '✅ Resultados salvos e enviados com sucesso!';
            statusText.style.color = 'var(--cyan)';
        } else {
            throw new Error('Erro no servidor');
        }
    } catch (error) {
        console.error("Erro:", error);
        statusText.innerHTML = '❌ Erro no envio automático. Por favor, clique em "COPIAR DADOS BRUTOS".';
        statusText.style.color = 'var(--orange)';
    }
}

// --- BACKUP MANUAL ---
function copyToClipboard() {
    const timeEstimation = document.getElementById('input-time-est')?.value || '';
    const fields = ['indice', 'tipo_estimulo', 'tempo_reacao_ms', 'status', 'estimativa_tempo_min'];
    const rows = state.logs.map((l, i) => [
        i + 1,
        l.type === 'G' ? 'Go' : 'No-Go',
        l.rt ?? '',
        l.status,
        timeEstimation
    ]);
    
    let clipText = fields.join('\t') + '\n';
    rows.forEach(row => { clipText += row.join('\t') + '\n'; });
    
    navigator.clipboard.writeText(clipText).then(() => {
        alert("Resultados copiados! Cole (Ctrl+V) no Excel.");
    }).catch(err => {
        alert("Erro ao copiar.");
    });
}

// --- ABORTO DE SEGURANÇA (0001) ---
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
    sendResultsByEmail();
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