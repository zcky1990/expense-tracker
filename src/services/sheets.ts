const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"
const DRIVE_API = "https://www.googleapis.com/drive/v3/files"
const SPREADSHEET_TITLE = "Expense Tracker"
const HEADER_ROW = ["Date", "Category", "Amount", "Note"]

/** Format sheet name per bulan: YYYY-MM */
export function getMonthFromDate(date: string): string {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export type ExpenseRow = {
  date: string
  category: string
  amount: number
  note: string
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  }
}

/** Cari spreadsheet by nama di Google Drive (milik user). Return spreadsheetId atau null. */
export async function findSpreadsheetByName(
  accessToken: string,
  title: string
): Promise<string | null> {
  const q = `name='${title}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  const url = `${DRIVE_API}?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`
  const res = await fetch(url, {
    headers: authHeaders(accessToken),
  })
  if (!res.ok) return null
  const data = await res.json()
  const files = data.files
  if (!Array.isArray(files) || files.length === 0) return null
  return files[0].id ?? null
}

/** Buat spreadsheet baru dengan sheet pertama = bulan berjalan */
export async function createSpreadsheet(accessToken: string): Promise<string> {
  const firstSheet = getMonthFromDate(new Date().toISOString().slice(0, 10))
  const res = await fetch(SHEETS_API, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      properties: { title: SPREADSHEET_TITLE },
      sheets: [
        {
          properties: { title: firstSheet },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: HEADER_ROW.map((cell) => ({
                    userEnteredValue: { stringValue: cell },
                    userEnteredFormat: {
                      textFormat: { bold: true },
                      backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    },
                  })),
                },
              ],
            },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Failed to create spreadsheet: ${res.status}`)
  }

  const data = await res.json()
  const id = data.spreadsheetId
  if (!id) throw new Error("No spreadsheet ID in response")
  return id
}

export async function ensureSpreadsheet(
  accessToken: string,
  existingId: string | null,
  onCreated: (id: string) => void
): Promise<string> {
  if (existingId) {
    const ok = await checkSpreadsheetExists(accessToken, existingId)
    if (ok) return existingId
  }
  const foundId = await findSpreadsheetByName(accessToken, SPREADSHEET_TITLE)
  if (foundId) {
    onCreated(foundId)
    return foundId
  }
  const id = await createSpreadsheet(accessToken)
  onCreated(id)
  return id
}

async function checkSpreadsheetExists(
  accessToken: string,
  spreadsheetId: string
): Promise<boolean> {
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}?fields=spreadsheetId`, {
    headers: authHeaders(accessToken),
  })
  return res.ok
}

/** Daftar nama sheet (YYYY-MM) yang ada di spreadsheet */
export async function getAvailableMonths(
  accessToken: string,
  spreadsheetId: string
): Promise<string[]> {
  const res = await fetch(
    `${SHEETS_API}/${spreadsheetId}?fields=sheets(properties(title))`,
    { headers: authHeaders(accessToken) }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Failed to list sheets: ${res.status}`)
  }
  const data = await res.json()
  const titles: string[] = (data.sheets || []).map(
    (s: { properties?: { title?: string } }) => s.properties?.title || ""
  )
  return titles.filter((t) => /^\d{4}-\d{2}$/.test(t)).sort().reverse()
}

/** Pastikan sheet untuk bulan YYYY-MM ada; bila belum, buat + header */
export async function ensureMonthSheet(
  accessToken: string,
  spreadsheetId: string,
  yearMonth: string
): Promise<void> {
  const months = await getAvailableMonths(accessToken, spreadsheetId)
  if (months.includes(yearMonth)) return

  const addRes = await fetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: { title: yearMonth },
          },
        },
      ],
    }),
  })
  if (!addRes.ok) {
    const err = await addRes.json().catch(() => ({}))
    throw new Error(err.error?.message || `Failed to add sheet: ${addRes.status}`)
  }

  const range = `'${yearMonth}'!A1:D1`
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
  const headerRes = await fetch(url, {
    method: "PUT",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ values: [HEADER_ROW] }),
  })
  if (!headerRes.ok) {
    const err = await headerRes.json().catch(() => ({}))
    throw new Error(err.error?.message || `Failed to set header: ${headerRes.status}`)
  }
}

export async function appendExpense(
  accessToken: string,
  spreadsheetId: string,
  expense: ExpenseRow
): Promise<void> {
  const yearMonth = getMonthFromDate(expense.date)
  await ensureMonthSheet(accessToken, spreadsheetId, yearMonth)

  const range = `'${yearMonth}'!A:D`
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`

  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      values: [[expense.date, expense.category, expense.amount, expense.note]],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Failed to add expense: ${res.status}`)
  }
}

/** Ambil pengeluaran untuk satu bulan (YYYY-MM). Return [] jika sheet belum ada (400). */
export async function getExpenses(
  accessToken: string,
  spreadsheetId: string,
  yearMonth: string
): Promise<ExpenseRow[]> {
  const range = `'${yearMonth}'!A1:D`
  const url = `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`

  const res = await fetch(url, {
    headers: authHeaders(accessToken),
  })

  if (!res.ok) {
    if (res.status === 404) return []
    if (res.status === 400) return []
    const err = await res.json().catch(() => ({}))
    const msg = (err?.error?.message ?? err?.message) || ""
    throw new Error(msg || `Failed to load expenses: ${res.status}`)
  }

  const data = await res.json()
  const rawValues = data.values
  if (!Array.isArray(rawValues) || rawValues.length === 0) return []

  const rows = rawValues as unknown[][]
  const dataRows = rows.length === 1 ? [] : rows.slice(1)
  return dataRows
    .filter((row) => Array.isArray(row) && row.length >= 3)
    .map((row) => ({
      date: String(row[0] ?? ""),
      category: String(row[1] ?? ""),
      amount: Number(row[2]) || 0,
      note: row[3] !== undefined && row[3] !== null ? String(row[3]) : "",
    }))
}
