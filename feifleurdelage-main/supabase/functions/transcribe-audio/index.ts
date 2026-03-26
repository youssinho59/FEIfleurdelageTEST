import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('ASSEMBLYAI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ASSEMBLYAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'No audio file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[transcribe-audio] Fichier reçu:', audioFile.name, audioFile.size, 'bytes')

    // Étape 1 : Upload
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioData = new Uint8Array(arrayBuffer)

    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: audioData,
    })

    if (!uploadResponse.ok) {
      const err = await uploadResponse.text()
      console.error('[transcribe-audio] Upload échoué:', err)
      return new Response(
        JSON.stringify({ error: 'Upload failed: ' + err }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const uploadResult = await uploadResponse.json()
    console.log('[transcribe-audio] Upload OK, url:', uploadResult.upload_url)

    // Étape 2 : Créer transcript — SANS speech_model ni language_detection
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: uploadResult.upload_url,
      }),
    })

    if (!transcriptResponse.ok) {
      const err = await transcriptResponse.text()
      console.error('[transcribe-audio] Transcript création échouée:', err)
      return new Response(
        JSON.stringify({ error: 'Transcript creation failed: ' + err }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const transcriptData = await transcriptResponse.json()
    console.log('[transcribe-audio] Transcript id:', transcriptData.id, 'status:', transcriptData.status)

    if (!transcriptData.id) {
      return new Response(
        JSON.stringify({ error: 'No transcript ID returned: ' + JSON.stringify(transcriptData) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Étape 3 : Polling (max 25 tentatives = ~25 secondes)
    let transcript = transcriptData
    let pollCount = 0
    const maxPolls = 25

    while (
      (transcript.status === 'processing' || transcript.status === 'queued') &&
      pollCount < maxPolls
    ) {
      await new Promise(r => setTimeout(r, 1000))
      const pollResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptData.id}`,
        { headers: { 'Authorization': apiKey } }
      )
      transcript = await pollResponse.json()
      pollCount++
      console.log('[transcribe-audio] Poll #' + pollCount + ' status:', transcript.status)
    }

    if (transcript.status === 'error') {
      console.error('[transcribe-audio] Transcription error:', transcript.error)
      return new Response(
        JSON.stringify({ error: transcript.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (transcript.status !== 'completed') {
      return new Response(
        JSON.stringify({ error: 'Transcription timeout after ' + maxPolls + 's, status: ' + transcript.status }),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[transcribe-audio] Transcription OK:', transcript.text?.slice(0, 100))
    return new Response(
      JSON.stringify({ text: transcript.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[transcribe-audio] Exception:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
