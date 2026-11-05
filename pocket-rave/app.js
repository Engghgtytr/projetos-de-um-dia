// Bateria de 16 passos com Web Audio. Cada som é sintetizado (oscilador ou ruído), sem arquivo de áudio.
const TRILHAS = [
  { nome: 'Bumbo', padrao: [0, 4, 8, 12] },
  { nome: 'Caixa', padrao: [4, 12] },
  { nome: 'Chimbal', padrao: [2, 6, 10, 14] },
  { nome: 'Baixo', padrao: [0, 3, 8, 11] },
];
const ligado = TRILHAS.map((t) => Array.from({ length: 16 }, (_, i) => t.padrao.includes(i)));

let audio = null;
let ruido = null;
function iniciarAudio() {
  audio ??= new AudioContext();
  if (!ruido) {
    ruido = audio.createBuffer(1, audio.sampleRate * 0.5, audio.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
}

function envelope(no, t, volume, duracao) {
  const g = audio.createGain();
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duracao);
  no.connect(g).connect(audio.destination);
}

const SONS = [
  (t) => { // bumbo: seno que cai de 150 Hz para 45 Hz
    const o = audio.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    envelope(o, t, 1, 0.3); o.start(t); o.stop(t + 0.3);
  },
  (t) => { // caixa: ruído filtrado
    const s = audio.createBufferSource(); s.buffer = ruido;
    const f = audio.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200;
    s.connect(f); envelope(f, t, 0.5, 0.18); s.start(t); s.stop(t + 0.2);
  },
  (t) => { // chimbal: ruído bem agudo e curto
    const s = audio.createBufferSource(); s.buffer = ruido;
    const f = audio.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    s.connect(f); envelope(f, t, 0.25, 0.05); s.start(t); s.stop(t + 0.06);
  },
  (t) => { // baixo: dente de serra em lá grave
    const o = audio.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55;
    const f = audio.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
    o.connect(f); envelope(f, t, 0.35, 0.22); o.start(t); o.stop(t + 0.25);
  },
];

// ----- grade -----
const grade = document.getElementById('grade');
const celulas = TRILHAS.map((t, ti) => {
  const linha = document.createElement('div');
  linha.className = 'trilha';
  linha.setAttribute('role', 'row');
  const nome = document.createElement('span');
  nome.textContent = t.nome;
  linha.append(nome);
  const botoes = ligado[ti].map((on, pi) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'celula';
    b.setAttribute('aria-label', `${t.nome}, passo ${pi + 1}`);
    b.setAttribute('aria-pressed', String(on));
    b.addEventListener('click', () => {
      ligado[ti][pi] = !ligado[ti][pi];
      b.setAttribute('aria-pressed', String(ligado[ti][pi]));
      desenhar();
    });
    linha.append(b);
    return b;
  });
  grade.append(linha);
  return botoes;
});

// ----- tela OLED (128x64, 1 bit) -----
const tela = document.getElementById('oled').getContext('2d');
let passo = 0;   // próximo passo a agendar (relógio)
let visivel = 0; // passo que está tocando agora (tela)
let bpm = 120;
function desenhar() {
  tela.fillStyle = '#000'; tela.fillRect(0, 0, 128, 64);
  tela.fillStyle = '#7fe3ff';
  tela.font = '8px monospace';
  tela.fillText(`POCKET RAVE  ${bpm} BPM`, 2, 9);
  ligado.forEach((linha, ti) => linha.forEach((on, pi) => {
    const x = Math.round(2 + pi * 7.8), y = 16 + ti * 11;
    if (on) tela.fillRect(x, y, 6, 8); else tela.fillRect(x + 2, y + 3, 2, 2);
  }));
  if (tocando) tela.fillRect(Math.round(2 + visivel * 7.8), 60, 6, 2);
}

// ----- relógio: agenda os sons um pouco à frente (o setInterval sozinho atrasa) -----
let tocando = false;
let proximo = 0;
let timer = null;
function agendar() {
  while (proximo < audio.currentTime + 0.1) {
    ligado.forEach((linha, ti) => { if (linha[passo]) SONS[ti](proximo); });
    const p = passo;
    setTimeout(() => marcar(p), Math.max(0, (proximo - audio.currentTime) * 1000));
    proximo += 60 / bpm / 4; // 16 passos = 4 tempos
    passo = (passo + 1) % 16;
  }
}
function marcar(p) {
  celulas.forEach((linha) => linha.forEach((b, i) => b.classList.toggle('agora', tocando && i === p)));
  visivel = p;
  desenhar();
}

const botaoTocar = document.getElementById('tocar');
botaoTocar.addEventListener('click', async () => {
  iniciarAudio();
  await audio.resume();
  tocando = !tocando;
  botaoTocar.setAttribute('aria-pressed', String(tocando));
  botaoTocar.textContent = tocando ? 'Parar' : 'Tocar';
  if (tocando) { passo = 0; proximo = audio.currentTime + 0.05; timer = setInterval(agendar, 25); }
  else { clearInterval(timer); marcar(-1); }
});

const faixa = document.getElementById('bpm');
faixa.addEventListener('input', () => { bpm = +faixa.value; document.getElementById('bpm-valor').textContent = bpm; desenhar(); });
document.getElementById('limpar').addEventListener('click', () => {
  ligado.forEach((l, ti) => l.forEach((_, pi) => { l[pi] = false; celulas[ti][pi].setAttribute('aria-pressed', 'false'); }));
  desenhar();
});
desenhar();
