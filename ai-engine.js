// ===== AI ENGINE — PDF Extraction + OpenAI/Claude Integration =====

// PDF.js worker
if(typeof pdfjsLib!=='undefined') pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ===== CONFIG STORAGE =====
const AI_CONFIG_KEY='licitapro_ai_config';
const DEFAULT_PROMPT=`Você é um analista especialista em licitações públicas brasileiras. Você receberá o texto extraído de um edital e possivelmente de seus anexos. Analise todo o material e forneça um relatório unificado e estruturado contendo:

1. **RESUMO DO OBJETO**: Descrição clara e concisa do que está sendo licitado, sintetizando o edital e anexos.

2. **INFORMAÇÕES DO PROCESSO** (MUITO IMPORTANTE: Forneça os valores exatos nas linhas abaixo para leitura automatizada):
   - Modalidade: [Pregão / Tomada de Preços / Concorrência / RDC / Dispensa]
   - Número do edital: [Ex: 133/2026]
   - Órgão/Entidade: [Nome completo do órgão]
   - Valor estimado: [Apenas o valor numérico ou com R$, ex: 1250000.00]
   - Data de abertura: [OBRIGATORIAMENTE no formato AAAA-MM-DD, ex: 2026-05-28]
   - Data limite (Proposta): [OBRIGATORIAMENTE no formato AAAA-MM-DD, a data máxima para cadastro/envio da proposta]
   - Plataforma de disputa: [Ex: ComprasNet / BLL / Licitações-e / PNCP]

3. **PONTOS DE ATENÇÃO** (classifique cada um como ✅ OK, ⚠️ ATENÇÃO ou 🔴 CRÍTICO):
   - Prazos relevantes e cronograma
   - Exigências técnicas especiais e amostras
   - Garantias exigidas
   - Restrições de participação
   - Critério de julgamento
   - Condições de pagamento

4. **CHECKLIST DE HABILITAÇÃO** (liste cada documento e se é obrigatório):
   - Documentos jurídicos
   - Documentos fiscais/trabalhistas
   - Qualificação econômico-financeira
   - Qualificação técnica

5. **PALAVRAS-CHAVE**: Liste as principais palavras-chave do objeto.

6. **RECOMENDAÇÕES**: Sugestões práticas para vencer o certame.

Responda de forma estruturada e objetiva.`;

function loadAIConfig(){
  try{return JSON.parse(localStorage.getItem(AI_CONFIG_KEY))||{}}catch(e){return{}}
}
function saveAIConfig(cfg){
  localStorage.setItem(AI_CONFIG_KEY,JSON.stringify(cfg));
}
function getAIConfig(){
  const defaults={
    openai_key:'',openai_model:'gpt-4o',
    claude_key:'',claude_model:'claude-sonnet-4-20250514',
    mistral_key:'',mistral_model:'mistral-large-latest',
    airtop_key:'',
    prompt:DEFAULT_PROMPT,
    provider:'openai'
  };
  return{...defaults,...loadAIConfig()};
}

// ===== PDF TEXT EXTRACTION + OCR FALLBACK =====
async function extractPdfText(file, onProgress, useOcr = true){
  const arrayBuf=await file.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:arrayBuf}).promise;
  const totalPages=pdf.numPages;
  let fullText='';
  for(let i=1;i<=totalPages;i++){
    const page=await pdf.getPage(i);
    const content=await page.getTextContent();
    let pageText=content.items.map(item=>item.str).join(' ');
    
    if(useOcr && pageText.trim().length < 50 && typeof Tesseract !== 'undefined') {
      if(onProgress) onProgress(Math.round(((i - 1)/totalPages)*100), i, totalPages, `Página ${i} escaneada. Executando OCR...`);
      try {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        
        const ocrResult = await Tesseract.recognize(canvas, 'por', {
          logger: m => {
            if (m.status === 'recognizing text' && onProgress) {
              const ocrPct = Math.round(m.progress * 100);
              const totalPct = Math.round(((i - 1 + m.progress)/totalPages)*100);
              onProgress(totalPct, i, totalPages, `Página ${i} (OCR português): ${ocrPct}%`);
            }
          }
        });
        pageText = ocrResult.data.text;
      } catch(err) {
        console.warn('Erro no OCR da página ' + i, err);
      }
    }
    
    fullText+=pageText+'\n\n';
    if(onProgress) onProgress(Math.round((i/totalPages)*100), i, totalPages, `Processando página ${i}/${totalPages}`);
  }
  return fullText.trim();
}

