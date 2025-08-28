if (document.getElementById('tspaciente') != null){

  // Cria um novo elemento input
  const divElement = document.createElement('div');
  const buttonElement = document.createElement('a');
  const buttonElement2 = document.createElement('a');
  const id_paciente = document.getElementById('tspaciente').innerHTML;
  const unidade = document.getElementById('Topo1_PageUS').innerHTML;
  const nome_paciente = (function(){
  const el = document.getElementById('griFichasGBCR__ctl2_txtNomePac2');
  if(!el) return '';
  const tag = (el.tagName||'').toUpperCase();
  const raw = (tag==='INPUT'||tag==='TEXTAREA') ? (el.value||'') : (el.textContent||el.innerText||el.innerHTML||'');
  const d = document.createElement('div');
  d.innerHTML = raw;
  return (d.textContent||d.innerText||'').trim();
})();
  const guiche = document.getElementById('txtGuiche').innerHTML;

  // Define o nome do button
  buttonElement.innerHTML = 'Receituário';
  buttonElement2.innerHTML = 'Chamar';
  buttonElement.target = '_blank';
  buttonElement.classList.add("TLinkButtonN");
  buttonElement2.classList.add("TLinkButtonN");
  buttonElement.href = "https://llemesbarros.github.io/UPASBC/?unidade=" + unidade + "&id=" + id_paciente + "&nome=" + nome_paciente;
  buttonElement2.href = "#";

  // Estiliza o button para que ele apareça de forma visível
  divElement.style.position = 'fixed';
  divElement.style.top = '50px';
  divElement.style.right = '10px';
  divElement.style.zIndex = '1000';
  divElement.style.padding = '10px';
  divElement.style.fontSize = '16px';

  // Adiciona o button ao corpo da página
  divElement.appendChild(buttonElement2);
  divElement.appendChild(buttonElement);
  document.body.appendChild(divElement);

  // Função para escolher voz pt-BR
  function pickVoice() {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find(v => v.lang === 'pt-BR') ||
      voices.find(v => (v.lang || '').toLowerCase().startsWith('pt')) ||
      voices[0] ||
      null
    );
  }

  // Garante o carregamento das vozes em navegadores como Chrome
  window.speechSynthesis.onvoiceschanged = () => pickVoice();

  // Evento de clique para falar o nome do paciente (com voice picker e logs)
(function(){
  const hasTTS = ('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window);
  if(!hasTTS){
    console.warn('[TTS] Web Speech API não suportada.');
    return;
  }
  function pickVoice(){
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v=>v.lang==='pt-BR') || voices.find(v=>(v.lang||'').toLowerCase().startsWith('pt')) || voices[0] || null;
  }
  window.speechSynthesis.addEventListener('voiceschanged', ()=>{ /* aquece as vozes */ });
  function speak(texto){
    const t = (texto||'').trim();
    if(!t){ console.warn('[TTS] Texto vazio.'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'pt-BR';
    const v = pickVoice();
    if(v) u.voice = v;
    u.rate = 1; u.pitch = 1; u.volume = 1;
    window.speechSynthesis.speak(u);
  }
  buttonElement2.addEventListener('click', function(ev){
    ev.preventDefault();
    // Releia o nome no momento do clique (caso a tela tenha mudado)
    const el = document.getElementById('griFichasGBCR__ctl2_txtNomePac2');
    const t = el ? ((el.tagName||'').toUpperCase()==='INPUT'||(el.tagName||'').toUpperCase()==='TEXTAREA' ? (el.value||'') : (el.textContent||el.innerText||el.innerHTML||'')) : nome_paciente;
    const d = document.createElement('div'); d.innerHTML = t; const txt = (d.textContent||d.innerText||'').trim();
    speak(`${txt}, ${guiche}`);
  });
})();

  // Adiciona o link para exame físico padrão
  const txtExameFisico = document.getElementById("txtExameFisico");
  txtExameFisico.rows = "10";
  const tdExameFisico = txtExameFisico.parentNode;
  const btnExameFisico = document.createElement('a');
  btnExameFisico.innerHTML = 'Exame físico normal';
  btnExameFisico.href = '#txtExameFisico';
  btnExameFisico.onclick = function(){
    txtExameFisico.value = 'BOM ESTADO GERAL, ACORDADO(A), ORIENTADO(A), CORADO(A), HIDRATADO(A), ACIANÓTICO(A), ANICTÉRICO(A), AFEBRIL, EUPNEICO(A) EM AR AMBIENTE.\nNEUROLÓGICO: G15, PIFR, SEM DÉFICIT MOTOR APARENTE. AR: MVUA SEM RA. ACV: BRNF 2T SEM SOPRO.\nABDOME: PERISTÁLTICO, FLÁCIDO, INDOLOR À PALPAÇÃO E À DESCOMPRESSÃO, SEM MASSAS E/OU VMG PALPÁVEIS.\nEXTREMIDADES: PULSOS PRESENTES E SIMÉTRICOS; SEM EDEMA OU DEMAIS SINAIS FLOGÍSTICOS.';
  };
  tdExameFisico.prepend(btnExameFisico);
}

if(location.origin + location.pathname === 'http://saudeweb/hygiaweb/UPA/FilaAtend_Manual.aspx' || location.origin + location.pathname === 'http://saudeweb/hygiaweb/UPA/FilaAtend.aspx'){
  var link  = document.createElement('link');
  link.rel  = 'stylesheet';
  link.type = 'text/css';
  link.href = 'https://llemesbarros.github.io/UPASBC/filamanual.css';
  document.head.appendChild(link);
  var link  = document.createElement('link');
  link.rel = 'icon';
  link.href = "http://saudeweb/hygiaweb/Images/hygia_grega.gif";
  link.type = "image/gif";
  document.head.appendChild(link);
}
