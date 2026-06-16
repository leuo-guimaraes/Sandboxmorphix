// ===== ROUTER & CORE =====
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const app = $('#app');
let currentPage = 'dashboard';
let currentUser = null;

function fmt(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)}
function fmtDate(d){if(!d)return'—';const p=d.split('T')[0].split('-');if(p.length!==3)return d;return `${p[2]}/${p[1]}/${p[0]}`}
function statusChip(s){const m={Aberto:'chip-green','Em Análise':'chip-yellow',Encerrado:'chip-gray'};return `<span class="chip ${m[s]||'chip-gray'}">${s}</span>`}
function prioColor(p){return p==='alta'?'var(--danger)':p==='media'?'var(--warning)':'var(--success)'}
function avatarColor(i){const c=['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];return c[i%c.length]}
function initials(n){return n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}

// NAV
document.querySelectorAll('.nav-item').forEach(item=>{
  item.addEventListener('click',()=>{
    document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));
    item.classList.add('active');
    currentPage=item.dataset.page;
    render();
  });
});

// Logout & User Profile injection in sidebar
let USUARIOS_SISTEMA = [
  { id: '1', nome: 'Administrador Principal', email: 'admin@morphix.com.br', senha: 'admin', tipo: 'admin', data: '2026-05-10' },
  { id: '2', nome: 'Usuário Operacional', email: 'usuario@morphix.com.br', senha: '123', tipo: 'usuario', data: '2026-05-12' }
];
try {
  const localU = localStorage.getItem('licitapro_usuarios');
  if(localU) USUARIOS_SISTEMA = JSON.parse(localU);
  else localStorage.setItem('licitapro_usuarios', JSON.stringify(USUARIOS_SISTEMA));
} catch(e){}

let userLogado = USUARIOS_SISTEMA[0];

document.querySelector('.sidebar-footer').innerHTML = `
  <div style="margin-bottom:12px;display:flex;align-items:center;gap:8px;font-weight:600;color:var(--gray-700)">
    <i class="ti ti-user-circle" style="font-size:1.2rem;color:var(--primary)"></i> <span id="sb-user-email" style="font-size:0.75rem;overflow:hidden;text-overflow:ellipsis">${userLogado.email}</span>
  </div>
  <button class="btn btn-sm btn-outline" style="width:100%;justify-content:center" onclick="doLogout()"><i class="ti ti-logout"></i> Sair da Conta</button>
`;

function render(){
  const pages={dashboard:renderDashboard,editais:renderEditais,analise:renderAnalise,indicacoes:renderIndicacoes,kanban:renderKanban,agenda:renderAgenda,crm:renderCRM,relatorios:renderRelatorios,configia:renderConfigIA,rpa:renderRPA,usuarios:renderUsuarios};
  (pages[currentPage]||pages.dashboard)();
}

// ===== MODAL =====
function openModal(html){
  $('#modal-content').innerHTML=html;
  $('#modal-overlay').classList.add('show');
}
function closeModal(){$('#modal-overlay').classList.remove('show')}
$('#modal-overlay').addEventListener('click',e=>{if(e.target.id==='modal-overlay')closeModal()});

// ===== DASHBOARD =====
function renderDashboard(){
  const totalVal=EDITAIS.reduce((s,e)=>s+e.valorEstimado,0);
  app.innerHTML=`
  <div class="page-header"><div><h1>Dashboard</h1><p>Visão geral do sistema de licitações</p></div></div>
  <div class="stats-grid">
    <div class="card stat-card"><div class="stat-icon blue"><i class="ti ti-file-text"></i></div><div class="stat-info"><h3>${EDITAIS.length}</h3><span>Editais Monitorados</span></div></div>
    <div class="card stat-card"><div class="stat-icon yellow"><i class="ti ti-send"></i></div><div class="stat-info"><h3>${PIPELINE.filter(p=>p.coluna==='proposta').length}</h3><span>Propostas em Andamento</span></div></div>
    <div class="card stat-card"><div class="stat-icon green"><i class="ti ti-currency-real"></i></div><div class="stat-info"><h3>${fmt(totalVal)}</h3><span>Valor Potencial Total</span></div></div>
    <div class="card stat-card"><div class="stat-icon red"><i class="ti ti-trophy"></i></div><div class="stat-info"><h3>${RELATORIOS.taxaVitoria}%</h3><span>Taxa de Sucesso</span></div></div>
  </div>
  <div class="grid-2-1">
    <div class="card">
      <div class="section-title"><i class="ti ti-file-text"></i> Editais Recentes</div>
      <table><thead><tr><th>Número</th><th>Órgão</th><th>Valor</th><th>Status</th><th>Match Clientes</th></tr></thead>
      <tbody>${EDITAIS.slice(0,5).map(e=>{
        const matches=getMatchesParaClientes(e);
        return `<tr><td style="font-weight:600">${e.numero}</td><td>${e.orgao}</td><td>${fmt(e.valorEstimado)}</td><td>${statusChip(e.status)}</td>
        <td>${matches.map(m=>`<span class="chip chip-blue" style="margin:1px">${m.nome.split(' ')[0]} ${m.match}%</span>`).join('')||'—'}</td></tr>`;
      }).join('')}</tbody></table>
    </div>
    <div class="card">
      <div class="section-title"><i class="ti ti-alert-triangle"></i> Alertas & Prazos</div>
      ${ALERTAS.map(a=>`<div class="alert-item"><div class="alert-dot ${a.tipo}"></div><div><div class="alert-title">${a.titulo}</div><div class="alert-desc">${a.desc}</div></div></div>`).join('')}
    </div>
  </div>`;
}

// ===== EDITAIS =====
function renderEditais(){
  app.innerHTML=`
  <div class="page-header"><div><h1>Editais</h1><p>Gerenciamento de editais de licitação</p></div>
    <button class="btn btn-primary" onclick="openNovoEdital()"><i class="ti ti-plus"></i> Novo Edital</button></div>

  ${typeof renderPNCPPanel === 'function' ? renderPNCPPanel() : ''}

  <div class="filters">
    <div class="search-box"><i class="ti ti-search"></i><input id="ed-search" placeholder="Buscar por número, órgão ou objeto..." oninput="filterEditais()"></div>
    <select id="ed-mod" onchange="filterEditais()"><option value="">Todas modalidades</option><option>Pregão</option><option>Tomada de Preços</option><option>Concorrência</option><option>RDC</option></select>
  </div>
  <div class="card"><table><thead><tr><th>Número</th><th>Modalidade</th><th>Órgão</th><th>Valor Est.</th><th>Abertura</th><th>Status</th><th>Match</th><th>Fonte</th><th></th></tr></thead>
  <tbody id="editais-body"></tbody></table></div>`;
  filterEditais();
}

function filterEditais(){
  const q=($('#ed-search')?$('#ed-search').value:'').toLowerCase();
  const m=$('#ed-mod')?$('#ed-mod').value:'';
  const filtered=EDITAIS.filter(e=>{
    if(m&&e.modalidade!==m)return false;
    if(q&&!(e.numero+e.orgao+e.objeto).toLowerCase().includes(q))return false;
    return true;
  });
  const tb=$('#editais-body');if(!tb)return;
  tb.innerHTML=filtered.map(e=>{
    const matches=getMatchesParaClientes(e);
    const isPNCP = !!e.pncp_id;
    const fonteBadge = isPNCP
      ? `<span class="chip chip-blue" style="font-size:.62rem;gap:3px"><i class="ti ti-building-community" style="font-size:.6rem"></i> PNCP</span>`
      : `<span class="chip chip-gray" style="font-size:.62rem">Manual</span>`;
    return `<tr style="cursor:pointer" onclick="verEdital(${e.id})"><td style="font-weight:600;font-size:.78rem">${e.numero}</td><td><span class="chip chip-gray">${e.modalidade}</span></td>
    <td>${e.orgao}</td><td>${fmt(e.valorEstimado)}</td><td>${fmtDate(e.dataAbertura)}</td><td>${statusChip(e.status)}</td>
    <td>${matches.map(m=>`<span class="chip chip-blue" style="margin:1px" title="Produtos: ${(m.produtosMatch||[]).join(', ')}">${m.nome.split(' ')[0]} ${m.match}%</span>`).join('')||'—'}</td>
    <td>${fonteBadge}${isPNCP && e.url_edital ? `<a href="${e.url_edital}" target="_blank" onclick="event.stopPropagation()" class="btn btn-sm btn-outline" style="margin-left:4px;padding:3px 7px;font-size:.62rem" title="Ver no PNCP"><i class="ti ti-external-link"></i></a>` : ''}</td>
    <td onclick="event.stopPropagation()">
      <button class="btn btn-sm btn-outline" style="color:var(--danger);border-color:var(--danger-light);padding:4px 8px" onclick="excluirEdital('${e.id}')" title="Excluir Edital">
        <i class="ti ti-trash"></i>
      </button>
    </td></tr>`;
  }).join('');
}


