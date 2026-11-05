// Pausar/retomar (começa pausado com "reduzir movimento") e repetir a animação de entrada.
const botao = document.getElementById('pausar');
const pagina = document.body;

function pausar(sim) {
  pagina.classList.toggle('pausado', sim);
  botao.setAttribute('aria-pressed', String(sim));
  botao.textContent = sim ? 'Tocar animações' : 'Pausar animações';
}
pausar(matchMedia('(prefers-reduced-motion: reduce)').matches);
botao.addEventListener('click', () => pausar(!pagina.classList.contains('pausado')));

document.querySelectorAll('.repetir').forEach((b) => b.addEventListener('click', () => {
  const alvo = b.closest('.card').querySelector(`.${b.dataset.alvo}`);
  alvo.style.animation = 'none';
  void alvo.getBoundingClientRect(); // força o navegador a "esquecer" a animação antes de ligar de novo
  alvo.style.animation = '';
}));
