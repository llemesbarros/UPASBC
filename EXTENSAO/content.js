if (document.getElementById('tspaciente') != null){

  // Cria um novo elemento input
  const divElement = document.createElement('div');
  const buttonElement = document.createElement('a');
  const buttonElement2 = document.createElement('a');
  const id_paciente = document.getElementById('tspaciente').innerHTML;
  const nome_medico = document.getElementById('ddprofis').innerHTML;
  const unidade = document.getElementById('Topo1_PageUS').innerHTML;
  const nascimento = document.getElementById('griFichasGBCR__ctl2_tDataNasc').innerHTML;
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
  buttonElement2.innerHTML = 'Prescrição';
  buttonElement.target = '_blank';
  buttonElement2.target = '_blank';
  buttonElement.classList.add("TLinkButtonN");
  buttonElement2.classList.add("TLinkButtonN");
  buttonElement.href = "https://llemesbarros.github.io/UPASBC/?unidade=" + unidade + "&id=" + id_paciente + "&nome=" + nome_paciente + "&medico=" + nome_medico ;
  buttonElement2.href = "https://llemesbarros.github.io/UPASBC/PRESCRICAO/?unidade=" + unidade + "&id=" + id_paciente + "&nome=" + nome_paciente + "&nascimento=" + nascimento;

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
