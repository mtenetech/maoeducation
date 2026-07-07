import { MessageCircle } from 'lucide-react'

const WHATSAPP_NUMBER = '593981968559'
const WHATSAPP_MESSAGE = 'Hola, necesito ayuda con Auleka'

export function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 transition-transform"
    >
      <MessageCircle className="w-7 h-7" fill="white" strokeWidth={0} />
    </a>
  )
}
