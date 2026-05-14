// ===== SUPABASE CLIENT & AUTH =====
const SUPABASE_CONFIG_KEY = 'licitapro_supabase';

function getSupabaseConfig() {
  return SB_DEFAULTS;
}
function saveSupabaseConfig(cfg) {
  console.log('Configuração do Supabase fixa no backend.');
}

// Default config (will be overridden by Config IA page)
const SB_DEFAULTS = {
  url: 'https://afbwkmdsqefyijlxhhur.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmYndrbWRzcWVmeWlqbHhoaHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NDk2NjcsImV4cCI6MjA5NDEyNTY2N30.GH3fAeNzIYN9IVqtiBwfursXXszCtMfp5ng_wEtE0SE'
};

let supabaseClient = null;

function initSupabase() {
  const cfg = getSupabaseConfig();
  const url = cfg.url || SB_DEFAULTS.url;
  const key = cfg.key || SB_DEFAULTS.key;
  
  if (typeof supabase !== 'undefined' && url && key) {
    supabaseClient = supabase.createClient(url, key);
  } else {
    console.warn("Supabase SDK não carregado ou credenciais ausentes.");
  }
}
// Inicializa o cliente na inicialização
initSupabase();

// ===== AUTHENTICATION =====
async function dbLogin(email, password) {
  if (!supabaseClient) throw new Error("Supabase não inicializado");
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

async function dbSignUp(email, password) {
  if (!supabaseClient) throw new Error("Supabase não inicializado");
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

async function dbLogout() {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw new Error(error.message);
}

async function dbGetCurrentUser() {
  if (!supabaseClient) return null;
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error || !session) return null;
  return session.user;
}

// ===== GENERIC CRUD & FALLBACK STORAGE =====
function getLocalFallback(table) {
  try {
    const data = localStorage.getItem('licitapro_fallback_' + table);
    return data ? JSON.parse(data) : [];
  } catch(e) { return []; }
}

function saveLocalFallback(table, list) {
  try {
    localStorage.setItem('licitapro_fallback_' + table, JSON.stringify(list));
  } catch(e){}
}

async function dbSelect(table, matchObj = null) {
  if (!supabaseClient) throw new Error("Supabase não inicializado");
  let query = supabaseClient.from(table).select('*').order('created_at', { ascending: false });
  if (matchObj) query = query.match(matchObj);
  const { data, error } = await query;
  if (error) throw new Error('Supabase SELECT error: ' + error.message);
  return data;
}

async function dbInsert(table, rowData) {
  if (!supabaseClient) throw new Error("Supabase não inicializado");
  const { data, error } = await supabaseClient.from(table).insert([rowData]).select();
  if (error) throw new Error('Supabase INSERT error: ' + error.message);
  return data;
}

async function dbUpdate(table, id, rowData) {
  if (!supabaseClient) throw new Error("Supabase não inicializado");
  const { data, error } = await supabaseClient.from(table).update(rowData).eq('id', id).select();
  if (error) throw new Error('Supabase UPDATE error: ' + error.message);
  return data;
}

async function dbDelete(table, id) {
  if (!supabaseClient) {
     let list = getLocalFallback(table);
     list = list.filter(item => String(item.id) !== String(id));
     saveLocalFallback(table, list);
     return true;
  }
  try {
    const { error } = await supabaseClient.from(table).delete().eq('id', id);
    if (error) throw error;
  } catch(e) {
    let list = getLocalFallback(table);
    list = list.filter(item => String(item.id) !== String(id));
    saveLocalFallback(table, list);
  }
  return true;
}

async function dbDeleteByColumn(table, column, value) {
  if (!supabaseClient) return true;
  const { error } = await supabaseClient.from(table).delete().eq(column, value);
  if (error) console.warn(`Aviso DELETE ${table}:`, error.message);
  return true;
}

async function dbUpdatePipelineColuna(pipelineId, novaColuna) {
  try {
    if (supabaseClient) {
      await supabaseClient.from('pipeline').update({ coluna: novaColuna }).eq('id', pipelineId);
    }
  } catch(e){}
  let list = getLocalFallback('pipeline');
  list = list.map(p => String(p.id) === String(pipelineId) ? { ...p, coluna: novaColuna } : p);
  saveLocalFallback('pipeline', list);
  return true;
}

// ===== SPECIFIC FUNCTIONS WITH ROBUST HYBRID STORAGE =====
async function dbGetEditais() { 
  let nuvem = [];
  try { nuvem = await dbSelect('editais'); } catch(e) {}
  const local = getLocalFallback('editais');
  // Merge por ID único
  const mapa = new Map();
  local.forEach(item => mapa.set(item.id, item));
  nuvem.forEach(item => mapa.set(item.id, item));
  return Array.from(mapa.values()).sort((a,b) => String(b.created_at).localeCompare(String(a.created_at)));
}

async function dbGetClientes() { 
  let nuvem = [];
  try { nuvem = await dbSelect('clientes'); } catch(e) {}
  const local = getLocalFallback('clientes');
  const mapa = new Map();
  local.forEach(item => mapa.set(item.id, item));
  nuvem.forEach(item => mapa.set(item.id, item));
  return Array.from(mapa.values());
}

async function dbGetPipeline() { 
  let nuvem = [];
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('pipeline').select('*, editais(*)').order('created_at', { ascending: false });
      if (!error && data) nuvem = data;
    } catch(e){}
  }
  const local = getLocalFallback('pipeline');
  const mapa = new Map();
  local.forEach(item => mapa.set(item.id, item));
  nuvem.forEach(item => mapa.set(item.id, item));
  return Array.from(mapa.values());
}

