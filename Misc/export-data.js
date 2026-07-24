// ── CSV / JSON / XLSX Export Trio ────────────────────────────────────────────
// Export a flat array of plain objects (rows) to CSV, JSON, or a styled XLSX
// file. The caller shapes `rows` beforehand — no field-name assumptions are
// baked in here; whatever keys the row objects have become the columns.
//
// CSV/JSON use a plain Blob-URL download (`dl`, reused/adapted from the
// original Work Log helper). XLSX requires ExcelJS to be loaded as a global
// beforehand:
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"></script>
// If `window.ExcelJS` isn't present, exportXLSX warns to the console and
// resolves without throwing.
//
// Usage:
//   const rows = [{ id: '1', name: 'Task A', type: 'Meeting', due: '01/07/2026' }, ...];
//   exportCSV(rows, 'tasks.csv');
//   exportJSON(rows, 'tasks.json');
//   await exportXLSX(rows, 'tasks.xlsx', {
//     sheetName: 'Tasks',
//     headerColor: 'FF60497A',   // ARGB, default shown
//     headerFontColor: 'FFFFFFFF',
//     zebraColors: ['FFE4DFEC', 'FFCCC0DA'],
//     columns: [{ header: 'ID', key: 'id', width: 16 }, ...], // optional; inferred from rows[0] if omitted
//     centerCols: [3, 4],   // optional 1-based column indexes to center-align
//     rightCols: [7, 8],    // optional 1-based column indexes to right-align
//     autoFilter: true,     // default true
//   });
//
// Public API:
//   exportCSV(rows, filename)          -> quoted CSV with UTF-8 BOM, one download
//   exportJSON(rows, filename)         -> pretty-printed JSON, one download
//   exportXLSX(rows, filename, opts)   -> async; styled workbook via ExcelJS
//   dl(name, href)                     -> shared download-trigger helper

(function (global) {
  function dl(name, href) {
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.click();
  }

  function inferColumns(rows) {
    if (!rows || !rows.length) return [];
    return Object.keys(rows[0]).map((key) => ({ header: key, key, width: 18 }));
  }

  function exportCSV(rows, filename) {
    filename = filename || 'export.csv';
    if (!rows || !rows.length) {
      console.warn('exportCSV: no rows to export.');
      return;
    }
    const columns = inferColumns(rows);
    const header = columns.map((c) => c.header);
    const body = rows.map((row) => columns.map((c) => row[c.key]));
    const allRows = [header, ...body];
    const csv = allRows
      .map((r) => r.map((c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(','))
      .join('\n');
    // Leading BOM ('﻿') keeps Excel from mangling UTF-8 on open.
    dl(filename, 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿' + csv));
  }

  function exportJSON(rows, filename) {
    filename = filename || 'export.json';
    if (!rows || !rows.length) {
      console.warn('exportJSON: no rows to export.');
      return;
    }
    dl(filename, 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rows, null, 2)));
  }

  async function exportXLSX(rows, filename, opts) {
    filename = filename || 'export.xlsx';
    const options = opts || {};
    if (typeof global.ExcelJS === 'undefined') {
      console.warn('exportXLSX: ExcelJS is not loaded (expected a global `ExcelJS`, e.g. from ' +
        'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js). Skipping export.');
      return;
    }
    if (!rows || !rows.length) {
      console.warn('exportXLSX: no rows to export.');
      return;
    }

    const sheetName = options.sheetName || 'Sheet1';
    const columns = options.columns || inferColumns(rows);
    const headerColor = options.headerColor || 'FF60497A';
    const headerFontColor = options.headerFontColor || 'FFFFFFFF';
    const zebraColors = options.zebraColors || ['FFE4DFEC', 'FFCCC0DA'];
    const centerCols = options.centerCols || [];
    const rightCols = options.rightCols || [];
    const autoFilter = options.autoFilter !== false;

    const wb = new global.ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName);
    ws.columns = columns;
    rows.forEach((row) => ws.addRow(row));

    if (autoFilter) {
      ws.autoFilter = { from: 'A1', to: { row: 1, column: ws.columns.length } };
    }

    function alignFor(colNumber) {
      if (centerCols.includes(colNumber)) return { horizontal: 'center' };
      if (rightCols.includes(colNumber)) return { horizontal: 'right' };
      return undefined;
    }

    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
      cell.font = { color: { argb: headerFontColor }, bold: true };
      const align = alignFor(colNumber);
      if (align) cell.alignment = align;
    });

    for (let i = 2; i <= ws.rowCount; i++) {
      const row = ws.getRow(i);
      const bg = (i % 2 === 0) ? zebraColors[0] : zebraColors[1];
      row.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        const align = alignFor(colNumber);
        if (align) cell.alignment = align;
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    dl(filename, url);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  global.exportCSV = exportCSV;
  global.exportJSON = exportJSON;
  global.exportXLSX = exportXLSX;
  global.dl = dl;
})(window);
