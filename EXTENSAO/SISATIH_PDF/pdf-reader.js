(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SisatihPdfReader = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function binaryString(bytes) {
    let out = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      out += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return out;
  }

  function fold(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function digits(value) {
    return String(value || '').replace(/\D+/g, '');
  }

  function truncate(value, max) {
    const v = clean(value);
    return v.length > max ? v.slice(0, max).trim() : v;
  }

  function getObject(pdfBinary, pdfBytes, id) {
    const re = new RegExp('(?:^|\\s)' + id + '\\s+\\d+\\s+obj\\b', 'g');
    const match = re.exec(pdfBinary);
    if (!match) return null;
    const objectStart = match.index + match[0].length;
    const endObj = pdfBinary.indexOf('endobj', objectStart);
    if (endObj < 0) return null;
    const streamPos = pdfBinary.indexOf('stream', objectStart);

    if (streamPos >= 0 && streamPos < endObj) {
      const dict = pdfBinary.slice(objectStart, streamPos);
      let dataStart = streamPos + 6;
      if (pdfBinary[dataStart] === '\r' && pdfBinary[dataStart + 1] === '\n') dataStart += 2;
      else if (pdfBinary[dataStart] === '\n' || pdfBinary[dataStart] === '\r') dataStart += 1;

      const lengthMatch = /\/Length\s+(\d+)\b/.exec(dict);
      let dataEnd = lengthMatch ? dataStart + Number(lengthMatch[1]) : -1;
      if (dataEnd < 0 || dataEnd > pdfBytes.length) {
        dataEnd = pdfBinary.indexOf('endstream', dataStart);
      }
      if (dataEnd < dataStart) return null;

      return {
        dict,
        stream: pdfBytes.subarray(dataStart, dataEnd),
        offset: match.index,
      };
    }

    return {
      dict: pdfBinary.slice(objectStart, endObj),
      stream: null,
      offset: match.index,
    };
  }

  async function inflate(data) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Este navegador não oferece DecompressionStream, necessário para ler este PDF localmente.');
    }
    const ds = new DecompressionStream('deflate');
    const stream = new Blob([data]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function decodePdfLiteral(raw) {
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      let c = raw.charCodeAt(i) & 255;
      if (c === 92) {
        if (i + 1 >= raw.length) break;
        const n = raw.charCodeAt(++i) & 255;
        if (n === 110) c = 10;
        else if (n === 114) c = 13;
        else if (n === 116) c = 9;
        else if (n === 98) c = 8;
        else if (n === 102) c = 12;
        else if (n === 40) c = 40;
        else if (n === 41) c = 41;
        else if (n === 92) c = 92;
        else if (n === 13) {
          if ((raw.charCodeAt(i + 1) & 255) === 10) i += 1;
          continue;
        } else if (n === 10) {
          continue;
        } else if (n >= 48 && n <= 55) {
          let oct = String.fromCharCode(n);
          for (let j = 0; j < 2 && i + 1 < raw.length; j++) {
            const d = raw.charCodeAt(i + 1) & 255;
            if (d >= 48 && d <= 55) oct += raw[++i];
            else break;
          }
          c = parseInt(oct, 8) & 255;
        } else {
          c = n;
        }
      }
      out.push(c);
    }
    return new TextDecoder('windows-1252').decode(new Uint8Array(out));
  }

  function parseLiteralAt(content, index) {
    let depth = 1;
    let raw = '';
    let i = index + 1;
    while (i < content.length && depth > 0) {
      const ch = content[i];
      if (ch === '\\') {
        raw += ch;
        if (i + 1 < content.length) {
          raw += content[i + 1];
          i += 2;
          continue;
        }
      }
      if (ch === '(') {
        depth += 1;
        raw += ch;
        i += 1;
        continue;
      }
      if (ch === ')') {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          break;
        }
        raw += ch;
        i += 1;
        continue;
      }
      raw += ch;
      i += 1;
    }
    return { text: decodePdfLiteral(raw), end: i };
  }

  function parseHexAt(content, index) {
    let end = content.indexOf('>', index + 1);
    if (end < 0) end = content.length;
    let hex = content.slice(index + 1, end).replace(/\s+/g, '');
    if (hex.length % 2) hex += '0';
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      const v = parseInt(hex.slice(i, i + 2), 16);
      bytes.push(Number.isFinite(v) ? v : 0);
    }
    return {
      text: new TextDecoder('windows-1252').decode(new Uint8Array(bytes)),
      end: end + 1,
    };
  }

  function parseContentItems(content) {
    let x = 0;
    let y = 0;
    let fontSize = 10;
    let i = 0;
    const numberStack = [];
    const items = [];

    const skipSpace = () => {
      while (i < content.length && /\s/.test(content[i])) i += 1;
    };

    while (i < content.length) {
      skipSpace();
      if (i >= content.length) break;
      const ch = content[i];

      if (ch === '%') {
        const next = content.indexOf('\n', i);
        i = next < 0 ? content.length : next + 1;
        continue;
      }

      if (ch === '(') {
        const parsed = parseLiteralAt(content, i);
        i = parsed.end;
        skipSpace();
        const operator = /^(Tj|'|")/.exec(content.slice(i));
        if (operator) {
          items.push({ x, y, size: fontSize, text: parsed.text });
          i += operator[0].length;
        }
        continue;
      }

      if (ch === '<' && content[i + 1] !== '<') {
        const parsed = parseHexAt(content, i);
        i = parsed.end;
        skipSpace();
        if (content.slice(i, i + 2) === 'Tj') {
          items.push({ x, y, size: fontSize, text: parsed.text });
          i += 2;
        }
        continue;
      }

      if (ch === '[') {
        let j = i + 1;
        let depth = 1;
        const textParts = [];
        while (j < content.length && depth > 0) {
          if (content[j] === '(') {
            const parsed = parseLiteralAt(content, j);
            textParts.push(parsed.text);
            j = parsed.end;
            continue;
          }
          if (content[j] === '<' && content[j + 1] !== '<') {
            const parsed = parseHexAt(content, j);
            textParts.push(parsed.text);
            j = parsed.end;
            continue;
          }
          if (content[j] === '[') depth += 1;
          else if (content[j] === ']') depth -= 1;
          j += 1;
        }
        i = j;
        skipSpace();
        if (content.slice(i, i + 2) === 'TJ') {
          items.push({ x, y, size: fontSize, text: textParts.join('') });
          i += 2;
        }
        continue;
      }

      const number = /^-?\d+(?:\.\d+)?/.exec(content.slice(i));
      if (number) {
        numberStack.push(Number(number[0]));
        i += number[0].length;
        continue;
      }

      const name = /^\/[A-Za-z0-9_.+\-]+/.exec(content.slice(i));
      if (name) {
        numberStack.push(name[0]);
        i += name[0].length;
        continue;
      }

      const operator = /^[A-Za-z*']+/.exec(content.slice(i));
      if (operator) {
        const op = operator[0];
        i += op.length;
        if (op === 'Tm' && numberStack.length >= 6) {
          const values = numberStack.splice(-6);
          x = Number(values[4]) || 0;
          y = Number(values[5]) || 0;
        } else if (op === 'Td' && numberStack.length >= 2) {
          const values = numberStack.splice(-2);
          x += Number(values[0]) || 0;
          y += Number(values[1]) || 0;
        } else if (op === 'Tf' && numberStack.length >= 2) {
          const values = numberStack.splice(-2);
          fontSize = Number(values[1]) || fontSize;
        }
        numberStack.length = 0;
        continue;
      }

      i += 1;
    }

    return items.filter((item) => clean(item.text));
  }

  function itemsToLines(items) {
    const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
    const grouped = [];
    for (const item of sorted) {
      let line = grouped.find((candidate) => Math.abs(candidate.y - item.y) <= 1.5);
      if (!line) {
        line = { y: item.y, items: [] };
        grouped.push(line);
      }
      line.items.push(item);
    }
    grouped.sort((a, b) => b.y - a.y);
    return grouped
      .map((line) => {
        line.items.sort((a, b) => a.x - b.x);
        return clean(line.items.map((item) => clean(item.text)).filter(Boolean).join(' '));
      })
      .filter(Boolean);
  }

  async function extractPageLines(arrayBuffer) {
    const pdfBytes = new Uint8Array(arrayBuffer);
    const pdfBinary = binaryString(pdfBytes);
    if (!pdfBinary.startsWith('%PDF-')) throw new Error('O arquivo selecionado não parece ser um PDF válido.');

    const pageObjects = [];
    const objectRe = /(\d+)\s+\d+\s+obj\b/g;
    let match;
    while ((match = objectRe.exec(pdfBinary))) {
      const id = Number(match[1]);
      const obj = getObject(pdfBinary, pdfBytes, id);
      if (!obj) continue;
      if (/\/Type\s*\/Page\b/.test(obj.dict) && !/\/Type\s*\/Pages\b/.test(obj.dict)) {
        pageObjects.push({ id, offset: obj.offset, dict: obj.dict });
      }
    }
    pageObjects.sort((a, b) => a.offset - b.offset);
    if (!pageObjects.length) throw new Error('Não foi possível localizar páginas legíveis neste PDF.');

    const pages = [];
    for (const page of pageObjects) {
      const singleContent = /\/Contents\s+(\d+)\s+\d+\s+R/.exec(page.dict);
      const arrayContents = /\/Contents\s*\[([^\]]+)\]/.exec(page.dict);
      const contentIds = [];
      if (singleContent) contentIds.push(Number(singleContent[1]));
      if (arrayContents) {
        for (const ref of arrayContents[1].matchAll(/(\d+)\s+\d+\s+R/g)) contentIds.push(Number(ref[1]));
      }
      const allItems = [];
      for (const contentId of contentIds) {
        const contentObj = getObject(pdfBinary, pdfBytes, contentId);
        if (!contentObj || !contentObj.stream) continue;
        let decoded = contentObj.stream;
        if (/\/FlateDecode/.test(contentObj.dict)) decoded = await inflate(decoded);
        if (/\/(?:ASCII85Decode|LZWDecode|RunLengthDecode|DCTDecode|JPXDecode)/.test(contentObj.dict)) {
          continue;
        }
        allItems.push(...parseContentItems(binaryString(decoded)));
      }
      pages.push(itemsToLines(allItems));
    }
    return pages;
  }

  return { extractPageLines };
});
