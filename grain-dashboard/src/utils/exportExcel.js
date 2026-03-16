import * as XLSX from 'xlsx'

/**
 * Export data to an Excel (.xlsx) file and trigger a browser download.
 *
 * @param {Object[]} data       – array of row objects
 * @param {Object[]} columns    – [{ header: string, key: string, format?: (value, row) => any }]
 * @param {string}   filename   – base filename (date will be appended)
 * @param {string}   [sheetName] – worksheet name (defaults to filename)
 */
export function exportToExcel(data, columns, filename, sheetName) {
  // Build header row
  const headers = columns.map(c => c.header)

  // Build data rows
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key]
      return c.format ? c.format(val, row) : (val ?? '')
    })
  )

  const aoa = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Auto-size columns based on content
  ws['!cols'] = columns.map((c, i) => {
    let maxLen = c.header.length
    rows.forEach(r => {
      const cell = String(r[i] ?? '')
      if (cell.length > maxLen) maxLen = cell.length
    })
    return { wch: Math.min(maxLen + 2, 40) }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName || filename)

  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`)
}

/**
 * Export multiple sheets into one workbook.
 *
 * @param {Object[]} sheets   – [{ name: string, data: Object[], columns: Object[] }]
 * @param {string}   filename – base filename
 */
export function exportMultiSheet(sheets, filename) {
  const wb = XLSX.utils.book_new()

  sheets.forEach(({ name, data, columns }) => {
    const headers = columns.map(c => c.header)
    const rows = data.map(row =>
      columns.map(c => {
        const val = row[c.key]
        return c.format ? c.format(val, row) : (val ?? '')
      })
    )
    const aoa = [headers, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(aoa)

    ws['!cols'] = columns.map((c, i) => {
      let maxLen = c.header.length
      rows.forEach(r => {
        const cell = String(r[i] ?? '')
        if (cell.length > maxLen) maxLen = cell.length
      })
      return { wch: Math.min(maxLen + 2, 40) }
    })

    XLSX.utils.book_append_sheet(wb, ws, name)
  })

  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`)
}