async function dbGetEditalClientes(editalId) {
  let nuvem = [];
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('edital_clientes').select('*, clientes(*)').eq('edital_id', editalId);
      if (!error && data) nuvem = data;
    } catch(e){}
  }
  const local = getLocalFallback('edital_clientes').filter(ec => String(ec.edital_id) === String(editalId));
  const mapa = new Map();
  local.forEach(item => mapa.set(item.id, item));
  nuvem.forEach(item => mapa.set(item.id, item));
  return Array.from(mapa.values());
}

async function dbGetRpaTasks() { 
  let nuvem = [];
  try { nuvem = await dbSelect('rpa_tasks'); } catch(e) {}
  const local = getLocalFallback('rpa_tasks');
  const mapa = new Map();
  local.forEach(item => mapa.set(item.id, item));
  nuvem.forEach(item => mapa.set(item.id, item));
  return Array.from(mapa.values());
}

async function dbSaveEdital(edital) {
  const row = {
    numero: edital.numero, modalidade: edital.modalidade, orgao: edital.orgao,
    valor_estimado: edital.valorEstimado || edital.valor_estimado,
    data_abertura: edital.dataAbertura || edital.data_abertura,
    data_limite: edital.dataLimite || edital.data_limite || null,
    status: edital.status || 'Aberto', objeto: edital.objeto,
    plataforma: edital.plataforma, keywords: edital.keywords || [],
    ai_analysis: edital.ai_analysis || '', ai_provider: edital.ai_provider || '',
    pdf_text: edital.pdf_text || ''
  };
  
  let salvo = { id: edital.id || Date.now().toString(), created_at: new Date().toISOString(), ...row };
  try {
    const res = await dbInsert('editais', row);
    if (res && res[0]) salvo = res[0];
  } catch (e) {
    console.warn("Falha no Supabase dbInsert editais, ativando fallback storage:", e.message);
  }
  
  const list = getLocalFallback('editais').filter(e => String(e.id) !== String(salvo.id));
  list.unshift(salvo);
  saveLocalFallback('editais', list);
  return salvo;
}

