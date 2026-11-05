// Atendente por voz: ouve (SpeechRecognition), entende por palavras-chave e responde falando (speechSynthesis).
// Os dados são os da Chapa Sete, a loja fictícia do projeto cardapio-digital.
const LOJA = {
  endereco: 'Rua dos Exemplos, 77, no Centro',
  taxaEntrega: 6,
  horarios: { 0: [18, 23.5], 1: null, 2: [18, 23.5], 3: [18, 23.5], 4: [18, 23.5], 5: [18, 23.5], 6: [18, 23.5] },
  itens: [
    { nome: 'Clássico Smash', chaves: ['classico', 'tradicional'], preco: 29.9 },
    { nome: 'Bacon Smash', chaves: ['bacon smash', 'bacon'], preco: 34.9 },
    { nome: 'Salada Smash', chaves: ['salada'], preco: 31.9 },
    { nome: 'Onion Smash', chaves: ['onion smash', 'onion'], preco: 33.9 },
    { nome: 'Frango Crispy', chaves: ['frango', 'crispy'], preco: 32.9 },
    { nome: 'Veggie Smash', chaves: ['veggie', 'vegetariano', 'vegetariana', 'vegano', 'sem carne'], preco: 32.9 },
    { nome: 'Batata frita', chaves: ['batata frita', 'batata'], preco: 16.9 },
    { nome: 'Batata cheddar e bacon', chaves: ['batata cheddar', 'cheddar e bacon'], preco: 24.9 },
    { nome: 'Onion rings', chaves: ['onion rings', 'aneis', 'cebola empanada'], preco: 19.9 },
  ],
};

const reais = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const sem = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function aberto(agora = new Date()) {
  const h = LOJA.horarios[agora.getDay()];
  const hora = agora.getHours() + agora.getMinutes() / 60;
  return h && hora >= h[0] && hora < h[1];
}

/** Escolhe a resposta pela pergunta. Exportada no fim para o teste. */
function responder(pergunta, agora = new Date()) {
  const p = sem(pergunta);
  const item = LOJA.itens
    .flatMap((i) => i.chaves.map((c) => ({ i, c })))
    .sort((a, b) => b.c.length - a.c.length) // "batata cheddar" ganha de "batata"
    .find(({ c }) => p.includes(c))?.i;

  if (/vegetarian|vegan|sem carne|veggie/.test(p)) return 'Temos sim: o Veggie Smash, com burger de grão-de-bico, por ' + reais(32.9) + '.';
  if (item) return `O ${item.nome} sai por ${reais(item.preco)}.`;
  if (/abert|fechad|horario|funciona|que horas/.test(p)) {
    return aberto(agora) ? 'Estamos abertos agora, até as 23h30.' : 'Agora estamos fechados. Abrimos de terça a domingo, das 18h às 23h30.';
  }
  if (/onde|endereco|fica|localiza/.test(p)) return `Ficamos na ${LOJA.endereco}.`;
  if (/entrega|taxa|delivery/.test(p)) return `Entregamos sim. A taxa de entrega é ${reais(LOJA.taxaEntrega)}.`;
  // A loja fictícia não define formas de pagamento: o atendente não inventa
  if (/pag|pix|cartao|dinheiro/.test(p)) return 'A forma de pagamento você combina com a loja na hora de fechar o pedido.';
  if (/cardapio|menu|tem o que|opcoes|lanche/.test(p)) return 'Temos seis burgers, de ' + reais(29.9) + ' a ' + reais(34.9) + ', além de batata, onion rings, bebidas e sobremesas. Quer saber o preço de algum?';
  if (/oi|ola|bom dia|boa tarde|boa noite/.test(p)) return 'Oi! Sou o atendente da Chapa Sete. Posso falar do horário, endereço, entrega ou preços.';
  return 'Desculpa, não entendi. Pode perguntar sobre horário, endereço, entrega, pagamento ou o preço de um lanche.';
}

const conversa = document.getElementById('conversa');
const status = document.getElementById('status');
const botao = document.getElementById('falar');

function balao(quem, texto) {
  const li = document.createElement('li');
  li.className = quem;
  li.textContent = texto;
  conversa.append(li);
  li.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function falar(texto) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = 'pt-BR';
  fala.voice = speechSynthesis.getVoices().find((v) => v.lang === 'pt-BR') ?? null;
  speechSynthesis.speak(fala);
}

function atender(pergunta) {
  if (!pergunta.trim()) return;
  balao('cliente', pergunta);
  const r = responder(pergunta);
  balao('atendente', r);
  falar(r);
}

document.getElementById('texto').addEventListener('submit', (e) => {
  e.preventDefault();
  const campo = e.target.pergunta;
  atender(campo.value);
  campo.value = '';
});

const Reconhecer = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!Reconhecer) {
  botao.disabled = true;
  status.textContent = 'Seu navegador não reconhece voz. Use o campo de texto abaixo.';
} else {
  const rec = new Reconhecer();
  rec.lang = 'pt-BR';
  rec.interimResults = false;
  let ouvindo = false;
  const parar = () => { ouvindo = false; botao.setAttribute('aria-pressed', 'false'); };
  botao.addEventListener('click', () => {
    if (ouvindo) return rec.stop();
    speechSynthesis?.cancel();
    rec.start();
    ouvindo = true;
    botao.setAttribute('aria-pressed', 'true');
    status.textContent = 'Ouvindo... pode falar.';
  });
  rec.addEventListener('result', (e) => { status.textContent = 'Pronto para ouvir.'; atender(e.results[0][0].transcript); });
  rec.addEventListener('error', (e) => {
    status.textContent = e.error === 'not-allowed' ? 'Sem permissão para o microfone. Libere nas configurações do navegador ou escreva.' : 'Não deu para ouvir. Tente de novo ou escreva.';
  });
  rec.addEventListener('end', parar);
}

if (typeof module !== 'undefined') module.exports = { responder };
