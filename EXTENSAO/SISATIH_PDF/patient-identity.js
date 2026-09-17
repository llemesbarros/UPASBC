(function (root) {
  'use strict';

  const parser = root && root.SisatihPdfParser;
  if (!parser || typeof parser.parseFromLines !== 'function' || typeof parser.extractPageLines !== 'function') return;

  const originalParseFromLines = parser.parseFromLines.bind(parser);

  function digits(value) {
    return String(value || '').replace(/\D+/g, '');
  }

  function fold(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isValidCpf(value) {
    const cpf = digits(value);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    for (let position = 9; position <= 10; position++) {
      let sum = 0;
      for (let i = 0; i < position; i++) sum += Number(cpf[i]) * (position + 1 - i);
      let check = (sum * 10) % 11;
      if (check === 10) check = 0;
      if (check !== Number(cpf[position])) return false;
    }
    return true;
  }

  function labelIndexes(lines, label) {
    const wanted = fold(label);
    const indexes = [];
    lines.forEach((line, index) => {
      if (new RegExp(`(?:^|\\b)${wanted}(?:\\b|$)`).test(fold(line))) indexes.push(index);
    });
    return indexes;
  }

  function nearbyText(lines, index, radius) {
    const start = Math.max(0, index - radius);
    const end = Math.min(lines.length, index + radius + 1);
    return lines.slice(start, end).join(' ');
  }

  function extractCpf(lines) {
    const directRe = /\bCPF\b\s*[:\-]?\s*((?:\d[.\-\s]*){11})/i;
    for (const line of lines) {
      const match = directRe.exec(line);
      if (match && isValidCpf(match[1])) return digits(match[1]);
    }

    const candidateRe = /(?:^|\D)(\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2})(?=\D|$)/g;
    for (const index of labelIndexes(lines, 'CPF')) {
      const windowText = nearbyText(lines, index, 3);
      for (const match of windowText.matchAll(candidateRe)) {
        if (isValidCpf(match[1])) return digits(match[1]);
      }
    }
    return '';
  }

  function extractCns(lines) {
    const directRe = /\bCNS\b\s*[:\-]?\s*(\d{15})\b/i;
    for (const line of lines) {
      const match = directRe.exec(line);
      if (match) return match[1];
    }

    for (const index of labelIndexes(lines, 'CNS')) {
      const match = /(?:^|\D)(\d{15})(?=\D|$)/.exec(nearbyText(lines, index, 3));
      if (match) return match[1];
    }
    return '';
  }

  function extractRg(lines) {
    for (const line of lines) {
      const match = /\bRG\b\s*[:\-]?\s*([0-9A-Z][0-9A-Z.\-]{3,19})(?=\s+(?:CPF|CNS|IDADE|TELEFONE)\b|\s*$)/i.exec(line);
      if (match) return String(match[1]).replace(/[^0-9A-Z]/gi, '');
    }
    return '';
  }

  function patchIdentity(parsed, pages) {
    if (!parsed || !parsed.patient) return parsed;
    const p1 = pages && pages[0] ? pages[0] : [];

    const cpf = extractCpf(p1);
    const cns = extractCns(p1);
    const rg = extractRg(p1);

    if (cpf) parsed.patient.cpf = cpf;
    if (cns) parsed.patient.cns = cns;
    if (rg) parsed.patient.rg = rg;
    return parsed;
  }

  parser.parseFromLines = function (pages) {
    return patchIdentity(originalParseFromLines(pages), pages);
  };

  parser.parsePdf = async function (arrayBuffer) {
    const pages = await parser.extractPageLines(arrayBuffer);
    const parsed = parser.parseFromLines(pages);
    parsed.raw = { pageCount: pages.length };
    return parsed;
  };

  parser._identityInternals = { extractCpf, extractCns, extractRg, isValidCpf, patchIdentity };
})(typeof globalThis !== 'undefined' ? globalThis : this);