async function dbSaveCliente(cliente) {
  const row = {
    nome: cliente.nome, cnpj: cliente.cnpj, area: cliente.area,
    cor: cliente.cor || '#3b82f6', produtos: cliente.produtos || [],
    contato: cliente.contato, obs: cliente.obs,
    keywords: cliente.keywords || [], status: cliente.status || 'Ativo'
  };
  
  let salvo = { id: cliente.id || Date.now().toString(), created_at: new Date().toISOString(), ...row };
  try {
    if (cliente.id) {
      const res = await dbUpdate('clientes', cliente.id, row);
      if (res && res[0]) salvo = res[0];
    } else {
      const res = await dbInsert('clientes', row);
      if (res && res[0]) salvo = res[0];
    }
  } catch (e) {
    console.warn("Falha no Supabase dbSaveCliente, salvando no localStorage fallback:", e.message);
  }
  
  const list = getLocalFallback('clientes').filter(c => String(c.id) !== String(salvo.id));
  list.unshift(salvo);
  saveLocalFallback('clientes', list);
  return salvo;
}

async function dbAddToPipeline(editalId, coluna, prioridade) {
  let salvo = { id: Date.now().toString(), edital_id: editalId, coluna: coluna || 'prospeccao', prioridade: prioridade || 'media', created_at: new Date().toISOString() };
  try {
    const res = await dbInsert('pipeline', { edital_id: editalId, coluna: coluna || 'prospeccao', prioridade: prioridade || 'media' });
    if(res && res[0]) salvo = res[0];
  } catch(e) {}
  
  const list = getLocalFallback('pipeline');
  list.unshift(salvo);
  saveLocalFallback('pipeline', list);
  return salvo;
}

async function dbVincularCliente(editalId, clienteId) {
  let salvo = { id: Date.now().toString(), edital_id: editalId, cliente_id: clienteId, created_at: new Date().toISOString() };
  try {
    const res = await dbInsert('edital_clientes', { edital_id: editalId, cliente_id: clienteId });
    if(res && res[0]) salvo = res[0];
  } catch(e) {}
  
  const list = getLocalFallback('edital_clientes');
  list.unshift(salvo);
  saveLocalFallback('edital_clientes', list);
  return salvo;
}

async function dbSaveRpaTask(task) {
  const row = {
    titulo: task.titulo, url: task.url, entrada: task.entrada || '', instrucao: task.instrucao,
    data_agendada: task.data_agendada, status: task.status || 'agendado'
  };
  let salvo = { id: task.id || Date.now().toString(), created_at: new Date().toISOString(), ...row };
  try {
    if(task.id) {
      const res = await dbUpdate('rpa_tasks', task.id, row);
      if(res && res[0]) salvo = res[0];
    } else {
      const res = await dbInsert('rpa_tasks', row);
      if(res && res[0]) salvo = res[0];
    }
  } catch(e){}
  
  const list = getLocalFallback('rpa_tasks').filter(t => String(t.id) !== String(salvo.id));
  list.unshift(salvo);
  saveLocalFallback('rpa_tasks', list);
  return salvo;
}

async function dbSaveExtracao(rpaTaskId, url, conteudo) {
  let salvo = { id: Date.now().toString(), rpa_task_id: rpaTaskId, url, conteudo, created_at: new Date().toISOString() };
  try {
    const res = await dbInsert('extracoes', { rpa_task_id: rpaTaskId, url, conteudo });
    if(res && res[0]) salvo = res[0];
  } catch(e){}
  const list = getLocalFallback('extracoes');
  list.unshift(salvo);
  saveLocalFallback('extracoes', list);
  return salvo;
}

// ===== TEST CONNECTION =====
async function testSupabaseConnection() {
  if (!supabaseClient) return { ok: false, msg: 'Cliente não inicializado' };
  try {
    const { data, error } = await supabaseClient.from('editais').select('id').limit(1);
    if (error) throw error;
    return { ok: true, msg: 'Conectado!' };
  } catch (e) {
    return { ok: false, msg: 'Erro: ' + e.message };
  }
}

// ===== SEED DEMO DATA =====
async function dbSeedDemoData(mockEditais, mockClientes) {
  if (!supabaseClient) throw new Error("Supabase não inicializado");
  for (const ed of mockEditais) {
     try { 
       const saved = await dbSaveEdital(ed);
       // Add to pipeline randomly
       await dbAddToPipeline(saved.id, 'prospeccao', 'media');
     } catch(e) { console.error(e); }
  }
  for (const cli of mockClientes) {
     try { await dbSaveCliente(cli); } catch(e) { console.error(e); }
  }
  return true;
}
