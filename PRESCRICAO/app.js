(() => {
  'use strict';

  const APP_VERSION = '1.1.1';
  const FILE_FORMAT = 'prescricao-medica-upa24';
  const FILE_EXTENSION = '.upa24';
  const FILE_MIME = 'application/json';
  const MUNICIPAL_CNPJ = '46.523.239/0001-47';
  const HANDOFF_SESSION_KEY = 'upa24-handoff-prescricao-evolucao';
  const HANDLE_DB_NAME = 'upa24-shared-file-handles';
  const HANDLE_DB_VERSION = 1;
  const HANDLE_STORE_NAME = 'handles';
  const HANDLE_KEY = 'prescricao-evolucao-current';

  const UNIDADES = [
    { aliases: ['UPA RIACHO GRANDE', 'RIACHO GRANDE'], nome: 'UPA RIACHO GRANDE', endereco: 'Rua Marcílio Conrado, nº 333 - Bairro Riacho Grande', cidade: 'São Bernardo do Campo/SP', telefone: '(11) 4357-2356', cnes: '6650864' },
    { aliases: ['UPA RUDGE RAMOS', 'RUDGE RAMOS'], nome: 'UPA RUDGE RAMOS', endereco: 'Rua Angela Tomé, nº 256 - Bairro Rudge Ramos', cidade: 'São Bernardo do Campo/SP', telefone: '(11) 4368-1222', cnes: '7030878' },
    { aliases: ['UPA BAETA NEVES', 'BAETA NEVES'], nome: 'UPA BAETA NEVES', endereco: 'Rua dos Vianas, nº 933 - Baeta Neves', cidade: 'São Bernardo do Campo/SP', telefone: '(11) 4125-9139', cnes: '6844596' },
    { aliases: ['UPA ALVES DIAS/ASSUNÇÃO', 'UPA ALVES DIAS/ASSUNCAO', 'ALVES DIAS/ASSUNÇÃO', 'ALVES DIAS/ASSUNCAO'], nome: 'UPA ALVES DIAS/ASSUNÇÃO', endereco: 'Av. Humberto de Alencar Castelo Branco, nº 4220 - Alves Dias', cidade: 'São Bernardo do Campo/SP', telefone: '(11) 4104-4018', cnes: '7053835' },
    { aliases: ['UPA DEMARCHI/BATISTINI', 'UPA UPA DEMARCHI/BATISTINI', 'DEMARCHI/BATISTINI'], nome: 'UPA DEMARCHI/BATISTINI', endereco: 'Rua Valdomiro Luís, nº 303 - Demarchi', cidade: 'São Bernardo do Campo/SP', telefone: '(11) 4368-4333', cnes: '6535798' },
    { aliases: ['UPA PAULICEIA/TABOAO', 'UPA PAULICÉIA/TABOÃO', 'PAULICEIA/TABOAO', 'PAULICÉIA/TABOÃO'], nome: 'UPA PAULICEIA/TABOAO', endereco: 'Rua Pedro de Tolêdo, nº 326 - Paulicéia', cidade: 'São Bernardo do Campo/SP', telefone: '', cnes: '' },
    { aliases: ['UPA SAO PEDRO', 'UPA SÃO PEDRO', 'SAO PEDRO', 'SÃO PEDRO'], nome: 'UPA SAO PEDRO', endereco: 'Av. Dom Pedro de Alcântara, nº 273 - Montanhão', cidade: 'São Bernardo do Campo/SP', telefone: '', cnes: '' },
    { aliases: ['UPA SILVINA', 'SILVINA'], nome: 'UPA SILVINA', endereco: 'Av. Dr. José Fornari, nº 509 - Ferrazópolis', cidade: 'São Bernardo do Campo/SP', telefone: '', cnes: '' },
    { aliases: ['UPA UNIÃO/ALVARENGA', 'UPA UNIAO/ALVARENGA', 'UNIÃO/ALVARENGA', 'UNIAO/ALVARENGA'], nome: 'UPA UNIÃO/ALVARENGA', endereco: 'Estrada dos Alvarengas, nº 5779 - Alvarenga', cidade: 'São Bernardo do Campo/SP', telefone: '', cnes: '' },
  ];

  const state = {
    currentFileHandle: null,
    currentFileName: '',
    sourceData: {},
    dirty: false,
    busy: false,
    launchReceived: false,
    deferredInstallPrompt: null,
    currentUnitValue: '',
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const cloneJson = (value) => JSON.parse(JSON.stringify(value ?? {}));

  const elements = {
    status: $('#document-status'),
    install: $('#install-button'),
    open: $('#open-button'),
    importModel: $('#import-model-button'),
    clear: $('#clear-button'),
    save: $('#save-button'),
    saveAs: $('#save-as-button'),
    print: $('#print-button'),
    evolution: null,
    fallbackInput: $('#file-input-fallback'),
    modelFallbackInput: $('#model-input-fallback'),
  };

  function localDateISO(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function normalizeDate(value) {
    if (value === null || value === undefined) return '';
    const raw = String(value).trim();
    if (!raw) return '';
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const br = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '' : localDateISO(parsed);
  }

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function addYearsClamped(date, years) {
    const year = date.getFullYear() + years;
    const month = date.getMonth();
    return new Date(year, month, Math.min(date.getDate(), daysInMonth(year, month)));
  }

  function addMonthsClamped(date, months) {
    const total = date.getMonth() + months;
    const year = date.getFullYear() + Math.floor(total / 12);
    const month = ((total % 12) + 12) % 12;
    return new Date(year, month, Math.min(date.getDate(), daysInMonth(year, month)));
  }

  function calendarDayDifference(later, earlier) {
    return Math.floor((Date.UTC(later.getFullYear(), later.getMonth(), later.getDate()) - Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate())) / 86400000);
  }

  function calculateAgeParts(value) {
    const normalized = normalizeDate(value);
    if (!normalized) return null;
    const [year, month, day] = normalized.split('-').map(Number);
    const birth = new Date(year, month - 1, day);
    if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    birth.setHours(0, 0, 0, 0);
    if (birth > today) return null;
    let years = today.getFullYear() - birth.getFullYear();
    let yearAnchor = addYearsClamped(birth, years);
    if (yearAnchor > today) {
      years -= 1;
      yearAnchor = addYearsClamped(birth, years);
    }
    if (years < 0 || years > 130) return null;
    let months = 0;
    while (months < 11 && addMonthsClamped(yearAnchor, months + 1) <= today) months += 1;
    const monthAnchor = addMonthsClamped(yearAnchor, months);
    return { years, months, days: calendarDayDifference(today, monthAnchor) };
  }

  function calculateAge(value) {
    const age = calculateAgeParts(value);
    return age ? `${age.years} anos, ${age.months} meses e ${age.days} dias` : '';
  }

  function updateAge() {
    const age = $('#idade');
    if (age) age.textContent = calculateAge($('#nascimento')?.value || '');
  }

  function getText(element) {
    if (!element) return '';
    return (element.innerText || element.textContent || '').replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n').trim();
  }

  function setText(element, value) {
    if (element) element.textContent = value === null || value === undefined ? '' : String(value);
  }

  function getInput(id) {
    return document.getElementById(id)?.value || '';
  }

  function setInput(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value === null || value === undefined ? '' : String(value);
  }

  function normalizeText(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  }

  function findUnit(value) {
    const key = normalizeText(value);
    if (!key) return null;
    return UNIDADES.find((unit) => [unit.nome, ...unit.aliases].some((alias) => normalizeText(alias) === key)) || null;
  }

  function shortUnitName(value) {
    return String(value || '').replace(/^UPA\s+/i, '').trim();
  }

  function unitFooterText(unit, fallback = '') {
    if (!unit) return String(fallback || '').trim();
    return [unit.nome, unit.endereco, unit.cidade, `CNPJ: ${MUNICIPAL_CNPJ}`].filter(Boolean).join(' - ');
  }

  function updateUnitData(value) {
    const unit = findUnit(value);
    const footer = unitFooterText(unit, value);
    $$('.dados-unidade').forEach((element) => setText(element, footer));
  }

  function setUnit(value) {
    const text = value === null || value === undefined ? '' : String(value).trim();
    if (!text) return;
    const unit = findUnit(text);
    state.currentUnitValue = unit?.nome || text;
    $$('.unidade').forEach((element) => setText(element, shortUnitName(unit?.nome || text)));
    updateUnitData(state.currentUnitValue);
  }

  function getUnit() {
    return state.currentUnitValue || getText($('.unidade'));
  }

  function rxRows() {
    return $$('tr[data-prescricao-numero]').sort((a, b) => Number(a.dataset.prescricaoNumero) - Number(b.dataset.prescricaoNumero));
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
    const base = cloneJson(state.sourceData);
    if (base.formato && base.formato !== FILE_FORMAT && !base.formatoOriginal) base.formatoOriginal = base.formato;
    base.formato = FILE_FORMAT;
    base.versao = 1;
    base.aplicativo = { nome: 'Prescrição Médica', versao: APP_VERSION };
    base.ultimaAlteracao = new Date().toISOString();
    base.unidade = getUnit();
    base.paciente = {
      ...(base.paciente || {}),
      id: getInput('id_paciente'),
      nome: getInput('nome'),
      nascimento: getInput('nascimento'),
      idade: calculateAge(getInput('nascimento')) || null,
      telefones: getInput('telefones'),
      alergias: getInput('alergias'),
    };
    base.atendimento = {
      ...(base.atendimento || {}),
      data: getInput('data'),
      diagnosticos: getInput('diagnosticos'),
      sala: getInput('sala'),
      leito: getInput('leito'),
    };
    base.prescricao = collectPrescriptionRows();
    base.camposLaterais = {
      pagina1: { aprazamento: getText($('#aprazamento-p1')), exames: getText($('#exames-p1')) },
      pagina2: { aprazamento: getText($('#aprazamento-p2')), exames: getText($('#exames-p2')) },
    };
    return base;
  }

  function clearForm({ keepDate = true, keepUnit = true } = {}) {
    const date = keepDate ? getInput('data') || localDateISO() : '';
    const unit = keepUnit ? getUnit() : '';
    $$('[contenteditable="true"]').forEach((element) => setText(element, ''));
    $$('input:not([type="file"])').forEach((element) => { element.value = ''; });
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
    const entries = Array.isArray(data?.prescricao) ? data.prescricao : Array.isArray(data?.prescricoes) ? data.prescricoes : [];
    return entries.map((entry, index) => ({
      numero: Number(entry?.numero ?? index + 1),
      medicamento: entry?.medicamento ?? entry?.nome ?? '',
      dose: entry?.dose ?? '',
      via: entry?.via ?? '',
      frequencia: entry?.frequencia ?? entry?.frequência ?? '',
      horarios: Array.isArray(entry?.horarios) ? entry.horarios : Array.isArray(entry?.horários) ? entry.horários : [],
    }));
  }

  function applyPrescriptionOnly(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('O arquivo não contém um objeto JSON válido.');
    const byNumber = new Map(normalizePrescriptionArray(data).map((entry) => [entry.numero, entry]));
    for (const row of rxRows()) {
      const entry = byNumber.get(Number(row.dataset.prescricaoNumero)) || {};
      setText(row.querySelector('.med'), entry.medicamento || '');
      setText(row.querySelector('.dose'), entry.dose || '');
      setText(row.querySelector('.via'), entry.via || '');
      setText(row.querySelector('.freq'), entry.frequencia || '');
      [...row.querySelectorAll('.time')].forEach((cell, index) => setText(cell, entry.horarios?.[index] || ''));
    }
  }

  function applyDocumentData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('O arquivo não contém um objeto JSON válido.');
    state.sourceData = cloneJson(data);
    clearForm({ keepDate: false, keepUnit: true });
    const unit = valueFrom(data, ['unidade.nome', 'unidade', 'atendimento.unidade'], getUnit());
    if (unit) setUnit(unit);
    setInput('id_paciente', valueFrom(data, ['paciente.id', 'paciente.id_paciente', 'paciente.hygia', 'id', 'id_paciente', 'hygia']));
    setInput('nome', valueFrom(data, ['paciente.nome', 'nome']));
    setInput('nascimento', normalizeDate(valueFrom(data, ['paciente.nascimento', 'paciente.dataNascimento', 'nascimento'])));
    setInput('telefones', valueFrom(data, ['paciente.telefones', 'paciente.telefone', 'telefones']));
    setInput('alergias', valueFrom(data, ['paciente.alergias', 'alergias']));
    const savedDate = normalizeDate(valueFrom(data, ['atendimento.data', 'atendimento.dataHora', 'data']));
    setInput('data', savedDate || localDateISO());
    setInput('diagnosticos', valueFrom(data, ['atendimento.diagnosticos', 'atendimento.diagnostico', 'diagnosticos']));
    setInput('sala', valueFrom(data, ['atendimento.sala', 'sala']));
    setInput('leito', valueFrom(data, ['atendimento.leito', 'leito']));

    const byNumber = new Map(normalizePrescriptionArray(data).map((entry) => [entry.numero, entry]));
    for (const row of rxRows()) {
      const entry = byNumber.get(Number(row.dataset.prescricaoNumero)) || {};
      setText(row.querySelector('.med'), entry.medicamento || '');
      setText(row.querySelector('.dose'), entry.dose || '');
      setText(row.querySelector('.via'), entry.via || '');
      setText(row.querySelector('.freq'), entry.frequencia || '');
      [...row.querySelectorAll('.time')].forEach((cell, index) => setText(cell, entry.horarios?.[index] || ''));
    }

    const side = data.camposLaterais || data.aprazamento || data.anotacoes || {};
    setText($('#aprazamento-p1'), valueFrom(side, ['pagina1.aprazamento', 'pagina1.superior', 'pagina1'], ''));
    setText($('#exames-p1'), valueFrom(side, ['pagina1.exames', 'examesPagina1'], valueFrom(data, ['examesPagina1'], '')));
    setText($('#aprazamento-p2'), valueFrom(side, ['pagina2.aprazamento', 'pagina2.superior', 'pagina2'], ''));
    setText($('#exames-p2'), valueFrom(side, ['pagina2.exames', 'examesPagina2'], valueFrom(data, ['examesPagina2'], '')));
    updateAge();
  }

  function filePickerTypes() {
    return [{ description: 'Prescrição Médica UPA', accept: { [FILE_MIME]: [FILE_EXTENSION] } }];
  }

  function safeFileNamePart(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  }

  function suggestedFileName() {
    return `prescricao-${safeFileNamePart(getInput('nome')) || 'paciente'}-${getInput('data') || localDateISO()}${FILE_EXTENSION}`;
  }

  function setBusy(busy) {
    state.busy = busy;
    [elements.open, elements.importModel, elements.clear, elements.save, elements.saveAs, elements.evolution].forEach((button) => {
      if (button) button.disabled = busy;
    });
  }

  function updateStatus(message) {
    if (!elements.status) return;
    const base = message || state.currentFileName || 'Novo documento';
    elements.status.textContent = state.dirty ? `${base} — alterações não salvas` : base;
    elements.status.classList.toggle('unsaved', state.dirty);
    document.title = state.currentFileName ? `Prescrição Médica — ${state.currentFileName}${state.dirty ? ' *' : ''}` : `Prescrição Médica${state.dirty ? ' *' : ''}`;
  }

  function markDirty() {
    if (!state.busy) {
      state.dirty = true;
      updateStatus();
    }
  }

  function markSaved(fileName, message = '') {
    state.dirty = false;
    if (fileName) state.currentFileName = fileName;
    updateStatus(message || state.currentFileName || 'Documento salvo');
  }

  async function ensureWritePermission(handle) {
    if (!handle) return false;
    const options = { mode: 'readwrite' };
    if (typeof handle.queryPermission === 'function' && await handle.queryPermission(options) === 'granted') return true;
    if (typeof handle.requestPermission === 'function') return await handle.requestPermission(options) === 'granted';
    return true;
  }

  async function writeToHandle(handle) {
    if (!(await ensureWritePermission(handle))) throw new Error('A permissão para gravar o arquivo não foi concedida.');
    const data = collectDocumentData();
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data, null, 2) + '\n');
    await writable.close();
    return data;
  }

  function openHandleDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponível.'));
      const request = indexedDB.open(HANDLE_DB_NAME, HANDLE_DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(HANDLE_STORE_NAME)) request.result.createObjectStore(HANDLE_STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function storeSharedHandle(handle) {
    try {
      const db = await openHandleDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(HANDLE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(HANDLE_STORE_NAME);
        if (handle) store.put(handle, HANDLE_KEY);
        else store.delete(HANDLE_KEY);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      db.close();
    } catch (error) {
      console.warn('Não foi possível compartilhar o FileSystemFileHandle.', error);
    }
  }

  async function saveCurrentFile() {
    if (state.busy) return;
    if (!state.currentFileHandle) {
      await saveFileAs();
      return;
    }
    setBusy(true);
    try {
      const data = await writeToHandle(state.currentFileHandle);
      state.sourceData = cloneJson(data);
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
    const name = anchor.download;
    anchor.remove();
    URL.revokeObjectURL(url);
    state.currentFileHandle = null;
    state.sourceData = cloneJson(data);
    markSaved(name, `Cópia baixada: ${name}`);
  }

  async function saveFileAs() {
    if (state.busy) return;
    if (typeof window.showSaveFilePicker !== 'function') {
      downloadFallback();
      return;
    }
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: suggestedFileName(), types: filePickerTypes(), excludeAcceptAllOption: false });
      setBusy(true);
      const data = await writeToHandle(handle);
      state.currentFileHandle = handle;
      state.sourceData = cloneJson(data);
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
    if (state.dirty && !confirm('Há alterações não salvas. Deseja descartá-las e abrir outro arquivo?')) return;
    setBusy(true);
    try {
      const file = await handle.getFile();
      const data = JSON.parse(await file.text());
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
    if (state.dirty && !confirm('Há alterações não salvas. Deseja descartá-las e abrir outro arquivo?')) return;
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

  async function loadModelHandle(handle) {
    if (!handle) return;
    setBusy(true);
    try {
      const file = await handle.getFile();
      applyPrescriptionOnly(JSON.parse(await file.text()));
      state.dirty = true;
      updateStatus(`Modelo importado: ${file.name || handle.name || 'arquivo .upa24'}`);
    } catch (error) {
      console.error(error);
      alert(`Não foi possível importar o modelo .upa24.\n\n${error.message || error}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadFallbackModel(file) {
    if (!file) return;
    setBusy(true);
    try {
      applyPrescriptionOnly(JSON.parse(await file.text()));
      state.dirty = true;
      updateStatus(`Modelo importado: ${file.name}`);
    } catch (error) {
      console.error(error);
      alert(`Não foi possível importar o modelo .upa24.\n\n${error.message || error}`);
    } finally {
      setBusy(false);
      if (elements.modelFallbackInput) elements.modelFallbackInput.value = '';
    }
  }

  async function importModelPicker() {
    if (state.busy) return;
    if (typeof window.showOpenFilePicker !== 'function') {
      elements.modelFallbackInput?.click();
      return;
    }
    try {
      const [handle] = await window.showOpenFilePicker({ multiple: false, types: filePickerTypes(), excludeAcceptAllOption: false });
      await loadModelHandle(handle);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error(error);
        alert(`Não foi possível importar o modelo.\n\n${error.message || error}`);
      }
    }
  }

  async function openFilePicker() {
    if (state.busy) return;
    if (typeof window.showOpenFilePicker !== 'function') {
      elements.fallbackInput?.click();
      return;
    }
    try {
      const [handle] = await window.showOpenFilePicker({ multiple: false, types: filePickerTypes(), excludeAcceptAllOption: false });
      await loadFileHandle(handle);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error(error);
        alert(`Não foi possível abrir o arquivo.\n\n${error.message || error}`);
      }
    }
  }

  async function openInEvolution() {
    if (state.busy) return;
    setBusy(true);
    let navigating = false;
    try {
      let data;
      if (state.currentFileHandle) {
        data = await writeToHandle(state.currentFileHandle);
        state.sourceData = cloneJson(data);
        markSaved(state.currentFileHandle.name, `Salvo: ${state.currentFileHandle.name}`);
        await storeSharedHandle(state.currentFileHandle);
      } else {
        data = collectDocumentData();
        state.sourceData = cloneJson(data);
        await storeSharedHandle(null);
        state.dirty = false;
        updateStatus(state.currentFileName || 'Documento transferido para Evolução');
      }

      sessionStorage.setItem(HANDOFF_SESSION_KEY, JSON.stringify({
        data,
        fileName: state.currentFileName || suggestedFileName(),
        hasFileHandle: Boolean(state.currentFileHandle),
        transferredAt: new Date().toISOString(),
      }));
      navigating = true;
      window.location.href = new URL('../EVOLUCAO/?from=prescricao', window.location.href).href;
    } catch (error) {
      console.error(error);
      alert(`Não foi possível abrir este arquivo na Evolução.\n\n${error.message || error}`);
    } finally {
      if (!navigating) setBusy(false);
    }
  }

  function installEvolutionButton() {
    const actions = document.querySelector('.toolbar-actions');
    if (!actions || document.getElementById('open-evolution-button')) return;
    const button = document.createElement('button');
    button.id = 'open-evolution-button';
    button.type = 'button';
    button.className = 'secondary-outline';
    button.textContent = 'Abrir na evolução';
    actions.insertBefore(button, elements.print || null);
    elements.evolution = button;
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
    const patientId = getSearchParameterCaseInsensitive('ID');
    if (unit) setUnit(unit);
    if (patientId) setInput('id_paciente', patientId);
    if (name) setInput('nome', name);
    if (birth) setInput('nascimento', normalizeDate(birth));
    setInput('data', localDateISO());
    updateAge();
    state.dirty = false;
    updateStatus(unit || patientId || name || birth ? 'Dados recebidos por GET — ainda não salvos em arquivo' : 'Novo documento');
  }

  function handleClear() {
    if (!confirm('Limpar todos os campos que podem ser editados?')) return;
    clearForm({ keepDate: true, keepUnit: true });
    markDirty();
  }

  function bindEvents() {
    elements.open?.addEventListener('click', openFilePicker);
    elements.importModel?.addEventListener('click', importModelPicker);
    elements.clear?.addEventListener('click', handleClear);
    elements.save?.addEventListener('click', saveCurrentFile);
    elements.saveAs?.addEventListener('click', saveFileAs);
    elements.evolution?.addEventListener('click', openInEvolution);
    elements.print?.addEventListener('click', () => window.print());
    elements.fallbackInput?.addEventListener('change', (event) => loadFallbackFile(event.target.files?.[0]));
    elements.modelFallbackInput?.addEventListener('change', (event) => loadFallbackModel(event.target.files?.[0]));
    $('#nascimento')?.addEventListener('input', updateAge);

    document.addEventListener('input', (event) => {
      if (event.target.matches('input:not([type="file"]), [contenteditable="true"]')) markDirty();
    });

    document.addEventListener('keydown', (event) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        if (event.shiftKey) saveFileAs(); else saveCurrentFile();
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
      window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch((error) => console.error('Falha ao registrar o service worker:', error)));
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
    installEvolutionButton();
    bindEvents();
    registerServiceWorker();
    registerFileLaunchHandler();
    setInput('data', localDateISO());
    setUnit(getText($('.unidade')) || 'RIACHO GRANDE');
    updateAge();
    applyGetParameters();
  }

  initialize();
})();