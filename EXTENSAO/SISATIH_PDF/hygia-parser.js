(function (root, factory) {
  let reader = root && root.SisatihPdfReader;
  let utils = root && root.SisatihHygiaUtils;
  if (typeof module === 'object' && module.exports) {
    if (!reader) reader = require('./pdf-reader.js');
    if (!utils) utils = require('./hygia-utils.js');
  }
  const api = factory(reader, utils);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SisatihPdfParser = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (reader, utils) {
  'use strict';
  if (!reader || !utils) throw new Error('Módulos do parser SisATIH não carregados.');
  const { fold, clean, digits, truncate, firstMatch, findSection, valueAfterLabel, parseAddress, mapGravity, mapGeneralState, parseVentilation, findMedicationEvidence, extractLabValue, parseCidCodes } = utils;

  function parseFromLines(pages) {
    const p1 = pages[0] || [];
    const p2 = pages[1] || [];
    const allLines = pages.flat();
    const allText = allLines.join('\n');

    const clinicianLine = p1.find((line) => fold(line).startsWith('PROFISSIONAL ')) || '';
    const clinicianMatch = /^PROFISSIONAL\s+(.+?)\s+CRM\s+(\d+)/i.exec(clinicianLine);
    const clinicianName = clinicianMatch ? clean(clinicianMatch[1]) : '';
    const crm = clinicianMatch ? digits(clinicianMatch[2]) : '';

    const patientLine = p1.find((line) => fold(line).startsWith('PRONTUARIO ')) || '';
    const patientMatch = /^PRONTU[ÁA]RIO\s+\S+\s+(.+?)\s+SEXO\s+([MF])\b/i.exec(patientLine);
    const patientName = patientMatch ? clean(patientMatch[1]) : '';
    const sex = patientMatch ? patientMatch[2].toUpperCase() : '';

    const unitLine = p1.find((line) => fold(line).startsWith('UN. PRESTADORA ')) || '';
    const unitMatch = /^UN\.\s*PRESTADORA\s+(.+?)\s+ATENDIMENTO\b/i.exec(unitLine);
    const specialtyLine = p1.find((line) => fold(line).startsWith('ESPECIALIDADE ')) || '';
    const specialtyMatch = /^ESPECIALIDADE\s+(.+?)\s+TIPO AT\b/i.exec(specialtyLine);

    const idLine = p1.find((line) => /\bRG\s+\S+\s+CPF\s+\S+\s+CNS\s+\S+/i.test(line)) || '';
    const ids = /RG\s+([^\s]+)\s+CPF\s+([^\s]+)\s+CNS\s+([^\s]+)/i.exec(idLine);

    const contactLine = p1.find((line) => fold(line).includes('TELEFONE') && fold(line).includes('DATA NASC')) || '';
    const phone = /TELEFONE\s*\(\s*(\d{2})\s*\)\s*([\d\s-]+)\s+DATA\s*NASC\s+(\d{2}\/\d{2}\/\d{4})/i.exec(contactLine);

    const motherLine = p1.find((line) => fold(line).startsWith('NOME DA MAE ')) || '';
    const motherName = valueAfterLabel(motherLine, 'NOME DA MÃE', []);

    const addressLine = p1.find((line) => fold(line).startsWith('END. ')) || '';
    let addressRaw = valueAfterLabel(addressLine, 'END.', ['CEP']);
    const parsedAddress = parseAddress(addressRaw);

    const municipalityLine = p1.find((line) => fold(line).startsWith('MUNICIPIO ')) || '';
    let city = '';
    let state = '';
    let neighborhood = '';
    if (municipalityLine) {
      const m = /^MUNIC[ÍI]PIO\s+(?:\d+\s+)?(.+?)\s+UF\s+([A-Z]{2})\s+BAIRRO\s+(.+)$/i.exec(municipalityLine);
      if (m) {
        city = clean(m[1]);
        state = m[2].toUpperCase();
        neighborhood = clean(m[3]);
      }
    }

    const encounterDate = p1.find((line) => /^\d{2}\/\d{2}\/\d{4}$/.test(clean(line))) || '';
    const encounterTime = p1.find((line) => /^\d{2}:\d{2}:\d{2}$/.test(clean(line))) || '';

    const complaint = findSection(p1, ['QUEIXA PRINCIPAL'], ['HISTÓRIA DA DOENÇA ATUAL'], [clinicianName]);
    const hda = findSection(p1, ['HISTÓRIA DA DOENÇA ATUAL'], ['HISTÓRIA PATOLÓGICA PREGRESSA'], [clinicianName]);
    const hpp = findSection(p1, ['HISTÓRIA PATOLÓGICA PREGRESSA'], ['EXAME FÍSICO'], [clinicianName]);
    const physicalExam = findSection(p1, ['EXAME FÍSICO'], ['HIPÓTESE DIAGNÓSTICA'], [clinicianName]);

    const medication = findSection(p2, ['Medicação na unidade'], ['TRANSFERÊNCIA INTERNA'], [clinicianName]);
    const otherConduct = findSection(p2, ['CONDUTA (OUTROS)'], ['REAVALIAÇÃO'], [clinicianName]);
    const orientation = findSection(p2, ['ORIENTAÇÕES GERAIS'], ['ASSINATURA E CARIMBO DO RESPONSÁVEL PELO ATENDIMENTO'], [clinicianName]);
    const conduct = clean([medication, otherConduct, orientation].filter(Boolean).join(' | '));

    const obsLine = p1.find((line) => fold(line).includes('OBSERVACAO:')) || '';
    const pa = firstMatch([obsLine, ...p1], /\bPA\s*:\s*(\d{2,3}\s*\/\s*\d{2,3})\b/i).replace(/\s+/g, '');
    const pulse = firstMatch([obsLine, ...p1], /\bPULSO\s*:\s*(\d{2,3})\s*BPM\b/i);
    const glasgow = firstMatch(p1, /\bGLASGOW\s+(\d{1,2})\b/i);
    const glucose = firstMatch(p1, /\bGLICEMIA\s+(\d{2,3})\b/i);
    const fr = firstMatch(p1, /\bFR\s*:\s*(\d{1,3})\b/i);
    const saturation = firstMatch(p1, /\bSAT\.?0?2\s+(\d{1,3}(?:[.,]\d+)?)\s*%/i).replace(',', '.');
    const temperature = firstMatch(p1, /\bTEMP\.?:?\s*(\d{2}(?:[.,]\d)?)\s*º?C\b/i).replace(',', '.');

    const ventilation = parseVentilation([physicalExam, medication, conduct].join(' '));
    const vasoactive = findMedicationEvidence(conduct, ['NORADRENALINA', 'NOREPINEFRINA', 'ADRENALINA', 'EPINEFRINA', 'VASOPRESSINA', 'DOBUTAMINA', 'DOPAMINA', 'MILRINONA']);
    const antibiotic = findMedicationEvidence(conduct, ['CEFTRIAXONA', 'CLARITROMICINA', 'AZITROMICINA', 'PIPERACILINA', 'TAZOBACTAM', 'MEROPENEM', 'VANCOMICINA', 'CEFEPIME', 'CEFAZOLINA', 'AMOXICILINA', 'AMPICILINA', 'SULBACTAM', 'METRONIDAZOL', 'CIPROFLOXACINO', 'LEVOFLOXACINO', 'ERTAPENEM']);

    let sedated = null;
    let sedationDescription = '';
    if (/\bN[AÃ]O\s+SEDAD[OA]\b|\bSEM\s+SEDA[CÇ][AÃ]O\b/i.test(allText)) {
      sedated = false;
    } else if (/\bSEDAD[OA]\b|\bEM\s+SEDA[CÇ][AÃ]O\b/i.test(allText)) {
      sedated = true;
      const sedative = findMedicationEvidence(conduct, ['MIDAZOLAM', 'PROPOFOL', 'DEXMEDETOMIDINA', 'KETAMINA']);
      sedationDescription = sedative.description;
    }

    let isolation = null;
    let isolationType = '';
    if (/ISOLAMENTO\s+RESPIRAT[ÓO]RIO/i.test(allText)) {
      isolation = true;
      isolationType = 'RESPIRATORIO';
    } else if (/ISOLAMENTO\s+DE\s+CONTATO|ISOLAMENTO\s+CONTATO/i.test(allText)) {
      isolation = true;
      isolationType = 'CONTATO';
    } else if (/SEM\s+ISOLAMENTO|N[AÃ]O\s+EST[AÁ]\s+EM\s+ISOLAMENTO/i.test(allText)) {
      isolation = false;
    }

    const cidCodes = parseCidCodes(p1, clinicianName);
    const labs = {
      hb: extractLabValue(allText, ['HB'], '\\d{1,2}(?:[.,]\\d)?'),
      ht: extractLabValue(allText, ['HT'], '\\d{1,2}(?:[.,]\\d)?'),
      leucograma: extractLabValue(allText, ['LEUCOGRAMA', 'LEUCOCITOS', 'LEUCÓCITOS'], '\\d{2,5}'),
      plq: extractLabValue(allText, ['PLQ', 'PLAQUETAS'], '\\d{2,7}'),
      u: extractLabValue(allText, ['UREIA', 'URÉIA'], '\\d{1,3}(?:[.,]\\d{1,2})?'),
      cr: extractLabValue(allText, ['CREATININA'], '\\d{1,2}(?:[.,]\\d{1,2})?'),
      na: extractLabValue(allText, ['NA', 'SODIO', 'SÓDIO'], '\\d{2,3}'),
      k: extractLabValue(allText, ['K', 'POTASSIO', 'POTÁSSIO'], '\\d{1,2}(?:[.,]\\d)?'),
      tp: extractLabValue(allText, ['TP'], '\\d{1,3}(?:[.,]\\d)?'),
      ap: extractLabValue(allText, ['AP'], '\\d{1,3}(?:[.,]\\d)?'),
      ttpa: extractLabValue(allText, ['TTPA'], '\\d{1,3}'),
      inr: extractLabValue(allText, ['INR'], '\\d{1,2}(?:[.,]\\d{1,2})?'),
      amilase: extractLabValue(allText, ['AMILASE'], '\\d{1,5}'),
      lipase: extractLabValue(allText, ['LIPASE'], '\\d{1,5}'),
      cpk: extractLabValue(allText, ['CPK'], '\\d{1,6}'),
      ckmb: extractLabValue(allText, ['CKMB', 'CK-MB'], '\\d{1,6}(?:[.,]\\d{1,2})?'),
      troponina: extractLabValue(allText, ['TROPONINA'], '[<>]?\\s*\\d+(?:[.,]\\d+)?'),
    };

    return {
      meta: { source: 'HygiaWeb UPA_FAAPosAt', encounterDate, encounterTime: encounterTime ? encounterTime.slice(0, 5) : '', gravity: mapGravity([...p1, ...p2]), gravitySource: mapGravity([...p1, ...p2]) ? 'Classificação de risco do PDF' : '' },
      clinician: { name: clinicianName, crm, unit: unitMatch ? clean(unitMatch[1]) : '', specialty: specialtyMatch ? clean(specialtyMatch[1]) : '' },
      patient: { name: patientName, sex, rg: ids ? digits(ids[1]) : '', cpf: ids ? digits(ids[2]) : '', cns: ids ? digits(ids[3]) : '', motherName, birthDate: phone ? phone[3] : '', phoneDdd: phone ? digits(phone[1]) : '', phone: phone ? digits(phone[2]) : '', address: parsedAddress, neighborhood, city, state },
      clinical: { complaint: truncate(complaint, 750), history: truncate(clean([hda, hpp].filter(Boolean).join(' | ')) || complaint, 750), physicalExam: truncate(physicalExam, 750), conduct: truncate(conduct, 750), ventilation, vasoactive, antibiotic, isolation: { value: isolation, type: isolationType }, sedation: { value: sedated, description: sedationDescription }, diagnoses: cidCodes },
      vitals: { state: mapGeneralState(physicalExam), bloodPressure: pa, heartRate: pulse, respiratoryRate: fr, temperature, saturation, glasgow, glucose },
      labs,
      raw: { pages },
    };
  }

  async function parsePdf(arrayBuffer) {
    const pages = await reader.extractPageLines(arrayBuffer);
    const parsed = parseFromLines(pages);
    parsed.raw = { pageCount: pages.length };
    return parsed;
  }

  return { parsePdf, extractPageLines: reader.extractPageLines, parseFromLines, _internals: { fold, clean, parseAddress, parseVentilation } };
});
