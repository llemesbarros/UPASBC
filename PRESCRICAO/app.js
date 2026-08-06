(() => {
  'use strict';

  const APP_VERSION = '1.0.0';
  const FILE_FORMAT = 'prescricao-medica-upa24';
  const FILE_EXTENSION = '.upa24';
  const FILE_MIME = 'application/json';

  const state = {
    currentFileHandle: null,
    currentFileName: '',
    dirty: false,
    busy: false,
    launchReceived: false,
    deferredInstallPrompt: null,
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const elements = {
    status: $('#document-status'),
    install: $('#install-button'),
    open: $('#open-button'),
    clear: $('#clear-button'),
    save: $('#save-button'),
    saveAs: $('#save-as-button'),
    print: $('#print-button'),
    fallbackInput: $('#file-input-fallback'),
  };

  function localDateISO(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function normalizeDate(value) {
    if (value === null || value === undefined) return '';
    const raw = String(value).trim();
    if (!raw) return '';

    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    const br = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (br) {
      return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return localDateISO(parsed);
    return '';
  }

  function calculateAge(birthDateValue) {
    const normalized = normalizeDate(birthDateValue);
    if (!normalized) return '';
    const [year, month, day] = normalized.split('-').map(Number);
    const today = new Date();
    let age = today.getFullYear() - year;
    const birthdayPending =
      today.getMonth() + 1 < month ||
      (today.getMonth() + 1 === month && today.getDate() < day);
    if (birthdayPending) age -= 1;
    return age >= 0 && age <= 130 ? String(age) : '';
  }

  function updateAge() {
    const birth = $('#nascimento')?.value || '';
    const age = calculateAge(birth);
    const ageElement = $('#idade');
    if (ageElement) ageElement.textContent = age ? `${age} ANOS` : '';
  }

  function getText(element) {
    if (!element) return '';
    return (element.innerText || element.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\r\n?/g, '\n')
      .trim();
  }

  function setText(element, value) {
    if (element) element.textContent = value === null || value === undefined ? '' : String(value);
  }

  function getInput(id) {
    return document.getElementById(id)?.value || '';
  }

  function setInput(id, value) {
    const element = document.getElementById(id);
    if (!element) return;
    element.value = value === null || value === undefined ? '' : String(value);
  }

  function setUnit(value) {
    const text = value === null || value === undefined ? '' : String(value).trim();
    if (!text) return;
    $$('.unidade').forEach((element) => setText(element, text));
  }

  function getUnit() {
    return getText($('.unidade'));
  }

  function rxRows() {
    return $$('tr[data-prescricao-numero]').sort(
      (a, b) => Number(a.dataset.prescricaoNumero) - Number(b.dataset.prescricaoNumero),
    );
  }

  function collectPrescriptionRows() {
    return rxRows().map((row) => ({
      numero: Number(row.dataset.prescricaoNumero),
      medicamento: getText(row.querySelector('.med')),
      dose: getText(row.querySelector('.dose')),
      via: getText(row.querySelector('.via')),
      frequencia: getText(row.querySelector('.freq')),
      horarios: [...row.querySelectorAll('.time')].map(getText),
    }));
  }

  function collectDocumentData() {
    updateAge();
    return {
      formato: FILE_FORMAT,
      versao: 1,
      aplicativo: {
        nome: 'Prescrição Médica',
        versao: APP_VERSION,
      },
      ultimaAlteracao: new Date().toISOString(),
      unidade: getUnit(),
      paciente: {
        nome: getInput('nome'),
        nascimento: getInput('nascimento'),
        idade: calculateAge(getInput('nascimento')) || null,
        telefones: getInput('telefones'),
        alergias: getInput('alergias'),
      },
      atendimento: {
        data: getInput('data'),
        diagnosticos: getInput('diagnosticos'),
        sala: getInput('sala'),
        leito: getInput('leito'),
      },
      prescricao: collectPrescriptionRows(),
      camposLaterais: {
        pagina1: {
          aprazamento: getText($('#aprazamento-p1')),
          exames: getText($('#exames-p1')),
        },
        pagina2: {
          aprazamento: getText($('#aprazamento-p2')),
          exames: getText($('#exames-p2')),
        },
      },
    };
  }

  function clearForm({ keepDate = true, keepUnit = true } = {}) {
    const date = keepDate ? getInput('data') || localDateISO() : '';
    const unit = keepUnit ? getUnit() : '';

    $$('[contenteditable="true"]').forEach((element) => setText(element, ''));
    $$('input:not(#file-input-fallback)').forEach((element) => {
      element.value = '';
    });

    if (keepDate) setInput('data', date);
    if (keepUnit && unit) setUnit(unit);
    updateAge();
  }

  function valueFrom(data, paths, fallback = '') {
    for (const path of paths) {
      const value = path.split('.').reduce((obj, key) => obj?.[key], data);
      if (value !== undefined && value !== null) return value;
    }
    return fallback;
  }

  function normalizePrescriptionArray(data) {
    const entries = Array.isArray(data?.prescricao)
      ? data.prescricao
      : Array.isArray(data?.prescricoes)
        ? data.prescricoes
        : [];

    return entries.map((entry, index) => ({
      numero: Number(entry?.numero ?? index + 1),
      medicamento: entry?.medicamento ?? entry?.nome ?? '',
      dose: entry?.dose ?? '',
      via: entry?.via ?? '',
      frequencia: entry?.frequencia ?? entry?.frequência ?? '',
      horarios: Array.isArray(entry?.horarios)
        ? entry.horarios
        : Array.isArray(entry?.horários)
          ? entry.horários
          : [],
    }));
  }

  function applyDocumentData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('O arquivo não contém um objeto JSON válido.');
    }

    clearForm({ keepDate: false, keepUnit: true });

    const unit = valueFrom(data, ['unidade', 'atendimento.unidade'], getUnit());
    if (unit) setUnit(unit);

    setInput('nome', valueFrom(data, ['paciente.nome', 'nome']));
    setInput(
      'nascimento',
      normalizeDate(valueFrom(data, ['paciente.nascimento', 'paciente.dataNascimento', 'nascimento'])),
    );
    setInput('telefones', valueFrom(data, ['paciente.telefones', 'paciente.telefone', 'telefones']));
    setInput('alergias', valueFrom(data, ['paciente.alergias', 'alergias']));

    const savedDate = normalizeDate(
      valueFrom(data, ['atendimento.data', 'atendimento.dataHora', 'data']),
    );
    setInput('data', savedDate || localDateISO());
    setInput(
      'diagnosticos',
      valueFrom(data, ['atendimento.diagnosticos', 'atendimento.diagnostico', 'diagnosticos']),
    );
    setInput('sala', valueFrom(data, ['atendimento.sala', 'sala']));
    setInput('leito', valueFrom(data, ['atendimento.leito', 'leito']));

    const byNumber = new Map(normalizePrescriptionArray(data).map((entry) => [entry.numero, entry]));
    for (const row of rxRows()) {
      const number = Number(row.dataset.prescricaoNumero);
      const entry = byNumber.get(number) || {};
      setText(row.querySelector('.med'), entry.medicamento || '');
      setText(row.querySelector('.dose'), entry.dose || '');
      setText(row.querySelector('.via'), entry.via || '');
      setText(row.querySelector('.freq'), entry.frequencia || '');
      [...row.querySelectorAll('.time')].forEach((cell, index) => {
        setText(cell, entry.horarios?.[index] || '');
      });
    }

    const side = data.camposLaterais || data.aprazamento || data.anotacoes || {};
    setText(
      $('#aprazamento-p1'),
      valueFrom(side, ['pagina1.aprazamento', 'pagina1.superior', 'pagina1'], ''),
    );
    setText(
      $('#exames-p1'),
      valueFrom(side, ['pagina1.exames', 'examesPagina1'], valueFrom(data, ['examesPagina1'], '')),
    );
    setText(
      $('#aprazamento-p2'),
      valueFrom(side, ['pagina2.aprazamento', 'pagina2.superior', 'pagina2'], ''),
    );
    setText(
      $('#exames-p2'),
      valueFrom(side, ['pagina2.exames', 'examesPagina2'], valueFrom(data, ['examesPagina2'], '')),
    );

    updateAge();
  }

  function filePickerTypes() {
    return [
      {
        description: 'Prescrição Médica UPA',
        accept: {
          [FILE_MIME]: [FILE_EXTENSION],
        },
      },
    ];
  }

  function safeFileNamePart(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  }

  function suggestedFileName() {
    const patient = safeFileNamePart(getInput('nome')) || 'paciente';
    const date = getInput('data') || localDateISO();
    return `prescricao-${patient}-${date}${FILE_EXTENSION}`;
  }

  function setBusy(busy) {
    state.busy = busy;
    [elements.open, elements.clear, elements.save, elements.saveAs].forEach((button) => {
      if (button) button.disabled = busy;
    });
  }

  function updateStatus(message) {
    if (!elements.status) return;
    const base = message || state.currentFileName || 'Novo documento';
    elements.status.textContent = state.dirty ? `${base} — alterações não salvas` : base;
    elements.status.classList.toggle('unsaved', state.dirty);
    document.title = state.currentFileName
      ? `Prescrição Médica — ${state.currentFileName}${state.dirty ? ' *' : ''}`
      : `Prescrição Médica${state.dirty ? ' *' : ''}`;
  }

  function markDirty() {
    if (state.busy) return;
    state.dirty = true;
    updateStatus();
  }

  function markSaved(fileName, message = '') {
    state.dirty = false;
    if (fileName) state.currentFileName = fileName;
    updateStatus(message || state.currentFileName || 'Documento salvo');
  }

  async function ensureWritePermission(handle) {
    if (!handle) return false;
    const options = { mode: 'readwrite' };

    if (typeof handle.queryPermission === 'function') {
      const current = await handle.queryPermission(options);
      if (current === 'granted') return true;
    }

    if (typeof handle.requestPermission === 'function') {
      return (await handle.requestPermission(options)) === 'granted';
    }

    return true;
  }

  async function writeToHandle(handle) {
    if (!(await ensureWritePermission(handle))) {
      throw new Error('A permissão para gravar o arquivo não foi concedida.');
    }

    const data = collectDocumentData();
    const json = JSON.stringify(data, null, 2) + '\n';
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
    return data;
  }

  async function saveCurrentFile() {
    if (state.busy) return;
    if (!state.currentFileHandle) {
      await saveFileAs();
      return;
    }

    setBusy(true);
    try {
      await writeToHandle(state.currentFileHandle);
      markSaved(state.currentFileHandle.name, `Salvo: ${state.currentFileHandle.name}`);
    } catch (error) {
      console.error(error);
      alert(`Não foi possível salvar o arquivo.\n\n${error.message || error}`);
    } finally {
      setBusy(false);
    }
  }

  function downloadFallback() {
    const data = collectDocumentData();
    const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: FILE_MIME });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = suggestedFileName();
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    state.currentFileHandle = null;
    markSaved(anchor.download, `Cópia baixada: ${anchor.download}`);
  }

  async function saveFileAs() {
    if (state.busy) return;

    if (typeof window.showSaveFilePicker !== 'function') {
      downloadFallback();
      return;
    }

    try {
      // The picker is called before any awaited work to preserve user activation.
      const handle = await window.showSaveFilePicker({
        suggestedName: suggestedFileName(),
        types: filePickerTypes(),
        excludeAcceptAllOption: false,
      });
      setBusy(true);
      await writeToHandle(handle);
      state.currentFileHandle = handle;
      markSaved(handle.name, `Salvo: ${handle.name}`);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error(error);
        alert(`Não foi possível salvar o arquivo.\n\n${error.message || error}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function loadFileHandle(handle, { launchedBySystem = false } = {}) {
    if (!handle) return;
    if (state.dirty && !confirm('Há alterações não salvas. Deseja descartá-las e abrir outro arquivo?')) {
      return;
    }

    setBusy(true);
    try {
      const file = await handle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      applyDocumentData(data);
      state.currentFileHandle = handle;
      state.currentFileName = file.name || handle.name || '';
      state.dirty = false;
      updateStatus(`${launchedBySystem ? 'Aberto pelo Windows' : 'Arquivo aberto'}: ${state.currentFileName}`);
    } catch (error) {
      console.error(error);
      alert(`Não foi possível abrir o arquivo .upa24.\n\n${error.message || error}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadFallbackFile(file) {
    if (!file) return;
    if (state.dirty && !confirm('Há alterações não salvas. Deseja descartá-las e abrir outro arquivo?')) {
      return;
    }

    setBusy(true);
    try {
      const data = JSON.parse(await file.text());
      applyDocumentData(data);
      state.currentFileHandle = null;
      state.currentFileName = file.name;
      state.dirty = false;
      updateStatus(`Arquivo aberto: ${file.name}. Use “Salvar como...” para gravar.`);
    } catch (error) {
      console.error(error);
      alert(`Não foi possível abrir o arquivo .upa24.\n\n${error.message || error}`);
    } finally {
      setBusy(false);
      if (elements.fallbackInput) elements.fallbackInput.value = '';
    }
  }

  async function openFilePicker() {
    if (state.busy) return;

    if (typeof window.showOpenFilePicker !== 'function') {
      elements.fallbackInput?.click();
      return;
    }

    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: filePickerTypes(),
        excludeAcceptAllOption: false,
      });
      await loadFileHandle(handle);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error(error);
        alert(`Não foi possível abrir o arquivo.\n\n${error.message || error}`);
      }
    }
  }

  function getSearchParameterCaseInsensitive(name) {
    const target = name.toLowerCase();
    for (const [key, value] of new URLSearchParams(window.location.search)) {
      if (key.toLowerCase() === target) return value;
    }
    return '';
  }

  function applyGetParameters() {
    if (state.launchReceived || state.currentFileHandle) return;

    const unit = getSearchParameterCaseInsensitive('UNIDADE');
    const name = getSearchParameterCaseInsensitive('NOME');
    const birth = getSearchParameterCaseInsensitive('NASCIMENTO');

    if (unit) setUnit(unit);
    if (name) setInput('nome', name);
    if (birth) setInput('nascimento', normalizeDate(birth));
    setInput('data', localDateISO());
    updateAge();
    state.dirty = false;

    if (unit || name || birth) {
      updateStatus('Dados recebidos por GET — ainda não salvos em arquivo');
    } else {
      updateStatus('Novo documento');
    }
  }

  function handleClear() {
    if (!confirm('Limpar todos os campos que podem ser editados?')) return;
    clearForm({ keepDate: true, keepUnit: true });
    markDirty();
  }

  function bindEvents() {
    elements.open?.addEventListener('click', openFilePicker);
    elements.clear?.addEventListener('click', handleClear);
    elements.save?.addEventListener('click', saveCurrentFile);
    elements.saveAs?.addEventListener('click', saveFileAs);
    elements.print?.addEventListener('click', () => window.print());
    elements.fallbackInput?.addEventListener('change', (event) => {
      loadFallbackFile(event.target.files?.[0]);
    });

    $('#nascimento')?.addEventListener('input', updateAge);

    document.addEventListener('input', (event) => {
      if (event.target.matches('input:not(#file-input-fallback), [contenteditable="true"]')) {
        markDirty();
      }
    });

    document.addEventListener('keydown', (event) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      const key = event.key.toLowerCase();

      if (key === 's') {
        event.preventDefault();
        if (event.shiftKey) saveFileAs();
        else saveCurrentFile();
      } else if (key === 'o') {
        event.preventDefault();
        openFilePicker();
      } else if (key === 'p') {
        event.preventDefault();
        window.print();
      }
    });

    window.addEventListener('beforeunload', (event) => {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = '';
    });

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      state.deferredInstallPrompt = event;
      if (elements.install) elements.install.hidden = false;
    });

    elements.install?.addEventListener('click', async () => {
      if (!state.deferredInstallPrompt) return;
      state.deferredInstallPrompt.prompt();
      await state.deferredInstallPrompt.userChoice;
      state.deferredInstallPrompt = null;
      elements.install.hidden = true;
    });

    window.addEventListener('appinstalled', () => {
      state.deferredInstallPrompt = null;
      if (elements.install) elements.install.hidden = true;
      updateStatus('Aplicativo instalado');
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch((error) => {
          console.error('Falha ao registrar o service worker:', error);
        });
      });
    }
  }

  function registerFileLaunchHandler() {
    if ('launchQueue' in window && 'LaunchParams' in window && 'files' in LaunchParams.prototype) {
      window.launchQueue.setConsumer(async (launchParams) => {
        const handle = launchParams.files?.[0];
        if (!handle) return;
        state.launchReceived = true;
        await loadFileHandle(handle, { launchedBySystem: true });
      });
    }
  }

  function initialize() {
    bindEvents();
    registerServiceWorker();
    registerFileLaunchHandler();

    // Defaults are applied first. A file launched by the operating system, if present,
    // is loaded afterward and takes precedence over URL parameters.
    setInput('data', localDateISO());
    updateAge();
    applyGetParameters();
  }

  initialize();
})();
