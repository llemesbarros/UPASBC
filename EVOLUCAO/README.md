# Evolução Multidisciplinar

Aplicativo web/PWA para abrir os mesmos arquivos `.upa24` da pasta `PRESCRICAO`, preencher a evolução clínica e salvar os novos campos sem remover os dados anteriores do prontuário.

## Compatibilidade

- Lê cabeçalho de paciente, atendimento e unidade dos arquivos de prescrição.
- Preserva propriedades desconhecidas e a prescrição original ao salvar.
- Acrescenta `formatoOriginal`, `versaoEvolucao`, `aplicativoEvolucao` e o array `evolucao` com 42 linhas.
- Cada linha contém `input[type="date"]`, `input[type="time"]` e campo de evolução.
- Usa File System Access API quando disponível e download como alternativa.

Abra `EVOLUCAO/index.html` por servidor HTTP ou pela URL do GitHub Pages.
