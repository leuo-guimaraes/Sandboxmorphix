// ===== MOCK DATA (PRESERVED FOR SEEDING) =====
const MOCK_CLIENTES = [
  { id:1, nome:'TechBrasil Ltda', cnpj:'12.345.678/0001-90', area:'Tecnologia', cor:'#3b82f6', produtos:['notebooks','servidores','switches','roteadores'], contato:'carlos@techbrasil.com', obs:'Fornecedor tier 1', keywords:['tecnologia','informática','computadores','notebooks','servidores','rede','switches','roteadores','TI','infraestrutura'], editaisAtivos:5, status:'Ativo' },
  { id:2, nome:'MedSupply SA', cnpj:'98.765.432/0001-10', area:'Saúde', cor:'#10b981', produtos:['EPIs','materiais hospitalares','medicamentos'], contato:'ana@medsupply.com', obs:'Especialista em licitações SUS', keywords:['saúde','hospital','médico','EPI','medicamento','farmacêutico','material hospitalar','ambulância','enfermagem'], editaisAtivos:3, status:'Ativo' },
  { id:3, nome:'ConstruPlan Eng.', cnpj:'45.678.901/0001-55', area:'Construção', cor:'#f59e0b', produtos:['obras civis','reformas','pavimentação'], contato:'pedro@construplan.com', obs:'Foco em obras públicas', keywords:['construção','obra','reforma','pavimentação','engenharia','infraestrutura','predial','manutenção predial','alvenaria'], editaisAtivos:2, status:'Ativo' },
  { id:4, nome:'AlimentaFort', cnpj:'33.222.111/0001-77', area:'Alimentação', cor:'#ef4444', produtos:['refeições coletivas','marmitex','cestas básicas'], contato:'maria@alimentafort.com', obs:'Certificação ANVISA', keywords:['alimentação','refeição','merenda','cesta básica','alimento','nutrição','cozinha industrial','marmitex'], editaisAtivos:4, status:'Ativo' },
  { id:5, nome:'SegPro Vigilância', cnpj:'55.444.333/0001-22', area:'Segurança', cor:'#8b5cf6', produtos:['vigilância','portaria','monitoramento CFTV'], contato:'jose@segpro.com', obs:'Alvará atualizado', keywords:['segurança','vigilância','portaria','monitoramento','CFTV','câmera','alarme','ronda','guarda'], editaisAtivos:1, status:'Inativo' },
  { id:6, nome:'LimpaTudo Serv.', cnpj:'77.888.999/0001-44', area:'Serviços', cor:'#06b6d4', produtos:['limpeza','conservação','jardinagem'], contato:'lucia@limpatudo.com', obs:'ISO 9001', keywords:['limpeza','conservação','jardinagem','manutenção','higienização','asseio','zeladoria','copeiragem'], editaisAtivos:3, status:'Ativo' }
];

