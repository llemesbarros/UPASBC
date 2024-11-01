// Cria um novo elemento input
const buttonElement = document.createElement('a');
if (document.getElementById('tspaciente') != null){
  const id_paciente = document.getElementById('tspaciente').innerHTML;
  const unidade = document.getElementById('Topo1_PageUS').innerHTML;
  const nome_paciente = document.getElementById('griFichasGBCR__ctl2_txtNomePac2').innerHTML;
  
  // Define o nome do button
  buttonElement.innerHTML = 'Receituário';
  buttonElement.target = '_blank';
  buttonElement.classList.add("TLinkButtonN");
  buttonElement.href = "https://llemesbarros.github.io/UPASBC/?unidade=" + unidade + "&id=" + id_paciente + "&nome=" + nome_paciente;
  
  
  // Estiliza o button para que ele apareça de forma visível
  buttonElement.style.position = 'fixed';
  buttonElement.style.top = '50px';
  buttonElement.style.right = '10px';
  buttonElement.style.zIndex = '1000';
  buttonElement.style.padding = '10px';
  buttonElement.style.fontSize = '16px';
  
  // Adiciona o input ao corpo da página
  document.body.appendChild(buttonElement);

  if(window.location.href=='http://saudeweb/hygiaweb/UPA/FilaAtend_Manual.aspx'){
    var link  = document.createElement('link');
    link.rel  = 'stylesheet';
    link.type = 'text/css';
    link.href = 'https://llemesbarros.github.io/UPASBC/filamanual.css';
    document.head.appendChild(link);
  }
}

