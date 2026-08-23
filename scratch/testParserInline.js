function normalizeAmount(raw) {
  if (!raw || typeof raw !== 'string') return { value: null, isValid: false };
  const cleaned = raw.replace(/[\$\s]/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num) || num < 0) return { value: null, isValid: false };
  return { value: num, isValid: true };
}

function normalizeDate(raw) {
  if (!raw || typeof raw !== 'string') {
    return { value: new Date().toISOString().split('T')[0], isValid: true };
  }
  const trimmed = raw.trim();
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    return { value: `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`, isValid: true };
  }
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    return { value: `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`, isValid: true };
  }
  return { value: '', isValid: false };
}

function isHeaderRow(cols) {
  if (!cols || cols.length === 0) return false;
  const headerKeywords = ['concepto', 'categoría', 'categoria', 'monto', 'importe', 'cantidad', 'fecha', 'date', 'amount', 'concept'];
  const joined = cols.join(' ').toLowerCase();
  return headerKeywords.some(kw => joined.includes(kw));
}

function parseImportText(rawText, defaultCategory = 'Facturación / Cobro') {
  const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const validRows = [];
  const invalidRows = [];
  let hasHeader = false;

  lines.forEach((line, index) => {
    let cols = [];
    if (line.includes('\t')) cols = line.split('\t');
    else if (line.includes(';')) cols = line.split(';');
    else if (line.includes(',')) cols = line.split(',');
    else cols = [line];

    cols = cols.map(c => c.trim().replace(/^["']|["']$/g, ''));

    if (index === 0 && isHeaderRow(cols)) {
      hasHeader = true;
      return;
    }

    const errors = [];
    const rawConcept = cols[0] || '';
    const rawCategory = cols[1] || defaultCategory;
    const rawAmount = cols[2] || '';
    const rawDate = cols[3] || '';

    if (!rawConcept) errors.push('Falta el concepto o título');
    const amountNorm = normalizeAmount(rawAmount);
    if (!amountNorm.isValid || amountNorm.value === null) errors.push(`Monto inválido: "${rawAmount || 'vacío'}"`);
    const dateNorm = normalizeDate(rawDate);
    if (!dateNorm.isValid) errors.push(`Fecha inválida: "${rawDate || 'vacía'}"`);

    const rowObj = {
      rowIndex: index + 1,
      concept: rawConcept,
      category: rawCategory || defaultCategory,
      amount: amountNorm.value !== null ? amountNorm.value : 0,
      date: dateNorm.isValid ? dateNorm.value : new Date().toISOString().split('T')[0],
      isValid: errors.length === 0,
      errors
    };

    if (rowObj.isValid) validRows.push(rowObj);
    else invalidRows.push(rowObj);
  });

  return { validRows, invalidRows, totalLinesProcessed: lines.length, hasHeader };
}

console.log('--- TEST 1: normalizeAmount ---');
console.log('$25,000.50 ->', normalizeAmount('$25,000.50'));
console.log('25000 ->', normalizeAmount('25000'));
console.log('abc ->', normalizeAmount('abc'));

console.log('\n--- TEST 2: normalizeDate ---');
console.log('2026-08-23 ->', normalizeDate('2026-08-23'));
console.log('23/08/2026 ->', normalizeDate('23/08/2026'));
console.log('23-08-2026 ->', normalizeDate('23-08-2026'));
console.log('invalida ->', normalizeDate('invalida'));

console.log('\n--- TEST 3: parseImportText (TSV con Encabezado) ---');
const sampleTSV = `Concepto\tCategoría\tMonto\tFecha
Anticipo cliente\tFacturación / Cobro\t25000\t2026-08-23
Servidores Vercel\tSoftware & Cloud\t$1,250.00\t15/08/2026
Fila Invalida\tMarketing\tINVALIDO\tfecha-mala`;

const result = parseImportText(sampleTSV);
console.log('Total procesadas:', result.totalLinesProcessed);
console.log('Encabezado detectado:', result.hasHeader);
console.log('Filas válidas count:', result.validRows.length);
console.log('Filas válidas data:', JSON.stringify(result.validRows, null, 2));
console.log('Filas inválidas count:', result.invalidRows.length);
console.log('Filas inválidas data:', JSON.stringify(result.invalidRows, null, 2));