window.excluirEdital = async function(id) {
  if(!confirm("Tem certeza que deseja excluir este edital? Esta ação não pode ser desfeita.")) return;

  try {
    if(typeof dbDeleteByColumn === 'function') {
      await dbDeleteByColumn('pipeline', 'edital_id', id);
      await dbDeleteByColumn('edital_clientes', 'edital_id', id);
    }
    if(typeof dbDelete === 'function') {
      await dbDelete('editais', id);
    }
  } catch(e) {
    console.warn("Aviso ao excluir no Supabase", e);
  }

  const idx = EDITAIS.findIndex(x => String(x.id) === String(id));
  if(idx >= 0) EDITAIS.splice(idx, 1);

  if(typeof PIPELINE !== 'undefined') {
    const pIdx = PIPELINE.findIndex(x => String(x.editalId) === String(id));
    if(pIdx >= 0) PIPELINE.splice(pIdx, 1);
  }

  filterEditais();
  if($('#nav-kanban')?.classList.contains('active')) renderKanban();
};
function verEdital(id){
  const e=EDITAIS.find(x=>x.id===id);if(!e)return;
  const matches=getMatchesParaEdital(e);
  openModal(`<div class="modal-header"><h2>${e.numero}</h2><button class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
    <div class="form-group"><label>Objeto</label><p style="font-size:.85rem;color:var(--gray-700)">${e.objeto}</p></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div class="form-group"><label>Modalidade</label><p>${e.modalidade}</p></div>
      <div class="form-group"><label>Órgão</label><p>${e.orgao}</p></div>
      <div class="form-group"><label>Valor Estimado</label><p style="font-weight:700;color:var(--primary)">${fmt(e.valorEstimado)}</p></div>
      <div class="form-group"><label>Data Abertura</label><p>${fmtDate(e.dataAbertura)}</p></div>
      <div class="form-group"><label>Plataforma</label><p>${e.plataforma}</p></div>
      <div class="form-group"><label>Status</label>${statusChip(e.status)}</div>
    </div>
    <div class="section-title"><i class="ti ti-users"></i> Clientes com Match</div>
    ${matches.length?matches.map(m=>`
    <div class="match-card">
      <div class="match-info">
        <div class="avatar" style="background:${m.cor}">${initials(m.nome)}</div>
        <div style="overflow:hidden">
          <div class="match-name">${m.nome}</div>
          <div class="match-area">${m.area}</div>
          <div style="font-size:0.7rem;color:var(--primary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${(m.produtosMatch||[]).join(', ')}">
            <i class="ti ti-link"></i> ${(m.produtosMatch||[]).join(', ') || 'Geral'}
          </div>
        </div>
      </div>
      <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end">
        <span class="match-pct" style="color:${m.match>=70?'var(--success)':m.match>=40?'var(--warning)':'var(--gray-500)'}">${m.match}%</span>
        <span style="font-size:.65rem;color:var(--gray-500);font-weight:600">ROI ESTIMADO</span>
      </div>
    </div>`).join(''):'<p style="color:var(--gray-400);font-size:.8rem">Nenhum match encontrado</p>'}
  `);
}
function openNovoEdital(){
  openModal(`<div class="modal-header"><h2>Novo Edital</h2><button class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
    
    <div style="margin-bottom:16px;background:var(--gray-50);padding:12px;border-radius:8px;border:1px dashed var(--gray-300)">
      <label style="font-weight:600;font-size:.85rem;display:block;margin-bottom:8px"><i class="ti ti-wand"></i> Preenchimento Automático com IA (Edital + Anexos)</label>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <input type="file" id="ne-pdf" accept="application/pdf" multiple style="font-size:.8rem;flex:1">
        <button type="button" class="btn btn-sm btn-outline" onclick="preencherNovoEditalIA()"><i class="ti ti-brain"></i> Analisar PDFs</button>
      </div>
      <div id="ai-progress-container"></div>
    </div>

    <form onsubmit="salvarEdital(event)">
    <div class="form-group"><label>Número</label><input id="ne-num" required placeholder="PE-2026/0000"></div>
    <div class="form-group"><label>Modalidade</label><select id="ne-mod" required><option>Pregão</option><option>Tomada de Preços</option><option>Concorrência</option><option>RDC</option></select></div>
    <div class="form-group"><label>Órgão</label><input id="ne-orgao" required></div>
    <div class="form-group"><label>Valor Estimado (R$)</label><input id="ne-val" type="number" step="0.01" required></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label>Data de Abertura</label><input id="ne-data" type="date" required></div>
      <div class="form-group"><label>Data Limite (Proposta)</label><input id="ne-data-limite" type="date"></div>
    </div>
    <div class="form-group"><label>Plataforma</label><input id="ne-plat" placeholder="ComprasNet"></div>
    <div class="form-group"><label>Objeto</label><textarea id="ne-obj" required placeholder="Descreva o objeto da licitação..."></textarea></div>
    <div class="form-group"><label>URL do Edital (opcional)</label><input id="ne-url" placeholder="https://..."></div>
    <div class="form-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button><button type="submit" class="btn btn-primary">Salvar Edital</button></div></form>`);
}

