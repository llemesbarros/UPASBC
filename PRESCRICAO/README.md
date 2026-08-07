# Prescrição Médica — PWA v1.1.0

Aplicação web instalável para abrir, editar e salvar arquivos locais `.upa24`. Todo o conteúdo clínico permanece no arquivo local selecionado; a aplicação não envia dados de pacientes ao servidor.

## Arquivos

- `index.html`: formulário atual em duas páginas A4 paisagem.
- `app.js`: GET, dados das unidades, cálculo da idade, abertura, importação de modelo e gravação de `.upa24`.
- `manifest.webmanifest`: instalação da PWA e associação da extensão `.upa24`.
- `service-worker.js`: cache para funcionamento offline.
- `icons/`: ícones da aplicação.
- `exemplo.upa24`: documento completo de teste.
- `modelo-exemplo.upa24`: exemplo para testar o botão **Importar modelo**.
- `schema.upa24.json`: esquema de referência do JSON.

## Publicação

Envie **todo o conteúdo desta pasta**, preservando a estrutura, para uma pasta do servidor acessível por HTTPS. Exemplo: `https://seu-dominio/prescricao/`.

A PWA também funciona em `http://localhost` durante testes. Não abra `index.html` por `file://` se quiser instalação, service worker e integração de arquivos com o Windows.

### GitHub Pages

Pode publicar a pasta na raiz de um repositório ou como GitHub Pages de projeto. Todos os caminhos usados pela aplicação são relativos. O arquivo `.nojekyll` já está incluído.

## Parâmetros GET

Quando nenhum arquivo `.upa24` tiver sido aberto pelo sistema ou pelo botão **Abrir .upa24**, a página aceita parâmetros sem diferenciar maiúsculas de minúsculas:

- `unidade`: unidade de atendimento;
- `id`: Hygia do paciente;
- `nome`: nome do paciente;
- `nascimento`: data de nascimento (`AAAA-MM-DD` ou `DD/MM/AAAA`).

A `DATA` do atendimento é preenchida automaticamente com a data local atual. A idade é calculada automaticamente e exibida como `xx anos, xx meses e xx dias`.

Exemplo:

`?unidade=UPA%20RIACHO%20GRANDE&id=4650310&nome=MARIA%20DA%20SILVA&nascimento=21%2F06%2F1985`

Se um `.upa24` for aberto, os dados do arquivo têm precedência sobre os parâmetros GET.

## Dados das unidades

O valor de `unidade` é comparado com a mesma relação usada no receituário UPASBC. São reconhecidas as seguintes unidades e aliases sem acentos:

- UPA Riacho Grande;
- UPA Rudge Ramos;
- UPA Baeta Neves;
- UPA Alves Dias/Assunção;
- UPA Demarchi/Batistini;
- UPA Pauliceia/Taboão;
- UPA São Pedro;
- UPA Silvina;
- UPA União/Alvarenga.

O nome abreviado aparece no cabeçalho. Os dois `<td class="dados-unidade">` são preenchidos automaticamente com nome completo, endereço, cidade e CNPJ municipal. Ao salvar, a unidade também é gravada no JSON e volta a preencher esses dados na próxima abertura.

## Importar modelo

O botão **Importar modelo** permite escolher qualquer arquivo `.upa24` e copia **somente as linhas numeradas 1 a 46 da prescrição** (`medicamento`, `dose`, `via`, `frequência` e quatro horários).

Ele não altera `unidade`, `id/Hygia`, `nome`, `nascimento`, `idade`, `telefones`, `alergias`, `data`, `HD`, `sala`, `leito`, aprazamentos ou exames. O arquivo atualmente aberto continua sendo o documento de destino; portanto, depois de importar o modelo, **Salvar** grava as linhas importadas no documento atual.

## Abrir e salvar `.upa24`

1. Abra a URL no Chrome ou Edge no Windows e instale a PWA.
2. Use **Abrir .upa24** ou dê duplo clique em um `.upa24` associado à PWA.
3. **Salvar** sobrescreve o arquivo aberto quando existe um `FileSystemFileHandle` com permissão de escrita.
4. **Salvar como...** cria outro `.upa24` e passa a tratá-lo como o documento atual.

Atalhos: `Ctrl+S` salva, `Ctrl+Shift+S` salva como, `Ctrl+O` abre e `Ctrl+P` imprime.

Se o navegador não oferecer a File System Access API, a abertura usa um seletor HTML e **Salvar como...** baixa uma cópia; nesse modo não é possível sobrescrever automaticamente o arquivo original.

## Formato JSON

O campo do Hygia é salvo em `paciente.id`. A unidade é salva em `unidade`. A idade é recalculada a partir de `paciente.nascimento` e salva como texto no formato exibido. A leitura mantém compatibilidade com arquivos antigos que não possuam `paciente.id` e também aceita aliases como `id_paciente` e `hygia`.

## MIME types

O servidor deve servir `.webmanifest` como `application/manifest+json` e `.upa24` como `application/json` quando esses arquivos forem disponibilizados pelo servidor. Exemplos para Apache (`.htaccess`) e IIS (`web.config`) acompanham o projeto.

## Privacidade

Não publique arquivos `.upa24` reais no servidor ou no repositório. Publique somente a aplicação vazia. Os arquivos de pacientes devem permanecer localmente em computadores autorizados e protegidos conforme as políticas institucionais aplicáveis.
