export interface ParsedImportRow {
  rowIndex: number;
  concept: string;
  category: string;
  amount: number;
  date: string;
  isValid: boolean;
  errors: string[];
}

export interface ParseImportResult {
  validRows: ParsedImportRow[];
  invalidRows: ParsedImportRow[];
  totalLinesProcessed: number;
  hasHeader: boolean;
}

/**
 * Normaliza y valida montos monetarios desde texto (ej. "$25,000.50", "25 000", "25000").
 */
export function normalizeAmount(raw: string): { value: number | null; isValid: boolean } {
  if (!raw || typeof raw !== 'string') return { value: null, isValid: false };
  
  // Clean currency symbols, commas, spaces
  const cleaned = raw.replace(/[\$\s]/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  
  if (isNaN(num) || num < 0) {
    return { value: null, isValid: false };
  }
  
  return { value: num, isValid: true };
}

/**
 * Normaliza y valida fechas en formatos YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY a YYYY-MM-DD.
 */
export function normalizeDate(raw: string): { value: string; isValid: boolean } {
  if (!raw || typeof raw !== 'string') {
    const today = new Date().toISOString().split('T')[0];
    return { value: today, isValid: true };
  }

  const trimmed = raw.trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = isoMatch[2].padStart(2, '0');
    const dd = isoMatch[3].padStart(2, '0');
    return { value: `${yyyy}-${mm}-${dd}`, isValid: true };
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    return { value: `${yyyy}-${mm}-${dd}`, isValid: true };
  }

  // Fallback to Date object parsing
  const parsedDate = new Date(trimmed);
  if (!isNaN(parsedDate.getTime())) {
    const yyyy = parsedDate.getFullYear();
    const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(parsedDate.getDate()).padStart(2, '0');
    return { value: `${yyyy}-${mm}-${dd}`, isValid: true };
  }

  return { value: '', isValid: false };
}

/**
 * Detecta si una fila de texto corresponde a encabezados (ej. Concepto, Categoría, Monto, Fecha).
 */
export function isHeaderRow(cols: string[]): boolean {
  if (!cols || cols.length === 0) return false;
  const headerKeywords = ['concepto', 'categoría', 'categoria', 'monto', 'importe', 'cantidad', 'fecha', 'date', 'amount', 'concept'];
  const joined = cols.join(' ').toLowerCase();
  return headerKeywords.some(kw => joined.includes(kw));
}

/**
 * Parsea el contenido pegado desde Google Sheets, Excel (Tab) o CSV (, o ;) para Ingresos y Gastos.
 */
export function parseImportText(
  rawText: string,
  defaultCategory: string = 'Facturación / Cobro'
): ParseImportResult {
  const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const validRows: ParsedImportRow[] = [];
  const invalidRows: ParsedImportRow[] = [];
  let hasHeader = false;

  lines.forEach((line, index) => {
    // Detect delimiter: Tab (\t), Semicolon (;), or Comma (,)
    let cols: string[] = [];
    if (line.includes('\t')) {
      cols = line.split('\t');
    } else if (line.includes(';')) {
      cols = line.split(';');
    } else if (line.includes(',')) {
      cols = line.split(',');
    } else {
      cols = [line];
    }

    cols = cols.map(c => c.trim().replace(/^["']|["']$/g, ''));

    // Check header on row 0
    if (index === 0 && isHeaderRow(cols)) {
      hasHeader = true;
      return; // Skip header row
    }

    const errors: string[] = [];
    
    // Order: Concepto | Categoría | Monto | Fecha
    const rawConcept = cols[0] || '';
    const rawCategory = cols[1] || defaultCategory;
    const rawAmount = cols[2] || '';
    const rawDate = cols[3] || '';

    // Validate concept
    if (!rawConcept) {
      errors.push('Falta el concepto o título');
    }

    // Validate amount
    const amountNorm = normalizeAmount(rawAmount);
    if (!amountNorm.isValid || amountNorm.value === null) {
      errors.push(`Monto inválido: "${rawAmount || 'vacío'}"`);
    }

    // Validate date
    const dateNorm = normalizeDate(rawDate);
    if (!dateNorm.isValid) {
      errors.push(`Fecha inválida: "${rawDate || 'vacía'}" (Use YYYY-MM-DD o DD/MM/YYYY)`);
    }

    const rowObj: ParsedImportRow = {
      rowIndex: index + 1,
      concept: rawConcept,
      category: rawCategory || defaultCategory,
      amount: amountNorm.value !== null ? amountNorm.value : 0,
      date: dateNorm.isValid ? dateNorm.value : new Date().toISOString().split('T')[0],
      isValid: errors.length === 0,
      errors
    };

    if (rowObj.isValid) {
      validRows.push(rowObj);
    } else {
      invalidRows.push(rowObj);
    }
  });

  return {
    validRows,
    invalidRows,
    totalLinesProcessed: lines.length,
    hasHeader
  };
}
