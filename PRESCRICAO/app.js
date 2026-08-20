(() => {
  'use strict';

  const UI_VERSION = '1.2.0';
  const CORE_URL = './app-core.js';
  let draggedIndex = null;

  function rows() {
    return [...document.querySelectorAll('tr[data-prescricao-numero]')]
      .sort((a, b) => Number(a.dataset.prescricaoNumero) - Number(b.dataset.prescricaoNumero));
  }

  function text(element) {
    return element ? (element.innerText || element.textContent || '').replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n').trim() : '';
  }

  function readRow(row) {
    return {
      medicamento: text(row.querySelector('.med')),
      dose: text(row.querySelector('.dose')),
      via: text(row.querySelector('.via')),
      frequencia: text(row.querySelector('.freq')),
      horarios: [...row.querySelectorAll('.time')].map(text),
    };
  }

  function writeRow(row, data) {
    const set = (selector, value) => {
      const element = row.querySelector(selector);
      if (element) element.textContent = value ?? '';
    };
    set('.med', data?.medicamento || '');
    set('.dose', data?.dose || '');
    set('.via', data?.via || '');
    set('.freq', data?.frequencia || '');
    [...row.querySelectorAll('.time')].forEach((cell, index) => {
      cell.textContent = data?.horarios?.[index] || '';
    });
  }

  function clearDropMarkers() {
    rows().forEach((row) => row.classList.remove('prescricao-drag-over', 'prescricao-dragging'));
  }

  function signalChange(row) {
    const target = row?.querySelector('.med, .dose, .via, .freq, .time');
    if (target) target.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function movePrescription(fromIndex, toIndex, focus = {}) {
    const allRows = rows();
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= allRows.length || toIndex >= allRows.length || fromIndex === toIndex) return false;

    const values = allRows.map(readRow);
    const [moved] = values.splice(fromIndex, 1);
    values.splice(toIndex, 0, moved);
    allRows.forEach((row, index) => writeRow(row, values[index]));
    signalChange(allRows[toIndex]);

    requestAnimationFrame(() => {
      const destination = allRows[toIndex];
      if (focus.handle) {
        destination.querySelector('.drag-handle')?.focus();
        return;
      }
      if (Number.isInteger(focus.fieldIndex) && focus.fieldIndex >= 0) {
        const fields = [...destination.querySelectorAll('.med, .dose, .via, .freq, .time')];
        fields[focus.fieldIndex]?.focus();
      }
    });
    return true;
  }

  function installStyles() {
    if (document.getElementById('prescricao-reorder-styles')) return;
    const style = document.createElement('style');
    style.id = 'prescricao-reorder-styles';
    style.textContent = `
      .row-number-inner {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: .45mm;
        width: 100%;
        min-width: 0;
        height: 100%;
      }
      .drag-handle {
        appearance: none;
        -webkit-appearance: none;
        border: 0;
        border-radius: 2px;
        background: transparent;
        color: #555;
        cursor: grab;
        padding: 0;
        margin: 0;
        width: 3.1mm;
        min-width: 3.1mm;
        height: 4.5mm;
        line-height: 4.5mm;
        font: 700 8pt/4.5mm Arial, Helvetica, sans-serif;
        text-align: center;
        box-shadow: none;
        user-select: none;
        -webkit-user-select: none;
      }
      .drag-handle:hover,
      .drag-handle:focus {
        background: #e8f2ff;
        color: #075fa8;
        outline: 1px solid #1677d2;
        filter: none;
      }
      .drag-handle:active { cursor: grabbing; }
      .row-number-value { flex: 0 0 auto; }
      tr.prescricao-dragging td:not(.row-number) { opacity: .5; }
      tr.prescricao-drag-over td:not(.row-number) { box-shadow: inset 0 1.1mm 0 #1677d2; }
      @media print {
        .drag-handle { display: none !important; }
        .row-number-inner { gap: 0 !important; }
        tr.prescricao-dragging td:not(.row-number),
        tr.prescricao-drag-over td:not(.row-number) { opacity: 1 !important; box-shadow: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function installHandles() {
    rows().forEach((row) => {
      const numberCell = row.querySelector('.row-number');
      if (!numberCell || numberCell.querySelector('.drag-handle')) return;

      const number = String(row.dataset.prescricaoNumero || text(numberCell));
      numberCell.textContent = '';

      const wrapper = document.createElement('span');
      wrapper.className = 'row-number-inner';

      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'drag-handle';
      handle.draggable = true;
      handle.textContent = '☰';
      handle.title = `Arrastar prescrição ${number}. Atalho: Alt + seta para cima/baixo.`;
      handle.setAttribute('aria-label', `Reordenar prescrição ${number}`);

      const label = document.createElement('span');
      label.className = 'row-number-value';
      label.textContent = number;

      wrapper.append(handle, label);
      numberCell.appendChild(wrapper);

      handle.addEventListener('dragstart', (event) => {
        draggedIndex = rows().indexOf(row);
        row.classList.add('prescricao-dragging');
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', number);
        }
      });

      handle.addEventListener('dragend', () => {
        draggedIndex = null;
        clearDropMarkers();
      });

      row.addEventListener('dragover', (event) => {
        if (draggedIndex === null) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        rows().forEach((item) => item.classList.remove('prescricao-drag-over'));
        row.classList.add('prescricao-drag-over');
      });

      row.addEventListener('drop', (event) => {
        if (draggedIndex === null) return;
        event.preventDefault();
        const targetIndex = rows().indexOf(row);
        const sourceIndex = draggedIndex;
        draggedIndex = null;
        clearDropMarkers();
        movePrescription(sourceIndex, targetIndex, { handle: true });
      });
    });
  }

  function installKeyboardShortcut() {
    document.addEventListener('keydown', (event) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

      const active = document.activeElement;
      const row = active?.closest?.('tr[data-prescricao-numero]');
      if (!row) return;

      const allRows = rows();
      const fromIndex = allRows.indexOf(row);
      const toIndex = fromIndex + (event.key === 'ArrowUp' ? -1 : 1);
      if (toIndex < 0 || toIndex >= allRows.length) return;

      const fields = [...row.querySelectorAll('.med, .dose, .via, .freq, .time')];
      const fieldIndex = fields.indexOf(active);
      const focusHandle = active.classList?.contains('drag-handle');

      event.preventDefault();
      event.stopPropagation();
      movePrescription(fromIndex, toIndex, { handle: focusHandle, fieldIndex });
    });
  }

  function preferClassicModelImport() {
    const button = document.getElementById('import-model-button');
    const input = document.getElementById('model-input-fallback');
    if (!button || !input) return;

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      input.click();
    }, true);
  }

  async function initialize() {
    await import(CORE_URL);
    installStyles();
    installHandles();
    installKeyboardShortcut();
    preferClassicModelImport();
    document.documentElement.dataset.prescricaoUiVersion = UI_VERSION;
  }

  initialize().catch((error) => {
    console.error('Falha ao inicializar os recursos adicionais da prescrição.', error);
  });
})();
