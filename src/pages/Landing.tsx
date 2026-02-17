import { Wallet, Shield, Sheet, Sun, Moon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"

const FAQ_ITEMS = [
  {
    q: "Apakah aplikasi ini menyimpan data saya?",
    a: "Tidak. Aplikasi ini hanya menggunakan Google (login dengan akun Google dan penyimpanan di Google Sheets). Data pengeluaran disimpan di spreadsheet milik Anda di Google Drive. Kami tidak memiliki server sendiri dan tidak menyimpan data Anda di mana pun.",
  },
  {
    q: "Di mana data saya disimpan?",
    a: "Semua data disimpan di Google Sheets dalam akun Google Anda. Setelah login, aplikasi hanya mengakses spreadsheet \"Expense Tracker\" di Drive Anda untuk membaca dan menulis catatan pengeluaran.",
  },
]

export function Landing() {
  const { signIn, error, clearError, isReady } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const handleSignIn = () => {
    clearError()
    signIn()
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex flex-col items-center justify-center p-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Mode terang" : "Mode gelap"}
      >
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
      <div className="w-full max-w-4xl space-y-8 text-center">
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <Wallet className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Expense Tracker
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Catat pengeluaran kamu dengan aman di Google Sheets milikmu. Login sekali, data tetap di akun kamu.
          </p>
        </div>

        <div className="grid gap-3 text-left max-w-md mx-auto sm:max-w-none sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg border bg-card/80 p-3">
            <Sheet className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Data di Google Sheets kamu</p>
              <p className="text-xs text-muted-foreground">Setiap user punya spreadsheet sendiri. Tidak tercampur.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-card/80 p-3">
            <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Tanpa backend, tetap aman</p>
              <p className="text-xs text-muted-foreground">OAuth Google resmi. Token hanya di browser kamu.</p>
            </div>
          </div>
        </div>

        <Card className="border-2 border-primary/20 bg-card/90 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Mulai sekarang</CardTitle>
            <CardDescription>
              Login dengan Google untuk mengakses expense tracker dan menyimpan data ke Sheets kamu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md py-2 px-3">
                {error}
              </p>
            )}
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={handleSignIn}
              disabled={!isReady}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Login dengan Google
            </Button>
          </CardContent>
        </Card>

        <section className="w-full max-w-4xl mt-8 text-left p-6 sm:p-8 space-y-6">
          <div className="space-y-2 text-center">
            <Badge variant="secondary" className="font-medium">
              FAQ
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Pertanyaan yang sering diajukan
            </h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Informasi singkat tentang cara kerja aplikasi dan keamanan data Anda.
            </p>
          </div>
          <ul className="space-y-6 list-none pl-0">
            {FAQ_ITEMS.map((item, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="space-y-1 pt-0.5">
                  <h3 className="font-semibold text-foreground">
                    {item.q}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
