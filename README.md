# Expense Tracker

Aplikasi catat pengeluaran (expense tracker) berbasis React yang deploy di **GitHub Pages**. Login dengan Google, data disimpan di **Google Sheets** milik masing-masing user.

## Arsitektur

- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Auth**: Google OAuth 2.0 (Identity Services) — tanpa backend
- **Storage**: Google Sheets API — setiap user punya spreadsheet sendiri

```
User Browser → GitHub Pages (React) → Google OAuth → Google Sheets API → User's Google Sheet
```

## Fitur

- **Landing page** saat belum login: deskripsi app + tombol "Login dengan Google"
- **Expense tracker** setelah login: tambah pengeluaran (tanggal, kategori, jumlah, catatan), list pengeluaran, total
- Data tersimpan di sheet **Expense Tracker** di Google Drive user

## Setup

### 1. Google Cloud Project

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat project baru atau pilih project yang ada.
3. **APIs & Services → Library**  
   - Aktifkan **Google Sheets API**  
   - Aktifkan **Google Drive API** (untuk mencari spreadsheet by nama "Expense Tracker")  
   - Aktifkan **Google Identity** (OAuth) jika perlu
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**  
   - Application type: **Web application**  
   - Authorized JavaScript origins:  
     - Development: `http://localhost:5173`  
     - Production: `https://<username>.github.io`  
   - Authorized redirect URIs (untuk OAuth flow):  
     - Production: `https://<username>.github.io/expense-tracker/`  
   - Copy **Client ID**.

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env` dan isi:

```
VITE_GOOGLE_CLIENT_ID=<client-id-kamu>.apps.googleusercontent.com
```

### 3. Install & Jalankan

```bash
npm install
npm run dev
```

Buka http://localhost:5173. Login dengan Google, lalu gunakan expense tracker.

### 4. Build & Deploy ke GitHub Pages

**Base path**: Di `vite.config.ts` sudah diset `base: '/expense-tracker/'`. Sesuaikan dengan nama repo kamu (misalnya repo `expense-tracker` → base tetap `/expense-tracker/`).

```bash
npm run build
```

Deploy folder `dist/` ke GitHub Pages:

- **GitHub Actions**: Repo ini sudah include workflow `.github/workflows/deploy-pages.yml`. Set Pages source ke **GitHub Actions**, lalu di **Settings → Secrets and variables → Actions** tambah secret `VITE_GOOGLE_CLIENT_ID` berisi Client ID Google OAuth kamu. Setiap push ke `main` akan build dan deploy otomatis.
- **Atau** jalankan `npm run build` lokal lalu push isi `dist/` ke branch `gh-pages`, dan set Pages source ke branch `gh-pages`.

**Penting**: Di Google Cloud Console, tambahkan **Authorized JavaScript origins** dan **Authorized redirect URIs** untuk URL production kamu, misalnya:

- `https://<username>.github.io`
- `https://<username>.github.io/expense-tracker/`

## Tech Stack

- React 18, TypeScript, Vite
- Tailwind CSS, shadcn/ui (Radix)
- React Router, Google Identity (GSI), Google Sheets API

## Lisensi

MIT
