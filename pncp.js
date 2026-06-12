// ===== MÓDULO PNCP — Portal Nacional de Contratações Públicas =====
// API Pública: https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao
// Dados abertos — sem autenticação necessária

const PNCP_BASE = 'https://pncp.gov.br/api/consulta/v1';

// Estado local dos editais pendentes encontrados na busca
let PNCP_PENDENTES = [];
let PNCP_IGNORADOS = new Set();
// Cache para passar objetos complexos via onclick (evita JSON no atributo HTML)
const PNCP_CACHE = new Map();
let _pncpCacheIdx = 0;

// Mapeamento de modalidades PNCP
const PNCP_MODALIDADES = {
  1: 'Leilão',
  2: 'Diálogo Competitivo',
  3: 'Concurso',
  4: 'Concorrência',
  5: 'Pregão',
  6: 'Credenciamento',
  7: 'Pré-qualificação',
  8: 'Dispensa',
  9: 'Inexigibilidade',
  10: 'Manifestação de Interesse',
  11: 'Pré-qualificação de Artes Cênicas',
  12: 'Licitação Internacional',
  13: 'RDC',
};

// ===== RENDER DO PAINEL PNCP (injetado em renderEditais) =====
function renderPNCPPanel() {
  const hoje = new Date();
  const seteDiasAtras = new Date(hoje);
  seteDiasAtras.setDate(hoje.getDate() - 7);

  const fmt8 = d => d.toISOString().slice(0, 10).replace(/-/g, '');
  const fmtInput = d => d.toISOString().slice(0, 10);

  return `
  <div id="pncp-panel" style="margin-bottom:20px">
    <!-- Cabeçalho expansível -->
    <div id="pncp-header" onclick="togglePNCPPanel()"
      style="background:linear-gradient(135deg,#1e3a5f,#185FA5);border-radius:12px;padding:16px 20px;cursor:pointer;user-select:none;
             display:flex;align-items:center;justify-content:space-between;transition:border-radius .2s">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="background:rgba(255,255,255,.15);border-radius:8px;width:36px;height:36px;display:flex;align-items:center;justify-content:center">
          <i class="ti ti-building-community" style="color:#fff;font-size:1.2rem"></i>
        </div>
        <div>
          <div style="color:#fff;font-weight:700;font-size:.95rem;display:flex;align-items:center;gap:8px">
            🤖 Buscar Novos Editais — PNCP
            <span style="background:rgba(255,255,255,.2);color:#fff;font-size:.65rem;padding:2px 8px;border-radius:99px;font-weight:600">Compras.gov.br</span>
          </div>
          <div style="color:rgba(255,255,255,.7);font-size:.75rem;margin-top:2px">API pública oficial do Governo Federal • Sem chave necessária</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div id="pncp-badge-count" style="display:none;background:#10b981;color:#fff;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:99px"></div>
        <i id="pncp-chevron" class="ti ti-chevron-down" style="color:rgba(255,255,255,.8);font-size:1.2rem;transition:transform .2s"></i>
      </div>
    </div>

    <!-- Corpo do painel (colapsável) -->
    <div id="pncp-body" style="display:none;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px">

      <!-- Filtros -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px">
        <div class="form-group" style="margin:0">
          <label>📅 Data Inicial</label>
          <input type="date" id="pncp-data-ini" value="${fmtInput(seteDiasAtras)}">
        </div>
        <div class="form-group" style="margin:0">
          <label>📅 Data Final</label>
          <input type="date" id="pncp-data-fim" value="${fmtInput(hoje)}">
        </div>
        <div class="form-group" style="margin:0">
          <label>🗺️ UF (estado)</label>
          <select id="pncp-uf">
            <option value="">Todos os estados</option>
            ${['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']
              .map(u => `<option value="${u}">${u}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label>📋 Modalidade</label>
          <select id="pncp-modalidade">
            <option value="">Todas</option>
            ${Object.entries(PNCP_MODALIDADES).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0;grid-column:1/-1">
          <label>🔎 Palavra-chave no objeto (filtra localmente)</label>
          <div class="search-box" style="width:100%">
            <i class="ti ti-filter"></i>
            <input id="pncp-keyword" placeholder="Ex: notebooks, limpeza, vigilância..." style="width:100%;padding-left:34px">
          </div>
        </div>
      </div>

      <!-- Ações -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f3f4f6">
        <button class="btn btn-primary" id="btn-pncp-buscar" onclick="buscarEditalPNCP(1)">
          <i class="ti ti-search"></i> Buscar no PNCP
        </button>
        <button class="btn btn-outline" onclick="buscarEditalPNCP(window._pncpPagina||1)" id="btn-pncp-reload" style="display:none">
          <i class="ti ti-refresh"></i> Recarregar
        </button>
        <div id="pncp-paginator" style="display:none;margin-left:auto;display:flex;align-items:center;gap:8px">
          <button class="btn btn-sm btn-outline" id="btn-pncp-prev" onclick="buscarEditalPNCP((window._pncpPagina||1)-1)">
            <i class="ti ti-chevron-left"></i> Anterior
          </button>
          <span id="pncp-pag-info" style="font-size:.78rem;color:var(--gray-600);white-space:nowrap"></span>
          <button class="btn btn-sm btn-outline" id="btn-pncp-next" onclick="buscarEditalPNCP((window._pncpPagina||1)+1)">
            Próxima <i class="ti ti-chevron-right"></i>
          </button>
        </div>
      </div>

      <!-- Área de resultados -->
      <div id="pncp-results">
        <div style="text-align:center;padding:32px;color:var(--gray-400)">
          <i class="ti ti-building-community" style="font-size:2.5rem;display:block;margin-bottom:10px"></i>
          <div style="font-size:.9rem;font-weight:600">Pronto para buscar!</div>
          <div style="font-size:.78rem;margin-top:4px">Defina os filtros acima e clique em "Buscar no PNCP"</div>
        </div>
      </div>
    </div>
  </div>`;
}

// ===== TOGGLE DO PAINEL =====
window.togglePNCPPanel = function() {
  const body = document.getElementById('pncp-body');
  const chevron = document.getElementById('pncp-chevron');
  const header = document.getElementById('pncp-header');
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
  if (header) header.style.borderRadius = isOpen ? '12px' : '12px 12px 0 0';
};

// ===== BUSCA NA API PNCP =====
// NOTA: codigoModalidadeContratacao é OBRIGATÓRIO na API do PNCP.
// Quando o usuário seleciona "Todas", fazemos buscas paralelas por modalidade.
const PNCP_MODALIDADES_BUSCA = [7, 5, 8, 9, 4, 6]; // Pregão eletr, Concorrência, Dispensa, Inexigibilidade, Concorrência pres, Credenciamento

window.buscarEditalPNCP = async function(pagina = 1) {
  const btn = document.getElementById('btn-pncp-buscar');
  const resultsEl = document.getElementById('pncp-results');
  if (!resultsEl) return;

  const dataIni = document.getElementById('pncp-data-ini')?.value?.replace(/-/g, '') || '';
  const dataFim = document.getElementById('pncp-data-fim')?.value?.replace(/-/g, '') || '';
  const uf = document.getElementById('pncp-uf')?.value || '';
  const modalidade = document.getElementById('pncp-modalidade')?.value || '';
  const keyword = (document.getElementById('pncp-keyword')?.value || '').toLowerCase().trim();

  if (!dataIni || !dataFim) {
    mostrarPNCPErro('Informe as datas de início e fim.');
    return;
  }

  // Validar período (API limita a 31 dias)
  const d1 = new Date(dataIni.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  const d2 = new Date(dataFim.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  if ((d2 - d1) / 86400000 > 31) {
    mostrarPNCPErro('O período máximo de busca é de 31 dias. Reduza o intervalo.');
    return;
  }

  window._pncpPagina = pagina;

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Buscando...'; }
  resultsEl.innerHTML = `
    <div style="text-align:center;padding:40px;color:var(--primary)">
      <div style="width:48px;height:48px;border:4px solid var(--primary-light);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 14px"></div>
      <div style="font-weight:600;font-size:.9rem">Consultando Portal Nacional de Contratações Públicas...</div>
      <div style="font-size:.75rem;color:var(--gray-500);margin-top:6px">Aguarde, conectando à API do Governo Federal</div>
    </div>`;

  try {
    let todosItens = [];
    let totalReg = 0;
    let totalPag = 1;
    let pagAtual = pagina;

    // Função para buscar uma modalidade específica
    const fetchModalidade = async (codMod) => {
      let url = `${PNCP_BASE}/contratacoes/publicacao?dataInicial=${dataIni}&dataFinal=${dataFim}&pagina=${pagina}&tamanhoPagina=20&codigoModalidadeContratacao=${codMod}`;
      if (uf) url += `&uf=${uf}`;
      const res = await fetch(url);
      if (res.status === 404) return null; // sem resultados para esta modalidade
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    };

    if (modalidade) {
      // ── Modalidade específica selecionada ──
      const data = await fetchModalidade(modalidade);
      if (data) {
        todosItens = Array.isArray(data) ? data : (data.data || []);
        totalReg = data.totalRegistros || todosItens.length;
        totalPag = data.totalPaginas || 1;
        pagAtual = data.numeroPagina || pagina;
      }
    } else {
      // ── "Todas": busca paralela nas principais modalidades ──
      resultsEl.querySelector('div > div:nth-child(2)').textContent = 'Buscando em múltiplas modalidades...';
      const resultados = await Promise.allSettled(
        PNCP_MODALIDADES_BUSCA.map(cod => fetchModalidade(cod))
      );

      // Combinar resultados bem-sucedidos, removendo duplicatas por numeroControlePNCP
      const vistosKeys = new Set();
      resultados.forEach(r => {
        if (r.status === 'fulfilled' && r.value) {
          const itens = Array.isArray(r.value) ? r.value : (r.value.data || []);
          totalReg += r.value.totalRegistros || itens.length;
          itens.forEach(item => {
            const key = item.numeroControlePNCP || String(item.sequencialCompra);
            if (!vistosKeys.has(key)) {
              vistosKeys.add(key);
              todosItens.push(item);
            }
          });
        }
      });

      // Ordenar por data de publicação (mais recente primeiro)
      todosItens.sort((a, b) => {
        const da = a.dataPublicacaoPncp || '';
        const db = b.dataPublicacaoPncp || '';
        return db.localeCompare(da);
      });

      // Paginação manual no modo "Todas"
      totalPag = 1; // paginação simples quando agregado
      pagAtual = 1;
    }

    if (todosItens.length === 0) {
      resultsEl.innerHTML = renderPNCPVazio('Nenhuma licitação encontrada para o período/filtros selecionados.');
      return;
    }

    // Filtro local por palavra-chave
    const filtrados = keyword
      ? todosItens.filter(i => (i.objetoCompra || '').toLowerCase().includes(keyword) || (i.orgaoEntidade?.razaoSocial || '').toLowerCase().includes(keyword))
      : todosItens;

    // Salvar pendentes (excluindo já ignorados e já aceitos)
    PNCP_PENDENTES = filtrados.filter(i => {
      const key = i.numeroControlePNCP || String(i.sequencialCompra);
      return !PNCP_IGNORADOS.has(key) && !EDITAIS.some(e => e.pncp_id === key);
    });

    renderPNCPResultados(PNCP_PENDENTES, pagAtual, totalPag, totalReg, keyword);
    atualizarBadgePNCP();

    // Paginação (só disponível quando modalidade específica)
    const pag = document.getElementById('pncp-paginator');
    const pagInfo = document.getElementById('pncp-pag-info');
    const btnPrev = document.getElementById('btn-pncp-prev');
    const btnNext = document.getElementById('btn-pncp-next');
    if (pag && totalPag > 1 && modalidade) {
      pag.style.display = 'flex';
      if (pagInfo) pagInfo.textContent = `Página ${pagAtual} de ${totalPag} (${totalReg} registros)`;
      if (btnPrev) btnPrev.disabled = pagAtual <= 1;
      if (btnNext) btnNext.disabled = pagAtual >= totalPag;
    } else if (pag) {
      pag.style.display = 'none';
    }

    const reloadBtn = document.getElementById('btn-pncp-reload');
    if (reloadBtn) reloadBtn.style.display = 'inline-flex';

  } catch (err) {
    console.error('[PNCP]', err);
    mostrarPNCPErro(`${err.message} — Verifique os filtros e tente novamente.`);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-search"></i> Buscar no PNCP'; }
  }
};


// ===== RENDER DE RESULTADOS =====
function renderPNCPResultados(itens, pagAtual, totalPag, totalReg, keyword) {
  const resultsEl = document.getElementById('pncp-results');
  if (!resultsEl) return;

  if (!itens || itens.length === 0) {
    resultsEl.innerHTML = renderPNCPVazio(keyword ? `Nenhum resultado para "${keyword}" neste período.` : 'Nenhuma licitação encontrada para os filtros selecionados.');
    return;
  }

  const aceitos = EDITAIS.filter(e => e.pncp_id).length;

  resultsEl.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div style="font-size:.82rem;color:var(--gray-600)">
        <strong style="color:var(--gray-900)">${itens.length}</strong> licitações encontradas${keyword ? ` para "<em>${keyword}</em>"` : ''}
        ${aceitos > 0 ? `<span class="chip chip-green" style="margin-left:8px"><i class="ti ti-check" style="font-size:.65rem"></i> ${aceitos} já aceito${aceitos>1?'s':''}</span>` : ''}
      </div>
      <button class="btn btn-sm btn-outline" style="color:var(--success);border-color:var(--success)" onclick="aceitarTodosPNCP()">
        <i class="ti ti-checks"></i> Aceitar todos (${itens.length})
      </button>
    </div>
    <div id="pncp-cards-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px">
      ${itens.map(item => renderPNCPCard(item)).join('')}
    </div>`;
}

// ===== CARD INDIVIDUAL =====
function renderPNCPCard(item) {
  const key = item.numeroControlePNCP || String(item.sequencialCompra);
  const jaAceito = EDITAIS.some(e => e.pncp_id === key);
  const modalNome = PNCP_MODALIDADES[item.codigoModalidadeContratacao] || item.modalidadeNome || 'N/D';
  const orgao = item.orgaoEntidade?.razaoSocial || item.nomeRazaoSocialFornecedor || '—';
  const uf = item.unidadeOrgao?.ufSigla || item.uf || '';
  const valor = item.valorTotalEstimado || item.valorTotalHomologado || 0;
  const objeto = item.objetoCompra || '(sem descrição)';
  const dataPub = item.dataPublicacaoPncp?.slice(0, 10) || item.dataAberturaProposta?.slice(0, 10) || '';
  const dataAbertura = item.dataAberturaProposta?.slice(0, 10) || item.dataEncerramentoProposta?.slice(0, 10) || '';
  const numPNCP = item.numeroControlePNCP || `PNCP-${item.sequencialCompra}`;
  const linkOrigem = item.linkSistemaOrigem || `https://pncp.gov.br/app/editais/${key}`;

  // Calcular matches com clientes
  const palavrasObj = objeto.toLowerCase().split(/[\s,;.]+/).filter(w => w.length > 3);
  const matchClientes = (typeof CLIENTES !== 'undefined' ? CLIENTES : []).filter(c =>
    c.keywords && c.keywords.some(k => palavrasObj.some(p => p.includes(k.toLowerCase()) || k.toLowerCase().includes(p)))
  ).slice(0, 3);

  const valorFmt = valor > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor) : 'Valor não divulgado';

  if (jaAceito) {
    return `
    <div id="pncp-card-${key.replace(/[^a-z0-9]/gi,'_')}" class="pncp-card pncp-aceito">
      <div style="display:flex;align-items:center;gap:8px;color:var(--success);font-weight:700;font-size:.8rem">
        <i class="ti ti-circle-check"></i> Edital aceito — disponível para Análise IA
      </div>
      <div style="font-size:.75rem;color:var(--gray-500);margin-top:4px">${numPNCP} • ${orgao.substring(0,50)}</div>
    </div>`;
  }

  return `
  <div id="pncp-card-${key.replace(/[^a-z0-9]/gi,'_')}" class="pncp-card">
    <!-- Header do card -->
    <div class="pncp-card-header">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px">
          <span class="chip chip-blue" style="font-size:.65rem">${modalNome}</span>
          ${uf ? `<span class="chip chip-gray" style="font-size:.65rem"><i class="ti ti-map-pin" style="font-size:.6rem"></i> ${uf}</span>` : ''}
          ${dataPub ? `<span class="chip chip-gray" style="font-size:.65rem">Pub. ${dataPub.split('-').reverse().join('/')}</span>` : ''}
        </div>
        <div style="font-size:.75rem;font-weight:700;color:var(--gray-500);font-family:monospace;letter-spacing:.5px">${numPNCP}</div>
      </div>
      ${valor > 0 ? `<div style="text-align:right;flex-shrink:0">
        <div style="font-size:.95rem;font-weight:800;color:var(--primary)">${valorFmt}</div>
        <div style="font-size:.62rem;color:var(--gray-400);margin-top:1px">valor estimado</div>
      </div>` : ''}
    </div>

    <!-- Órgão -->
    <div style="font-size:.8rem;font-weight:600;color:var(--gray-800);margin-bottom:6px;display:flex;align-items:flex-start;gap:6px">
      <i class="ti ti-building" style="color:var(--primary);flex-shrink:0;margin-top:1px"></i>
      <span style="overflow:hidden;text-overflow:ellipsis">${orgao}</span>
    </div>

    <!-- Objeto -->
    <div style="font-size:.78rem;color:var(--gray-600);line-height:1.5;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden" title="${objeto.replace(/"/g,"'")}">
      ${objeto}
    </div>

    <!-- Data de abertura + Matches -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;flex-wrap:wrap">
      ${dataAbertura ? `<div style="font-size:.75rem;color:var(--gray-500)"><i class="ti ti-calendar" style="color:var(--warning)"></i> Abertura: <strong>${dataAbertura.split('-').reverse().join('/')}</strong></div>` : '<div></div>'}
      ${matchClientes.length > 0
        ? `<div style="display:flex;gap:3px;flex-wrap:wrap">${matchClientes.map(c => `<span class="chip chip-green" style="font-size:.62rem" title="${c.nome}"><i class="ti ti-link" style="font-size:.55rem"></i> ${c.nome.split(' ')[0]}</span>`).join('')}</div>`
        : '<span style="font-size:.68rem;color:var(--gray-400)">Sem match com clientes</span>'}
    </div>

    <!-- Ações -->
    <div style="display:flex;gap:8px;border-top:1px solid var(--gray-100);padding-top:10px">
      <button class="btn btn-success btn-sm" style="flex:1;justify-content:center" onclick="aceitarEditalPNCP(_pncpIdx_${key.replace(/[^a-z0-9]/gi,'_')})">
        <i class="ti ti-check"></i> Aceitar
      </button>
      <a href="${linkOrigem}" target="_blank" class="btn btn-outline btn-sm" title="Ver no PNCP" style="padding:5px 10px">
        <i class="ti ti-external-link"></i>
      </a>
      <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger-light);padding:5px 10px" onclick="ignorarEditalPNCP('${key}')" title="Ignorar">
        <i class="ti ti-x"></i>
      </button>
    </div>
  </div>
  <script>window._pncpIdx_${key.replace(/[^a-z0-9]/gi,'_')} = ${++_pncpCacheIdx}; PNCP_CACHE.set(${_pncpCacheIdx}, ${JSON.stringify(item).replace(/<\/script>/gi,'<\/scr"+"ipt>')});<\/script>`;
}