// ===== PROGRESS UI =====
function createProgressUI(containerId){
  const container=document.getElementById(containerId);
  if(!container)return null;
  const steps=['Lendo PDF','Extraindo texto','Enviando para IA','Processando resposta','Concluído'];
  container.innerHTML=`
    <div class="ai-progress-wrap">
      <div class="ai-progress-header">
        <span class="ai-progress-label" id="progress-label">Preparando...</span>
        <span class="ai-progress-pct" id="progress-pct">0%</span>
      </div>
      <div class="ai-progress-bar"><div class="ai-progress-fill" id="progress-fill" style="width:0%"></div></div>
      <div class="ai-progress-steps" id="progress-steps">
        ${steps.map((s,i)=>`<div class="ai-step" data-step="${i}"><i class="ti ti-${i===0?'file-text':i===1?'text-recognition':i===2?'send':i===3?'brain':'check'}"></i>${s}</div>`).join('')}
      </div>
    </div>`;
  return{
    setProgress(pct,label){
      const fill=document.getElementById('progress-fill');
      const pctEl=document.getElementById('progress-pct');
      const labelEl=document.getElementById('progress-label');
      if(fill)fill.style.width=pct+'%';
      if(pctEl)pctEl.textContent=Math.round(pct)+'%';
      if(label&&labelEl)labelEl.textContent=label;
    },
    setStep(stepIdx){
      document.querySelectorAll('#progress-steps .ai-step').forEach((el,i)=>{
        el.classList.remove('active','done');
        if(i<stepIdx)el.classList.add('done');
        else if(i===stepIdx)el.classList.add('active');
      });
    }
  };
}

// ===== TEXT TRUNCATION =====
// Editais têm info mais relevante no início (objeto, modalidade) e no fim (anexos, habilitação).
// Limitamos a ~20K chars (~5K tokens) para caber no rate limit de contas free/baixo tier.
const MAX_CHARS = 20000;

function truncateForAPI(text) {
  if (text.length <= MAX_CHARS) return { text, truncated: false };
  const headSize = Math.floor(MAX_CHARS * 0.65); // 65% do início
  const tailSize = MAX_CHARS - headSize;           // 35% do final
  const head = text.substring(0, headSize);
  const tail = text.substring(text.length - tailSize);
  const truncated = head + '\n\n[... seção intermediária omitida para otimização — ' +
    (text.length - MAX_CHARS).toLocaleString() + ' caracteres removidos ...]\n\n' + tail;
  return { text: truncated, truncated: true, original: text.length, final: truncated.length };
}

// ===== OPENAI API =====
async function callOpenAI(text,config){
  const prepared = truncateForAPI(text);
  const resp=await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+config.openai_key},
    body:JSON.stringify({
      model:config.openai_model,
      messages:[
        {role:'system',content:config.prompt},
        {role:'user',content:'Analise o seguinte edital de licitação:\n\n'+prepared.text}
      ],
      max_tokens:3000,
      temperature:0.3
    })
  });
  if(!resp.ok){
    const err=await resp.json().catch(()=>({}));
    throw new Error(err.error?.message||`Erro OpenAI: ${resp.status}`);
  }
  const data=await resp.json();
  return data.choices[0].message.content;
}

