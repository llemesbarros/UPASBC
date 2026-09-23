'use strict';

(() => {
  const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
  const PATH_NOVA = '/sisatih/a/solicitacao/nova';
  const PATH_CLINICOS = '/sisatih/a/solicitacao/nova/dados-clinicos';

  if (![PATH_NOVA, PATH_CLINICOS].includes(location.pathname)) return;
  if (!globalThis.SisatihPdfParser || !globalThis.SisatihFormFiller) return;

  let current = null;
  let busy = false;

  function send(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        if (!response || response.ok !== true) return reject(new Error(response && response.error || 'Falha de comunicação com a extensão.'));
        resolve(response.value);
      });
    });
  }

  const sessionGet = () => send({ type: 'SISATIH_SESSION_GET' });
  const sessionSet = (value) => send({ type: 'SISATIH_SESSION_SET', value });
  const sessionClear = () => send({ type: 'SISATIH_SESSION_CLEAR' });
  const pageLabel = () => location.pathname === PATH_CLINICOS ? 'Dados clínicos' : 'Nova solicitação';

  function summaryOf(data) {
    const p = data && data.patient || {};
    const c = data && data.clinician || {};
    return [p.name, c.unit].filter(Boolean).join(' • ') || 'PDF carregado';
  }

  function setStatus(message, kind = '') {
    const status = document.getElementById('sisatih-pdf-status');
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function syncButtons() {
    const fill = document.getElementById('sisatih-pdf-fill');
    const clear = document.getElementById('sisatih-pdf-clear');
    if (fill) fill.disabled = busy || !current;
    if (clear) clear.disabled = busy || !current;
  }

  async function loadStored() {
    try {
      const stored = await sessionGet();
      if (!stored) return;
      if (!stored.expiresAt || stored.expiresAt < Date.now()) {
        await sessionClear();
        return;
      }
      current = stored;
      setStatus(`PDF da sessão: ${summaryOf(stored.data)}\nArquivo: ${stored.fileName || 'não informado'}`, 'ok');
      syncButtons();
    } catch (error) {
      setStatus(`Não foi possível recuperar a sessão: ${error.message}`, 'warn');
    }
  }

  async function onFile(file) {
    if (!file) return;
    if (file.type && file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      setStatus('Selecione um arquivo PDF.', 'error');
      return;
    }
    busy = true;
    syncButtons();
    setStatus('Lendo o PDF localmente…');
    try {
      const data = await SisatihPdfParser.parsePdf(await file.arrayBuffer());
      const enough = Boolean(data && data.patient && data.patient.name && data.clinician && data.clinician.unit);
      if (!enough) throw new Error('O arquivo não parece corresponder ao modelo textual do Hygia/UPA. PDFs digitalizados como imagem exigem OCR.');
      current = { fileName: file.name, parsedAt: Date.now(), expiresAt: Date.now() + SESSION_TTL_MS, data };
      await sessionSet(current);
      setStatus(`Extração concluída: ${summaryOf(data)}\nRevise os dados antes de salvar no SisATIH.`, 'ok');
    } catch (error) {
      current = null;
      setStatus(`Falha ao extrair o PDF: ${error.message}`, 'error');
    } finally {
      busy = false;
      syncButtons();
    }
  }

  function onFill() {
    if (!current || busy) return;
    const filler = globalThis.SisatihFormFiller;
    const count = location.pathname === PATH_CLINICOS ? filler.fillClinicos(current.data) : filler.fillNova(current.data);
    const missing = filler.requiredMissing();
    const list = missing.slice(0, 8).join(', ');
    const suffix = missing.length
      ? `\nAinda exigem revisão/preenchimento manual (${missing.length}): ${list}${missing.length > 8 ? '…' : ''}`
      : '\nNenhum campo obrigatório vazio foi detectado nesta tela.';
    setStatus(`${count} campo(s) preenchido(s) sem sobrescrever valores existentes.${suffix}\nO formulário NÃO foi enviado automaticamente.`, missing.length ? 'warn' : 'ok');
  }

  async function onClear() {
    try { await sessionClear(); } catch (_) {}
    current = null;
    const input = document.getElementById('sisatih-pdf-file');
    if (input) input.value = '';
    setStatus('Sessão limpa. Selecione outro PDF.');
    syncButtons();
  }

  function mount() {
    if (document.getElementById('sisatih-pdf-helper')) return;
    const panel = document.createElement('section');
    panel.id = 'sisatih-pdf-helper';
    panel.innerHTML = `
      <div class="sisatih-pdf-header">
        <span>SisATIH • PDF</span>
        <button class="sisatih-pdf-toggle" type="button" title="Recolher/expandir" aria-label="Recolher ou expandir">−</button>
      </div>
      <div class="sisatih-pdf-body">
        <div class="sisatih-pdf-page">Tela ativa: ${pageLabel()}</div>
        <label for="sisatih-pdf-file"><strong>Ficha PDF do Hygia</strong></label>
        <input id="sisatih-pdf-file" class="sisatih-pdf-file" type="file" accept="application/pdf,.pdf">
        <div id="sisatih-pdf-status" class="sisatih-pdf-status">Selecione o PDF. A leitura é feita no navegador e o arquivo não é enviado para servidor externo.</div>
        <div class="sisatih-pdf-actions">
          <button id="sisatih-pdf-fill" class="sisatih-pdf-button sisatih-pdf-button-primary" type="button" disabled>Preencher esta página</button>
          <button id="sisatih-pdf-clear" class="sisatih-pdf-button" type="button" disabled>Limpar</button>
        </div>
        <div class="sisatih-pdf-note">A extensão não envia o formulário e não inventa campos ausentes no PDF. Confira tudo antes de clicar em Salvar.</div>
      </div>`;
    document.body.appendChild(panel);

    panel.querySelector('.sisatih-pdf-toggle').addEventListener('click', (event) => {
      panel.classList.toggle('sisatih-pdf-collapsed');
      event.currentTarget.textContent = panel.classList.contains('sisatih-pdf-collapsed') ? '+' : '−';
    });
    document.getElementById('sisatih-pdf-file').addEventListener('change', (event) => onFile(event.target.files && event.target.files[0]));
    document.getElementById('sisatih-pdf-fill').addEventListener('click', onFill);
    document.getElementById('sisatih-pdf-clear').addEventListener('click', onClear);
    loadStored();
  }

  mount();
})();