// ===== ACEITAR EDITAL =====
// Recebe um índice numérico do PNCP_CACHE (evita passar JSON via onclick)
window.aceitarEditalPNCP = function(idxOuItem) {
  let item = idxOuItem;
  if (typeof idxOuItem === 'number') {
    item = PNCP_CACHE.get(idxOuItem);
    if (!item) { console.error('[PNCP] item não encontrado no cache:', idxOuItem); return; }
  } else if (typeof idxOuItem === 'string') {
    try { item = JSON.parse(idxOuItem); } catch(e) { return; }
  }

  const key = item.numeroControlePNCP || String(item.sequencialCompra);
  const orgao = item.orgaoEntidade?.razaoSocial || '—';
  const objeto = item.objetoCompra || '';
  const valor = item.valorTotalEstimado || item.valorTotalHomologado || 0;
  const modalNome = PNCP_MODALIDADES[item.codigoModalidadeContratacao] || item.modalidadeNome || 'Pregão';
  const dataAbertura = (item.dataAberturaProposta || item.dataPublicacaoPncp || '').slice(0, 10);
  const linkOrigem = item.linkSistemaOrigem || `https://pncp.gov.br/app/editais/${key}`;

  // Extrair keywords do objeto + órgão automaticamente (melhora o matching)
  const textoBase = (objeto + ' ' + orgao).toLowerCase();
  const keywords = [...new Set(
    textoBase.split(/[\s,;.\-\/\(\)]+/)
      .filter(w => w.length > 3)
      .slice(0, 20)
  )];

  // Normalizar modalidade para o sistema local
  const modalMap = {
    'Pregão': 'Pregão', 'Concorrência': 'Concorrência', 'RDC': 'RDC',
    'Tomada de Preços': 'Tomada de Preços', 'Leilão': 'RDC', 'Dispensa': 'Pregão',
    'Inexigibilidade': 'Pregão', 'Concurso': 'Concorrência'
  };
  const modalLocal = Object.keys(modalMap).find(k => modalNome.includes(k)) || 'Pregão';

  const novoEdital = {
    id: Date.now(),
    pncp_id: key,
    numero: key,
    modalidade: modalLocal,
    orgao: orgao,
    valorEstimado: valor,
    dataAbertura: dataAbertura,
    status: 'Aberto',
    objeto: objeto,
    plataforma: 'PNCP / Compras.gov.br',
    keywords: keywords,
    url_edital: linkOrigem,
    ai_analysis: '',
    ai_provider: '',
    pdf_text: ''
  };

  // Adicionar ao array global
  EDITAIS.push(novoEdital);

  // Tentar salvar no Supabase (sem bloquear)
  if (typeof dbSaveEdital === 'function') {
    dbSaveEdital({
      numero: novoEdital.numero,
      modalidade: novoEdital.modalidade,
      orgao: novoEdital.orgao,
      valor_estimado: novoEdital.valorEstimado,
      data_abertura: novoEdital.dataAbertura,
      status: novoEdital.status,
      objeto: novoEdital.objeto,
      plataforma: novoEdital.plataforma,
      keywords: novoEdital.keywords,
      ai_analysis: '',
      ai_provider: '',
      pdf_text: ''
    }).then(async saved => {
      if (saved?.id) {
        novoEdital.id = saved.id;
        dbAddToPipeline(saved.id, 'prospeccao', 'media').catch(() => {});
        
        // VINCULAR CLIENTES COM MATCH AUTOMATICAMENTE
        const palavrasObj = objeto.toLowerCase().split(/[\s,;.]+/).filter(w => w.length > 3);
        const matchClientes = (typeof CLIENTES !== 'undefined' ? CLIENTES : []).filter(c =>
          c.keywords && c.keywords.some(k => palavrasObj.some(p => p.includes(k.toLowerCase()) || k.toLowerCase().includes(p)))
        ).slice(0, 3);
        
        for (const c of matchClientes) {
          try {
            const vinculo = await dbVincularCliente(saved.id, c.id);
            if (vinculo && typeof EDITAL_CLIENTES !== 'undefined') {
              if (!EDITAL_CLIENTES.some(ec => String(ec.edital_id) === String(saved.id) && String(ec.cliente_id) === String(c.id))) {
                EDITAL_CLIENTES.push(vinculo);
              }
            }
          } catch (err) {
            console.error('[PNCP] Erro ao vincular cliente automático:', err);
          }
        }
        
        if (typeof filterCRM === 'function') filterCRM();
      }
    }).catch(() => {});
  } else {
    // FALLBACK SE SUPABASE NÃO ESTIVER DISPONÍVEL (SALVAR EM FALLBACK LOCAL)
    const palavrasObj = objeto.toLowerCase().split(/[\s,;.]+/).filter(w => w.length > 3);
    const matchClientes = (typeof CLIENTES !== 'undefined' ? CLIENTES : []).filter(c =>
      c.keywords && c.keywords.some(k => palavrasObj.some(p => p.includes(k.toLowerCase()) || k.toLowerCase().includes(p)))
    ).slice(0, 3);
    
    matchClientes.forEach(c => {
      if (typeof dbVincularCliente === 'function') {
        dbVincularCliente(novoEdital.id, c.id).then(vinculo => {
          if (vinculo && typeof EDITAL_CLIENTES !== 'undefined') {
            if (!EDITAL_CLIENTES.some(ec => String(ec.edital_id) === String(novoEdital.id) && String(ec.cliente_id) === String(c.id))) {
              EDITAL_CLIENTES.push(vinculo);
            }
          }
        }).catch(() => {});
      }
    });
    
    if (typeof filterCRM === 'function') filterCRM();
  }

  // Atualizar card visualmente
  const cardId = `pncp-card-${key.replace(/[^a-z0-9]/gi, '_')}`;
  const cardEl = document.getElementById(cardId);
  if (cardEl) {
    cardEl.classList.add('pncp-aceito');
    cardEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;color:var(--success);font-weight:700;font-size:.82rem">
        <i class="ti ti-circle-check" style="font-size:1rem"></i> Edital aceito com sucesso!
      </div>
      <div style="font-size:.75rem;color:var(--gray-600);margin-top:6px">
        <strong>${orgao.substring(0, 60)}</strong><br>
        <span style="color:var(--gray-400)">Disponível na aba Editais para Análise IA e Pipeline</span>
      </div>
      <div style="margin-top:8px;display:flex;gap:6px">
        <button class="btn btn-sm btn-outline" style="font-size:.7rem;color:var(--primary);border-color:var(--primary)" onclick="navigateTo('analise')">
          <i class="ti ti-brain"></i> Ir para Análise IA
        </button>
        <button class="btn btn-sm btn-outline" style="font-size:.7rem" onclick="navigateTo('kanban')">
          <i class="ti ti-layout-kanban"></i> Ver Pipeline
        </button>
      </div>`;
    cardEl.style.borderColor = 'var(--success)';
    cardEl.style.background = 'var(--success-light)';
  }

  atualizarBadgePNCP();

  // Atualizar a tabela de editais imediatamente (se visível)
  if (typeof filterEditais === 'function') filterEditais();

  // Notificação toast
  mostrarToastPNCP(`✅ Edital adicionado! ${orgao.substring(0, 40)}...`);
};

// ===== ACEITAR TODOS =====
window.aceitarTodosPNCP = function() {
  if (!confirm(`Aceitar todos os ${PNCP_PENDENTES.length} editais encontrados? Eles serão adicionados à aba Editais.`)) return;
  const pendentes = [...PNCP_PENDENTES];
  pendentes.forEach(item => {
    const key = item.numeroControlePNCP || String(item.sequencialCompra);
    if (!EDITAIS.some(e => e.pncp_id === key)) {
      window.aceitarEditalPNCP(item);
    }
  });
};

// ===== IGNORAR EDITAL =====
window.ignorarEditalPNCP = function(key) {
  PNCP_IGNORADOS.add(key);
  const cardId = `pncp-card-${key.replace(/[^a-z0-9]/gi, '_')}`;
  const cardEl = document.getElementById(cardId);
  if (cardEl) {
    cardEl.style.opacity = '0';
    cardEl.style.transform = 'scale(0.95)';
    cardEl.style.transition = 'all 0.3s ease';
    setTimeout(() => cardEl.remove(), 300);
  }
  PNCP_PENDENTES = PNCP_PENDENTES.filter(i => (i.numeroControlePNCP || String(i.sequencialCompra)) !== key);
  atualizarBadgePNCP();
};

// ===== HELPERS =====
function atualizarBadgePNCP() {
  const badge = document.getElementById('pncp-badge-count');
  if (!badge) return;
  const pendentes = PNCP_PENDENTES.filter(i => {
    const key = i.numeroControlePNCP || String(i.sequencialCompra);
    return !PNCP_IGNORADOS.has(key) && !EDITAIS.some(e => e.pncp_id === key);
  }).length;
  if (pendentes > 0) {
    badge.style.display = 'inline-block';
    badge.textContent = `${pendentes} novo${pendentes > 1 ? 's' : ''}`;
  } else {
    badge.style.display = 'none';
  }
}

function mostrarPNCPErro(msg) {
  const resultsEl = document.getElementById('pncp-results');
  if (!resultsEl) return;
  resultsEl.innerHTML = `
    <div style="background:var(--danger-light);border:1px solid #fca5a5;border-radius:10px;padding:16px;display:flex;align-items:flex-start;gap:12px">
      <i class="ti ti-alert-circle" style="color:var(--danger);font-size:1.3rem;flex-shrink:0;margin-top:1px"></i>
      <div>
        <div style="font-weight:700;color:var(--danger);font-size:.85rem">Erro na busca</div>
        <div style="font-size:.78rem;color:#7f1d1d;margin-top:4px">${msg}</div>
        <div style="font-size:.72rem;color:var(--gray-500);margin-top:8px">
          💡 Dica: A API do PNCP pode ter instabilidades momentâneas. Tente reduzir o período de busca ou verifique sua conexão.
        </div>
      </div>
    </div>`;
}

function renderPNCPVazio(msg) {
  return `
    <div style="text-align:center;padding:32px;color:var(--gray-400)">
      <i class="ti ti-mood-empty" style="font-size:2.5rem;display:block;margin-bottom:10px"></i>
      <div style="font-size:.9rem;font-weight:600;color:var(--gray-600)">${msg}</div>
      <div style="font-size:.75rem;margin-top:6px">Tente ampliar o período ou remover filtros</div>
    </div>`;
}

function mostrarToastPNCP(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:#1e3a5f;color:#fff;padding:12px 20px;
    border-radius:10px;font-size:.82rem;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,.2);
    display:flex;align-items:center;gap:10px;max-width:360px;
    animation:slideInRight .3s ease`;
  toast.innerHTML = `<i class="ti ti-check-circle" style="color:#10b981;font-size:1.1rem;flex-shrink:0"></i>${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = 'all .3s'; }, 3000);
  setTimeout(() => toast.remove(), 3400);
}
