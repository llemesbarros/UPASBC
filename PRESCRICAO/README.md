# Prescrição Médica — PWA

Aplicação web instalável para abrir, editar e salvar arquivos locais `.upa24`.
Todo o conteúdo clínico permanece no arquivo local selecionado; a aplicação não envia os dados para um servidor.

## Arquivos

- `index.html`: formulário em duas páginas A4 paisagem.
- `app.js`: leitura por GET, abertura, edição e gravação de `.upa24`.
- `manifest.webmanifest`: instalação da PWA e associação da extensão `.upa24`.
- `service-worker.js`: cache para funcionamento offline.
- `icons/`: ícones da aplicação.
- `exemplo.upa24`: arquivo de teste.

## Publicação

Envie **todo o conteúdo desta pasta**, preservando a estrutura, para uma pasta do servidor acessível por HTTPS.
Exemplo: `https://seu-dominio/prescricao/`.

A PWA também funciona em `http://localhost` durante testes. Não abra `index.html` por `file://`, pois service worker, instalação e manipulação direta de arquivos exigem contexto seguro.

### GitHub Pages

Pode publicar a pasta na raiz de um repositório ou em uma pasta de projeto. Os caminhos são relativos e funcionam em URLs como:

`https://usuario.github.io/prescricao-upa/`

O arquivo `.nojekyll` já está incluído.

## Parâmetros GET

Quando nenhum arquivo `.upa24` tiver sido aberto, a página aceita:

- `UNIDADE`: preenche o `span` da unidade;
- `NOME`: preenche o nome do paciente;
- `NASCIMENTO`: preenche a data de nascimento.

A data do atendimento é preenchida automaticamente com a data local atual.

Exemplo:

`?UNIDADE=RIACHO%20GRANDE&NOME=MARIA%20DA%20SILVA&NASCIMENTO=21%2F06%2F1985`

Também são aceitos nomes de parâmetros em minúsculas e datas nos formatos `AAAA-MM-DD` ou `DD/MM/AAAA`.

## Instalação e abertura de `.upa24`

1. Abra a URL no Chrome ou Edge no Windows.
2. Instale pelo ícone da barra de endereços ou pelo botão **Instalar aplicativo**, quando exibido.
3. Abra `exemplo.upa24` pelo Explorador de Arquivos.
4. Na primeira vez, selecione **Prescrição Médica** em **Abrir com** e autorize o acesso.

A associação de arquivo depende de navegador e sistema operacional compatíveis com a File Handling API. Em Chrome/Edge recentes no Windows, a PWA instalada pode aparecer como manipuladora da extensão.

## Salvamento

- **Salvar**: sobrescreve o arquivo aberto, após autorização do navegador.
- **Salvar como...**: cria outro arquivo `.upa24` e passa a tratá-lo como o documento atual.
- `Ctrl+S`: salvar.
- `Ctrl+Shift+S`: salvar como.
- `Ctrl+O`: abrir.
- `Ctrl+P`: imprimir.

Se o navegador não oferecer a File System Access API, **Salvar como...** baixa uma cópia; nesse modo, não é possível sobrescrever automaticamente o arquivo original.

## MIME types

O servidor deve servir:

- `.webmanifest` como `application/manifest+json`;
- `.upa24` como `application/json` quando esses arquivos forem disponibilizados pelo servidor.

Arquivos de configuração de exemplo para Apache (`.htaccess`) e IIS (`web.config`) acompanham o projeto.

## Privacidade

Não publique arquivos `.upa24` reais no servidor ou no repositório. Publique somente a aplicação vazia. Os arquivos de pacientes devem permanecer localmente em computadores autorizados e protegidos conforme as políticas institucionais aplicáveis.
