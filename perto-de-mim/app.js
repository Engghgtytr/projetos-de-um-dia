// Busca lugares com dados abertos: Nominatim acha a cidade, Overpass lista os lugares.
// Sem chave de API e sem servidor. Regras de uso: no máximo 1 busca por segundo.
const form = document.getElementById('busca');
const lista = document.getElementById('resultados');
const erroLugar = document.getElementById('erro-lugar');
const botoes = form.querySelectorAll('button');

const mapa = L.map('mapa').setView([-15.8, -47.9], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '© OpenStreetMap',
}).addTo(mapa);
const camada = L.layerGroup().addTo(mapa);

// Monta o HTML com textContent (nunca innerHTML): nome de lugar vem de fora e não pode virar código
function el(tag, props = {}, ...filhos) {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...filhos);
  return n;
}

function estado(...filhos) { lista.replaceChildren(...filhos); }
function carregando(sim) {
  botoes.forEach((b) => { b.disabled = sim; });
  lista.setAttribute('aria-busy', String(sim));
  if (sim) estado(...[1, 2, 3].map(() => el('div', { className: 'esqueleto' })));
}
function mostrarErro(texto) { estado(el('p', { className: 'vazio', textContent: texto })); }

async function pedirJson(url, opcoes) {
  const r = await fetch(url, { ...opcoes, signal: AbortSignal.timeout(opcoes?.method === 'POST' ? 35000 : 15000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function acharCidade(texto) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(texto)}`;
  const [lugar] = await pedirJson(url, { headers: { 'Accept-Language': 'pt-BR' } });
  return lugar ? { lat: +lugar.lat, lon: +lugar.lon, nome: lugar.display_name.split(',').slice(0, 2).join(',') } : null;
}

const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

async function buscarLugares(filtro, { lat, lon }) {
  const consulta = `[out:json][timeout:20];nwr[${filtro}](around:3000,${lat},${lon});out center 60;`;
  let dados;
  for (const servidor of OVERPASS) { // o servidor principal vive lotado: tenta os espelhos públicos
    try { dados = await pedirJson(servidor, { method: 'POST', body: new URLSearchParams({ data: consulta }) }); break; }
    catch (e) { console.warn(servidor, e.message); }
  }
  if (!dados) throw new Error('Nenhum servidor Overpass respondeu');
  return dados.elements
    .map((e) => ({ id: e.id, nome: e.tags?.name, lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, site: e.tags?.website || e.tags?.['contact:website'], rua: [e.tags?.['addr:street'], e.tags?.['addr:housenumber']].filter(Boolean).join(', '), fone: e.tags?.phone || e.tags?.['contact:phone'] }))
    .filter((l) => l.nome && l.lat);
}

function mostrar(lugares, centro, tipoNome, ondeNome) {
  camada.clearLayers();
  mapa.setView([centro.lat, centro.lon], 14);
  if (!lugares.length) {
    return estado(el('p', { className: 'vazio' }, 'Nada encontrado para ', el('strong', { textContent: tipoNome.toLowerCase() }), ` perto de ${ondeNome}. Tente outro bairro ou outro tipo.`));
  }
  const semSite = lugares.filter((l) => !l.site).length;
  const itens = lugares.map((l) => {
    const marcador = L.marker([l.lat, l.lon], { title: l.nome }).addTo(camada).bindPopup(l.nome);
    const h = el('h2', { textContent: l.nome });
    if (!l.site) h.append(el('span', { className: 'etiqueta sem-site', textContent: 'sem site' }));
    const info = [l.rua, l.fone].filter(Boolean).join(' · ') || 'Endereço não cadastrado';
    const ver = el('button', { type: 'button', className: 'secundario', textContent: 'Ver no mapa' });
    ver.addEventListener('click', () => { mapa.setView([l.lat, l.lon], 17); marcador.openPopup(); });
    const filhos = [h, el('p', { textContent: info })];
    if (l.site) filhos.push(el('p', {}, el('a', { href: l.site.startsWith('http') ? l.site : `https://${l.site}`, textContent: 'Abrir site', rel: 'noopener', target: '_blank' })));
    return el('li', { className: 'item' }, ...filhos, ver);
  });
  estado(el('p', { className: 'resumo', textContent: `${lugares.length} encontrados perto de ${ondeNome} · ${semSite} sem site cadastrado` }), el('ul', { className: 'lista' }, ...itens));
}

async function buscar(centroPronto) {
  const tipo = form.tipo;
  const tipoNome = tipo.options[tipo.selectedIndex].text;
  const texto = form.lugar.value.trim();
  erroLugar.hidden = true; form.lugar.removeAttribute('aria-invalid');
  if (!centroPronto && !texto) {
    erroLugar.textContent = 'Digite uma cidade ou bairro, ou use a sua localização.';
    erroLugar.hidden = false; form.lugar.setAttribute('aria-invalid', 'true'); form.lugar.focus();
    return;
  }
  carregando(true);
  try {
    const centro = centroPronto ?? await acharCidade(texto);
    if (!centro) return mostrarErro(`Não achei "${texto}". Confira o nome e tente de novo.`);
    const lugares = await buscarLugares(tipo.value, centro);
    mostrar(lugares, centro, tipoNome, centroPronto ? 'você' : texto);
  } catch (e) {
    console.error(e);
    mostrarErro('O serviço de mapas não respondeu agora. Espere alguns segundos e tente de novo.');
  } finally {
    carregando(false);
  }
}

form.addEventListener('submit', (e) => { e.preventDefault(); buscar(); });
document.getElementById('aqui').addEventListener('click', () => {
  if (!navigator.geolocation) return mostrarErro('Seu navegador não permite pegar a localização. Digite a cidade.');
  carregando(true);
  navigator.geolocation.getCurrentPosition(
    (p) => buscar({ lat: p.coords.latitude, lon: p.coords.longitude, nome: 'você' }),
    () => { carregando(false); mostrarErro('Sem permissão para a localização. Digite a cidade.'); },
    { timeout: 10000 },
  );
});