async function preencherNovoEditalIA() {
  const fileInput = document.getElementById('ne-pdf');
  if(!fileInput.files.length) return alert('Selecione pelo menos um arquivo PDF primeiro.');
  
  const progContainer = document.getElementById('ai-progress-container');
  try {
    const cfg = getAIConfig();
    const provider = cfg.provider || 'openai';
    const analysisResult = await runAIAnalysis(fileInput.files, provider, true);
    const mdText = analysisResult ? analysisResult.response : '';
    
    window.lastCreatedEditalPdfText = analysisResult ? analysisResult.text : '';
    window.lastCreatedEditalAiAnalysis = mdText;
    window.lastCreatedEditalProvider = provider;
    
    if(typeof parseEditalFromMarkdown === 'function') {
      const editalData = parseEditalFromMarkdown(mdText);
      if(editalData) {
        if(editalData.numero) document.getElementById('ne-num').value = editalData.numero;
        if(editalData.orgao) document.getElementById('ne-orgao').value = editalData.orgao;
        if(editalData.valor_estimado) document.getElementById('ne-val').value = editalData.valor_estimado;
        if(editalData.objeto) document.getElementById('ne-obj').value = editalData.objeto;
        
        if(editalData.data_abertura) {
            document.getElementById('ne-data').value = editalData.data_abertura;
        }
        
        if(editalData.data_limite) {
            const el = document.getElementById('ne-data-limite');
            if(el) el.value = editalData.data_limite;
        }
        
        if(editalData.modalidade) {
            const m = editalData.modalidade.toLowerCase();
            const sel = document.getElementById('ne-mod');
            for(let i=0; i<sel.options.length; i++) {
                if(sel.options[i].text.toLowerCase() === m || m.includes(sel.options[i].text.toLowerCase())) {
                    sel.selectedIndex = i; break;
                }
            }
        }
      }
    }
    
    progContainer.innerHTML += '<div style="margin-top:10px;padding:8px;background:var(--success-light);color:var(--success);border-radius:6px;font-size:.8rem"><i class="ti ti-check"></i> Formulário preenchido com sucesso! Revise os dados abaixo.</div>';
    
  } catch(e) {
    console.error(e);
    progContainer.innerHTML = '<div style="margin-top:10px;color:var(--danger);font-size:.8rem"><i class="ti ti-alert-circle"></i> Erro: ' + e.message + '</div>';
  }
}
async function salvarEdital(ev){
  ev.preventDefault();
  const btn = ev.target.querySelector('button[type="submit"]');
  if(btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader"></i> Salvando...'; }
  
  const obj=$('#ne-obj').value;
  const kw=obj.toLowerCase().split(/[\s,;.]+/).filter(w=>w.length>3);
  const editalLoc = {
    id: EDITAIS.length+1, numero: $('#ne-num').value, modalidade: $('#ne-mod').value, 
    orgao: $('#ne-orgao').value, valorEstimado: +$('#ne-val').value, 
    dataAbertura: $('#ne-data').value, dataLimite: $('#ne-data-limite').value,
    status: 'Aberto', objeto: obj, plataforma: $('#ne-plat').value||'ComprasNet', keywords: kw,
    ai_analysis: window.lastCreatedEditalAiAnalysis || '',
    ai_provider: window.lastCreatedEditalProvider || 'openai',
    pdf_text: window.lastCreatedEditalPdfText || ''
  };
  
  try {
    // Tenta salvar no Supabase
    if (typeof dbSaveEdital === 'function') {
      const saved = await dbSaveEdital({
        numero: editalLoc.numero, modalidade: editalLoc.modalidade, orgao: editalLoc.orgao,
        valor_estimado: editalLoc.valorEstimado, data_abertura: editalLoc.dataAbertura, status: editalLoc.status,
        objeto: editalLoc.objeto, plataforma: editalLoc.plataforma, keywords: editalLoc.keywords,
        ai_analysis: editalLoc.ai_analysis, ai_provider: editalLoc.ai_provider, pdf_text: editalLoc.pdf_text
      });
      if(saved && saved.id) {
        editalLoc.id = saved.id; // usa o ID real do banco
        await dbAddToPipeline(saved.id, 'prospeccao', 'media');
      }
    }
  } catch(e) {
    console.warn("Aviso: Supabase falhou, salvando apenas localmente.", e);
  }
  
  // Atualiza a interface local
  EDITAIS.push(editalLoc);
  if(typeof PIPELINE !== 'undefined') PIPELINE.push({editalId: editalLoc.id, coluna: 'prospeccao', prioridade: 'media'});
  
  closeModal();
  renderEditais();
  if($('#nav-kanban')?.classList.contains('active')) renderKanban();
}

// ===== ANÁLISE IA =====
let selectedProvider='openai';
let lastAnalysisFile=null;

function renderAnalise(){
  const cfg=getAIConfig();
  const hasOpenAI=!!cfg.openai_key;
  const hasClaude=!!cfg.claude_key;
  const hasMistral=!!cfg.mistral_key;
  selectedProvider=cfg.provider||'openai';

  const providerLabel = selectedProvider === 'openai' ? 'OpenAI' : (selectedProvider === 'claude' ? 'Claude' : 'Mistral');
  const activeModel = selectedProvider === 'openai' ? cfg.openai_model : (selectedProvider === 'claude' ? cfg.claude_model : cfg.mistral_model);

  app.innerHTML=`
  <div class="page-header"><div><h1>Análise IA</h1><p>Análise inteligente de editais com inteligência artificial</p></div>
    <button class="btn btn-outline" onclick="navigateTo('configia')"><i class="ti ti-settings"></i> Config IA</button></div>

  <!-- Provider Selector -->
  <div class="provider-tabs">
    <div class="provider-tab ${selectedProvider==='openai'?'active':''}" onclick="selectProvider('openai')">
      <i class="ti ti-brand-openai"></i> OpenAI
      ${hasOpenAI?'<span class="chip chip-green" style="font-size:.6rem">Ativo</span>':'<span class="chip chip-red" style="font-size:.6rem">Sem chave</span>'}
    </div>
    <div class="provider-tab ${selectedProvider==='claude'?'active':''}" onclick="selectProvider('claude')">
      <i class="ti ti-brain"></i> Claude
      ${hasClaude?'<span class="chip chip-green" style="font-size:.6rem">Ativo</span>':'<span class="chip chip-red" style="font-size:.6rem">Sem chave</span>'}
    </div>
    <div class="provider-tab ${selectedProvider==='mistral'?'active':''}" onclick="selectProvider('mistral')">
      <i class="ti ti-lambda"></i> Mistral
      ${hasMistral?'<span class="chip chip-green" style="font-size:.6rem">Ativo</span>':'<span class="chip chip-red" style="font-size:.6rem">Sem chave</span>'}
    </div>
  </div>

  <!-- Upload Area ou Seleção de Edital -->
  <div class="card" style="margin-bottom:20px">
    <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--gray-200)">
      <label style="font-weight:600;font-size:.85rem;display:block;margin-bottom:8px"><i class="ti ti-select"></i> Analisar Edital Cadastrado</label>
      <select id="ia-select-edital" class="form-control" onchange="selecionarEditalExistente(this.value)">
        <option value="">-- Selecione um edital da lista para analisar --</option>
        ${EDITAIS.map(e=>`<option value="${e.id}">${e.numero} — ${e.orgao} (${e.modalidade})</option>`).join('')}
      </select>
    </div>
    <div style="display:flex;gap:20px;align-items:stretch">
      <div class="upload-area" style="flex:1" id="drop-zone" onclick="document.getElementById('ia-file').click()">
        <input type="file" id="ia-file" accept=".pdf" multiple style="display:none" onchange="handleFileSelect(this)">
        <i class="ti ti-file-type-pdf"></i>
        <div style="font-weight:600;font-size:.9rem" id="file-label">Upload de PDF do Edital</div>
        <div style="font-size:.75rem;margin-top:4px">Arraste ou clique para selecionar o arquivo</div>
      </div>
      <div style="display:flex;flex-direction:column;justify-content:center;min-width:180px">
        <div style="font-size:.75rem;color:var(--gray-500);margin-bottom:8px">Provedor: <strong>${providerLabel}</strong></div>
        <div style="font-size:.75rem;color:var(--gray-500);margin-bottom:12px">Modelo: <strong>${activeModel}</strong></div>
        <div style="margin-bottom:12px;display:flex;align-items:center;gap:6px">
          <input type="checkbox" id="ia-use-ocr" checked style="cursor:pointer">
          <label for="ia-use-ocr" style="font-size:.75rem;font-weight:600;cursor:pointer;margin:0;color:var(--gray-700)" title="Ativa reconhecimento óptico de caracteres em PDFs de imagem/escaneados">PDF + OCR Fallback</label>
        </div>
        <button class="btn btn-primary" id="btn-analyze" onclick="startAnalysis()" disabled>
          <i class="ti ti-brain"></i> Analisar com IA
        </button>
      </div>
    </div>
  </div>

  <!-- Progress Container -->
  <div id="ai-progress-container"></div>

  <!-- Results Container -->
  <div id="ia-result"></div>`;

  // Setup drag & drop
  setupDragDrop();
}

function selectProvider(p){
  selectedProvider=p;
  const cfg=getAIConfig();
  cfg.provider=p;
  saveAIConfig(cfg);
  renderAnalise();
}

function navigateTo(page){
  currentPage=page;
  document.querySelectorAll('.nav-item').forEach(i=>{
    i.classList.toggle('active',i.dataset.page===page);
  });
  render();
}

function handleFileSelect(input){
  const files=Array.from(input.files);
  if(!files.length)return;
  lastAnalysisFile=files;
  const label=document.getElementById('file-label');
  if(label) {
    if(files.length === 1) {
      label.textContent=files[0].name+' ('+formatBytes(files[0].size)+')';
    } else {
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      label.textContent=`${files.length} arquivos selecionados (${formatBytes(totalSize)})`;
    }
  }
  const btn=document.getElementById('btn-analyze');
  if(btn)btn.disabled=false;
}

function formatBytes(b){
  if(b<1024)return b+' B';
  if(b<1048576)return(b/1024).toFixed(1)+' KB';
  return(b/1048576).toFixed(1)+' MB';
}

function setupDragDrop(){
  const zone=document.getElementById('drop-zone');
  if(!zone)return;
  ['dragenter','dragover'].forEach(e=>zone.addEventListener(e,ev=>{ev.preventDefault();zone.style.borderColor='var(--primary)';zone.style.background='var(--primary-light)'}));
  ['dragleave','drop'].forEach(e=>zone.addEventListener(e,ev=>{ev.preventDefault();zone.style.borderColor='';zone.style.background=''}));
  zone.addEventListener('drop',ev=>{
    const files=Array.from(ev.dataTransfer.files).filter(file=>file.type==='application/pdf');
    if(files.length){
      lastAnalysisFile=files;
      const label=document.getElementById('file-label');
      if(label) {
        if(files.length === 1) {
          label.textContent=files[0].name+' ('+formatBytes(files[0].size)+')';
        } else {
          const totalSize = files.reduce((sum, f) => sum + f.size, 0);
          label.textContent=`${files.length} arquivos selecionados (${formatBytes(totalSize)})`;
        }
      }
      const btn=document.getElementById('btn-analyze');
      if(btn)btn.disabled=false;
    }
  });
}

window.selecionarEditalExistente = function(id) {
  if(!id) return;
  const ed = EDITAIS.find(x => String(x.id) === String(id));
  if(!ed) return;
  
  if(ed.ai_analysis) {
    displayAIResult({ response: ed.ai_analysis, provider: ed.ai_provider || 'openai', editalId: ed.id });
  } else {
    const textToAnalyze = ed.pdf_text || `Número: ${ed.numero}\nModalidade: ${ed.modalidade}\nÓrgão: ${ed.orgao}\nValor Estimado: R$ ${ed.valorEstimado}\nObjeto: ${ed.objeto}`;
    lastAnalysisFile = { name: `Edital ${ed.numero}.txt`, isText: true, content: textToAnalyze, editalId: ed.id };
    const label = document.getElementById('file-label');
    if(label) label.textContent = `Edital Selecionado: ${ed.numero} — ${ed.orgao}`;
    const btn = document.getElementById('btn-analyze');
    if(btn) btn.disabled = false;
    
    // Dispara análise automaticamente
    startAnalysis();
  }
};

async function startAnalysis(){
  if(!lastAnalysisFile){alert('Selecione um arquivo PDF ou Edital primeiro.');return;}
  const btn=document.getElementById('btn-analyze');
  if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader"></i> Analisando...';}

  // Clear previous results
  const resultEl=document.getElementById('ia-result');
  if(resultEl)resultEl.innerHTML='';

  const useOcr = document.getElementById('ia-use-ocr') ? document.getElementById('ia-use-ocr').checked : true;

  try{
    let result;
    if(lastAnalysisFile.isText) {
      const config = getAIConfig();
      const progress = createProgressUI('ai-progress-container');
      const providerLabel = selectedProvider === 'openai' ? 'OpenAI' : (selectedProvider === 'claude' ? 'Claude' : 'Mistral');
      if(progress) {
        progress.setStep(2);
        progress.setProgress(55, `Enviando texto do edital para ${providerLabel}...`);
      }
      let resp;
      if(selectedProvider === 'openai') resp = await callOpenAI(lastAnalysisFile.content, config);
      else if(selectedProvider === 'claude') resp = await callClaude(lastAnalysisFile.content, config);
      else resp = await callMistral(lastAnalysisFile.content, config);
      
      if(progress) {
        progress.setStep(4);
        progress.setProgress(100, 'Análise concluída!');
      }
      result = { text: lastAnalysisFile.content, response: resp, provider: selectedProvider };
    } else {
      result=await runAIAnalysis(lastAnalysisFile,selectedProvider,useOcr);
    }
    displayAIResult(result);
  }catch(e){
    const container=document.getElementById('ai-progress-container');
    if(container)container.innerHTML=`
      <div class="card" style="border-color:var(--danger);margin-top:16px">
        <div style="display:flex;align-items:center;gap:10px;color:var(--danger)">
          <i class="ti ti-alert-circle" style="font-size:1.3rem"></i>
          <div><div style="font-weight:700;font-size:.85rem">Erro na Análise</div>
          <div style="font-size:.78rem;margin-top:4px;color:var(--gray-600)">${e.message}</div></div>
        </div>
      </div>`;
  }
  if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-brain"></i> Analisar com IA';}
}

async function displayAIResult(result){
  const resultEl=document.getElementById('ia-result');
  if(!resultEl)return;
  
  const isOpenAI = result.provider.includes('openai');
  const isClaude = result.provider.includes('claude');
  const providerLabel = isOpenAI ? 'OpenAI' : (isClaude ? 'Claude' : 'Mistral');
  const providerColor = isOpenAI ? '#10a37f' : (isClaude ? '#d47838' : '#ff5b00');
  const providerIcon = isOpenAI ? 'brand-openai' : (isClaude ? 'brain' : 'lambda');

  // Extract info from markdown to save to DB
  let num='Sem número', mod='Desconhecida', org='Desconhecido', val=0;
  const t = result.response;
  const mNum = t.match(/Número[^:]*:\s*(.+)/i); if(mNum) num=mNum[1].trim();
  const mMod = t.match(/Modalidade[^:]*:\s*(.+)/i); if(mMod) mod=mMod[1].trim();
  const mOrg = t.match(/Órgão[^:]*:\s*(.+)/i); if(mOrg) org=mOrg[1].trim();
  const mVal = t.match(/Valor[^:]*:\s*R?\$\s*([\d.,]+)/i); 
  if(mVal) {
    const rawVal = mVal[1].trim();
    if(rawVal.includes(',') && rawVal.includes('.')) {
      val = parseFloat(rawVal.replace(/\./g,'').replace(',','.'));
    } else if(rawVal.includes(',')) {
      val = parseFloat(rawVal.replace(',','.'));
    } else {
      val = parseFloat(rawVal);
    }
  }

  const editalId = result.editalId || '';
  
  // Cache variables to prevent HTML escaping issues
  window._lastAIAnalysisResponse = result.response;
  window._lastAIAnalysisProvider = result.provider;
  window._lastAIAnalysisEditalId = editalId;

  let fileNames = '';
  if (lastAnalysisFile) {
    if (lastAnalysisFile.isText) {
      fileNames = lastAnalysisFile.name;
    } else if (Array.isArray(lastAnalysisFile)) {
      fileNames = lastAnalysisFile.map(f => f.name).join(', ');
    } else {
      fileNames = lastAnalysisFile.name || 'Edital';
    }
  }

  resultEl.innerHTML=`
  <div class="card" style="margin-top:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div class="section-title" style="margin:0"><i class="ti ti-sparkles"></i> Resultado da Análise</div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="chip" style="background:${providerColor}20;color:${providerColor}"><i class="ti ti-${providerIcon}" style="font-size:.7rem"></i> ${providerLabel}</span>
        <span class="chip chip-gray" title="${fileNames}">${fileNames.length > 30 ? fileNames.substring(0, 27) + '...' : fileNames}</span>
      </div>
    </div>
    <div class="ai-response">${renderMarkdown(result.response)}</div>
    
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--gray-200);display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:.8rem;color:var(--gray-600)"><i class="ti ti-info-circle"></i> O edital será salvo automaticamente no Supabase e movido para o Pipeline.</div>
      <button class="btn btn-primary" onclick="salvarEditalIACached('${num}', '${mod}', '${org}', ${val})">
        <i class="ti ti-device-floppy"></i> Salvar no Pipeline
      </button>
    </div>
  </div>`;
}

window.salvarEditalIACached = function(num, mod, org, val) {
  const analysis = window._lastAIAnalysisResponse || '';
  const provider = window._lastAIAnalysisProvider || 'openai';
  const editalId = window._lastAIAnalysisEditalId || '';
  salvarEditalIA(num, mod, org, val, analysis, provider, editalId);
};

window.salvarEditalIA = async function(num, mod, org, val, analysis, provider, editalId) {
  try {
    const btn = event ? event.currentTarget : null;
    if(btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="ti ti-loader"></i> Salvando...';
    }
    
    const modalMap = {
      'Pregão': 'Pregão', 'Concorrência': 'Concorrência', 'RDC': 'RDC',
      'Tomada de Preços': 'Tomada de Preços', 'Leilão': 'RDC', 'Dispensa': 'Pregão',
      'Inexigibilidade': 'Pregão', 'Concurso': 'Concorrência'
    };
    const modalLocal = Object.keys(modalMap).find(k => mod.includes(k)) || 'Pregão';
    
    const editalData = {
      numero: num,
      modalidade: modalLocal,
      orgao: org,
      valor_estimado: val || 0,
      data_abertura: new Date().toISOString().split('T')[0], // Hoje fallback
      status: 'Aberto',
      objeto: 'Extraído via IA',
      plataforma: 'N/A',
      keywords: [],
      ai_analysis: analysis,
      ai_provider: provider
    };
    
    if(editalId) {
      editalData.id = editalId;
      const existing = EDITAIS.find(x => String(x.id) === String(editalId));
      if (existing) {
        editalData.data_abertura = existing.dataAbertura || existing.data_abertura || editalData.data_abertura;
        editalData.status = existing.status || editalData.status;
        editalData.objeto = existing.objeto || editalData.objeto;
        editalData.plataforma = existing.plataforma || editalData.plataforma;
        editalData.keywords = existing.keywords || editalData.keywords;
        editalData.url_edital = existing.url_edital || existing.url || '';
        editalData.pncp_id = existing.pncp_id || '';
      }
    }
    
    const savedEdital = await dbSaveEdital(editalData);
    
    if(savedEdital && savedEdital.id) {
      if(!editalId) {
        await dbAddToPipeline(savedEdital.id, 'analise', 'media');
        
        EDITAIS.push({
          id: savedEdital.id, numero: num, modalidade: modalLocal, orgao: org,
          valorEstimado: val || 0, dataAbertura: new Date().toISOString().split('T')[0],
          status: 'Aberto', objeto: 'Extraído via IA', plataforma: 'N/A', keywords: [],
          ai_analysis: analysis, ai_provider: provider
        });
        if(typeof PIPELINE !== 'undefined') {
          PIPELINE.push({id: savedEdital.id, editalId: savedEdital.id, edital_id: savedEdital.id, coluna: 'analise', prioridade: 'media'});
        }
      } else {
        const idx = EDITAIS.findIndex(x => String(x.id) === String(editalId));
        if (idx >= 0) {
          EDITAIS[idx].ai_analysis = analysis;
          EDITAIS[idx].ai_provider = provider;
          EDITAIS[idx].numero = num;
          EDITAIS[idx].modalidade = modalLocal;
          EDITAIS[idx].orgao = org;
          EDITAIS[idx].valorEstimado = val || EDITAIS[idx].valorEstimado;
        }
        // Move to 'analise' stage in pipeline if it is in 'prospeccao'
        if (typeof PIPELINE !== 'undefined') {
          const p = PIPELINE.find(x => String(x.editalId || x.edital_id) === String(editalId));
          if (p) {
            if (p.coluna === 'prospeccao') {
              p.coluna = 'analise';
              if (typeof dbUpdatePipelineColuna === 'function' && p.id) {
                try {
                  await dbUpdatePipelineColuna(p.id, 'analise');
                } catch(err) {}
              }
            }
          } else {
            try {
              const added = await dbAddToPipeline(editalId, 'analise', 'media');
              if (added) {
                PIPELINE.push({ id: added.id, editalId: editalId, edital_id: editalId, coluna: 'analise', prioridade: 'media' });
              }
            } catch(err){}
          }
        }
      }
      
      alert(editalId ? 'Análise do edital atualizada com sucesso!' : 'Edital salvo com sucesso no banco e adicionado ao Pipeline!');
      navigateTo('kanban');
    } else {
      throw new Error('Falha ao salvar edital');
    }
  } catch (e) {
    alert('Erro ao salvar no banco: ' + e.message);
    const btn = event ? event.currentTarget : null;
    if(btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="ti ti-device-floppy"></i> Tentar Novamente';
    }
  }
};

window.parseEditalFromMarkdown = function(md) {
  if(typeof md === 'object' && md !== null) {
    md = md.response || md.text || '';
  }
  if(typeof md !== 'string') md = '';

  let numero = '';
  let orgao = '';
  let valor_estimado = 0;
  let data_abertura = '';
  let data_limite = '';
  let modalidade = 'Pregão';
  let objeto = '';

  const mNum = md.match(/Número[^:\n]*:\s*([^\n]+)/i);
  if(mNum) numero = mNum[1].replace(/\*\*/g,'').trim();

  const mOrg = md.match(/Órgão[^:\n]*:\s*([^\n]+)/i);
  if(mOrg) orgao = mOrg[1].replace(/\*\*/g,'').trim();

  const mVal = md.match(/Valor[^:\n]*:\s*(?:R\$\s*)?([\d.,]+)/i);
  if(mVal) {
    let cleanVal = mVal[1].trim();
    if(cleanVal.includes(',') && cleanVal.includes('.')) {
      cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
    } else if(cleanVal.includes(',')) {
      cleanVal = cleanVal.replace(',', '.');
    }
    valor_estimado = parseFloat(cleanVal) || 0;
  }

  const mMod = md.match(/Modalidade[^:\n]*:\s*([^\n]+)/i);
  if(mMod) modalidade = mMod[1].replace(/\*\*/g,'').trim();

  const dateRegex = /(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i;

  const mData = md.match(/Data[^:\n]*Abertura[^:\n]*:\s*([^\n]+)/i) || md.match(/Abertura[^:\n]*:\s*([^\n]+)/i) || md.match(/Sessão[^:\n]*:\s*([^\n]+)/i);
  if(mData) {
    const dMatch = mData[1].match(dateRegex);
    if(dMatch) {
       let d = dMatch[1];
       if(d.includes('/')) {
         const p = d.split('/');
         data_abertura = `${p[2]}-${p[1]}-${p[0]}`;
       } else {
         data_abertura = d;
       }
    }
  }

  const mLimite = md.match(/Data[^:\n]*Limite[^:\n]*:\s*([^\n]+)/i) || md.match(/Prazo[^:\n]*:\s*([^\n]+)/i) || md.match(/Proposta[^:\n]*:\s*([^\n]+)/i) || md.match(/Entrega[^:\n]*:\s*([^\n]+)/i);
  if(mLimite) {
    const dMatch = mLimite[1].match(dateRegex);
    if(dMatch) {
       let d = dMatch[1];
       if(d.includes('/')) {
         const p = d.split('/');
         data_limite = `${p[2]}-${p[1]}-${p[0]}`;
       } else {
         data_limite = d;
       }
    }
  }

  const mObj = md.match(/RESUMO DO OBJETO[\s\S]*?(\n\n|\n###|\n2\.)/i);
  if(mObj) {
    objeto = mObj[0].replace(/### 1\. RESUMO DO OBJETO/i,'').replace(/1\. \*\*RESUMO DO OBJETO\*\*/i,'').replace(/\*\*/g,'').trim();
  } else {
    objeto = md.split('\n').slice(0, 5).join(' ').trim();
  }

  return { numero, orgao, valor_estimado, data_abertura, data_limite, modalidade, objeto };
};

// ===== INDICAÇÕES INTELIGENTES =====
function renderIndicacoes(){
  app.innerHTML=`
  <div class="page-header"><div><h1>Indicações Inteligentes</h1><p>Oportunidades mapeadas e sugeridas diretamente para a base de clientes</p></div></div>
  
  <!-- Painel de Vínculo Manual e Contrato IA -->
  <div class="card" style="margin-bottom:24px; background:linear-gradient(145deg, #ffffff, #f8fafc); border:1px solid #e2e8f0; border-left:4px solid var(--primary);">
    <div style="margin-bottom:16px;">
      <h2 style="font-size:1.2rem; color:var(--gray-900); display:flex; align-items:center; gap:8px; margin:0;"><i class="ti ti-link" style="color:var(--primary)"></i> Vínculo Manual de Edital e Cliente</h2>
      <p style="font-size:0.85rem; color:var(--gray-600); margin-top:4px;">Selecione qualquer edital e cliente para redigir instantaneamente um Pitch Comercial ou Minuta de Contrato via Inteligência Artificial.</p>
    </div>
    
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-bottom:16px;">
      <div class="form-group" style="margin:0;">
        <label style="font-weight:600; font-size:.8rem;">1. Selecione o Edital</label>
        <select id="man-edital" style="width:100%; font-size:.85rem;">
          <option value="">-- Escolha um Edital --</option>
          ${EDITAIS.map(e => `<option value="${e.id}">${e.numero} — ${e.orgao} (${fmt(e.valorEstimado || e.valor_estimado)})</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="margin:0;">
        <label style="font-weight:600; font-size:.8rem;">2. Selecione o Cliente</label>
        <select id="man-cliente" style="width:100%; font-size:.85rem;">
          <option value="">-- Escolha um Cliente --</option>
          ${CLIENTES.map(c => `<option value="${c.id}">${c.nome} (Área: ${c.area})</option>`).join('')}
        </select>
      </div>
    </div>
    
    <div style="display:flex; gap:12px; flex-wrap:wrap;">
      <button class="btn btn-primary btn-sm" onclick="gerarManualIA('pitch')">
        <i class="ti ti-mail"></i> Preparar E-mail de Indicação
      </button>
      <button class="btn btn-outline btn-sm" style="color:var(--primary); border-color:var(--primary);" onclick="gerarManualIA('contrato')">
        <i class="ti ti-file-certificate"></i> Gerar Contrato de Parceria com IA
      </button>
    </div>
    
    <div id="manual-ai-result" style="display:none; margin-top:20px; border-top:1px solid var(--gray-200); padding-top:16px;"></div>
  </div>

  <div id="indicacoes-container" style="display:flex; flex-direction:column; gap:20px;">
    ${EDITAIS.filter(e => e.status !== 'Encerrado').map(e => {
      const matches = getMatchesParaEdital(e).slice(0, 3);
      if(matches.length === 0) return '';
      return `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid var(--gray-200);padding-bottom:12px">
          <div>
            <div class="section-title" style="margin:0"><i class="ti ti-file-text"></i> ${e.numero}</div>
            <div style="font-size:0.8rem;color:var(--gray-600);margin-top:4px">${e.orgao} — ${fmt(e.valorEstimado || e.valor_estimado)}</div>
          </div>
          <span class="chip chip-blue">${e.modalidade}</span>
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
          ${matches.map(m => `
            <div class="match-card" style="margin:0; border:1px solid var(--gray-200)">
              <div class="match-info" style="width:100%">
                <div class="avatar" style="background:${m.cor}">${initials(m.nome)}</div>
                <div style="flex:1; overflow:hidden">
                  <div style="display:flex; justify-content:space-between">
                    <div class="match-name">${m.nome}</div>
                    <span class="match-pct" style="color:var(--primary);font-size:0.8rem">ROI ${m.match}%</span>
                  </div>
                  <div style="font-size:0.75rem;color:var(--gray-500);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${(m.produtosMatch||[]).join(', ')}"><i class="ti ti-link"></i> Sinergia: ${(m.produtosMatch||[]).join(', ')}</div>
                  <button class="btn btn-sm btn-outline" style="width:100%; margin-top:12px; border-color:var(--primary-light); color:var(--primary)" onclick="gerarPitchIA('${e.id}', '${m.id}', this)">
                    <i class="ti ti-brain"></i> Gerar Pitch com IA
                  </button>
                  <div class="pitch-container" style="display:none; margin-top:12px; font-size:0.8rem; background:var(--gray-50); padding:10px; border-radius:6px; border:1px solid var(--gray-200)"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
    }).join('') || '<p style="color:var(--gray-500)">Nenhuma indicação com match alto encontrada no momento.</p>'}
  </div>`;
}

window.gerarManualIA = async function(tipo) {
  const editalId = document.getElementById('man-edital')?.value;
  const clienteId = document.getElementById('man-cliente')?.value;
  const resContainer = document.getElementById('manual-ai-result');
  if(!resContainer) return;

  if(!editalId || !clienteId) {
    alert('Por favor, selecione o Edital e o Cliente primeiro!');
    return;
  }

  const edital = EDITAIS.find(x => String(x.id) === String(editalId));
  const cliente = CLIENTES.find(x => String(x.id) === String(clienteId));

  resContainer.style.display = 'block';
  resContainer.innerHTML = `<div style="color:var(--primary); font-size:.9rem;"><i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Gerando ${tipo === 'pitch' ? 'e-mail de indicação' : 'contrato com IA'}...</div>`;

  try {
    const config = typeof getAIConfig === 'function' ? getAIConfig() : { provider: 'openai', openai_model: 'gpt-4o' };
    let promptCustom = '';

    if(tipo === 'pitch') {
      promptCustom = `Você é um executivo comercial especialista em licitações públicas. Escreva um e-mail comercial e estratégico sugerindo ao cliente ${cliente.nome} (Área: ${cliente.area}, Produtos: ${cliente.produtos.join(', ')}) que entre na licitação do edital ${edital.numero} do órgão ${edital.orgao} (Valor Estimado: R$ ${edital.valorEstimado || edital.valor_estimado}). Explique como o objeto "${edital.objeto}" casa perfeitamente com as soluções da empresa e chame para uma reunião para alinharmos a proposta.`;
    } else {
      promptCustom = `Você é um advogado sênior especialista em direito administrativo e licitações. Redija uma minuta de "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ASSESSORIA EM LICITAÇÃO COM CLÁUSULA DE ÊXITO" entre a nossa empresa Consultoria LicitaPro e a contratante ${cliente.nome}. 
Objeto Específico: Representação, elaboração e envio de proposta para o Edital nº ${edital.numero} do órgão ${edital.orgao} (Objeto: ${edital.objeto}).
Inclua cláusulas padrão de:
1. Objeto e Escopo dos Serviços
2. Obrigações da Contratada (LicitaPro) e da Contratante
3. Honorários Fixos e Honorários de ÊXITO (percentual sobre o valor ganho)
4. Confidencialidade e Exclusividade
5. Foro de Eleição.
Formate de maneira extremamente profissional e limpa em Markdown.`;
    }

    let resp = '';
    if(typeof callOpenAI === 'function' && typeof callClaude === 'function') {
        if(config.provider === 'openai') {
          resp = await callOpenAI(promptCustom, config); 
        } else {
          resp = await callClaude(promptCustom, config);
        }
    } else {
        resp = tipo === 'pitch' ? `Olá equipe da ${cliente.nome},\nTemos uma oportunidade estratégica no edital ${edital.numero} (${edital.orgao}).\n...` : `## CONTRATO DE ASSESSORIA EM LICITAÇÃO\n\nEntre Consultoria e ${cliente.nome}...\n...`;
    }

    const titleIcon = tipo === 'pitch' ? '<i class="ti ti-mail"></i> E-mail Comercial de Indicação' : '<i class="ti ti-file-certificate"></i> Minuta de Contrato de Parceria (Gerado via IA)';
    const rendered = typeof renderMarkdown === 'function' ? renderMarkdown(resp) : resp.replace(/\n/g, '<br>');

    resContainer.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <h3 style="margin:0; color:var(--gray-900); font-size:1.1rem; display:flex; align-items:center; gap:6px;">${titleIcon}</h3>
      <button class="btn btn-sm btn-outline" style="padding:4px 8px; font-size:0.75rem; border-color:var(--primary); color:var(--primary);" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText); alert('${tipo === 'pitch' ? 'Pitch' : 'Contrato'} copiado para a área de transferência!');">
        <i class="ti ti-copy"></i> Copiar Texto
      </button>
    </div>
    <div style="background:var(--gray-50); padding:16px; border-radius:8px; border:1px solid var(--gray-200); font-size:.85rem; color:var(--gray-800); max-height:400px; overflow-y:auto; line-height:1.6;">
      ${rendered}
    </div>`;

  } catch(err) {
    resContainer.innerHTML = `<div style="color:var(--danger); font-size:.85rem;"><i class="ti ti-alert-circle"></i> Erro ao processar com IA: ${err.message}</div>`;
  }
};

window.gerarPitchIA = async function(editalId, clienteId, btn) {
  const edital = EDITAIS.find(x => String(x.id) === String(editalId));
  const cliente = CLIENTES.find(x => String(x.id) === String(clienteId));
  if(!edital || !cliente) return;
  
  const container = btn.nextElementSibling;
  container.style.display = 'block';
  container.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Gerando pitch...';
  btn.style.display = 'none';
  
  try {
    const promptCustom = `Você é um consultor de vendas experiente de licitações. Escreva um e-mail curto e persuasivo para o cliente ${cliente.nome} (área: ${cliente.area}, produtos: ${cliente.produtos.join(', ')}). 
Você está recomendando que eles participem do edital ${edital.numero} do órgão ${edital.orgao} (Valor: R$ ${edital.valorEstimado || edital.valor_estimado}).
Explique brevemente por que o perfil deles se encaixa perfeitamente nas exigências do objeto do edital: "${edital.objeto}".
Seja direto, comercial e foque no ROI e na sinergia da parceria.`;

    const config = typeof getAIConfig === 'function' ? getAIConfig() : { provider: 'openai', openai_model: 'gpt-4o' };
    let resp;
    
    if(typeof callOpenAI === 'function' && typeof callClaude === 'function') {
        if(config.provider === 'openai') {
          resp = await callOpenAI(promptCustom, config); 
        } else {
          resp = await callClaude(promptCustom, config);
        }
    } else {
      resp = `Olá equipe da ${cliente.nome},
Temos uma excelente oportunidade para vocês. Encontramos o edital ${edital.numero} para o órgão ${edital.orgao}.
Os produtos (${cliente.produtos.join(', ')}) se encaixam perfeitamente na licitação.
Podemos marcar uma rápida ligação para discutirmos os próximos passos?`;
    }
    
    container.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong><i class="ti ti-mail"></i> Sugestão de Pitch:</strong> <button class="btn btn-sm btn-outline" style="padding:2px 6px;font-size:0.7rem;border:none;color:var(--primary)" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText);alert('Pitch copiado!')" title="Copiar Pitch"><i class="ti ti-copy"></i> Copiar</button></div><div style="color:var(--gray-700)">${resp.replace(/\n/g, '<br>')}</div>`;
    
  } catch(e) {
    container.innerHTML = `<span style="color:var(--danger)"><i class="ti ti-alert-circle"></i> Erro: ${e.message}</span>`;
    btn.style.display = 'block';
  }
};

// ===== KANBAN =====
function renderKanban(){
  const cols = KANBAN_COLUNAS && KANBAN_COLUNAS.length > 0 ? KANBAN_COLUNAS : DEFAULT_KANBAN_COLUNAS;
  app.innerHTML=`<div class="page-header">
    <div>
      <h1>Pipeline de Licitações</h1>
      <p>Acompanhe o progresso de cada edital</p>
    </div>
    <button class="btn btn-primary" onclick="abrirNovaColunaKanban()"><i class="ti ti-plus"></i> Nova Coluna</button>
  </div>
  <div class="kanban">${cols.map(col=>{
    const items=PIPELINE.filter(p=>p.coluna===col.key);
    return `<div class="kanban-col" ondragover="allowDrop(event)" ondrop="drop(event, '${col.key}')"><div class="kanban-col-header"><span class="kanban-col-title">${col.label}</span><span class="kanban-count">${items.length}</span></div>
    ${items.map(p=>{
      const e=EDITAIS.find(x=>String(x.id)===String(p.editalId || p.edital_id));if(!e)return'';
      let extra='';
      if(col.key==='concluido')extra=`<div style="margin-top:6px"><span class="result-badge ${p.resultado==='ganho'?'won':'lost'}">${p.resultado==='ganho'?'✓ Ganho':'✗ Perdido'}</span></div>`;
      return `<div class="kanban-card" draggable="true" ondragstart="drag(event, '${e.id}')" onclick="abrirDetalhesEdital('${e.id}')" style="cursor:pointer" title="Clique para ver detalhes"><div class="kanban-card-title"><span class="priority-dot" style="background:${prioColor(p.prioridade)}"></span>${e.numero}</div>
      <div style="font-size:.75rem;color:var(--gray-700);margin-bottom:4px">${e.objeto.substring(0,60)}...</div>
      <div class="kanban-card-meta"><span><i class="ti ti-currency-real" style="font-size:.7rem"></i> ${fmt(e.valorEstimado || e.valor_estimado)}</span><span><i class="ti ti-calendar" style="font-size:.7rem"></i> ${new Date(e.dataAbertura || e.data_abertura).toLocaleDateString('pt-BR')}</span></div>${extra}</div>`;
    }).join('')}</div>`;
  }).join('')}</div>`;
}

window.abrirNovaColunaKanban = function() {
  openModal(`<div class="modal-header"><h2>Nova Coluna no Pipeline</h2><button class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <form onsubmit="salvarNovaColunaKanban(event)">
    <div class="form-group">
      <label>Nome da Coluna <span style="color:#ef4444">*</span></label>
      <input id="nk-label" required placeholder="Ex: Qualificação, Negociação, etc.">
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button type="submit" class="btn btn-primary">Criar Coluna</button>
    </div>
  </form>`);
};

window.salvarNovaColunaKanban = async function(event) {
  event.preventDefault();
  const label = document.getElementById('nk-label').value.trim();
  if (!label) return;
  
  const key = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_+$)/g, '');
  if (!key) {
    alert('Nome de coluna inválido.');
    return;
  }
  
  // Check if key already exists
  const cols = KANBAN_COLUNAS && KANBAN_COLUNAS.length > 0 ? KANBAN_COLUNAS : DEFAULT_KANBAN_COLUNAS;
  if (cols.some(c => c.key === key)) {
    alert('Já existe uma coluna com este nome ou similar.');
    return;
  }
  
  const novaPosicao = cols.length + 1;
  const novaCol = { key, label, posicao: novaPosicao };
  
  try {
    const salvo = await dbSaveKanbanColuna(novaCol);
    if (salvo) {
      if (KANBAN_COLUNAS.length === 0) {
        KANBAN_COLUNAS = [...DEFAULT_KANBAN_COLUNAS];
      }
      KANBAN_COLUNAS.push(salvo);
    }
  } catch(e) {
    console.warn("Erro ao salvar coluna no banco, inserindo localmente:", e);
    if (KANBAN_COLUNAS.length === 0) {
      KANBAN_COLUNAS = [...DEFAULT_KANBAN_COLUNAS];
    }
    KANBAN_COLUNAS.push(novaCol);
  }
  
  closeModal();
  renderKanban();
};

