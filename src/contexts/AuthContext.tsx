import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.metadata.readonly"
const USERINFO_SCOPES = "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
const SCOPES = `${SHEETS_SCOPE} ${DRIVE_READONLY_SCOPE} ${USERINFO_SCOPES}`
const STORAGE_ACCESS_TOKEN = "expense_tracker_access_token"
const STORAGE_SPREADSHEET_ID = "expense_tracker_spreadsheet_id"
const STORAGE_USER_EMAIL = "expense_tracker_user_email"
const STORAGE_USER_NAME = "expense_tracker_user_name"
const STORAGE_USER_PICTURE = "expense_tracker_user_picture"
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

export type AuthState = {
  isReady: boolean
  isSignedIn: boolean
  accessToken: string | null
  spreadsheetId: string | null
  userEmail: string | null
  userName: string | null
  userPicture: string | null
  error: string | null
}

type AuthContextValue = AuthState & {
  signIn: () => Promise<void>
  signOut: () => void
  ensureToken: () => Promise<string | null>
  setSpreadsheetId: (id: string) => void
  clearError: () => void
}

const initialState: AuthState = {
  isReady: false,
  isSignedIn: false,
  accessToken: null,
  spreadsheetId: localStorage.getItem(STORAGE_SPREADSHEET_ID),
  userEmail: localStorage.getItem(STORAGE_USER_EMAIL),
  userName: localStorage.getItem(STORAGE_USER_NAME),
  userPicture: localStorage.getItem(STORAGE_USER_PICTURE),
  error: null,
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchUserInfo(accessToken: string): Promise<{ email: string; name: string; picture: string } | null> {
  try {
    const res = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      email: data.email ?? "",
      name: data.name ?? "",
      picture: data.picture ?? "",
    }
  } catch {
    return null
  }
}

function getClientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!id) {
    throw new Error(
      "VITE_GOOGLE_CLIENT_ID is not set. Add it in .env and restart the dev server."
    )
  }
  return id
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }))
  }, [])

  const setSpreadsheetId = useCallback((id: string) => {
    localStorage.setItem(STORAGE_SPREADSHEET_ID, id)
    setState((s) => ({ ...s, spreadsheetId: id }))
  }, [])

  const requestToken = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!window.google?.accounts?.oauth2) {
        setState((s) => ({
          ...s,
          isReady: true,
          error: "Google Sign-In belum dimuat. Refresh halaman.",
        }))
        resolve(null)
        return
      }
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: getClientId(),
          scope: SCOPES,
          callback: async (response) => {
            if (response.error) {
              setState((s) => ({ ...s, error: response.error ?? "Login gagal" }))
              resolve(null)
              return
            }
            const token = response.access_token
            localStorage.setItem(STORAGE_ACCESS_TOKEN, token)
            setState((s) => ({
              ...s,
              isSignedIn: true,
              accessToken: token,
              spreadsheetId: s.spreadsheetId ?? localStorage.getItem(STORAGE_SPREADSHEET_ID),
              error: null,
            }))
            const user = await fetchUserInfo(token)
            if (user) {
              localStorage.setItem(STORAGE_USER_EMAIL, user.email)
              localStorage.setItem(STORAGE_USER_NAME, user.name)
              localStorage.setItem(STORAGE_USER_PICTURE, user.picture)
              setState((s) => ({
                ...s,
                userEmail: user.email,
                userName: user.name,
                userPicture: user.picture,
              }))
            }
            resolve(token)
          },
        })
        client.requestAccessToken({ prompt: "consent" })
      } catch (e) {
        const message = e instanceof Error ? e.message : "Login gagal"
        setState((s) => ({ ...s, isReady: true, error: message }))
        resolve(null)
      }
    })
  }, [])

  const signIn = useCallback(async () => {
    setState((s) => ({ ...s, error: null }))
    await requestToken()
  }, [requestToken])

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_USER_EMAIL)
    localStorage.removeItem(STORAGE_USER_NAME)
    localStorage.removeItem(STORAGE_USER_PICTURE)
    const keptSpreadsheetId = localStorage.getItem(STORAGE_SPREADSHEET_ID)
    setState({
      isReady: true,
      isSignedIn: false,
      accessToken: null,
      spreadsheetId: keptSpreadsheetId,
      userEmail: null,
      userName: null,
      userPicture: null,
      error: null,
    })
  }, [])

  const ensureToken = useCallback(async (): Promise<string | null> => {
    const stored = localStorage.getItem(STORAGE_ACCESS_TOKEN)
    if (stored) {
      const hasProfile = localStorage.getItem(STORAGE_USER_NAME) ?? localStorage.getItem(STORAGE_USER_PICTURE)
      setState((s) => ({
        ...s,
        isSignedIn: true,
        accessToken: stored,
        spreadsheetId: s.spreadsheetId ?? localStorage.getItem(STORAGE_SPREADSHEET_ID),
        userEmail: s.userEmail ?? localStorage.getItem(STORAGE_USER_EMAIL),
        userName: s.userName ?? localStorage.getItem(STORAGE_USER_NAME),
        userPicture: s.userPicture ?? localStorage.getItem(STORAGE_USER_PICTURE),
        isReady: true,
      }))
      if (!hasProfile) {
        const user = await fetchUserInfo(stored)
        if (user) {
          localStorage.setItem(STORAGE_USER_EMAIL, user.email)
          localStorage.setItem(STORAGE_USER_NAME, user.name)
          localStorage.setItem(STORAGE_USER_PICTURE, user.picture)
          setState((s) => ({ ...s, userEmail: user.email, userName: user.name, userPicture: user.picture }))
        }
      }
      return stored
    }
    return requestToken()
  }, [requestToken])

  useEffect(() => {
    const checkGoogle = () => {
      if (window.google?.accounts?.oauth2) {
        const storedToken = localStorage.getItem(STORAGE_ACCESS_TOKEN)
        setState((s) => ({
          ...s,
          isReady: true,
          isSignedIn: !!storedToken,
          accessToken: storedToken,
          userEmail: s.userEmail ?? localStorage.getItem(STORAGE_USER_EMAIL),
          userName: s.userName ?? localStorage.getItem(STORAGE_USER_NAME),
          userPicture: s.userPicture ?? localStorage.getItem(STORAGE_USER_PICTURE),
        }))
        return
      }
      setTimeout(checkGoogle, 100)
    }
    checkGoogle()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn,
      signOut,
      ensureToken,
      setSpreadsheetId,
      clearError,
    }),
    [state, signIn, signOut, ensureToken, setSpreadsheetId, clearError]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
