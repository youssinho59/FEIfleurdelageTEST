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

      console.log('[Dictée] mimeType sélectionné:', mimeType || '(défaut navigateur)')

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        console.log('[Dictée] chunk reçu:', e.data.size, 'bytes')
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
      setTimer(0)
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
      console.log('[Dictée] Enregistrement démarré')
    } catch (err) {
      console.error('[Dictée] Erreur accès micro:', err)
      toast.error("Impossible d'accéder au microphone. Vérifiez les permissions.")
    }
  }

  const stopRecording = (): Promise<string> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current
      if (!mediaRecorder) {
        console.warn('[Dictée] stopRecording appelé sans mediaRecorder actif')
        return resolve('')
      }

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

        console.log('[Dictée] Blob audio:', audioBlob.size, 'bytes, type:', audioBlob.type, 'ext:', ext)
        console.log('[Dictée] Nombre de chunks:', chunksRef.current.length)

        if (audioBlob.size === 0) {
          console.error('[Dictée] Blob vide — aucun audio capturé')
          toast.error('Aucun audio capturé. Parlez plus près du micro et réessayez.')
          setIsTranscribing(false)
          mediaRecorder.stream.getTracks().forEach(t => t.stop())
          return resolve('')
        }

        const formData = new FormData()
        formData.append('audio', audioBlob, `audio.${ext}`)

        try {
          const { data: { session } } = await supabase.auth.getSession()
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

          console.log('[Dictée] Envoi vers Edge Function:', supabaseUrl + '/functions/v1/transcribe-audio')
          console.log('[Dictée] Session token présent:', !!session?.access_token)

          const response = await fetch(`${supabaseUrl}/functions/v1/transcribe-audio`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session?.access_token ?? ''}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
            },
            body: formData,
          })

          console.log('[Dictée] Réponse HTTP:', response.status, response.statusText)

          const result = await response.json()
          console.log('[Dictée] Résultat Edge Function:', result)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status} — ${result.error ?? response.statusText}`)
          }

          resolve(result.text || '')
        } catch (err) {
          console.error('[Dictée] Erreur transcription:', err)
          toast.error('La transcription a échoué. Réessayez.')
          resolve('')
        } finally {
          setIsTranscribing(false)
          mediaRecorder.stream.getTracks().forEach(t => t.stop())
        }
      }

      mediaRecorder.stop()
      console.log('[Dictée] Enregistrement arrêté, envoi en cours…')
    })
  }

  const formatTimer = () => {
    const m = Math.floor(timer / 60).toString().padStart(2, '0')
    const s = (timer % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return { isRecording, isTranscribing, startRecording, stopRecording, formatTimer }
}