const MOCK_EDITAIS = [
  { id:1, numero:'PE-2026/0045', modalidade:'Pregão', orgao:'Ministério da Saúde', valorEstimado:1250000, dataAbertura:'2026-05-20', status:'Aberto', objeto:'Aquisição de equipamentos de informática incluindo notebooks, servidores e switches para modernização da rede hospitalar', plataforma:'ComprasNet', keywords:['informática','notebooks','servidores','switches','rede','hospitalar'] },
  { id:2, numero:'TP-2026/0112', modalidade:'Tomada de Preços', orgao:'Prefeitura de Curitiba', valorEstimado:3800000, dataAbertura:'2026-05-25', status:'Aberto', objeto:'Obra de reforma e ampliação do Hospital Municipal, incluindo alvenaria, instalações elétricas e pavimentação do estacionamento', plataforma:'BLL', keywords:['reforma','hospital','alvenaria','pavimentação','obra','engenharia'] },
  { id:3, numero:'PE-2026/0078', modalidade:'Pregão', orgao:'INSS', valorEstimado:450000, dataAbertura:'2026-05-18', status:'Em Análise', objeto:'Contratação de serviço de vigilância armada e monitoramento CFTV para agências do INSS na região Sul', plataforma:'ComprasNet', keywords:['vigilância','monitoramento','CFTV','segurança','guarda'] },
  { id:4, numero:'CC-2026/0009', modalidade:'Concorrência', orgao:'Governo do Estado PR', valorEstimado:12500000, dataAbertura:'2026-06-10', status:'Aberto', objeto:'Construção de escola estadual padrão FNDE com 12 salas, quadra coberta e pavimentação do entorno', plataforma:'BLL', keywords:['construção','escola','pavimentação','obra','quadra','engenharia'] },
  { id:5, numero:'PE-2026/0091', modalidade:'Pregão', orgao:'UFPR', valorEstimado:280000, dataAbertura:'2026-05-15', status:'Encerrado', objeto:'Fornecimento de refeições tipo marmitex para restaurante universitário, incluindo preparo e distribuição de alimentação balanceada', plataforma:'ComprasNet', keywords:['refeição','marmitex','alimentação','nutrição','cozinha'] },
  { id:6, numero:'RDC-2026/0003', modalidade:'RDC', orgao:'DNIT', valorEstimado:45000000, dataAbertura:'2026-06-20', status:'Aberto', objeto:'Pavimentação e recuperação de rodovia federal BR-277 trecho Curitiba-Paranaguá incluindo infraestrutura de drenagem', plataforma:'ComprasNet', keywords:['pavimentação','rodovia','infraestrutura','drenagem','obra','engenharia'] },
  { id:7, numero:'PE-2026/0102', modalidade:'Pregão', orgao:'TRT 9ª Região', valorEstimado:680000, dataAbertura:'2026-05-22', status:'Aberto', objeto:'Contratação de serviço de limpeza, conservação e copeiragem para edifício sede do TRT', plataforma:'ComprasNet', keywords:['limpeza','conservação','copeiragem','zeladoria','asseio'] },
  { id:8, numero:'PE-2026/0055', modalidade:'Pregão', orgao:'Hospital das Clínicas', valorEstimado:950000, dataAbertura:'2026-05-28', status:'Aberto', objeto:'Aquisição de materiais hospitalares incluindo EPIs, seringas, luvas e medicamentos para estoque anual', plataforma:'ComprasNet', keywords:['material hospitalar','EPI','medicamento','saúde','hospital','enfermagem'] }
];

const MOCK_EVENTOS = [
  { id:1, data:'2026-05-15', titulo:'Sessão PE-2026/0091', desc:'Abertura de propostas UFPR', tipo:'sessao' },
  { id:2, data:'2026-05-18', titulo:'Prazo proposta PE-0078', desc:'Enviar proposta INSS vigilância', tipo:'prazo' },
  { id:3, data:'2026-05-20', titulo:'Sessão PE-2026/0045', desc:'Pregão Min. Saúde - informática', tipo:'sessao' },
  { id:4, data:'2026-05-22', titulo:'Certidão FGTS vence', desc:'Renovar CRF TechBrasil', tipo:'certidao' },
  { id:5, data:'2026-05-25', titulo:'TP-0112 abertura', desc:'Tomada de preços Curitiba', tipo:'sessao' },
  { id:6, data:'2026-05-28', titulo:'Reunião MedSupply', desc:'Alinhar documentação habilitação', tipo:'reuniao' },
  { id:7, data:'2026-06-02', titulo:'Prazo recurso PE-0091', desc:'Prazo para recurso UFPR', tipo:'prazo' },
  { id:8, data:'2026-06-10', titulo:'Concorrência CC-0009', desc:'Abertura Gov. Estado escola', tipo:'sessao' },
  { id:9, data:'2026-06-15', titulo:'Certidão Negativa vence', desc:'CND Federal - ConstruPlan', tipo:'certidao' },
  { id:10, data:'2026-06-20', titulo:'RDC DNIT abertura', desc:'Sessão pavimentação BR-277', tipo:'sessao' },
  { id:11, data:'2026-05-11', titulo:'Revisar docs habilitação', desc:'Verificar validade certidões AlimentaFort', tipo:'prazo' }
];

// ===== DYNAMIC DATA ARRAYS =====
let CLIENTES = [];
let EDITAIS = [];
let PIPELINE = [];
let EVENTOS = [];
let ALERTAS = [];
let EDITAL_CLIENTES = [];
let KANBAN_COLUNAS = [];
const DEFAULT_KANBAN_COLUNAS = [
  { key: 'prospeccao', label: 'Prospecção', posicao: 1 },
  { key: 'analise', label: 'Análise Edital', posicao: 2 },
  { key: 'proposta', label: 'Proposta em Elaboração', posicao: 3 },
  { key: 'enviado', label: 'Enviado / Sessão', posicao: 4 },
  { key: 'concluido', label: 'Concluído', posicao: 5 }
];
let RELATORIOS = {
  taxaVitoria: 0,
  editaisParticipados: 0,
  valorArrematado: 0,
  metaValor: 15000000,
  porCliente: [],
  motivosDerrota: []
};

