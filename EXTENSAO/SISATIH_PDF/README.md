# SisATIH - Preenchimento por PDF

Extensão Manifest V3 para Chrome/Edge que lê **localmente** uma ficha PDF textual exportada pelo Hygia/UPA e auxilia o preenchimento das telas **Nova solicitação** e **Dados clínicos** do SisATIH.

## Objetivo

Reduzir digitação repetitiva sem automatizar decisões clínicas nem o envio do formulário. O operador seleciona a ficha PDF, revisa a identificação exibida pela extensão e clica em **Preencher esta página**. Ao avançar para a tela seguinte, os dados continuam disponíveis durante a sessão do navegador.

## Privacidade e segurança

- O PDF é processado no próprio navegador; não há upload para API, servidor externo ou serviço de IA.
- O arquivo PDF não é persistido pela extensão.
- Os dados estruturados extraídos ficam somente em `chrome.storage.session`, com expiração lógica de 8 horas, para permitir a navegação entre as etapas do SisATIH.
- O botão **Limpar** remove imediatamente os dados da sessão.
- A extensão **não envia** o formulário e não clica em **Salvar**.
- Campos que não tenham evidência no PDF são mantidos em branco.
- Valores já existentes no formulário não são sobrescritos.
- Nenhum PDF real ou dado identificável de paciente é incluído neste repositório.

## Compatibilidade

A primeira versão foi construída para:

- fichas **textuais/pesquisáveis** do HygiaWeb/UPA (`UPA_FAAPosAt` / ActiveReports);
- `https://regulacao.saobernardo.sp.gov.br/sisatih/a/solicitacao/nova`;
- `https://regulacao.saobernardo.sp.gov.br/sisatih/a/solicitacao/nova/dados-clinicos`.

PDFs digitalizados apenas como imagem não são suportados nesta versão, pois exigiriam OCR. Alterações futuras no HTML do SisATIH podem exigir atualização de seletores.

## Instalação manual

1. Baixe/clone este repositório.
2. Abra `chrome://extensions` no Chrome ou `edge://extensions` no Edge.
3. Ative **Modo do desenvolvedor**.
4. Escolha **Carregar sem compactação** / **Load unpacked**.
5. Selecione a pasta `EXTENSAO/SISATIH_PDF`.
6. Abra a tela **Nova solicitação** do SisATIH.

## Uso

1. Na caixa flutuante **SisATIH • PDF**, selecione a ficha PDF do paciente.
2. Confira o nome/unidade mostrados no painel.
3. Clique em **Preencher esta página**.
4. Revise os campos, complete manualmente o que não estiver documentado no PDF e salve somente depois da conferência.
5. Ao entrar em **Dados clínicos**, use novamente **Preencher esta página**; não é necessário selecionar o PDF outra vez durante a mesma sessão.
6. Ao terminar ou trocar de paciente, clique em **Limpar**.

## Mapeamentos implementados

### Nova solicitação

| Origem no PDF | SisATIH |
|---|---|
| Unidade prestadora | Unidade solicitante |
| CRM / profissional | CRM e nome do médico solicitante |
| Classificação de risco marcada | Classificação de gravidade |
| Nome, CNS, CPF, RG | Identificação do paciente |
| Nome da mãe / sexo / nascimento | Dados demográficos |
| Telefone | DDD + telefone principal |
| Endereço / bairro / município / UF | Endereço do paciente |

### Dados clínicos

| Origem no PDF | SisATIH |
|---|---|
| História da doença atual / queixa | História clínica |
| Exame físico | Exame físico |
| Oxigenoterapia/ventilação explicitamente descrita | Tipo e descrição da ventilação |
| Glasgow explicitamente informado | Glasgow |
| Data/hora do atendimento | Data/hora de internação na etapa regulatória |
| Estado geral descrito | Estado geral |
| PA / FC / FR / temperatura / SpO2 quando presentes | Sinais vitais correspondentes |
| Resultados laboratoriais numéricos quando presentes | Campos laboratoriais correspondentes |
| Medicações/condutas/orientações | Descrição das condutas |
| CID-10 da hipótese diagnóstica | CID principal/secundário/terciário |
| `CLINICA GERAL` | `CLÍNICA MÉDICA` |

### Classificação de risco → gravidade

O SisATIH usa uma escala diferente da classificação impressa na ficha. A extensão aplica o mapeamento administrativo abaixo e o operador deve revisá-lo:

| Ficha | SisATIH |
|---|---|
| Emergente / vermelho | GRAVÍSSIMO |
| Muito urgente / laranja | GRAVE |
| Urgente / amarelo | MODERADO |
| Pouco urgente, não urgente / verde ou azul | LEVE |

A prioridade é lida primeiro pela opção explicitamente marcada (`X`) na ficha; opções apenas impressas e não marcadas são ignoradas.

## Campos deliberadamente não inferidos

A ausência de informação no PDF **não significa “Não”**. Por isso, a extensão só marca estes campos quando houver informação explícita e deixa os demais para o operador:

- convênio;
- suspeita/confirmado COVID-19, SWAB e notificação;
- droga vasoativa;
- antibiótico;
- isolamento;
- sedação;
- internação prévia;
- peso e altura;
- laudo de raio-X (pedido de RX não é tratado como resultado);
- recurso solicitado;
- tipo de transporte.

## Estrutura

- `manifest.json` — Manifest V3 e escopo das páginas.
- `background.js` — armazenamento efêmero de sessão.
- `pdf-reader.js` — leitura local dos streams/texto do PDF.
- `hygia-utils.js` e `hygia-parser.js` — extração estruturada da ficha Hygia/UPA.
- `form-fill.js` — mapeamento dos dados para os campos do SisATIH.
- `content.js` — painel e preenchimento dos controles do SisATIH.
- `content.css` — estilos do painel e destaque de campos preenchidos.
- `tests/smoke.js` — teste de fumaça opcional contra um PDF local informado pelo desenvolvedor.

## Teste do parser

Sem colocar a ficha real no repositório:

```bash
node tests/smoke.js /caminho/para/ficha.pdf
```

O teste verifica apenas se a estrutura mínima foi extraída; não contém valores de pacientes.

## Observações técnicas

O PDF textual é interpretado diretamente pelo conteúdo de páginas (`Tj`/`TJ`, matrizes de texto e streams Flate) usando APIs nativas do navegador, inclusive `DecompressionStream`. Isso evita CDN, bibliotecas remotas e transmissão do documento. A implementação é propositalmente direcionada ao padrão de PDF usado pelas fichas Hygia/UPA.