window.abrirDetalhesEdital = function(editalId) {
  const e = EDITAIS.find(x => String(x.id) === String(editalId));
  if(!e) return;
  const p = PIPELINE.find(x => String(x.editalId || x.edital_id) === String(editalId)) || {};

  const cols = KANBAN_COLUNAS && KANBAN_COLUNAS.length > 0 ? KANBAN_COLUNAS : DEFAULT_KANBAN_COLUNAS;
  const colObj = cols.find(c => c.key === p.coluna);
  const statusAtual = colObj ? colObj.label : (e.status || 'Ativo');

  let aiBlock = '';
  if(e.aiAnalysis || e.ai_analysis || e.pdfText || e.pdf_text) {
     const textMd = e.aiAnalysis || e.ai_analysis || e.pdfText || e.pdf_text;
     const rendered = typeof renderMarkdown === 'function' ? renderMarkdown(textMd) : textMd.replace(/\n/g, '<br>');
     aiBlock = `<div style="margin-top:20px; border-top:1px solid var(--gray-200); padding-top:16px;">
       <h3 style="margin-bottom:12px; display:flex; align-items:center; gap:6px; color:var(--primary); font-size:1rem;"><i class="ti ti-brain"></i> Análise da IA / Texto do Edital</h3>
       <div style="background:var(--gray-50); padding:16px; border-radius:8px; border:1px solid var(--gray-200); max-height:350px; overflow-y:auto; font-size:.85rem; color:var(--gray-800); line-height:1.5;">
         ${rendered}
       </div>
     </div>`;
  }

  let linkBtn = '';
  if(e.url) {
     linkBtn = `<a href="${e.url}" target="_blank" class="btn btn-sm btn-outline" style="color:var(--primary); border-color:var(--primary)"><i class="ti ti-external-link"></i> Acessar Portal</a>`;
  }

  openModal(`<div class="modal-header" style="border-bottom:1px solid var(--gray-200); padding-bottom:12px; margin-bottom:16px;">
    <div>
      <span class="chip chip-blue" style="margin-bottom:6px;">${e.modalidade}</span>
      <h2 style="font-size:1.4rem; color:var(--gray-900); margin:0;">${e.numero} — ${e.orgao}</h2>
    </div>
    <button class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></button>
  </div>

  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:20px;">
    <div style="background:var(--gray-50); padding:12px; border-radius:8px; border:1px solid var(--gray-200);">
      <span style="font-size:.75rem; color:var(--gray-500); display:block;">Valor Estimado</span>
      <strong style="font-size:1.1rem; color:var(--gray-900);">${fmt(e.valorEstimado || e.valor_estimado)}</strong>
    </div>
    <div style="background:var(--gray-50); padding:12px; border-radius:8px; border:1px solid var(--gray-200);">
      <span style="font-size:.75rem; color:var(--gray-500); display:block;">Data de Abertura</span>
      <strong style="font-size:.95rem; color:var(--gray-900);"><i class="ti ti-calendar-event"></i> ${e.dataAbertura || e.data_abertura ? new Date(e.dataAbertura || e.data_abertura).toLocaleDateString('pt-BR') : 'Não informada'}</strong>
    </div>
    <div style="background:var(--gray-50); padding:12px; border-radius:8px; border:1px solid var(--gray-200);">
      <span style="font-size:.75rem; color:var(--gray-500); display:block;">Prazo / Data Limite</span>
      <strong style="font-size:.95rem; color:var(--danger);"><i class="ti ti-clock"></i> ${e.dataLimite || e.data_limite ? new Date(e.dataLimite || e.data_limite).toLocaleDateString('pt-BR') : 'Não cadastrado'}</strong>
    </div>
    <div style="background:var(--gray-50); padding:12px; border-radius:8px; border:1px solid var(--gray-200);">
      <span style="font-size:.75rem; color:var(--gray-500); display:block;">Fase / Status</span>
      <strong style="font-size:.95rem; color:var(--primary);">${statusAtual}</strong>
    </div>
  </div>

  <div style="margin-bottom:16px;">
    <span style="font-size:.8rem; font-weight:600; color:var(--gray-700); display:block; margin-bottom:6px;">Objeto do Edital:</span>
    <div style="background:var(--gray-100); padding:12px; border-radius:6px; font-size:.9rem; color:var(--gray-800); white-space:pre-wrap;">${e.objeto}</div>
  </div>

  ${aiBlock}

  <div class="form-actions" style="margin-top:24px; padding-top:16px; border-top:1px solid var(--gray-200); justify-content:space-between; display:flex; align-items:center;">
    <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="if(confirm('Tem certeza que deseja excluir este edital?')) { excluirEdital('${e.id}'); closeModal(); }">
      <i class="ti ti-trash"></i> Excluir Edital
    </button>
    <div style="display:flex; gap:8px;">
      ${linkBtn}
      <button class="btn btn-sm btn-primary" onclick="closeModal()">Fechar</button>
    </div>
  </div>`);
};