// ===== DATA REFRESH FUNCTIONS =====
// Esses arrays serão populados no app.js após o auth
function computeRelatorios() {
  if (!PIPELINE || PIPELINE.length === 0) {
    RELATORIOS.taxaVitoria = 0;
    RELATORIOS.editaisParticipados = 0;
    RELATORIOS.valorArrematado = 0;
    return;
  }
  const ganhos = PIPELINE.filter(p => p.coluna === 'concluido' && p.resultado === 'ganho');
  const total = PIPELINE.length;
  RELATORIOS.editaisParticipados = total;
  RELATORIOS.taxaVitoria = total > 0 ? Math.round((ganhos.length / total) * 100) : 0;
  
  // Calcula valor arrematado buscando os valores em EDITAIS
  let val = 0;
  ganhos.forEach(p => {
    const ed = EDITAIS.find(e => e.id === p.edital_id || e.id === p.editalId);
    if (ed) {
      val += (ed.valorEstimado || ed.valor_estimado || 0);
    }
  });
  RELATORIOS.valorArrematado = val;

  // Calcula por cliente mock
  RELATORIOS.porCliente = CLIENTES.slice(0, 5).map((c, i) => ({
    nome: c.nome,
    ganhos: Math.floor(Math.random() * 5),
    valor: Math.floor(Math.random() * 2000000)
  })).sort((a,b) => b.valor - a.valor);
  
  RELATORIOS.motivosDerrota = [
    { motivo:'Preço acima do estimado', pct:35 },
    { motivo:'Documentação irregular', pct:25 },
    { motivo:'Atestado insuficiente', pct:18 },
    { motivo:'Proposta desclassificada', pct:12 },
    { motivo:'Outros', pct:10 }
  ];
}

function computeAlertas() {
  ALERTAS = [];
  // Gera alertas dinâmicos baseados nos editais abertos
  const abertos = EDITAIS.filter(e => e.status !== 'Encerrado').slice(0, 5);
  abertos.forEach(e => {
    const dataAbertura = new Date(e.dataAbertura || e.data_abertura);
    const diasParaAbertura = Math.ceil((dataAbertura - new Date()) / (1000 * 60 * 60 * 24));
    
    if (diasParaAbertura > 0 && diasParaAbertura <= 7) {
      ALERTAS.push({
        tipo: diasParaAbertura <= 3 ? 'urgent' : 'attention',
        titulo: `Sessão ${e.numero} em ${diasParaAbertura} dias`,
        desc: `Preparar proposta para ${e.orgao}`
      });
    }
    
    // Calcula match para info
    const matches = getMatchesParaClientes(e);
    if (matches.length > 0 && matches[0].match > 80) {
      ALERTAS.push({
        tipo: 'info',
        titulo: 'Edital com Alto Match',
        desc: `${e.numero} tem ${matches[0].match}% com ${matches[0].nome}`
      });
    }
  });
  
  // Garantir pelo menos um mock se vazio
  if (ALERTAS.length === 0) {
    ALERTAS.push({ tipo: 'info', titulo: 'Sistema Monitorando', desc: 'Buscando novas oportunidades.' });
  }
}

// ===== MATCHING ENGINE =====
function calcularMatchInfo(edital, cliente) {
  if (!edital.keywords || !cliente.keywords || edital.keywords.length === 0) return { match: 0, produtos: [] };
  const ek = edital.keywords.map(k => k.toLowerCase());
  const ck = cliente.keywords.map(k => k.toLowerCase());
  let hits = [];
  ek.forEach(k => { 
    if (ck.some(c => c.includes(k) || k.includes(c))) hits.push(k); 
  });
  const uniqueHits = [...new Set(hits)];
  const score = Math.min(100, Math.round((uniqueHits.length / ek.length) * 100));
  return { match: score, produtos: uniqueHits };
}

function getMatchesParaEdital(edital) {
  return CLIENTES
    .map(c => {
      const info = calcularMatchInfo(edital, c);
      return { ...c, match: info.match, produtosMatch: info.produtos };
    })
    .filter(c => c.match > 0)
    .sort((a, b) => b.match - a.match);
}

function getMatchesParaClientes(edital) {
  return getMatchesParaEdital(edital).slice(0, 3);
}
