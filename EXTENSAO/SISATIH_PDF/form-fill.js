(function (root, factory) {
  const api = factory();
  if (root) root.SisatihFormFiller = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const fold = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  const text = (value, max) => {
    const v = String(value || '').replace(/\s+/g, ' ').trim();
    return max ? v.slice(0, max) : v;
  };

  function elBy(selector) { return document.querySelector(selector); }
  function mark(el) { if (el) el.classList.add('sisatih-pdf-filled'); }
  function hasValue(el) {
    if (!el) return false;
    if (el.type === 'radio' || el.type === 'checkbox') return el.checked;
    return String(el.value || '').trim() !== '';
  }

  function setValue(el, value, options = {}) {
    if (!el || value === undefined || value === null || String(value).trim() === '') return false;
    if (!options.overwrite && hasValue(el)) return false;
    const valueToSet = options.max ? text(value, options.max) : String(value).trim();
    el.value = valueToSet;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    mark(el);
    return true;
  }

  function setSelector(selector, value, options) { return setValue(elBy(selector), value, options); }
  function setName(name, value, options) { return setValue(document.querySelector(`[name="${CSS.escape(name)}"]`), value, options); }

  function setSelectValue(selector, value) {
    const el = elBy(selector);
    if (!el || !value || hasValue(el)) return false;
    const option = [...el.options].find((opt) => String(opt.value) === String(value));
    if (!option) return false;
    el.value = option.value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    mark(el);
    return true;
  }

  function setSelectText(selector, wanted) {
    const el = elBy(selector);
    if (!el || !wanted || hasValue(el)) return false;
    const target = fold(wanted);
    const option = [...el.options].find((opt) => fold(opt.textContent) === target)
      || [...el.options].find((opt) => fold(opt.textContent).includes(target) || target.includes(fold(opt.textContent)));
    if (!option || !option.value) return false;
    el.value = option.value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    mark(el);
    return true;
  }

  function setRadio(name, value) {
    if (value === undefined || value === null) return false;
    const radios = [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)];
    if (!radios.length || radios.some((radio) => radio.checked)) return false;
    const radio = radios.find((item) => item.value === String(value));
    if (!radio) return false;
    radio.click();
    mark(radio);
    return true;
  }

  function blur(selector) {
    const el = elBy(selector);
    if (el) {
      el.dispatchEvent(new Event('blur', { bubbles: false }));
      try { el.blur(); } catch (_) {}
    }
  }

  function labelFor(el) {
    if (!el) return '';
    if (el.id) {
      const explicit = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (explicit) return text(explicit.textContent, 70);
    }
    const group = el.closest('.form-group');
    const label = group && group.querySelector('label');
    return label ? text(label.textContent, 70) : (el.name || el.id || 'campo');
  }

  function requiredMissing() {
    const missing = [];
    const seenRadio = new Set();
    for (const el of document.querySelectorAll('.required, [data-msbc-required]')) {
      if (el.type === 'hidden' || el.disabled) continue;
      if (el.type === 'radio') {
        if (seenRadio.has(el.name)) continue;
        seenRadio.add(el.name);
        const group = [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)];
        if (!group.some((item) => item.checked)) missing.push(labelFor(el));
      } else if (!String(el.value || '').trim()) missing.push(labelFor(el));
    }
    return [...new Set(missing.filter(Boolean))];
  }

  function fillCid(slot, code) {
    if (!code) return false;
    const config = [
      { table: 'DataTables_Table_0', visible: '#cid10-principal-extenso', hidden: '#cid10-principal', button: '#principal' },
      { table: 'DataTables_Table_1', visible: '#cid10-secundario-extenso', hidden: '#cid10-secundario', button: '#secundario' },
      { table: 'DataTables_Table_2', visible: '#cid10-terciario-extenso', hidden: '#cid10-terciario', button: '#terciario' }
    ][slot];
    if (!config) return false;
    const visible = elBy(config.visible);
    const hidden = elBy(config.hidden);
    if ((visible && visible.value) || (hidden && hidden.value)) return false;
    const table = document.getElementById(config.table);
    if (table) {
      const row = [...table.querySelectorAll('tbody tr')].find((tr) => {
        const first = tr.querySelector('td');
        return first && fold(first.textContent) === fold(code);
      });
      if (row) {
        row.click();
        const button = elBy(config.button);
        if (button) button.click();
        if (visible) mark(visible);
        return true;
      }
    }
    let changed = false;
    if (hidden) changed = setValue(hidden, code) || changed;
    if (visible) changed = setValue(visible, code) || changed;
    return changed;
  }

  function fillNova(data) {
    let n = 0;
    const p = data.patient || {};
    const c = data.clinician || {};
    const meta = data.meta || {};
    n += Number(setSelectText('#unidade', c.unit));
    n += Number(setSelector('#crm-medico', c.crm));
    if (c.crm) blur('#crm-medico');
    n += Number(setSelector('#nome-medico', c.name));
    n += Number(setName('pedidoDeSolicitacao.classificacaoDeGravidade', meta.gravity));
    n += Number(setSelector('#nome-paciente', p.name, { max: 100 }));
    n += Number(setSelector('#cns-paciente', p.cns));
    n += Number(setSelector('#cpf-paciente', p.cpf));
    n += Number(setSelector('#rg-paciente', p.rg));
    n += Number(setSelector('#nome-mae', p.motherName, { max: 100 }));
    n += Number(setRadio('pedidoDePaciente.sexo', p.sex === 'M' ? 'MASCULINO' : p.sex === 'F' ? 'FEMININO' : null));
    n += Number(setSelector('#data-nascimento', p.birthDate));
    n += Number(setSelector('#telefone1-ddd', p.phoneDdd));
    n += Number(setSelector('#telefone1-paciente', p.phone));
    n += Number(setSelector('#logradouro-paciente', p.address && p.address.logradouro, { max: 100 }));
    n += Number(setSelector('#numero-paciente', p.address && p.address.numero, { max: 100 }));
    n += Number(setSelector('#complemento-paciente', p.address && p.address.complemento, { max: 100 }));
    n += Number(setSelector('#bairro-paciente', p.neighborhood, { max: 100 }));
    n += Number(setSelector('#cidade-paciente', p.city, { max: 100 }));
    n += Number(setSelectValue('#estados', p.state));
    return n;
  }

  function fillClinicos(data) {
    let n = 0;
    const clinical = data.clinical || {};
    const vitals = data.vitals || {};
    const labs = data.labs || {};
    const meta = data.meta || {};
    const clinician = data.clinician || {};
    n += Number(setSelector('#historia-clinica', clinical.history || clinical.complaint, { max: 750 }));
    n += Number(setSelector('#exame-fisico', clinical.physicalExam, { max: 750 }));
    if (clinical.ventilation) {
      n += Number(setName('quadroClinico.tipoDeVentilacao', clinical.ventilation.tipo));
      n += Number(setName('quadroClinico.descricaoVentilacao', clinical.ventilation.descricao, { max: 100 }));
      n += Number(setSelectValue('#tipoVentilacao', clinical.ventilation.sinaisTipo));
    }
    if (clinical.vasoactive && clinical.vasoactive.value !== null) {
      n += Number(setRadio('quadroClinico.usaDrogaVasoativa', String(clinical.vasoactive.value)));
      if (clinical.vasoactive.value) n += Number(setSelector('#dose-vasoativa-droga', clinical.vasoactive.description, { max: 255 }));
    }
    if (clinical.antibiotic && clinical.antibiotic.value !== null) {
      n += Number(setRadio('quadroClinico.usaAntibiotico', String(clinical.antibiotic.value)));
      if (clinical.antibiotic.value) n += Number(setSelector('#dose-antibiotico', clinical.antibiotic.description, { max: 255 }));
    }
    if (clinical.isolation && clinical.isolation.value !== null) {
      n += Number(setRadio('quadroClinico.estaEmIsolamento', String(clinical.isolation.value)));
      if (clinical.isolation.value && clinical.isolation.type) n += Number(setSelectValue('#tipo-isolamento', clinical.isolation.type));
    }
    if (clinical.sedation && clinical.sedation.value !== null) {
      n += Number(setRadio('quadroClinico.estaSedado', String(clinical.sedation.value)));
      if (clinical.sedation.value) n += Number(setSelector('#dose-sedacao', clinical.sedation.description, { max: 255 }));
    }
    n += Number(setSelectValue('#glasgowSinais', vitals.glasgow));
    n += Number(setSelector('#data-internacao', meta.encounterDate));
    n += Number(setSelector('#hora-internacao', meta.encounterTime));
    blur('#data-internacao');
    blur('#hora-internacao');
    n += Number(setSelectValue('#select-estado-geral', vitals.state));
    n += Number(setSelector('#pressao-arterial', vitals.bloodPressure));
    n += Number(setSelector('#input-fc', vitals.heartRate));
    n += Number(setSelector('#input-fr', vitals.respiratoryRate));
    n += Number(setSelector('#temperatura', vitals.temperature));
    n += Number(setSelector('#saturacaoO2', vitals.saturation));
    const labMap = [
      ['#sinais-vitais-hb', labs.hb], ['#sinais-vitais-ht', labs.ht], ['#sinais-vitais-leucograma', labs.leucograma],
      ['[name="sinaisVitais.plq"]', labs.plq], ['#sinais-vitais-u', labs.u], ['#sinais-vitais-cr', labs.cr],
      ['#sinais-vitais-na', labs.na], ['#sinais-vitais-k', labs.k], ['#sinais-vitais-tp', labs.tp], ['#sinais-vitais-ap', labs.ap],
      ['#sinais-vitais-ttpa', labs.ttpa], ['#sinais-vitais-inr', labs.inr], ['#sinais-vitais-amilase', labs.amilase],
      ['#sinais-vitais-lipase', labs.lipase], ['#sinais-vitais-cpk', labs.cpk], ['#sinais-vitais-ckmb', labs.ckmb],
      ['[name="sinaisVitais.troponina"]', labs.troponina]
    ];
    for (const [selector, value] of labMap) n += Number(setSelector(selector, value));
    n += Number(setSelector('#descricao-conduta', clinical.conduct, { max: 750 }));
    (clinical.diagnoses || []).slice(0, 3).forEach((cid, index) => { n += Number(fillCid(index, cid)); });
    if (fold(clinician.specialty).includes('CLINICA GERAL')) n += Number(setSelectText('#select-especialidade', 'CLÍNICA MÉDICA'));
    return n;
  }

  return { fillNova, fillClinicos, requiredMissing };
});
