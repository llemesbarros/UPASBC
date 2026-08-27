#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
require(path.join(__dirname, '..', 'pdf-reader.js'));
require(path.join(__dirname, '..', 'hygia-utils.js'));
const parser = require(path.join(__dirname, '..', 'hygia-parser.js'));

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node tests/smoke.js /caminho/para/ficha.pdf');
    process.exit(2);
  }
  const bytes = fs.readFileSync(file);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const data = await parser.parsePdf(buffer);
  const checks = {
    paginas: Boolean(data.raw && data.raw.pageCount > 0),
    paciente: Boolean(data.patient && data.patient.name),
    unidade: Boolean(data.clinician && data.clinician.unit),
    profissional: Boolean(data.clinician && data.clinician.crm),
    historiaOuQueixa: Boolean(data.clinical && (data.clinical.history || data.clinical.complaint)),
    exameFisico: Boolean(data.clinical && data.clinical.physicalExam)
  };
  for (const [name, ok] of Object.entries(checks)) console.log(`${ok ? 'OK' : 'FALHA'}  ${name}`);
  if (Object.values(checks).some((ok) => !ok)) process.exit(1);
  console.log('Parser compatível com a estrutura mínima esperada.');
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