window.allowDrop = function(ev) {
  ev.preventDefault();
};

window.drag = function(ev, editalId) {
  ev.dataTransfer.setData("text", editalId);
};

window.drop = async function(ev, novaColuna) {
  ev.preventDefault();
  const editalId = ev.dataTransfer.getData("text");
  if(!editalId || !novaColuna) return;
  
  const p = PIPELINE.find(x => String(x.editalId || x.edital_id) === String(editalId));
  if(p && p.coluna !== novaColuna) {
    p.coluna = novaColuna;
    renderKanban(); 
    
    if(typeof dbUpdatePipelineColuna === 'function' && p.id) {
      try {
        await dbUpdatePipelineColuna(p.id, novaColuna);
      } catch(e) {
        console.error("Erro ao atualizar pipeline no Supabase", e);
      }
    }
  }
};

// ===== AUTH UI & INIT =====
window.togglePasswordVisibility = function(inputId, btnEl) {
  const input = document.getElementById(inputId);
  const button = btnEl || (typeof event !== 'undefined' && event.currentTarget) || (input && input.nextElementSibling);
  const icon = button ? button.querySelector('i') : null;
  if (input && icon) {
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'ti ti-eye-off';
    } else {
      input.type = 'password';
      icon.className = 'ti ti-eye';
    }
  }
};

