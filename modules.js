// ===== AGENDA =====
function renderAgenda(){
  const now=new Date(2026,4,1);let cMonth=now.getMonth(),cYear=now.getFullYear();
  function draw(){
    const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const first=new Date(cYear,cMonth,1);const startDay=first.getDay();
    const daysInMonth=new Date(cYear,cMonth+1,0).getDate();
    const prevDays=new Date(cYear,cMonth,0).getDate();
    const today=new Date();const todayStr=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    let cells='';
    const daysOfWeek=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    daysOfWeek.forEach(d=>{cells+=`<div class="cal-header">${d}</div>`});

    const agendamentos = [];
    EDITAIS.filter(e => e.status !== 'Encerrado').forEach(e => {
       const dAbertura = e.dataAbertura || e.data_abertura;
       if(dAbertura) {
           agendamentos.push({ data: dAbertura, titulo: `Abertura ${e.numero}`, desc: `Sessão: ${e.orgao}`, tipo: 'sessao' });
       }
       const dLimite = e.dataLimite || e.data_limite;
       if(dLimite) {
           agendamentos.push({ data: dLimite, titulo: `Prazo Final ${e.numero}`, desc: `Limite proposta: ${e.orgao}`, tipo: 'prazo' });
       }
    });

    for(let i=startDay-1;i>=0;i--){cells+=`<div class="cal-day other-month">${prevDays-i}</div>`}
    for(let d=1;d<=daysInMonth;d++){
      const ds=`${cYear}-${String(cMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const evts=agendamentos.filter(e=>e.data===ds);
      const isToday=ds===todayStr;
      const hasCrit=evts.some(e=>e.tipo==='prazo');
      let cls='cal-day';
      if(isToday)cls+=' today';else if(hasCrit)cls+=' critical';else if(evts.length)cls+=' has-event';
      cells+=`<div class="${cls}" onclick="showDayEvents('${ds}')">${d}</div>`;
    }
    const totalCells=startDay+daysInMonth;const rem=totalCells%7?7-totalCells%7:0;
    for(let i=1;i<=rem;i++){cells+=`<div class="cal-day other-month">${i}</div>`}

    const upcoming=agendamentos.filter(e=>e.data>=todayStr).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,6);
    const tipoStyle={sessao:{bg:'var(--primary-light)',color:'var(--primary)',label:'Sessão'},prazo:{bg:'var(--danger-light)',color:'var(--danger)',label:'Prazo'},certidao:{bg:'var(--warning-light)',color:'var(--warning-dark)',label:'Certidão'},reuniao:{bg:'var(--success-light)',color:'var(--success)',label:'Reunião'}};

    app.innerHTML=`<div class="page-header"><div><h1>Agenda de Prazos</h1><p>Calendário inteligente gerado automaticamente a partir dos editais abertos</p></div></div>
    <div class="grid-2-1">
      <div class="card">
        <div class="cal-nav">
          <button onclick="calPrev()"><i class="ti ti-chevron-left"></i></button>
          <h3>${months[cMonth]} ${cYear}</h3>
          <button onclick="calNext()"><i class="ti ti-chevron-right"></i></button>
        </div>
        <div class="calendar-grid">${cells}</div>
      </div>
      <div class="card">
        <div class="section-title"><i class="ti ti-calendar-event"></i> Próximos Eventos</div>
        ${upcoming.length ? upcoming.map(ev=>{
          const ts=tipoStyle[ev.tipo]||tipoStyle.sessao;
          const dp=ev.data.split('-');
          return `<div class="event-item">
            <div class="event-date"><div class="day">${dp[2]}</div><div class="month">${months[+dp[1]-1].substring(0,3)}</div></div>
            <div class="event-info"><div class="ev-title">${ev.titulo}</div><div class="ev-desc">${ev.desc}</div>
            <span class="event-type" style="background:${ts.bg};color:${ts.color}">${ts.label}</span></div>
          </div>`;
        }).join('') : '<p style="color:var(--gray-500);font-size:.8rem">Nenhum evento futuro mapeado.</p>'}
      </div>
    </div>`;

    window.calPrev=()=>{cMonth--;if(cMonth<0){cMonth=11;cYear--}draw()};
    window.calNext=()=>{cMonth++;if(cMonth>11){cMonth=0;cYear++}draw()};
  }
  draw();
}

window.showDayEvents=function(ds){
  const agendamentos = [];
  EDITAIS.filter(e => e.status !== 'Encerrado').forEach(e => {
       const dAbertura = e.dataAbertura || e.data_abertura;
       if(dAbertura) agendamentos.push({ data: dAbertura, titulo: `Abertura ${e.numero}`, desc: `Sessão: ${e.orgao}`, tipo: 'sessao' });
       const dLimite = e.dataLimite || e.data_limite;
       if(dLimite) agendamentos.push({ data: dLimite, titulo: `Prazo Final ${e.numero}`, desc: `Limite proposta: ${e.orgao}`, tipo: 'prazo' });
  });

  const evts=agendamentos.filter(e=>e.data===ds);
  if(!evts.length){openModal(`<div class="modal-header"><h2>${fmtDate(ds)}</h2><button class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></button></div><p style="color:var(--gray-400);font-size:.85rem">Nenhum evento nesta data.</p>`);return}
  const tipoStyle={sessao:{label:'Sessão',cls:'chip-blue'},prazo:{label:'Prazo Limite',cls:'chip-red'}};
  openModal(`<div class="modal-header"><h2>Eventos — ${fmtDate(ds)}</h2><button class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  ${evts.map(ev=>{const ts=tipoStyle[ev.tipo]||tipoStyle.sessao;return`<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)"><div style="font-weight:600;font-size:.85rem">${ev.titulo}</div><div style="font-size:.78rem;color:var(--gray-500);margin:4px 0">${ev.desc}</div><span class="chip ${ts.cls}">${ts.label}</span></div>`}).join('')}`);
};

// ===== CRM =====
function renderCRM(){
  app.innerHTML=`
  <div class="page-header"><div><h1>CRM de Clientes</h1><p>Gerencie seus clientes e palavras-chave para matching</p></div>
    <button class="btn btn-primary" onclick="openNovoCliente()"><i class="ti ti-plus"></i> Novo Cliente</button></div>
  <div class="filters">
    <div class="search-box"><i class="ti ti-search"></i><input id="crm-search" placeholder="Buscar por nome ou CNPJ..." oninput="filterCRM()"></div>
    <select id="crm-area" onchange="filterCRM()"><option value="">Todas as áreas</option>${[...new Set(CLIENTES.map(c=>c.area))].map(a=>`<option>${a}</option>`).join('')}</select>
  </div>
  <div class="card"><table><thead><tr><th></th><th>Nome</th><th>Área</th><th>Produtos/Serviços</th><th>Editais Ativos</th><th>Status</th><th></th></tr></thead>
  <tbody id="crm-body"></tbody></table></div>`;
  filterCRM();
}
function filterCRM(){
  const q=($('#crm-search')?$('#crm-search').value:'').toLowerCase();
  const a=$('#crm-area')?$('#crm-area').value:'';
  const filtered=CLIENTES.filter(c=>{
    if(a&&c.area!==a)return false;
    if(q&&!(c.nome+c.cnpj).toLowerCase().includes(q))return false;
    return true;
  });
  const tb=$('#crm-body');if(!tb)return;
  tb.innerHTML=filtered.map((c,i)=>`<tr>
    <td><div class="avatar" style="background:${c.cor}">${initials(c.nome)}</div></td>
    <td><div style="font-weight:600">${c.nome}</div><div style="font-size:.7rem;color:var(--gray-400)">${c.cnpj}</div></td>
    <td><span class="chip" style="background:${c.cor}20;color:${c.cor}">${c.area}</span></td>
    <td><div style="display:flex;flex-wrap:wrap;gap:3px">${c.produtos.map(p=>`<span class="chip chip-gray">${p}</span>`).join('')}</div></td>
    <td style="font-weight:600;text-align:center">${c.editaisAtivos}</td>
    <td><span class="chip ${c.status==='Ativo'?'chip-green':'chip-red'}">${c.status}</span></td>
    <td>
      <button class="btn btn-sm btn-outline" onclick="verCliente(${c.id})"><i class="ti ti-eye"></i></button>
      <button class="btn btn-sm btn-outline" onclick="editarCliente(${c.id})"><i class="ti ti-edit"></i></button>
    </td>
  </tr>`).join('');
}

function verCliente(id){
  const c=CLIENTES.find(x=>x.id===id);if(!c)return;
  const situacaoCor = (c.situacao||'').toLowerCase().includes('ativa') ? '#10b981' : '#f59e0b';
  openModal(`<div class="modal-header"><h2>${c.nome}</h2><button class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
    <div style="display:flex;gap:16px;margin-bottom:16px;align-items:flex-start">
      <div class="avatar" style="width:64px;height:64px;font-size:1.5rem;flex-shrink:0;background:${c.cor}">${initials(c.nome)}</div>
      <div style="flex:1">
        ${c.fantasia?`<div style="font-size:.75rem;color:var(--gray-500);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Nome Fantasia</div><div style="font-weight:700;font-size:1rem;margin-bottom:4px">${c.fantasia}</div>`:''}
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">
          <span class="chip chip-gray"><i class="ti ti-id-badge" style="font-size:.7rem"></i> ${c.cnpj}</span>
          <span class="chip" style="background:${c.cor}20;color:${c.cor}">${c.area}</span>
          ${c.situacao?`<span class="chip" style="background:${situacaoCor}20;color:${situacaoCor}"><i class="ti ti-circle-check" style="font-size:.7rem"></i> ${c.situacao}</span>`:''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.8rem;color:var(--gray-600)">
          ${c.contato?`<div><i class="ti ti-mail" style="color:var(--primary)"></i> ${c.contato}</div>`:''}
          ${c.telefone?`<div><i class="ti ti-phone" style="color:var(--primary)"></i> ${c.telefone}</div>`:''}
          ${c.municipio?`<div><i class="ti ti-map-pin" style="color:var(--primary)"></i> ${c.municipio}${c.uf?'/'+c.uf:''}</div>`:''}
          ${c.cep?`<div><i class="ti ti-mailbox" style="color:var(--primary)"></i> CEP ${c.cep}</div>`:''}
        </div>
        ${c.endereco?`<div style="font-size:.78rem;color:var(--gray-500);margin-top:4px"><i class="ti ti-building"></i> ${c.endereco}</div>`:''}
        ${c.cnae?`<div style="font-size:.75rem;color:var(--gray-400);margin-top:4px;font-style:italic"><i class="ti ti-category"></i> CNAE: ${c.cnae}</div>`:''}
      </div>
    </div>

    <div class="section-title"><i class="ti ti-file-text"></i> Editais Vinculados</div>
    <div style="margin-bottom:16px">
      <button class="btn btn-sm btn-outline" onclick="abrirVincularEdital(${id})"><i class="ti ti-link"></i> Vincular Novo Edital</button>
    </div>
    <div id="lista-vinculados">
      <p style="color:var(--gray-400);font-size:.8rem">Nenhum edital vinculado localmente ainda.<br>Clique em "Vincular Novo Edital" para preparar uma proposta.</p>
    </div>
  `);
}

function abrirVincularEdital(clienteId) {
  const c = CLIENTES.find(x => x.id === clienteId);
  const abertos = EDITAIS.filter(e => e.status !== 'Encerrado');
  
  openModal(`<div class="modal-header"><h2>Vincular Edital — ${c.nome}</h2><button class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
    <div class="form-group">
      <label>Selecione o Edital</label>
      <select id="sel-edital-vinc" class="form-control">
        ${abertos.map(e => `<option value="${e.id}">${e.numero} — ${e.orgao} (${fmt(e.valorEstimado)})</option>`).join('')}
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="verCliente(${clienteId})">Voltar</button>
      <button class="btn btn-primary" onclick="vincularEEnviar(${clienteId})"><i class="ti ti-mail"></i> Vincular e Criar Proposta</button>
    </div>
  `);
}

async function vincularEEnviar(clienteId) {
  const editalId = parseInt(document.getElementById('sel-edital-vinc').value);
  const c = CLIENTES.find(x => x.id === clienteId);
  const e = EDITAIS.find(x => x.id === editalId);
  
  // Salvar vínculo no banco (se configurado)
  try {
    await dbVincularCliente(editalId, clienteId);
  } catch(err) {
    console.log('Sem Supabase configurado, usando apenas UI local', err);
  }
  
  const subject = encodeURIComponent(`Proposta de Licitação — ${e.numero}`);
  const body = encodeURIComponent(`Olá equipe da ${c.nome},

Encontramos uma licitação com alta aderência ao perfil da empresa:

Número: ${e.numero}
Órgão: ${e.orgao}
Modalidade: ${e.modalidade}
Valor Estimado: ${fmt(e.valorEstimado)}
Data de Abertura: ${fmtDate(e.dataAbertura)}

Objeto: ${e.objeto}

Podemos agendar uma reunião para detalhar as exigências e estruturar a proposta?

Atenciosamente,
Equipe Sandbox Morphix`);

  window.open(`mailto:${c.contato}?subject=${subject}&body=${body}`, '_blank');
  
  alert('Edital vinculado! O seu cliente de email padrão foi aberto com o rascunho da proposta.');
  verCliente(clienteId);
}

function openNovoCliente(c){
  const edit=!!c;const title=edit?'Editar Cliente':'Novo Cliente';
  const areas=['Tecnologia','Saúde','Construção','Alimentação','Segurança','Serviços','Outros'];
  openModal(`<div class="modal-header"><h2>${title}</h2><button class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <form onsubmit="salvarCliente(event,${edit?c.id:'null'})" autocomplete="off">

    <!-- BLOCO CNPJ com busca API GOV -->
    <div style="background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:1.5px solid #bfdbfe;border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <i class="ti ti-building-store" style="color:#3b82f6;font-size:1.1rem"></i>
        <span style="font-weight:700;font-size:.85rem;color:#1e40af">Consulta Automática — CNPJ Federal</span>
        <span style="font-size:.72rem;color:#64748b;background:#e0f2fe;padding:2px 8px;border-radius:99px">API GOV gratuita</span>
      </div>
      <div style="display:flex;gap:10px;align-items:flex-end">
        <div class="form-group" style="flex:1;margin:0">
          <label style="font-size:.8rem;font-weight:600;color:#374151">CNPJ <span style="color:#ef4444">*</span></label>
          <input id="nc-cnpj" required value="${c?c.cnpj:''}" placeholder="00.000.000/0001-00"
            style="font-size:.95rem;font-weight:600;letter-spacing:1px"
            oninput="mascararCNPJ(this)" onblur="if(this.value.replace(/\\D/g,'').length===14)buscarCNPJ()">
        </div>
        <button type="button" id="btn-buscar-cnpj" class="btn btn-primary" style="height:40px;white-space:nowrap;gap:6px" onclick="buscarCNPJ()">
          <i class="ti ti-search"></i> Consultar CNPJ
        </button>
      </div>
      <div id="cnpj-status" style="margin-top:8px;font-size:.78rem"></div>
    </div>

    <!-- DADOS DA EMPRESA -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group" style="grid-column:1/-1">
        <label>Razão Social / Nome da Empresa <span style="color:#ef4444">*</span></label>
        <input id="nc-nome" required value="${c?c.nome:''}" placeholder="Razão social da empresa">
      </div>
      <div class="form-group">
        <label>Nome Fantasia</label>
        <input id="nc-fantasia" value="${c?c.fantasia||'':''}" placeholder="Nome fantasia (opcional)">
      </div>
      <div class="form-group">
        <label>Situação Cadastral</label>
        <input id="nc-situacao" value="${c?c.situacao||'':''}" placeholder="Ex: Ativa" readonly style="background:var(--gray-50);cursor:default">
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group">
        <label>Área de Atuação <span style="color:#ef4444">*</span></label>
        <select id="nc-area" required>
          ${areas.map(a=>`<option ${c&&c.area===a?'selected':''}>${a}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Telefone</label>
        <input id="nc-tel" value="${c?c.telefone||'':''}" placeholder="(00) 00000-0000">
      </div>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px">
      <div class="form-group">
        <label>Município</label>
        <input id="nc-municipio" value="${c?c.municipio||'':''}" placeholder="Cidade">
      </div>
      <div class="form-group">
        <label>UF</label>
        <input id="nc-uf" value="${c?c.uf||'':''}" placeholder="PR" maxlength="2" style="text-transform:uppercase">
      </div>
      <div class="form-group">
        <label>CEP</label>
        <input id="nc-cep" value="${c?c.cep||'':''}" placeholder="00000-000">
      </div>
    </div>

    <div class="form-group">
      <label>Logradouro / Endereço</label>
      <input id="nc-endereco" value="${c?c.endereco||'':''}" placeholder="Rua, número, complemento">
    </div>

    <div class="form-group">
      <label>Contato (e-mail)</label>
      <input id="nc-contato" type="email" value="${c?c.contato:''}" placeholder="contato@empresa.com.br">
    </div>

    <div class="form-group">
      <label>Produtos/Serviços <span style="font-size:.75rem;color:var(--gray-400)">(separar por vírgula)</span></label>
      <input id="nc-prod" value="${c?c.produtos.join(', '):''}" placeholder="produto1, produto2...">
    </div>

    <div class="form-group">
      <label>Palavras-chave para Matching <span style="font-size:.75rem;color:var(--gray-400)">(separar por vírgula)</span></label>
      <textarea id="nc-kw" placeholder="palavra1, palavra2...">${c?c.keywords.join(', '):''}</textarea>
    </div>

    <div class="form-group">
      <label>CNAE Principal</label>
      <input id="nc-cnae" value="${c?c.cnae||'':''}" placeholder="Código e descrição do CNAE" readonly style="background:var(--gray-50);cursor:default">
    </div>

    <div class="form-group">
      <label>Observações</label>
      <textarea id="nc-obs">${c?c.obs:''}</textarea>
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button type="submit" class="btn btn-primary">${edit?'Salvar Alterações':'Cadastrar'}</button>
    </div>
  </form>`);
}

window.mascararCNPJ = function(input) {
  let v = input.value.replace(/\D/g,'').substring(0,14);
  v = v.replace(/(\d{2})(\d)/,'$1.$2');
  v = v.replace(/(\d{2})\.(\d{3})(\d)/,'$1.$2.$3');
  v = v.replace(/\.(\d{3})(\d)/,'.$1/$2');
  v = v.replace(/(\d{4})(\d)/,'$1-$2');
  input.value = v;
};

window.buscarCNPJ = async function() {
  const cnpjInput = document.getElementById('nc-cnpj');
  const statusEl = document.getElementById('cnpj-status');
  const btn = document.getElementById('btn-buscar-cnpj');
  if (!cnpjInput || !statusEl) return;

  const cnpj = cnpjInput.value.replace(/\D/g,'');
  if (cnpj.length !== 14) {
    statusEl.innerHTML = '<span style="color:#ef4444"><i class="ti ti-alert-circle"></i> CNPJ deve ter 14 dígitos.</span>';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Consultando...';
  statusEl.innerHTML = '<span style="color:#3b82f6"><i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Buscando dados na Receita Federal...</span>';

  try {
    // Usa BrasilAPI (HTTPS, CORS liberado, sem chave)
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!res.ok) throw new Error(`CNPJ não encontrado (status ${res.status})`);
    const d = await res.json();

    // Preenche Razão Social
    const nomeEl = document.getElementById('nc-nome');
    if (nomeEl && d.razao_social) nomeEl.value = d.razao_social;

    // Nome Fantasia
    const fantasiaEl = document.getElementById('nc-fantasia');
    if (fantasiaEl && d.nome_fantasia) fantasiaEl.value = d.nome_fantasia;

    // Situação
    const situacaoEl = document.getElementById('nc-situacao');
    if (situacaoEl && d.descricao_situacao_cadastral) situacaoEl.value = d.descricao_situacao_cadastral;

    // Telefone
    const telEl = document.getElementById('nc-tel');
    if (telEl && d.ddd_telefone_1) telEl.value = d.ddd_telefone_1;

    // Endereço
    const endEl = document.getElementById('nc-endereco');
    if (endEl) {
      const partes = [d.logradouro, d.numero, d.complemento, d.bairro].filter(Boolean);
      endEl.value = partes.join(', ');
    }
    const municipioEl = document.getElementById('nc-municipio');
    if (municipioEl && d.municipio) municipioEl.value = d.municipio;
    const ufEl = document.getElementById('nc-uf');
    if (ufEl && d.uf) ufEl.value = d.uf;
    const cepEl = document.getElementById('nc-cep');
    if (cepEl && d.cep) cepEl.value = d.cep.replace(/(\d{5})(\d{3})/,'$1-$2');

    // CNAE
    const cnaeEl = document.getElementById('nc-cnae');
    if (cnaeEl && d.cnae_fiscal_descricao) cnaeEl.value = `${d.cnae_fiscal} — ${d.cnae_fiscal_descricao}`;

    // Inferir área de atuação pelo CNAE
    const areaEl = document.getElementById('nc-area');
    if (areaEl && d.cnae_fiscal_descricao) {
      const desc = (d.cnae_fiscal_descricao + ' ' + (d.razao_social||'')).toLowerCase();
      const areaMap = [
        { keys:['tecnologia','software','informática','telecomunic','dados','computador','ti ','sistema'], area:'Tecnologia' },
        { keys:['saúde','médic','hospital','farmac','odontol','enfermagem','clínica','laborat'], area:'Saúde' },
        { keys:['construção','obras','engenharia','arquitetura','pavimentação','alvenaria'], area:'Construção' },
        { keys:['alimento','alimentação','merenda','bebida','nutrição','frigorífico','agropec'], area:'Alimentação' },
        { keys:['vigilância','segurança','monitoramento','proteção'], area:'Segurança' },
        { keys:['limpeza','conservação','zeladoria','higienização','asseio'], area:'Serviços' }
      ];
      for(const am of areaMap){
        if(am.keys.some(k=>desc.includes(k))){
          for(let i=0;i<areaEl.options.length;i++){
            if(areaEl.options[i].value===am.area){areaEl.selectedIndex=i;break;}
          }
          break;
        }
      }
    }

    // Gerar keywords automáticas pelo CNAE
    const kwEl = document.getElementById('nc-kw');
    if (kwEl && !kwEl.value && d.cnae_fiscal_descricao) {
      const kwAuto = d.cnae_fiscal_descricao.toLowerCase()
        .split(/[\s,;\-\/]+/).filter(w=>w.length>3).slice(0,8).join(', ');
      kwEl.value = kwAuto;
    }

    const ativo = (d.descricao_situacao_cadastral||'').toLowerCase().includes('ativa');
    statusEl.innerHTML = `<span style="color:${ativo?'#10b981':'#f59e0b'}"><i class="ti ti-${ativo?'circle-check':'alert-triangle'}"></i>
      <strong>${d.razao_social}</strong> — Situação: <strong>${d.descricao_situacao_cadastral||'Desconhecida'}</strong>
      ${d.municipio?`— ${d.municipio}/${d.uf}`:''}
    </span>`;

  } catch(err) {
    statusEl.innerHTML = `<span style="color:#ef4444"><i class="ti ti-alert-circle"></i> ${err.message || 'Erro ao consultar CNPJ. Verifique o número e tente novamente.'}</span>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-search"></i> Consultar CNPJ';
  }
};

function editarCliente(id){const c=CLIENTES.find(x=>x.id===id);if(c)openNovoCliente(c)}
function salvarCliente(ev,id){
  ev.preventDefault();
  const cores=['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];
  const data={
    nome:$('#nc-nome').value,
    cnpj:$('#nc-cnpj').value,
    fantasia:$('#nc-fantasia')?$('#nc-fantasia').value:'',
    situacao:$('#nc-situacao')?$('#nc-situacao').value:'',
    area:$('#nc-area').value,
    telefone:$('#nc-tel')?$('#nc-tel').value:'',
    municipio:$('#nc-municipio')?$('#nc-municipio').value:'',
    uf:$('#nc-uf')?$('#nc-uf').value:'',
    cep:$('#nc-cep')?$('#nc-cep').value:'',
    endereco:$('#nc-endereco')?$('#nc-endereco').value:'',
    cnae:$('#nc-cnae')?$('#nc-cnae').value:'',
    produtos:$('#nc-prod').value.split(',').map(s=>s.trim()).filter(Boolean),
    contato:$('#nc-contato').value,
    obs:$('#nc-obs').value,
    keywords:$('#nc-kw').value.split(',').map(s=>s.trim()).filter(Boolean),
    editaisAtivos:0,status:'Ativo'
  };
  if(id){
    const idx=CLIENTES.findIndex(c=>c.id===id);
    if(idx>=0)Object.assign(CLIENTES[idx],data);
  }else{
    data.id=CLIENTES.length+1;
    data.cor=cores[CLIENTES.length%cores.length];
    CLIENTES.push(data);
  }
  closeModal();renderCRM();
}

// ===== RELATÓRIOS =====
function renderRelatorios(){
  const R=RELATORIOS;
  const pctMeta=Math.round((R.valorArrematado/R.metaValor)*100);
  app.innerHTML=`
  <div class="page-header"><div><h1>Relatórios</h1><p>Métricas de desempenho e análise de resultados</p></div></div>
  <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
    <div class="card report-metric">
      <div class="value" style="color:var(--primary)">${R.taxaVitoria}%</div><div class="label">Taxa de Vitória</div>
      <div class="progress-bar" style="margin-top:10px"><div class="progress-fill" style="width:${R.taxaVitoria}%;background:var(--primary)"></div></div>
    </div>
    <div class="card report-metric">
      <div class="value">${R.editaisParticipados}</div><div class="label">Editais Participados</div>
    </div>
    <div class="card report-metric">
      <div class="value" style="color:var(--success)">${fmt(R.valorArrematado)}</div><div class="label">Valor Total Arrematado</div>
      <div style="font-size:.7rem;color:var(--gray-400);margin-top:6px">Meta: ${fmt(R.metaValor)} (${pctMeta}%)</div>
      <div class="progress-bar" style="margin-top:4px"><div class="progress-fill" style="width:${pctMeta}%;background:var(--success)"></div></div>
    </div>
  </div>
  <div class="grid-2">
    <div class="card">
      <div class="section-title"><i class="ti ti-trophy"></i> Resultado por Cliente</div>
      <table><thead><tr><th>Cliente</th><th>Contratos Ganhos</th><th>Valor Total</th></tr></thead>
      <tbody>${R.porCliente.map(c=>`<tr><td style="font-weight:600">${c.nome}</td><td><span class="chip chip-green">${c.ganhos} ganhos</span></td><td style="font-weight:600;color:var(--success)">${fmt(c.valor)}</td></tr>`).join('')}</tbody></table>
    </div>
    <div class="card">
      <div class="section-title"><i class="ti ti-chart-pie"></i> Motivos de Derrota</div>
      ${R.motivosDerrota.map(m=>`<div class="defeat-item"><span class="reason">${m.motivo}</span><div class="bar-wrap"><div class="bar-fill" style="width:${m.pct}%"></div></div><span class="pct">${m.pct}%</span></div>`).join('')}
    </div>
  </div>`;
}
