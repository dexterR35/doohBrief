import { toast as _toast } from 'react-toastify'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export const toast = {
  success: (msg) => _toast.success(msg, { position: 'top-center', autoClose: 3000 }),
  error: (msg) => _toast.error(msg, { position: 'top-center', autoClose: false }),
  info: (msg) => _toast.info(msg, { position: 'top-center', autoClose: 3000 }),
  warn: (msg, opts) => _toast.warn(msg, { position: 'top-center', ...opts }),
  dismiss: (id) => _toast.dismiss(id),
  welcome: (name, role) => {
    const roleLabel = role === 'admin' ? 'Admin' : 'Member'
    _toast.info(`${getGreeting()}, ${name} 👋 — ${roleLabel}`, { position: 'top-center', autoClose: 5000 })
  },
}