// ===== CLAUDE API =====
async function callClaude(text,config){
  const prepared = truncateForAPI(text);
  const resp=await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'x-api-key':config.claude_key,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true'
    },
    body:JSON.stringify({
      model:config.claude_model,
      max_tokens:3000,
      messages:[
        {role:'user',content:config.prompt+'\n\nAnalise o seguinte edital de licitação:\n\n'+prepared.text}
      ]
    })
  });
  if(!resp.ok){
    const err=await resp.json().catch(()=>({}));
    throw new Error(err.error?.message||`Erro Claude: ${resp.status}`);
  }
  const data=await resp.json();
  return data.content[0].text;
}

// ===== MISTRAL API =====
async function callMistral(text,config){
  const prepared = truncateForAPI(text);
  const resp=await fetch('https://api.mistral.ai/v1/chat/completions',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer '+config.mistral_key
    },
    body:JSON.stringify({
      model:config.mistral_model,
      messages:[
        {role:'system',content:config.prompt},
        {role:'user',content:'Analise o seguinte edital de licitação:\n\n'+prepared.text}
      ],
      max_tokens:3000,
      temperature:0.3
    })
  });
  if(!resp.ok){
    const err=await resp.json().catch(()=>({}));
    throw new Error(err.message||`Erro Mistral: ${resp.status}`);
  }
  const data=await resp.json();
  return data.choices[0].message.content;
}

