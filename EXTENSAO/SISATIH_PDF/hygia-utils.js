(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SisatihHygiaUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function fold(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim(); }
  function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function digits(value) { return String(value || '').replace(/\D+/g, ''); }
  function truncate(value, max) { const v = clean(value); return v.length > max ? v.slice(0, max).trim() : v; }

  function firstMatch(lines, regex, group = 1) {
    for (const line of lines) {
      const m = regex.exec(line);
      regex.lastIndex = 0;
      if (m && m[group] != null) return clean(m[group]);
    }
    return '';
  }

  function findSection(lines, startLabels, endLabels, ignoreLines) {
    const starts = startLabels.map(fold);
    const ends = endLabels.map(fold);
    const ignored = new Set((ignoreLines || []).map(fold));
    const startIndex = lines.findIndex((line) => starts.includes(fold(line)));
    if (startIndex < 0) return '';
    const collected = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
      const normalized = fold(lines[i]);
      if (ends.includes(normalized)) break;
      if (!normalized || ignored.has(normalized)) continue;
      collected.push(clean(lines[i]));
    }
    return clean(collected.join(' '));
  }

  function valueAfterLabel(line, label, stopLabels) {
    const normalized = fold(line);
    const key = fold(label);
    const pos = normalized.indexOf(key);
    if (pos < 0) return '';
    let originalStart = line.toUpperCase().indexOf(label.toUpperCase());
    if (originalStart < 0) originalStart = 0;
    let value = line.slice(originalStart + label.length);
    for (const stop of stopLabels || []) {
      const idx = fold(value).indexOf(fold(stop));
      if (idx >= 0) value = value.slice(0, idx);
    }
    return clean(value.replace(/^[:\s-]+/, ''));
  }

  function parseAddress(raw) {
    const value = clean(raw);
    if (!value) return { logradouro: '', numero: '', complemento: '' };
    const m = /^(.*?)(?:\s+)(\d+[A-Za-z]?)\s*(?:,\s*(.*))?$/.exec(value);
    if (!m) return { logradouro: value, numero: '', complemento: '' };
    return { logradouro: clean(m[1]), numero: clean(m[2]), complemento: clean(m[3]) };
  }

  function mapGravity(lines) {
    const all = fold(lines.join(' '));
    const selected = /(?:\(\s*X\s*\)|\[\s*X\s*\]|☒)\s*(MUITO URGENTE|POUCO URGENTE|NAO URGENTE|EMERGENTE|URGENTE)\b/.exec(all);
    if (selected) {
      const priority = selected[1];
      if (priority === 'EMERGENTE') return 'GRAVISSIMO';
      if (priority === 'MUITO URGENTE') return 'GRAVE';
      if (priority === 'URGENTE') return 'MODERADO';
      if (priority === 'POUCO URGENTE' || priority === 'NAO URGENTE') return 'LEVE';
    }
    if (/\bVERMELH[AO]\b/.test(all)) return 'GRAVISSIMO';
    if (/\bLARANJA\b/.test(all)) return 'GRAVE';
    if (/\bAMAREL[AO]\b/.test(all)) return 'MODERADO';
    if (/\bVERDE\b/.test(all) || /\bAZUL\b/.test(all)) return 'LEVE';
    return '';
  }

  function mapGeneralState(exam) {
    const f = fold(exam);
    if (f.includes('PESSIMO ESTADO GERAL')) return 'PESSIMO_ESTADO_GERAL';
    if (f.includes('MAU ESTADO GERAL')) return 'MAU_ESTADO_GERAL';
    if (f.includes('REGULAR ESTADO GERAL')) return 'REGULAR_ESTADO_GERAL';
    if (f.includes('BOM ESTADO GERAL')) return 'BOM_ESTADO_GERAL';
    return '';
  }

  function parseVentilation(text) {
    const f = fold(text);
    if (/MASCARA NAO REINALANTE|MNR\b/.test(f)) {
      const rate = /MASCARA NAO REINALANTE\s*([0-9]+\s*L\/?MIN)?/i.exec(f);
      return { tipo: 'MASCARA_DE_O2', sinaisTipo: 'MNR', descricao: clean(rate && rate[0] ? rate[0] : 'MÁSCARA NÃO REINALANTE') };
    }
    if (/VENTILACAO MECANICA|\bIOT\b/.test(f)) return { tipo: 'VENTILACAO_MECANICA', sinaisTipo: 'IOT', descricao: 'VENTILAÇÃO MECÂNICA' };
    if (/VENTURI/.test(f)) return { tipo: 'VENTURI', sinaisTipo: 'O2', descricao: 'MÁSCARA DE VENTURI' };
    if (/CATETER(?: NASAL)?(?: DE)? O2|CATETER DE O2/.test(f)) return { tipo: 'CATETER_DE_O2', sinaisTipo: 'CN', descricao: 'CATETER DE O2' };
    if (/AR AMBIENTE|\bAA\b/.test(f)) return { tipo: 'AR_AMBIENTE', sinaisTipo: 'AA', descricao: 'AR AMBIENTE' };
    return { tipo: '', sinaisTipo: '', descricao: '' };
  }

  function findMedicationEvidence(text, terms) {
    const f = fold(text);
    const found = terms.find((term) => f.includes(fold(term)));
    if (!found) return { value: null, description: '' };
    const lines = String(text || '').split(/\n|;/).map(clean).filter(Boolean);
    const line = lines.find((candidate) => fold(candidate).includes(fold(found))) || found;
    return { value: true, description: truncate(line, 255) };
  }

  function extractLabValue(text, labels, valuePattern) {
    const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const re = new RegExp('(?:^|\\b)(?:' + escaped + ')\\s*(?::|=|-)?\\s*(' + valuePattern + ')\\b', 'i');
    const m = re.exec(text);
    return m ? m[1].replace(',', '.') : '';
  }

  function parseCidCodes(lines, doctorName) {
    const start = lines.findIndex((line) => fold(line) === 'HIPOTESE DIAGNOSTICA');
    if (start < 0) return [];
    const codes = [];
    const doctorFold = fold(doctorName);
    for (let i = start + 1; i < lines.length; i++) {
      const f = fold(lines[i]);
      if (f.includes('UPA_FAAPOSAT') || f.startsWith('PAGINA:')) break;
      if (doctorFold && f === doctorFold) continue;
      for (const m of lines[i].matchAll(/\b([A-Z][0-9]{2}[A-Z0-9]?)\b/g)) {
        if (!codes.includes(m[1])) codes.push(m[1]);
      }
    }
    return codes.slice(0, 3);
  }

  return { fold, clean, digits, truncate, firstMatch, findSection, valueAfterLabel, parseAddress, mapGravity, mapGeneralState, parseVentilation, findMedicationEvidence, extractLabValue, parseCidCodes };
});
