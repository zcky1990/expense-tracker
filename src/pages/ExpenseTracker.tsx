import React, { useCallback, useEffect, useRef, useState, useMemo } from "react"
import {
  Plus,
  LogOut,
  Loader2,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Sun,
  Moon,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"
import {
  appendExpense,
  ensureSpreadsheet,
  getExpenses,
  getAvailableMonths,
  getMonthFromDate,
  type ExpenseRow,
} from "@/services/sheets"

const CATEGORIES = [
  "Makanan & Minuman",
  "Transportasi",
  "Belanja",
  "Hiburan",
  "Kesehatan",
  "Utilitas",
  "Lainnya",
]

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n)
}

function formatDate(s: string) {
  if (!s) return "-"
  try {
    return new Date(s).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return s
  }
}

/** Label bulan dari YYYY-MM ke "Februari 2025" */
function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
}

/** Generate list bulan: 12 bulan terakhir + bulan berjalan */
function getMonthOptions(available: string[]): string[] {
  const now = new Date()
  const options = new Set<string>(available)
  for (let i = 0; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.add(getMonthFromDate(d.toISOString().slice(0, 10)))
  }
  return Array.from(options).sort().reverse()
}

function currentYearMonth(): string {
  return getMonthFromDate(new Date().toISOString().slice(0, 10))
}

