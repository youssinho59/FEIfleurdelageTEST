import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('ASSEMBLYAI_API_KEY')
    console.log('[transcribe-audio] API key présente:', !!apiKey)

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ASSEMBLYAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      console.error('[transcribe-audio] Pas de fichier audio dans la requête')
      return new Response(
        JSON.stringify({ error: 'No audio file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[transcribe-audio] Fichier reçu:', audioFile.name, audioFile.size, 'bytes, type:', audioFile.type)

    const arrayBuffer = await audioFile.arrayBuffer()
    const audioData = new Uint8Array(arrayBuffer)

    // Étape 1 : upload vers AssemblyAI
    console.log('[transcribe-audio] Upload vers AssemblyAI...')
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: audioData,
    })

    const uploadResult = await uploadResponse.json()
    console.log('[transcribe-audio] Upload response:', JSON.stringify(uploadResult))

    if (!uploadResult.upload_url) {
      throw new Error('Upload failed: ' + JSON.stringify(uploadResult))
    }

    // Étape 2 : demande de transcription
    console.log('[transcribe-audio] Création transcript...')
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: uploadResult.upload_url,
        language_detection: true,
      }),
    })

    const transcriptData = await transcriptResponse.json()
    console.log('[transcribe-audio] Transcript créé, id:', transcriptData.id, 'status:', transcriptData.status)

    if (!transcriptData.id) {
      throw new Error('Transcript creation failed: ' + JSON.stringify(transcriptData))
    }

    // Étape 3 : polling
    let transcript = transcriptData
    let pollCount = 0
    while (transcript.status === 'processing' || transcript.status === 'queued') {
      await new Promise(r => setTimeout(r, 1000))
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptData.id}`, {
        headers: { 'Authorization': apiKey },
      })
      transcript = await pollResponse.json()
      pollCount++
      console.log(`[transcribe-audio] Poll #${pollCount} status:`, transcript.status)
    }

    console.log('[transcribe-audio] Transcription terminée, status:', transcript.status, 'text:', transcript.text?.slice(0, 100))

    if (transcript.status === 'error') throw new Error(transcript.error)

    return new Response(
      JSON.stringify({ text: transcript.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[transcribe-audio] Erreur:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