function showAuth() {
  const root = $('#auth-root');
  root.style.display = 'block';
  $('.sidebar').style.display = 'none';
  $('.main').style.display = 'none';
  renderLoginForm();
}

function hideAuth() {
  const root = $('#auth-root');
  root.style.display = 'none';
  $('.sidebar').style.display = 'flex';
  $('.main').style.display = 'block';
}

function renderLoginForm() {
  $('#auth-root').innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">
          <i class="ti ti-box"></i>
          <h2>Sandbox Morphix</h2>
          <p>Faça login para acessar a plataforma</p>
        </div>
        <form class="auth-form" onsubmit="handleLogin(event)">
          <div id="auth-error" style="color:var(--danger);font-size:0.8rem;margin-bottom:10px;text-align:center"></div>
          <div class="form-group">
            <label>E-mail</label>
            <div class="input-icon-wrap">
              <i class="ti ti-mail"></i>
              <input type="email" id="auth-email" required placeholder="seu@email.com">
            </div>
          </div>
          <div class="form-group">
            <label>Senha</label>
            <div class="input-icon-wrap">
              <i class="ti ti-lock"></i>
              <input type="password" id="auth-pass" class="password-input" required placeholder="••••••••">
              <button type="button" class="password-toggle" onclick="togglePasswordVisibility('auth-pass', this)" tabindex="-1">
                <i class="ti ti-eye"></i>
              </button>
            </div>
            <div style="text-align: right; margin-top: 6px;">
              <a onclick="renderResetPasswordRequestForm()" style="font-size: 0.75rem; color: var(--primary); cursor: pointer; font-weight: 600;">Esqueceu sua senha?</a>
            </div>
          </div>
          <button type="submit" class="auth-btn" id="btn-login">Entrar</button>
        </form>
        <div class="auth-links">
          Ainda não tem conta? <a onclick="renderRegisterForm()">Cadastre-se</a>
        </div>
      </div>
    </div>
  `;
}

function renderRegisterForm() {
  $('#auth-root').innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">
          <i class="ti ti-user-plus"></i>
          <h2>Criar Conta</h2>
          <p>Junte-se ao Sandbox Morphix</p>
        </div>
        <form class="auth-form" onsubmit="handleRegister(event)">
          <div id="auth-error" style="color:var(--danger);font-size:0.8rem;margin-bottom:10px;text-align:center"></div>
          <div class="form-group">
            <label>E-mail</label>
            <div class="input-icon-wrap">
              <i class="ti ti-mail"></i>
              <input type="email" id="auth-email" required placeholder="seu@email.com">
            </div>
          </div>
          <div class="form-group">
            <label>Senha</label>
            <div class="input-icon-wrap">
              <i class="ti ti-lock"></i>
              <input type="password" id="auth-pass" class="password-input" required placeholder="Mínimo 6 caracteres">
              <button type="button" class="password-toggle" onclick="togglePasswordVisibility('auth-pass', this)" tabindex="-1">
                <i class="ti ti-eye"></i>
              </button>
            </div>
          </div>
          <button type="submit" class="auth-btn" id="btn-register">Registrar</button>
        </form>
        <div class="auth-links">
          Já tem uma conta? <a onclick="renderLoginForm()">Voltar ao Login</a>
        </div>
      </div>
    </div>
  `;
}