// ===== MAIN ANALYSIS FUNCTION =====
async function runAIAnalysis(fileOrFiles,provider,useOcr=true){
  const config=getAIConfig();
  const key=provider==='openai'?config.openai_key:(provider==='claude'?config.claude_key:config.mistral_key);
  if(!key){
    const progress=createProgressUI('ai-progress-container');
    if(progress) {
      progress.setStep(0);
      progress.setProgress(10, 'Modo de teste: Analisando documentos do edital...');
      await sleep(500);
      progress.setStep(1);
      progress.setProgress(40, 'Modo de teste: Extraindo texto e termos do edital...');
      await sleep(500);
      progress.setStep(2);
      progress.setProgress(70, 'Modo de teste: Processando com IA Simulada...');
      await sleep(600);
      progress.setStep(3);
      progress.setProgress(90, 'Modo de teste: Estruturando relatório final...');
      await sleep(400);
      progress.setStep(4);
      progress.setProgress(100, 'Análise simulada concluída!');
    }

    let textContent = '';
    let fileName = 'Edital.pdf';
    let editalId = undefined;
    
    if (fileOrFiles && fileOrFiles.isText) {
      textContent = fileOrFiles.content || '';
      fileName = fileOrFiles.name || 'Edital';
      editalId = fileOrFiles.editalId;
    } else if (fileOrFiles) {
      let filesList = [];
      if (fileOrFiles instanceof FileList || Array.isArray(fileOrFiles)) {
        filesList = Array.from(fileOrFiles);
      } else {
        filesList = [fileOrFiles];
      }
      if (filesList.length > 0) {
        fileName = filesList.map(f => f.name).join(', ');
        textContent = `Arquivo de Edital: ${fileName}`;
      }
    }

    let num='PE-2026/0120', mod='Pregão', org='Prefeitura Municipal', val='R$ 1.850.000,00';
    if (textContent) {
      const mNum = textContent.match(/Número[^:\n]*:\s*([^\n]+)/i); if(mNum) num=mNum[1].trim();
      const mMod = textContent.match(/Modalidade[^:\n]*:\s*([^\n]+)/i); if(mMod) mod=mMod[1].trim();
      const mOrg = textContent.match(/Órgão[^:\n]*:\s*([^\n]+)/i); if(mOrg) org=mOrg[1].trim();
      const mVal = textContent.match(/Valor[^:\n]*:\s*([^\n]+)/i); if(mVal) val=mVal[1].trim();
    }

    if (val && !val.includes('R$') && !isNaN(parseFloat(val.replace(/[^\d.-]/g, '')))) {
      const numVal = parseFloat(val.replace(/[^\d.-]/g, ''));
      val = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numVal);
    }

    const mockResponse = `[⚠️ ANÁLISE SIMULADA - MODO DE TESTE SEM CHAVE DE API]

### 1. **RESUMO DO OBJETO**
Este edital tem por objeto a contratação/aquisição simulada correspondente a:
"${textContent.substring(0, 300)}${textContent.length > 300 ? '...' : ''}"
O projeto visa atender às especificações e demandas descritas no termo de referência do edital.

### 2. **INFORMAÇÕES DO PROCESSO**
- Modalidade: ${mod}
- Número do edital: ${num}
- Órgão/Entidade: ${org}
- Valor estimado: ${val}
- Data de abertura: 2026-06-30
- Data limite (Proposta): 2026-06-29
- Plataforma de disputa: Compras.gov.br (PNCP)

### 3. **PONTOS DE ATENÇÃO**
- ✅ **OK** - Cronograma de entrega em lotes.
- ⚠️ **ATENÇÃO** - Exigência de comprovação de regularidade fiscal e trabalhista atualizadas na fase de habilitação.
- 🔴 **CRÍTICO** - Prazo exíguo de 48 horas para envio de amostras após a convocação do arrematante.

### 4. **CHECKLIST DE HABILITAÇÃO**
- **Documentos Jurídicos**: Contrato social consolidado e certidão simplificada da Junta Comercial. (Obrigatório)
- **Documentos Fiscais/Trabalhistas**: CND Federal, CND Estadual, CND Municipal, CRF FGTS e CNDT Trabalhista. (Obrigatório)
- **Qualificação Econômico-Financeira**: Balanço Patrimonial do último exercício e certidão negativa de falência ou recuperação judicial. (Obrigatório)
- **Qualificação Técnica**: Atestado de capacidade técnica fornecido por pessoa jurídica de direito público ou privado que comprove aptidão de pelo menos 50% dos quantitativos. (Obrigatório)

### 5. **PALAVRAS-CHAVE**
Licitação, PNCP, Compras Governamentais, Gestão de Editais, Aquisição de Bens.

### 6. **RECOMENDAÇÕES**
- Separar toda a documentação de habilitação com antecedência.
- Verificar a validade de todas as certidões negativas antes do início da sessão pública.
- Analisar os custos detalhadamente para formular uma proposta de preço competitiva com margem de lucro segura.`;

    return {
      text: textContent || `Texto simulado para ${fileName}`,
      response: mockResponse,
      provider: provider + ' (Simulado)',
      editalId: editalId
    };
  }

  const progress=createProgressUI('ai-progress-container');
  if(!progress)throw new Error('Container de progresso não encontrado');

  let files = [];
  if(fileOrFiles instanceof FileList || Array.isArray(fileOrFiles)) {
    files = Array.from(fileOrFiles);
  } else if(fileOrFiles) {
    files = [fileOrFiles];
  }

  if(!files.length) throw new Error("Nenhum arquivo fornecido.");

  // Step 1: Reading PDF
  progress.setStep(0);
  progress.setProgress(5, `Lendo ${files.length} arquivo(s) PDF...`);
  await sleep(300);

  // Step 2: Extract text
  progress.setStep(1);
  let pdfText='';

  for(let i=0; i<files.length; i++) {
    const f = files[i];
    progress.setProgress(10 + ((i/files.length)*30), `Extraindo: ${f.name} (${i+1}/${files.length})...`);
    try {
      const txt = await extractPdfText(f, (pct, page, total, msg) => {
        const base = 10 + ((i/files.length)*30);
        const chunk = 30 / files.length;
        const mappedPct = base + (pct * (chunk/100));
        progress.setProgress(mappedPct, `[${f.name}] Pág ${page}/${total}`);
      }, useOcr);

      if(txt && txt.trim()) {
         pdfText += `\n\n--- INÍCIO DO ARQUIVO: ${f.name} ---\n` + txt.trim() + `\n--- FIM DO ARQUIVO: ${f.name} ---\n\n`;
      }
    } catch(e) {
      console.warn(`Erro ao extrair ${f.name}:`, e);
    }
  }

  pdfText = pdfText.trim();
  if(!pdfText || pdfText.length < 50){
    throw new Error('Arquivos sem texto extraível ou vazios. Verifique se não são imagens escaneadas.');
  }

  const truncInfo = truncateForAPI(pdfText);
  const truncMsg = truncInfo.truncated
    ? ` (truncado de ${truncInfo.original.toLocaleString()} → ${truncInfo.final.toLocaleString()} chars)`
    : '';
  progress.setProgress(50, `Texto extraído (${pdfText.length.toLocaleString()} caracteres)${truncMsg}`);
  await sleep(500);

  // Step 3: Send to AI
  progress.setStep(2);
  const providerLabel = provider === 'openai' ? 'OpenAI' : (provider === 'claude' ? 'Claude' : 'Mistral');
  progress.setProgress(55, `Enviando ${files.length} arquivo(s) para ${providerLabel}...${truncMsg}`);
  await sleep(300);

  progress.setStep(3);
  progress.setProgress(65, 'Processando super resumo com IA — aguarde...');

  let response;
  try{
    if(provider==='openai'){response=await callOpenAI(pdfText,config)}
    else if(provider==='claude'){response=await callClaude(pdfText,config)}
    else{response=await callMistral(pdfText,config)}
  }catch(e){throw e}

  // Step 4: Done
  progress.setStep(4);
  progress.setProgress(100, 'Análise unificada concluída!');

  return{text:pdfText,response,provider};
}

