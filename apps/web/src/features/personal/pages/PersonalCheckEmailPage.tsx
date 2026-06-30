import { useSearchParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { MailOpen, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useResendVerification } from '../hooks/usePersonalAuth'

export default function PersonalCheckEmailPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [sent, setSent] = useState(false)
  const resend = useResendVerification()

  const handleResend = () => {
    if (!email) return
    resend.mutate(email, { onSuccess: () => setSent(true) })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <MailOpen className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Revisa tu correo</h1>
        <p className="text-slate-500 mb-1">
          Te enviamos un enlace de confirmación a:
        </p>
        {email && (
          <p className="font-semibold text-slate-800 mb-6 break-all">{email}</p>
        )}
        <p className="text-sm text-slate-400 mb-8">
          Haz clic en el botón del correo para activar tu cuenta. El enlace expira en 24 horas.
        </p>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resend.isPending || sent}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${resend.isPending ? 'animate-spin' : ''}`} />
            {sent ? 'Enlace enviado' : 'Reenviar correo'}
          </Button>
          <Link to="/personal/login" className="block text-sm text-blue-600 hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