function renderResetPasswordRequestForm() {
  $('#auth-root').innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">
          <i class="ti ti-key"></i>
          <h2>Recuperar Senha</h2>
          <p>Digite seu e-mail para receber o link de redefinição</p>
        </div>
        <form class="auth-form" onsubmit="handleResetPasswordRequest(event)">
          <div id="auth-error" style="color:var(--danger);font-size:0.8rem;margin-bottom:10px;text-align:center"></div>
          <div id="auth-success" style="color:var(--success);font-size:0.8rem;margin-bottom:10px;text-align:center"></div>
          <div class="form-group">
            <label>E-mail</label>
            <div class="input-icon-wrap">
              <i class="ti ti-mail"></i>
              <input type="email" id="reset-email" required placeholder="seu@email.com">
            </div>
          </div>
          <button type="submit" class="auth-btn" id="btn-reset-req">Enviar Link</button>
        </form>
        <div class="auth-links">
          <a onclick="renderLoginForm()">Voltar ao Login</a>
        </div>
      </div>
    </div>
  `;
}

function renderResetPasswordConfirmForm() {
  $('#auth-root').style.display = 'block';
  $('.sidebar').style.display = 'none';
  $('.main').style.display = 'none';

  $('#auth-root').innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">
          <i class="ti ti-shield-lock"></i>
          <h2>Nova Senha</h2>
          <p>Crie uma nova senha forte para sua conta</p>
        </div>
        <form class="auth-form" onsubmit="handleResetPasswordConfirm(event)">
          <div id="auth-error" style="color:var(--danger);font-size:0.8rem;margin-bottom:10px;text-align:center"></div>
          <div id="auth-success" style="color:var(--success);font-size:0.8rem;margin-bottom:10px;text-align:center"></div>
          <div class="form-group">
            <label>Nova Senha</label>
            <div class="input-icon-wrap">
              <i class="ti ti-lock"></i>
              <input type="password" id="confirm-pass" class="password-input" required placeholder="Nova senha (min. 6 carac.)">
              <button type="button" class="password-toggle" onclick="togglePasswordVisibility('confirm-pass', this)" tabindex="-1">
                <i class="ti ti-eye"></i>
              </button>
            </div>
          </div>
          <button type="submit" class="auth-btn" id="btn-reset-conf">Atualizar Senha</button>
        </form>
      </div>
    </div>
  `;
}

window.saveAuthSupabaseConfig = function() {
  const url = document.getElementById('sb-cfg-url').value.trim();
  const key = document.getElementById('sb-cfg-key').value.trim();
  saveSupabaseConfig({ url, key }); 
};

function atualizarPermissoesSidebar() {
  const itemUsuarios = document.querySelector('.nav-item[data-page="usuarios"]');
  if (itemUsuarios) {
    if (userLogado && userLogado.tipo === 'admin') {
      itemUsuarios.style.display = 'flex';
    } else {
      itemUsuarios.style.display = 'none';
      if (currentPage === 'usuarios') {
        currentPage = 'dashboard';
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        const itemDash = document.querySelector('.nav-item[data-page="dashboard"]');
        if(itemDash) itemDash.classList.add('active');
      }
    }
  }
}

window.handleLogin = async function(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value.trim();
  const btn = document.getElementById('btn-login');
  btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Entrando...';

  const enc = USUARIOS_SISTEMA.find(u => u.email.toLowerCase() === email.toLowerCase() && u.senha === pass);
  if (enc) {
    userLogado = enc;
    currentUser = { email: enc.email };
    const sbEmail = document.getElementById('sb-user-email');
    if(sbEmail) sbEmail.textContent = enc.email;
    document.getElementById('splash-screen').classList.remove('hidden');
    await loadSupabaseData();
    hideAuth();
    atualizarPermissoesSidebar();
    document.getElementById('splash-screen').classList.add('hidden');
    render();
    return;
  }

  try {
    const data = await dbLogin(email, pass);
    currentUser = { email: email };
    userLogado = { id: data.user.id, nome: email.split('@')[0], email: email, tipo: 'usuario' };
    const sbEmail = document.getElementById('sb-user-email');
    if(sbEmail) sbEmail.textContent = email;
    document.getElementById('splash-screen').classList.remove('hidden');
    await loadSupabaseData();
    hideAuth();
    atualizarPermissoesSidebar();
    document.getElementById('splash-screen').classList.add('hidden');
    render();
  } catch (err) {
    document.getElementById('auth-error').textContent = "Credenciais inválidas. Verifique seu e-mail e senha.";
    btn.disabled = false; btn.innerHTML = 'Entrar';
  }
};

window.handleRegister = async function(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value.trim();
  const btn = document.getElementById('btn-register');
  btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Registrando...';

  try {
    await dbSignUp(email, pass);
    alert('Cadastro realizado com sucesso! Verifique seu e-mail para confirmação se necessário.');
    renderLoginForm();
  } catch(err) {
    document.getElementById('auth-error').textContent = 'Erro ao cadastrar: ' + err.message;
    btn.disabled = false; btn.innerHTML = 'Registrar';
  }
};

