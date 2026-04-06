import { useEffect, useState } from 'react'

interface Props {
  message: string
}

export default function ActionToast({ message }: Props) {
  const [visible, setVisible] = useState(false)
  const [current, setCurrent] = useState('')

  useEffect(() => {
    if (!message) return
    setCurrent(message)
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2500)
    return () => clearTimeout(t)
  }, [message])

  if (!visible || !current) return null

  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-auto cursor-pointer"
      onClick={() => setVisible(false)}
    >
      <div className="bg-black/93 border border-purple-700 rounded-2xl px-4 py-2.5 max-w-xs text-center">
        <span className="text-white font-bold text-sm">{current}</span>
      </div>
    </div>
  )
}
