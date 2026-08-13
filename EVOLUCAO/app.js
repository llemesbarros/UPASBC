(() => {
  'use strict';
  const FORMAT = 'evolucao-multidisciplinar-upa24';
  const EXTENSION = '.upa24';
  const ROWS_PER_PAGE = 20;
  const TOTAL_ROWS = 42;
  const state = { handle: null, fileName: '', dirty: false, busy: false, source: {} };
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const localDate = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const valueAt = (o, paths, fallback='') => { for(const p of paths){ const v=p.split('.').reduce((a,k)=>a?.[k],o); if(v!==undefined&&v!==null)return v; } return fallback; };

  function header(first){
    if(!first) return '';
    return `<table class="header"><tr><td class="logo" rowspan="3"><img src="../logo-sbc.jpg" alt="Prefeitura de São Bernardo do Campo"></td><td class="city">MUNICÍPIO DE SÃO BERNARDO DO CAMPO</td></tr><tr><td class="secretary">Secretaria da Saúde</td></tr><tr><td class="unit">Unidade de Pronto Atendimento<br><span id="unit-label">Riacho Grande</span></td></tr></table>
    <table class="patient"><tr><td colspan="2"><div class="cell-field"><label for="nome">NOME:</label><input id="nome" autocomplete="off"></div></td></tr><tr><td class="split"><div class="cell-field"><label for="sala">SALA:</label><input id="sala" autocomplete="off"></div></td><td class="small"><div class="cell-field"><label for="leito">LEITO:</label><input id="leito" autocomplete="off"></div></td></tr><tr><td><div class="cell-field"><label for="diagnosticos">HD:</label><input id="diagnosticos" autocomplete="off"></div></td><td><div class="cell-field"><label for="idade">IDADE:</label><input id="idade" autocomplete="off"></div></td></tr></table>`;
  }

  function formatDateTimeForPrint(value){
    if(!value) return '';
    const [date,time=''] = String(value).split('T');
    const m = date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m) return value;
    return `${m[3]}/${m[2]}/${m[1]}${time ? `\n${time.slice(0,5)}` : ''}`;
  }

  function rows(start,count){
    return Array.from({length:count},(_,i)=>{
      const n=start+i;
      const entryCell = i===0 ? `<td class="entry-continuous" rowspan="${count}" style="--rows:${count}"><label class="visually-hidden" for="evolucao-${start}">Evolução</label><textarea id="evolucao-${start}" class="page-evolution" data-start="${start}" data-count="${count}" spellcheck="true" aria-label="Evolução multidisciplinar da página"></textarea></td>` : '';
      return `<tr data-row="${n}"><td class="date-time"><label class="visually-hidden" for="datetime-${n}">Data e hora</label><input id="datetime-${n}" class="row-datetime" type="datetime-local"><span class="datetime-print" aria-hidden="true"></span></td>${entryCell}</tr>`;
    }).join('');
  }

  function page(number,start,count){
    return `<section class="sheet ${number===2?'page-two':''}">${header(number===1)}<table class="evolution"><thead><tr><th class="datetime">DATA/HORA</th><th>EVOLUÇÃO MULTIDISCIPLINAR</th></tr></thead><tbody>${rows(start,count)}${number===2?'<tr><td class="footer" colspan="2">Rua Marcílio Conrado, 333 - RIACHO GRANDE - CNPJ 46.523.239/0001-47</td></tr>':''}</tbody></table></section>`;
  }

  $('#pages').innerHTML=page(1,0,ROWS_PER_PAGE)+page(2,ROWS_PER_PAGE,TOTAL_ROWS-ROWS_PER_PAGE);

  function setStatus(message){
    const e=$('#document-status');
    e.textContent=(message||state.fileName||'Novo documento')+(state.dirty?' — alterações não salvas':'');
    e.classList.toggle('unsaved',state.dirty);
    document.title=`Evolução Multidisciplinar${state.dirty?' *':''}`;
  }
  function markDirty(){ if(!state.busy){state.dirty=true;setStatus();} }
  function normalizeUnit(v){ return String(v||'UPA RIACHO GRANDE').replace(/^UPA\s+/i,'').trim()||'Riacho Grande'; }

  function syncPrintDateTimes(){
    $$('tr[data-row]').forEach(r=>{
      const input=r.querySelector('.row-datetime');
      const out=r.querySelector('.datetime-print');
      out.textContent=formatDateTimeForPrint(input?.value||'');
    });
  }

  function splitPageText(text,count){
    const lines=String(text||'').split(/\r?\n/);
    const out=Array.from({length:count},()=> '');
    for(let i=0;i<Math.min(lines.length,count);i++) out[i]=lines[i];
    if(lines.length>count) out[count-1]+=(out[count-1]?'\n':'')+lines.slice(count).join('\n');
    return out;
  }

  function collect(){
    syncPrintDateTimes();
    const base=structuredClone(state.source||{});
    base.formatoOriginal=base.formato||null;
    base.formato=FORMAT;
    base.versaoEvolucao=2;
    base.aplicativoEvolucao={nome:'Evolução Multidisciplinar',versao:'2.0.0'};
    base.ultimaAlteracao=new Date().toISOString();
    base.unidade=base.unidade||`UPA ${$('#unit-label').textContent}`;
    base.paciente={...(base.paciente||{}),nome:$('#nome').value,idade:$('#idade').value||base.paciente?.idade||null};
    base.atendimento={...(base.atendimento||{}),diagnosticos:$('#diagnosticos').value,sala:$('#sala').value,leito:$('#leito').value};

    const pageTexts={};
    $$('.page-evolution').forEach(t=>{ pageTexts[Number(t.dataset.start)] = splitPageText(t.value,Number(t.dataset.count)); });
    base.evolucao=$$('tr[data-row]').map((r,i)=>{
      const dt=r.querySelector('.row-datetime').value||'';
      const [data='',hora=''] = dt.split('T');
      const pageStart=i<ROWS_PER_PAGE?0:ROWS_PER_PAGE;
      const texto=(pageTexts[pageStart]||[])[i-pageStart]||'';
      return {numero:i+1,data,hora,datetime:dt,texto};
    });
    base.evolucaoTextoPaginas=$$('.page-evolution').map((t,index)=>({pagina:index+1,texto:t.value}));
    return base;
  }

  function apply(data){
    state.source=structuredClone(data);
    $('#nome').value=valueAt(data,['paciente.nome','nome']);
    $('#sala').value=valueAt(data,['atendimento.sala','sala']);
    $('#leito').value=valueAt(data,['atendimento.leito','leito']);
    $('#diagnosticos').value=valueAt(data,['atendimento.diagnosticos','atendimento.diagnostico','diagnosticos']);
    $('#idade').value=valueAt(data,['paciente.idade','idade']);
    $('#unit-label').textContent=normalizeUnit(valueAt(data,['unidade.nome','unidade','atendimento.unidade']));

    const evol=Array.isArray(data.evolucao)?data.evolucao:Array.isArray(data.evolucoes)?data.evolucoes:[];
    $$('tr[data-row]').forEach((r,i)=>{
      const e=evol.find(x=>Number(x.numero)===i+1)||evol[i]||{};
      let dt=e.datetime||e.dataHora||e.datahora||'';
      if(!dt && e.data){ dt=`${String(e.data).slice(0,10)}${e.hora||e.horario?`T${String(e.hora||e.horario).slice(0,5)}`:''}`; }
      r.querySelector('.row-datetime').value=dt;
    });

    const storedPages=Array.isArray(data.evolucaoTextoPaginas)?data.evolucaoTextoPaginas:[];
    $$('.page-evolution').forEach((t,pageIndex)=>{
      const stored=storedPages.find(p=>Number(p.pagina)===pageIndex+1)?.texto;
      if(stored!==undefined){ t.value=stored; return; }
      const start=Number(t.dataset.start), count=Number(t.dataset.count);
      const lines=[];
      for(let i=0;i<count;i++){
        const e=evol.find(x=>Number(x.numero)===start+i+1)||evol[start+i]||{};
        lines.push(e.texto||e.evolucao||'');
      }
      while(lines.length && !lines[lines.length-1]) lines.pop();
      t.value=lines.join('\n');
    });
    syncPrintDateTimes();
    state.dirty=false;
    setStatus();
  }

  function reset(){
    if(state.dirty&&!confirm('Descartar as alterações não salvas?'))return;
    state.handle=null;state.fileName='';state.source={};
    $$('input:not([type=file]),textarea').forEach(e=>e.value='');
    $('#unit-label').textContent='Riacho Grande';syncPrintDateTimes();state.dirty=false;setStatus();
  }

  async function readFile(file,handle=null){
    try{
      const data=JSON.parse(await file.text());
      if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Conteúdo inválido');
      state.handle=handle;state.fileName=file.name;apply(data);setStatus(`Aberto: ${file.name}`);
    }catch(e){alert(`Não foi possível abrir o arquivo.\n\n${e.message}`);}
  }

  const pickerTypes=()=>[{description:'Arquivo UPA24',accept:{'application/json':[EXTENSION]}}];
  async function openFile(){
    if(state.dirty&&!confirm('Descartar as alterações não salvas?'))return;
    if('showOpenFilePicker'in window){
      try{const [h]=await showOpenFilePicker({types:pickerTypes(),multiple:false});await readFile(await h.getFile(),h);}catch(e){if(e.name!=='AbortError')alert(e.message);}
    }else $('#file-input').click();
  }

  function suggested(){
    const patient=$('#nome').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'paciente';
    return `evolucao-${patient}-${localDate()}${EXTENSION}`;
  }
  function download(data,name){
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  async function write(handle,data){
    const permission=await handle.queryPermission?.({mode:'readwrite'});
    if(permission!=='granted'&&await handle.requestPermission?.({mode:'readwrite'})!=='granted')throw new Error('Permissão de gravação não concedida');
    const w=await handle.createWritable();await w.write(JSON.stringify(data,null,2)+'\n');await w.close();
  }
  async function save(as=false){
    const data=collect();
    try{
      if('showSaveFilePicker'in window){let h=state.handle;if(as||!h)h=await showSaveFilePicker({suggestedName:suggested(),types:pickerTypes()});await write(h,data);state.handle=h;state.fileName=h.name;}
      else{download(data,suggested());state.handle=null;state.fileName=suggested();}
      state.source=structuredClone(data);state.dirty=false;setStatus(`Salvo: ${state.fileName}`);
    }catch(e){if(e.name!=='AbortError')alert(`Não foi possível salvar.\n\n${e.message}`);}
  }

  document.addEventListener('input',e=>{if(e.target.matches('.row-datetime'))syncPrintDateTimes();markDirty();});
  $('#open-button').onclick=openFile;$('#clear-button').onclick=reset;$('#save-button').onclick=()=>save(false);$('#save-as-button').onclick=()=>save(true);
  $('#print-button').onclick=()=>{syncPrintDateTimes();window.print();};
  $('#file-input').onchange=e=>{const f=e.target.files?.[0];if(f)readFile(f);e.target.value='';};
  window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
  if('launchQueue'in window)launchQueue.setConsumer(async params=>{const h=params.files?.[0];if(h)await readFile(await h.getFile(),h);});
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(console.error);
  syncPrintDateTimes();
})();