export function ExpenseTracker() {
  const { accessToken, spreadsheetId, setSpreadsheetId, signOut, ensureToken, userEmail, userName, userPicture } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>(() => currentYearMonth())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [groupByCategory, setGroupByCategory] = useState(false)
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false)
  const [comparisonMonths, setComparisonMonths] = useState<string[]>([])
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [comparisonData, setComparisonData] = useState<{
    current: ExpenseRow[]
    compares: Record<string, ExpenseRow[]>
  } | null>(null)
  const selectedMonthRef = useRef(selectedMonth)
  selectedMonthRef.current = selectedMonth

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "",
    amount: "",
    note: "",
  })

  const monthOptions = useMemo(
    () => getMonthOptions(availableMonths),
    [availableMonths]
  )

  const loadData = async (token: string, sheetId: string, yearMonth: string) => {
    try {
      const [months, list] = await Promise.all([
        getAvailableMonths(token, sheetId),
        getExpenses(token, sheetId, yearMonth),
      ])
      setAvailableMonths(months)
      if (selectedMonthRef.current === yearMonth) {
        setExpenses(list)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data")
      if (selectedMonthRef.current === yearMonth) {
        setExpenses([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      const token = await ensureToken()
      if (cancelled || !token) {
        setLoading(false)
        return
      }
      try {
        const sheetId = await ensureSpreadsheet(token, spreadsheetId, setSpreadsheetId)
        if (cancelled) return
        await loadData(token, sheetId, selectedMonth)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyiapkan spreadsheet")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!accessToken || !spreadsheetId) return
    setLoading(true)
    loadData(accessToken, spreadsheetId, selectedMonth)
  }, [selectedMonth, accessToken, spreadsheetId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !spreadsheetId) return
    const amount = Number(form.amount.replace(/\D/g, "")) || 0
    if (!form.category || amount <= 0) return

    setSaving(true)
    setError(null)
    const addedMonth = getMonthFromDate(form.date)
    try {
      await appendExpense(accessToken, spreadsheetId, {
        date: form.date,
        category: form.category,
        amount,
        note: form.note.trim(),
      })
      setForm({
        date: new Date().toISOString().slice(0, 10),
        category: "",
        amount: "",
        note: "",
      })
      setDialogOpen(false)
      setSelectedMonth(addedMonth)
      setLoading(true)
      await new Promise((r) => setTimeout(r, 300))
      await loadData(accessToken, spreadsheetId, addedMonth)
      setLoading(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah expense")
    } finally {
      setSaving(false)
    }
  }

  const total = expenses.reduce((sum, r) => sum + r.amount, 0)

  const filteredExpenses = useMemo(() => {
    if (!filterCategory || filterCategory === "all") return expenses
    return expenses.filter((r) => r.category === filterCategory)
  }, [expenses, filterCategory])

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((sum, r) => sum + r.amount, 0),
    [filteredExpenses]
  )

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, ExpenseRow[]>()
    for (const row of filteredExpenses) {
      const list = map.get(row.category) ?? []
      list.push(row)
      map.set(row.category, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredExpenses])

  const sortedForTable = useMemo(
    () => [...filteredExpenses].sort((a, b) => b.date.localeCompare(a.date)),
    [filteredExpenses]
  )

  /** Opsi bulan pembanding: maks. 3 bulan sebelum & 3 bulan sesudah selectedMonth (sesudah tidak melebihi bulan berjalan) */
  const comparisonMonthOptions = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number)
    const current = currentYearMonth()
    const options = new Set<string>()
    for (let i = 1; i <= 3; i++) {
      const dBefore = new Date(y, m - 1 - i, 1)
      options.add(getMonthFromDate(dBefore.toISOString().slice(0, 10)))
    }
    for (let i = 1; i <= 3; i++) {
      const dAfter = new Date(y, m - 1 + i, 1)
      const ym = getMonthFromDate(dAfter.toISOString().slice(0, 10))
      if (ym <= current) options.add(ym)
    }
    options.delete(selectedMonth)
    return Array.from(options).sort()
  }, [selectedMonth])

  const defaultComparisonMonths = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number)
    const prev = new Date(y, m - 2, 1)
    const prevYm = getMonthFromDate(prev.toISOString().slice(0, 10))
    if (comparisonMonthOptions.includes(prevYm)) return [prevYm]
    return comparisonMonthOptions.length > 0 ? [comparisonMonthOptions[0]] : []
  }, [selectedMonth, comparisonMonthOptions])

  /** Data komparasi per kategori: total bulan ini, tiap bulan pembanding, rata-rata pembanding, selisih vs rata-rata, % */
  const comparisonByCategory = useMemo(() => {
    if (!comparisonData || comparisonMonths.length === 0) return []
    const sumByCat = (rows: ExpenseRow[]) => {
      const map = new Map<string, number>()
      for (const r of rows) {
        map.set(r.category, (map.get(r.category) ?? 0) + r.amount)
      }
      return map
    }
    const currentSums = sumByCat(comparisonData.current)
    const compareSumsByMonth: Record<string, Map<string, number>> = {}
    for (const ym of comparisonMonths) {
      const rows = comparisonData.compares[ym] ?? []
      compareSumsByMonth[ym] = sumByCat(rows)
    }
    const allCats = new Set([
      ...Array.from(currentSums.keys()),
      ...Object.values(compareSumsByMonth).flatMap((m) => Array.from(m.keys())),
    ])
    const n = comparisonMonths.length
    return Array.from(allCats)
      .map((category) => {
        const curr = currentSums.get(category) ?? 0
        const byMonth: Record<string, number> = {}
        let sumCompare = 0
        for (const ym of comparisonMonths) {
          const v = compareSumsByMonth[ym]?.get(category) ?? 0
          byMonth[ym] = v
          sumCompare += v
        }
        const compareAvg = n > 0 ? sumCompare / n : 0
        const diff = curr - compareAvg
        const pct = compareAvg === 0 ? (curr > 0 ? 100 : 0) : Math.round((diff / compareAvg) * 100)
        return { category, current: curr, byMonth, compareAvg, diff, pct }
      })
      .filter((r) => r.current > 0 || r.compareAvg > 0)
      .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
  }, [comparisonData, comparisonMonths])

  const loadComparison = useCallback(async () => {
    if (!accessToken || !spreadsheetId || comparisonMonths.length === 0) return
    setComparisonLoading(true)
    setComparisonData(null)
    try {
      const current = await getExpenses(accessToken, spreadsheetId, selectedMonth)
      const compares: Record<string, ExpenseRow[]> = {}
      await Promise.all(
        comparisonMonths.map(async (ym) => {
          compares[ym] = await getExpenses(accessToken, spreadsheetId, ym)
        })
      )
      setComparisonData({ current, compares })
    } catch {
      setComparisonData(null)
    } finally {
      setComparisonLoading(false)
    }
  }, [accessToken, spreadsheetId, selectedMonth, comparisonMonths])

  useEffect(() => {
    if (comparisonMonths.length === 0) {
      setComparisonData(null)
      return
    }
    if (comparisonDialogOpen && accessToken && spreadsheetId) {
      loadComparison()
    }
  }, [comparisonDialogOpen, comparisonMonths, accessToken, spreadsheetId, loadComparison])

  const toggleComparisonMonth = (ym: string) => {
    setComparisonMonths((prev) =>
      prev.includes(ym) ? prev.filter((m) => m !== ym) : [...prev, ym].sort()
    )
  }

  const openComparisonDialog = () => {
    setComparisonMonths(defaultComparisonMonths)
    setComparisonData(null)
    setComparisonDialogOpen(true)
  }

  const goPrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number)
    const d = new Date(y, m - 2, 1)
    setSelectedMonth(getMonthFromDate(d.toISOString().slice(0, 10)))
  }

  const goNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number)
    const d = new Date(y, m, 1)
    const next = getMonthFromDate(d.toISOString().slice(0, 10))
    if (next > currentYearMonth()) return
    setSelectedMonth(next)
  }

  const canGoNext = selectedMonth < currentYearMonth()

  if (loading && expenses.length === 0 && availableMonths.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Menyiapkan spreadsheet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container max-w-7xl mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="font-semibold">Expense Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Mode terang" : "Mode gelap"}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 pl-2 pr-3">
                  {userPicture ? (
                    <img
                      src={userPicture}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                      {userName?.slice(0, 1).toUpperCase() ?? userEmail?.slice(0, 1).toUpperCase() ?? "?"}
                    </span>
                  )}
                  <span className="max-w-[140px] truncate font-medium">
                    {userName || userEmail || "User"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">
                  {userEmail}
                </div>
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Pilih bulan */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={goPrevMonth}
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue>
                  {formatMonthLabel(selectedMonth)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((ym) => (
                  <SelectItem key={ym} value={ym}>
                    {formatMonthLabel(ym)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={goNextMonth}
              disabled={!canGoNext}
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Pengeluaran {formatMonthLabel(selectedMonth)}</CardTitle>
            <CardDescription>Ringkasan bulan ini dari Google Sheets</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-2xl font-bold">...</span>
              </div>
            ) : (
              <p className="text-2xl font-bold text-primary">{formatRupiah(total)}</p>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Daftar Pengeluaran</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px] gap-2">
                <Filter className="h-4 w-4 shrink-0" />
                <SelectValue placeholder="Filter kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kategori</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={groupByCategory ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setGroupByCategory((g) => !g)}
            >
              <Layers className="h-4 w-4" />
              {groupByCategory ? "Group per kategori" : "Daftar rata"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={openComparisonDialog}
            >
              <BarChart3 className="h-4 w-4" />
              Komparasi
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Pengeluaran</DialogTitle>
                <DialogDescription>
                  Data disimpan di sheet bulan sesuai tanggal yang dipilih.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Tanggal</Label>
                    <Input
                      id="date"
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Jumlah (Rp)</Label>
                  <Input
                    id="amount"
                    type="text"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        amount: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Catatan (opsional)</Label>
                  <Input
                    id="note"
                    placeholder="Contoh: Makan siang"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={comparisonDialogOpen} onOpenChange={setComparisonDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" showClose>
              <DialogHeader className="shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Komparasi Pengeluaran
                </DialogTitle>
                <DialogDescription>
                  Bandingkan {formatMonthLabel(selectedMonth)} dengan bulan lain (maks. 3 bulan sebelum atau sesudah) untuk melihat kategori yang perlu diperbaiki.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
                <div className="space-y-2 shrink-0">
                  <Label>Bulan pembanding (bisa pilih lebih dari satu, maks. 3 bulan sebelum/sesudah):</Label>
                  <div className="flex flex-wrap gap-3 pt-1">
                    {comparisonMonthOptions.map((ym) => (
                      <label
                        key={ym}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={comparisonMonths.includes(ym)}
                          onChange={() => toggleComparisonMonth(ym)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span>{formatMonthLabel(ym)}</span>
                      </label>
                    ))}
                  </div>
                  {comparisonMonths.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Terpilih: {comparisonMonths.map(formatMonthLabel).join(", ")}
                    </p>
                  )}
                </div>
                {comparisonMonthOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground shrink-0">
                    Tidak ada bulan lain untuk dibandingkan.
                  </p>
                )}
                {comparisonMonths.length === 0 && !comparisonLoading && (
                  <p className="text-sm text-muted-foreground shrink-0">
                    Centang minimal satu bulan di atas untuk memuat komparasi.
                  </p>
                )}
                {comparisonLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground shrink-0">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Memuat data...
                  </div>
                ) : comparisonData && comparisonByCategory.length > 0 ? (
                  <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
                    <div className="rounded-lg border overflow-auto min-h-0 min-w-0 flex-1">
                      <Table className="min-w-max">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kategori</TableHead>
                            <TableHead className="text-right whitespace-nowrap">{formatMonthLabel(selectedMonth)}</TableHead>
                            {comparisonMonths.map((ym) => (
                              <TableHead key={ym} className="text-right text-muted-foreground whitespace-nowrap">
                                {formatMonthLabel(ym)}
                              </TableHead>
                            ))}
                            <TableHead className="text-right whitespace-nowrap">Selisih vs rata-rata</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Perubahan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparisonByCategory.map((row) => (
                            <TableRow key={row.category}>
                              <TableCell className="font-medium">{row.category}</TableCell>
                              <TableCell className="text-right">{formatRupiah(row.current)}</TableCell>
                              {comparisonMonths.map((ym) => (
                                <TableCell key={ym} className="text-right text-muted-foreground">
                                  {formatRupiah(row.byMonth[ym] ?? 0)}
                                </TableCell>
                              ))}
                              <TableCell className={`text-right whitespace-nowrap ${row.diff > 0 ? "text-destructive" : row.diff < 0 ? "text-green-600 dark:text-green-400" : ""}`}>
                                {row.diff >= 0 ? "+" : ""}{formatRupiah(row.diff)}
                              </TableCell>
                              <TableCell className={`text-right whitespace-nowrap ${row.pct > 0 ? "text-destructive" : row.pct < 0 ? "text-green-600 dark:text-green-400" : ""}`}>
                                <span className="inline-flex items-center justify-end gap-1">
                                  {row.pct > 0 && <TrendingUp className="h-4 w-4 shrink-0" />}
                                  {row.pct < 0 && <TrendingDown className="h-4 w-4 shrink-0" />}
                                  {row.pct > 0 ? "+" : ""}{row.pct}%
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {comparisonByCategory.some((r) => r.pct > 0) && (
                      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 p-3 space-y-1 shrink-0">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Perlu diperhatikan (naik vs rata-rata bulan pembanding):</p>
                        <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside">
                          {comparisonByCategory
                            .filter((r) => r.pct > 0)
                            .slice(0, 5)
                            .map((r) => (
                              <li key={r.category}>
                                <strong>{r.category}</strong> naik {r.pct}% (+{formatRupiah(r.diff)})
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : comparisonData && comparisonByCategory.length === 0 ? (
                  <p className="py-6 text-center text-muted-foreground text-sm shrink-0">
                    Tidak ada data pengeluaran di bulan-bulan tersebut untuk dibandingkan.
                  </p>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading && expenses.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat...
              </div>
            ) : expenses.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <p className="text-muted-foreground text-sm">
                  Belum ada pengeluaran di {formatMonthLabel(selectedMonth)}. Klik &quot;Tambah&quot; untuk mencatat.
                </p>
                <p className="text-muted-foreground text-xs max-w-md mx-auto">
                  Jika data seharusnya ada tapi tidak muncul, pastikan hanya ada 1 spreadsheet &quot;Expense Tracker&quot; di Google Drive Anda.
                </p>
              </div>
            ) : (
              <>
                {filterCategory !== "all" && (
                  <p className="px-4 pt-3 text-sm text-muted-foreground">
                    Total yang ditampilkan: {formatRupiah(filteredTotal)} ({filteredExpenses.length} item)
                  </p>
                )}
                {groupByCategory ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedByCategory.map(([category, rows]) => {
                    const subtotal = rows.reduce((s, r) => s + r.amount, 0)
                    const sortedRows = [...rows].sort((a, b) => b.date.localeCompare(a.date))
                    return (
                      <React.Fragment key={category}>
                        <TableRow className="bg-muted/50 font-medium">
                          <TableCell colSpan={2}>{category}</TableCell>
                          <TableCell className="text-right">
                            {formatRupiah(subtotal)} ({rows.length} item)
                          </TableCell>
                          <TableCell />
                        </TableRow>
                        {sortedRows.map((row, i) => (
                          <TableRow key={`${row.date}-${row.amount}-${i}`}>
                            <TableCell className="w-0 opacity-0">{category}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(row.date)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatRupiah(row.amount)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.note || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
                ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedForTable.map((row, i) => (
                    <TableRow key={`${row.date}-${row.amount}-${i}`}>
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {formatRupiah(row.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.note || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex gap-3 text-sm text-muted-foreground">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <p>
            Jika data tidak muncul, pastikan hanya ada <strong className="text-foreground">1 spreadsheet bernama &quot;Expense Tracker&quot;</strong> di Google Drive Anda. Aplikasi memakai file pertama yang ditemukan berdasarkan nama.
          </p>
        </div>
      </main>
    </div>
  )
}
