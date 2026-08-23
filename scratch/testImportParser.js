const { parseImportText, normalizeAmount, normalizeDate } = require('../src/lib/parseImportText');

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

const result = parseImportText(sampleTSV, 'Facturación / Cobro');
console.log('Total procesadas:', result.totalLinesProcessed);
console.log('Encabezado detectado:', result.hasHeader);
console.log('Filas válidas:', result.validRows.length, JSON.stringify(result.validRows, null, 2));
console.log('Filas inválidas:', result.invalidRows.length, JSON.stringify(result.invalidRows, null, 2));
