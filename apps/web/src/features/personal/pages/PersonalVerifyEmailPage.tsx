import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { personalApi } from '../api/personal.api'

type State = 'loading' | 'success' | 'error'

export default function PersonalVerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [state, setState] = useState<State>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setState('error'); setMessage('Enlace inválido.'); return }

    personalApi.verifyEmail(token)
      .then((res) => { setState('success'); setMessage(res.message) })
      .catch(async (err) => {
        let msg = 'Enlace inválido o expirado.'
        try {
          const body = await err.response?.json()
          if (body?.message) msg = body.message
        } catch { /* ignore */ }
        setState('error')
        setMessage(msg)
      })
  }, [token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full p-8 text-center">
        {state === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Verificando tu correo...</p>
          </>
        )}
        {state === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Correo confirmado!</h1>
            <p className="text-slate-500 mb-8">{message}</p>
            <Link
              to="/personal/login"
              className="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-3 px-6 rounded-lg transition-colors"
            >
              Iniciar sesión
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-9 h-9 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Enlace inválido</h1>
            <p className="text-slate-500 mb-8">{message}</p>
            <Link to="/personal/login" className="text-sm text-blue-600 hover:underline">
              Volver al inicio de sesión
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
