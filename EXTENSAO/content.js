if (document.getElementById('tspaciente') != null){

// Cria um novo elemento input
const buttonElement = document.createElement('a');
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

// Adiciona o button ao corpo da página
document.body.appendChild(buttonElement);

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

if(location.origin + location.pathname === 'http://saudeweb/hygiaweb/UPA/FilaAtend_Manual.aspx'){
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
