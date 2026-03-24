import { useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export const useWhisperDictation = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [timer, setTimer] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Choix du mimeType : webm sur Chrome/Firefox, mp4 sur Safari
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : ''

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
      setTimer(0)
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    } catch {
      toast.error("Impossible d'accéder au microphone. Vérifiez les permissions.")
    }
  }

  const stopRecording = (): Promise<string> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current
      if (!mediaRecorder) return resolve('')

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      mediaRecorder.onstop = async () => {
        setIsRecording(false)
        setIsTranscribing(true)

        const mimeType = mediaRecorder.mimeType || 'audio/webm'
        const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        const formData = new FormData()
        formData.append('audio', audioBlob, `audio.${ext}`)

        try {
          // Utilise fetch directement pour garantir l'envoi correct de FormData
          const { data: { session } } = await supabase.auth.getSession()
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
          const response = await fetch(`${supabaseUrl}/functions/v1/transcribe-audio`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session?.access_token ?? ''}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
            },
            body: formData,
          })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const result = await response.json()
          resolve(result.text || '')
        } catch {
          toast.error('La transcription a échoué. Réessayez.')
          resolve('')
        } finally {
          setIsTranscribing(false)
          mediaRecorder.stream.getTracks().forEach(t => t.stop())
        }
      }

      mediaRecorder.stop()
    })
  }

  const formatTimer = () => {
    const m = Math.floor(timer / 60).toString().padStart(2, '0')
    const s = (timer % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return { isRecording, isTranscribing, startRecording, stopRecording, formatTimer }
}