function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

// ===== SIMPLE MARKDOWN RENDER =====
function renderMarkdown(text){
  return text
    .replace(/### (.*)/g,'<h3>$1</h3>')
    .replace(/## (.*)/g,'<h2>$1</h2>')
    .replace(/# (.*)/g,'<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/^- (.*)/gm,'<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs,(m)=>'<ul>'+m+'</ul>')
    .replace(/<\/ul>\s*<ul>/g,'')
    .replace(/✅/g,'<span style="color:var(--success)">✅</span>')
    .replace(/⚠️/g,'<span style="color:var(--warning)">⚠️</span>')
    .replace(/🔴/g,'<span style="color:var(--danger)">🔴</span>')
    .replace(/\n/g,'<br>');
}

// ===== CONFIG PAGE RENDER =====
function renderConfigIA(){
  const cfg=getAIConfig();
  const app=document.getElementById('app');
  app.innerHTML=`
  <div class="page-header"><div><h1>Configurações</h1><p>Configure integrações com IA, Supabase e Airtop</p></div></div>

  <div class="grid-2">
    <!-- Supabase Config -->
    <div class="card config-card" style="grid-column: span 2">
      <div class="config-card-header">
        <div class="provider-icon" style="background:#3ecf8e20;color:#3ecf8e"><i class="ti ti-database"></i></div>
        <div><h3>Supabase</h3><span style="font-size:.7rem;color:var(--gray-400)">Banco de dados e armazenamento</span></div>
      </div>
      <div class="grid-2" style="gap:16px; margin-bottom:0">
        <div class="form-group">
          <label>URL do Projeto</label>
          <input type="text" id="cfg-sb-url" value="${getSupabaseConfig().url || SB_DEFAULTS.url}" placeholder="https://xxxxx.supabase.co">
        </div>
        <div class="form-group">
          <label>Anon Key</label>
          <div class="api-key-input">
            <input type="password" id="cfg-sb-key" value="${getSupabaseConfig().key || SB_DEFAULTS.key}" placeholder="eyJhbGci...">
            <button onclick="toggleKeyVis('cfg-sb-key')"><i class="ti ti-eye"></i></button>
          </div>
        </div>
      </div>
    </div>
    <!-- OpenAI Config -->
    <div class="card config-card">
      <div class="config-card-header">
        <div class="provider-icon openai"><i class="ti ti-brand-openai"></i></div>
        <div><h3>OpenAI</h3><span style="font-size:.7rem;color:var(--gray-400)">GPT-4o, GPT-4o-mini</span></div>
      </div>
      <div class="form-group">
        <label>API Key</label>
        <div class="api-key-input">
          <input type="password" id="cfg-openai-key" value="${cfg.openai_key}" placeholder="sk-...">
          <button onclick="toggleKeyVis('cfg-openai-key')"><i class="ti ti-eye"></i></button>
        </div>
        <div class="config-status ${cfg.openai_key?'ok':'err'}">
          <i class="ti ti-${cfg.openai_key?'circle-check':'alert-circle'}"></i>
          ${cfg.openai_key?'Chave configurada':'Chave não configurada'}
        </div>
      </div>
      <div class="form-group">
        <label>Modelo</label>
        <select id="cfg-openai-model">
          ${['gpt-4o','gpt-4o-mini','gpt-4-turbo','gpt-3.5-turbo'].map(m=>`<option ${cfg.openai_model===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-sm btn-outline" onclick="testAIConnection('openai')"><i class="ti ti-plug"></i> Testar Conexão</button>
      <span id="test-openai-result" style="font-size:.72rem;margin-left:8px"></span>
    </div>

    <!-- Claude Config -->
    <div class="card config-card">
      <div class="config-card-header">
        <div class="provider-icon claude"><i class="ti ti-brain"></i></div>
        <div><h3>Claude (Anthropic)</h3><span style="font-size:.7rem;color:var(--gray-400)">Claude Sonnet 4, Claude Haiku</span></div>
      </div>
      <div class="form-group">
        <label>API Key</label>
        <div class="api-key-input">
          <input type="password" id="cfg-claude-key" value="${cfg.claude_key}" placeholder="sk-ant-...">
          <button onclick="toggleKeyVis('cfg-claude-key')"><i class="ti ti-eye"></i></button>
        </div>
        <div class="config-status ${cfg.claude_key?'ok':'err'}">
          <i class="ti ti-${cfg.claude_key?'circle-check':'alert-circle'}"></i>
          ${cfg.claude_key?'Chave configurada':'Chave não configurada'}
        </div>
      </div>
      <div class="form-group">
        <label>Modelo</label>
        <select id="cfg-claude-model">
          ${['claude-sonnet-4-20250514','claude-haiku-4-20250514','claude-3-5-sonnet-20241022','claude-3-haiku-20240307'].map(m=>`<option ${cfg.claude_model===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-sm btn-outline" onclick="testAIConnection('claude')"><i class="ti ti-plug"></i> Testar Conexão</button>
      <span id="test-claude-result" style="font-size:.72rem;margin-left:8px"></span>
    </div>

    <!-- Mistral Config -->
    <div class="card config-card">
      <div class="config-card-header">
        <div class="provider-icon" style="background:#ff5b0020;color:#ff5b00"><i class="ti ti-lambda"></i></div>
        <div><h3>Mistral AI</h3><span style="font-size:.7rem;color:var(--gray-400)">Mistral Large, Mistral Small</span></div>
      </div>
      <div class="form-group">
        <label>API Key</label>
        <div class="api-key-input">
          <input type="password" id="cfg-mistral-key" value="${cfg.mistral_key || ''}" placeholder="Chave do Mistral...">
          <button onclick="toggleKeyVis('cfg-mistral-key')"><i class="ti ti-eye"></i></button>
        </div>
        <div class="config-status ${cfg.mistral_key?'ok':'err'}">
          <i class="ti ti-${cfg.mistral_key?'circle-check':'alert-circle'}"></i>
          ${cfg.mistral_key?'Chave configurada':'Chave não configurada'}
        </div>
      </div>
      <div class="form-group">
        <label>Modelo</label>
        <select id="cfg-mistral-model">
          ${['mistral-large-latest','mistral-small-latest','codestral-latest'].map(m=>`<option ${cfg.mistral_model===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-sm btn-outline" onclick="testAIConnection('mistral')"><i class="ti ti-plug"></i> Testar Conexão</button>
      <span id="test-mistral-result" style="font-size:.72rem;margin-left:8px"></span>
    </div>
  </div>

  <div class="grid-2" style="margin-top:16px">
    <!-- Airtop Config -->
    <div class="card config-card">
      <div class="config-card-header">
        <div class="provider-icon" style="background:#6366f120;color:#6366f1"><i class="ti ti-robot"></i></div>
        <div><h3>Airtop RPA</h3><span style="font-size:.7rem;color:var(--gray-400)">Automação de navegador com IA</span></div>
      </div>
      <div class="form-group">
        <label>API Key</label>
        <div class="api-key-input">
          <input type="password" id="cfg-airtop-key" value="${cfg.airtop_key}" placeholder="sk-...">
          <button onclick="toggleKeyVis('cfg-airtop-key')"><i class="ti ti-eye"></i></button>
        </div>
        <div class="config-status ${cfg.airtop_key?'ok':'err'}">
          <i class="ti ti-${cfg.airtop_key?'circle-check':'alert-circle'}"></i>
          ${cfg.airtop_key?'Chave configurada':'Chave não configurada'}
        </div>
      </div>
      <button class="btn btn-sm btn-outline" onclick="testAIConnection('airtop')"><i class="ti ti-plug"></i> Testar Conexão</button>
      <span id="test-airtop-result" style="font-size:.72rem;margin-left:8px"></span>
    </div>

  <!-- Prompt Editor -->
  <div class="card config-card" style="margin-top:16px">
    <div class="config-card-header">
      <div class="provider-icon" style="background:var(--primary-light);color:var(--primary)"><i class="ti ti-prompt"></i></div>
      <div><h3>Prompt de Análise</h3><span style="font-size:.7rem;color:var(--gray-400)">Configure como a IA deve interpretar os editais</span></div>
    </div>
    <div class="form-group prompt-editor">
      <label>System Prompt</label>
      <textarea id="cfg-prompt">${cfg.prompt}</textarea>
      <div class="prompt-variables">
        <span style="font-size:.68rem;color:var(--gray-500);margin-right:4px">Variáveis sugeridas:</span>
        <span class="prompt-var" onclick="insertPromptVar('{objeto}')">objeto</span>
        <span class="prompt-var" onclick="insertPromptVar('{modalidade}')">modalidade</span>
        <span class="prompt-var" onclick="insertPromptVar('{clientes}')">clientes</span>
        <span class="prompt-var" onclick="insertPromptVar('{palavras_chave}')">palavras-chave</span>
      </div>
    </div>
    <button class="btn btn-sm btn-outline" onclick="resetPrompt()" style="margin-right:8px"><i class="ti ti-refresh"></i> Restaurar Padrão</button>
  </div>
  </div>

  <div class="form-actions" style="margin-top:16px; justify-content:space-between">
    <div>
      <button class="btn btn-outline" style="color:var(--gray-600)" onclick="doSeedDemoData()"><i class="ti ti-database-import"></i> Importar Dados de Demonstração</button>
    </div>
    <button class="btn btn-primary" onclick="saveConfigIA()"><i class="ti ti-check"></i> Salvar Configurações</button>
  </div>`;
}

window.doSeedDemoData = async function() {
  if (!confirm("Isso importará editais e clientes de teste para o seu Supabase. Deseja continuar?")) return;
  const btn = event.currentTarget;
  const oldHtml = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Importando...';
  try {
    await dbSeedDemoData(MOCK_EDITAIS, MOCK_CLIENTES);
    alert('Dados de demonstração importados com sucesso! O aplicativo será recarregado.');
    window.location.reload();
  } catch (err) {
    alert('Erro ao importar dados: ' + err.message);
    btn.disabled = false; btn.innerHTML = oldHtml;
  }
};

function toggleKeyVis(id){
  const inp=document.getElementById(id);
  inp.type=inp.type==='password'?'text':'password';
}

function insertPromptVar(v){
  const ta=document.getElementById('cfg-prompt');
  if(!ta)return;
  const start=ta.selectionStart;
  ta.value=ta.value.substring(0,start)+v+ta.value.substring(ta.selectionEnd);
  ta.focus();
  ta.setSelectionRange(start+v.length,start+v.length);
}

function resetPrompt(){
  const ta=document.getElementById('cfg-prompt');
  if(ta)ta.value=DEFAULT_PROMPT;
}

function saveConfigIA(){
  const cfg={
    openai_key:document.getElementById('cfg-openai-key').value.trim(),
    openai_model:document.getElementById('cfg-openai-model').value,
    claude_key:document.getElementById('cfg-claude-key').value.trim(),
    claude_model:document.getElementById('cfg-claude-model').value,
    mistral_key:document.getElementById('cfg-mistral-key').value.trim(),
    mistral_model:document.getElementById('cfg-mistral-model').value,
    airtop_key:document.getElementById('cfg-airtop-key')?.value.trim() || '',
    prompt:document.getElementById('cfg-prompt').value,
    provider:getAIConfig().provider||'openai'
  };
  saveAIConfig(cfg);

  // Save Supabase
  const sbUrl = document.getElementById('cfg-sb-url')?.value.trim();
  const sbKey = document.getElementById('cfg-sb-key')?.value.trim();
  if (sbUrl || sbKey) {
    saveSupabaseConfig({ url: sbUrl, key: sbKey });
  }

  renderConfigIA();
  alert('Configurações salvas com sucesso!');
}

async function testAIConnection(provider){
  if(provider==='airtop') {
    const resultEl=document.getElementById('test-airtop-result');
    const inputKey = document.getElementById('cfg-airtop-key')?.value.trim();
    if(resultEl)resultEl.innerHTML='<span style="color:var(--primary)"><i class="ti ti-loader"></i> Testando...</span>';
    const res = await testAirtopConnection(inputKey);
    if(resultEl) resultEl.innerHTML = res.ok ? '<span style="color:var(--success)">✓ Conexão OK</span>' : `<span style="color:var(--danger)">✗ ${res.msg}</span>`;
    return;
  }
  const cfg=getAIConfig();
  // Also grab the unsaved values from the form
  const key=provider==='openai'
    ?(document.getElementById('cfg-openai-key')?.value||cfg.openai_key)
    :(provider==='claude'
      ?(document.getElementById('cfg-claude-key')?.value||cfg.claude_key)
      :(document.getElementById('cfg-mistral-key')?.value||cfg.mistral_key));
  const resultEl=document.getElementById('test-'+provider+'-result');
  if(!key){
    if(resultEl)resultEl.innerHTML='<span style="color:var(--danger)">⚠ Insira uma chave primeiro</span>';
    return;
  }
  if(resultEl)resultEl.innerHTML='<span style="color:var(--primary)"><i class="ti ti-loader"></i> Testando...</span>';
  try{
    if(provider==='openai'){
      const r=await fetch('https://api.openai.com/v1/models',{headers:{'Authorization':'Bearer '+key}});
      if(!r.ok)throw new Error('Status '+r.status);
    }else if(provider==='claude'){
      const r=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:'claude-3-haiku-20240307',max_tokens:10,messages:[{role:'user',content:'ping'}]})
      });
      if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error?.message||'Status '+r.status)}
    }else{
      const r=await fetch('https://api.mistral.ai/v1/chat/completions',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
        body:JSON.stringify({model:'mistral-small-latest',max_tokens:10,messages:[{role:'user',content:'ping'}]})
      });
      if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.message||'Status '+r.status)}
    }
    if(resultEl)resultEl.innerHTML='<span style="color:var(--success)">✓ Conexão OK</span>';
  }catch(e){
    if(resultEl)resultEl.innerHTML=`<span style="color:var(--danger)">✗ ${e.message}</span>`;
  }
}
