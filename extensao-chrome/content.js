// Cria um novo elemento input
const buttonElement = document.createElement('a');
if (document.getElementById('tspaciente') != null){
const id_paciente = document.getElementById('tspaciente').innerHTML;
const nome_paciente = document.getElementById('griFichasGBCR__ctl2_txtNomePac2').innerHTML;

// Define o nome do button
buttonElement.innerHTML = 'RECEITA PARA PACIENTE';
buttonElement.href = "file://10.1.0.109/saude/Mapa_de_Leitos/CENTRAL%20DE%20ACESSO%202016/UPA%20RIACHO%20GRANDE/PRESCRI%C3%87%C3%95ES/MODELOS/LUCAS%20LEMES/html/RECEITUARIO.html?id=" + id_paciente + "&nome=" + nome_paciente;


// Estiliza o button para que ele apareça de forma visível
buttonElement.style.position = 'fixed';
buttonElement.style.top = '10px';
buttonElement.style.left = '10px';
buttonElement.style.zIndex = '1000';
buttonElement.style.padding = '10px';
buttonElement.style.fontSize = '16px';

// Adiciona o input ao corpo da página
document.body.appendChild(buttonElement);
}