window.handleResetPasswordRequest = async function(e) {
  e.preventDefault();
  const email = document.getElementById('reset-email').value.trim();
  const btn = document.getElementById('btn-reset-req');
  const errDiv = document.getElementById('auth-error');
  const succDiv = document.getElementById('auth-success');
  
  errDiv.textContent = '';
  succDiv.textContent = '';
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Enviando...';
  
  try {
    await dbResetPasswordEmail(email);
    succDiv.textContent = 'E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.';
    btn.innerHTML = 'Enviar Link';
    btn.disabled = false;
  } catch(err) {
    errDiv.textContent = 'Erro ao enviar e-mail: ' + err.message;
    btn.innerHTML = 'Enviar Link';
    btn.disabled = false;
  }
};

window.handleResetPasswordConfirm = async function(e) {
  e.preventDefault();
  const pass = document.getElementById('confirm-pass').value.trim();
  const btn = document.getElementById('btn-reset-conf');
  const errDiv = document.getElementById('auth-error');
  const succDiv = document.getElementById('auth-success');
  
  errDiv.textContent = '';
  succDiv.textContent = '';
  
  if (pass.length < 6) {
    errDiv.textContent = 'A senha deve ter no mínimo 6 caracteres.';
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Atualizando...';
  
  try {
    await dbUpdatePassword(pass);
    succDiv.textContent = 'Senha atualizada com sucesso! Redirecionando para o login...';
    
    if (history.pushState) {
      history.pushState("", document.title, window.location.pathname + window.location.search);
    } else {
      window.location.hash = "";
    }
    
    setTimeout(() => {
      renderLoginForm();
    }, 2000);
  } catch(err) {
    errDiv.textContent = 'Erro ao atualizar senha: ' + err.message;
    btn.innerHTML = 'Atualizar Senha';
    btn.disabled = false;
  }
};

window.doLogout = async function() {
  if (!confirm("Tem certeza que deseja sair?")) return;
  document.getElementById('splash-screen').classList.remove('hidden');
  try { await dbLogout(); } catch(e){}
  userLogado = null;
  showAuth();
  document.getElementById('splash-screen').classList.add('hidden');
};

async function loadSupabaseData() {
  EDITAIS = await dbGetEditais() || [];
  CLIENTES = await dbGetClientes() || [];
  PIPELINE = await dbGetPipeline() || [];
  EDITAL_CLIENTES = await dbGetAllEditalClientes() || [];
  KANBAN_COLUNAS = await dbGetKanbanColunas() || [];
  if (typeof computeRelatorios === 'function') computeRelatorios();
  if (typeof computeAlertas === 'function') computeAlertas();
}

async function checkAuthAndInit() {
  const splash = document.getElementById('splash-screen');
  
  // Interceptar fluxo de recuperação de senha do Supabase
  const hash = window.location.hash;
  const isRecovery = hash.includes('type=recovery') || (hash.includes('access_token=') && hash.includes('type=recovery'));
  if (isRecovery) {
    splash.classList.add('hidden');
    renderResetPasswordConfirmForm();
    return;
  }
  
  // Tentar obter sessão ativa do Supabase
  if (typeof dbGetCurrentUser === 'function') {
    try {
      const sbUser = await dbGetCurrentUser();
      if (sbUser) {
        userLogado = { id: sbUser.id, nome: sbUser.email.split('@')[0], email: sbUser.email, tipo: 'usuario' };
        currentUser = { email: sbUser.email };
        const sbEmail = document.getElementById('sb-user-email');
        if(sbEmail) sbEmail.textContent = sbUser.email;
        await loadSupabaseData();
        hideAuth();
        atualizarPermissoesSidebar();
        splash.classList.add('hidden');
        render();
        return;
      }
    } catch(e) {
      console.warn("Erro ao obter sessão do Supabase:", e);
    }
  }

  try {
    if (userLogado) {
      currentUser = { email: userLogado.email };
      const sbEmail = document.getElementById('sb-user-email');
      if(sbEmail) sbEmail.textContent = userLogado.email;
      await loadSupabaseData();
      hideAuth();
      atualizarPermissoesSidebar();
      splash.classList.add('hidden');
      render();
    } else {
      splash.classList.add('hidden');
      showAuth();
    }
  } catch (err) {
    splash.classList.add('hidden');
    showAuth();
  }
}

// ===== GESTÃO DE USUÁRIOS =====
function renderUsuarios() {
  const isAdmin = userLogado.tipo === 'admin';
  app.innerHTML = `
  <div class="page-header">
    <div>
      <h1>Gestão de Usuários</h1>
      <p>Gerencie o acesso da sua equipe à plataforma Morphix</p>
    </div>
    ${isAdmin ? `<button class="btn btn-primary" onclick="openNovoUsuario()"><i class="ti ti-user-plus"></i> Novo Usuário</button>` : `<span class="chip chip-red" style="font-size:0.85rem;"><i class="ti ti-lock"></i> Criação restrita a Administradores</span>`}
  </div>
  <div class="card" style="margin-bottom:16px;background:var(--gray-50);padding:16px;border-radius:8px;border:1px solid var(--gray-200);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
    <div>
      <span style="font-size:0.8rem;color:var(--gray-500);display:block;">Sua Sessão Atual:</span>
      <strong style="font-size:1.1rem;color:var(--gray-800);">${userLogado.nome}</strong> (${userLogado.email})
      <span class="chip ${userLogado.tipo === 'admin' ? 'chip-green' : 'chip-blue'}" style="margin-left:6px;">${userLogado.tipo === 'admin' ? 'Administrador (Acesso Total)' : 'Usuário Padrão'}</span>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <span style="font-size:0.8rem;color:var(--gray-600)">Simular Alternância de Perfil:</span>
      <select class="btn btn-sm btn-outline" onchange="alternarUserLogado(this.value)" style="background:white;cursor:pointer;">
        ${USUARIOS_SISTEMA.map(u => `<option value="${u.id}" ${u.id === userLogado.id ? 'selected' : ''}>${u.nome} (${u.tipo})</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="card">
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>E-mail</th>
          <th>Permissão</th>
          <th>Criado em</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${USUARIOS_SISTEMA.map(u => `
        <tr>
          <td style="font-weight:600"><div style="display:flex;align-items:center;gap:8px;"><i class="ti ti-user-circle" style="font-size:1.4rem;color:var(--primary);"></i> ${u.nome}</div></td>
          <td>${u.email}</td>
          <td><span class="chip ${u.tipo === 'admin' ? 'chip-green' : 'chip-blue'}">${u.tipo === 'admin' ? 'Administrador' : 'Usuário Comum'}</span></td>
          <td>${u.data ? fmtDate(u.data) : '14/05/2026'}</td>
          <td>
            ${isAdmin && u.id !== userLogado.id ? `<button class="btn btn-sm btn-outline" style="color:var(--danger)" onclick="excluirUsuario('${u.id}')" title="Excluir Usuário"><i class="ti ti-trash"></i></button>` : `<span style="font-size:0.75rem;color:var(--gray-400);">${u.id === userLogado.id ? 'Você' : 'Bloqueado'}</span>`}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

window.alternarUserLogado = function(id) {
  const enc = USUARIOS_SISTEMA.find(u => u.id === id);
  if(enc) {
    userLogado = enc;
    const sbEmail = document.getElementById('sb-user-email');
    if(sbEmail) sbEmail.innerText = enc.email;
    atualizarPermissoesSidebar();
    if (currentPage === 'usuarios' && userLogado.tipo !== 'admin') {
      render();
    } else if (currentPage === 'usuarios') {
      renderUsuarios();
    } else {
      render();
    }
  }
};

window.openNovoUsuario = function() {
  if(userLogado.tipo !== 'admin') {
    alert("Acesso Negado: Apenas Administradores podem criar novos usuários.");
    return;
  }
  openModal(`<div class="modal-header"><h2><i class="ti ti-user-plus" style="color:var(--primary)"></i> Novo Usuário</h2><button class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <form onsubmit="salvarUsuario(event)">
    <div class="form-group">
      <label>Nome Completo</label>
      <input id="usr-nome" required placeholder="Ex: Carlos Silva">
    </div>
    <div class="form-group">
      <label>E-mail Corporativo</label>
      <input id="usr-email" type="email" required placeholder="carlos@morphix.com.br">
    </div>
    <div class="form-group">
      <label>Senha Provisória</label>
      <input id="usr-senha" type="password" required placeholder="••••••••">
    </div>
    <div class="form-group">
      <label>Nível de Permissão</label>
      <select id="usr-tipo" required>
        <option value="usuario">Usuário Comum (Não cria novos usuários)</option>
        <option value="admin">Administrador (Acesso Total)</option>
      </select>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button type="submit" class="btn btn-primary"><i class="ti ti-check"></i> Cadastrar Usuário</button>
    </div>
  </form>`);
};

window.salvarUsuario = function(ev) {
  ev.preventDefault();
  const novo = {
    id: Date.now().toString(),
    nome: document.getElementById('usr-nome').value,
    email: document.getElementById('usr-email').value,
    senha: document.getElementById('usr-senha').value,
    tipo: document.getElementById('usr-tipo').value,
    data: new Date().toISOString().split('T')[0]
  };
  USUARIOS_SISTEMA.push(novo);
  try { localStorage.setItem('licitapro_usuarios', JSON.stringify(USUARIOS_SISTEMA)); } catch(e){}
  closeModal();
  renderUsuarios();
};

window.excluirUsuario = function(id) {
  if(!confirm("Tem certeza que deseja excluir este usuário da plataforma?")) return;
  USUARIOS_SISTEMA = USUARIOS_SISTEMA.filter(u => u.id !== id);
  try { localStorage.setItem('licitapro_usuarios', JSON.stringify(USUARIOS_SISTEMA)); } catch(e){}
  renderUsuarios();
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  checkAuthAndInit();
});

