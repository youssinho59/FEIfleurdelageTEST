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

    // Étape 1 : upload du fichier audio vers AssemblyAI
    const audioBuffer = await audioFile.arrayBuffer()
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: audioBuffer,
    })

    if (!uploadResponse.ok) {
      const err = await uploadResponse.text()
      console.error('AssemblyAI upload error:', err)
      return new Response(
        JSON.stringify({ error: 'Upload error', detail: err }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { upload_url } = await uploadResponse.json()

    // Étape 2 : demande de transcription
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: 'fr',
      }),
    })

    if (!transcriptResponse.ok) {
      const err = await transcriptResponse.text()
      return new Response(
        JSON.stringify({ error: 'Transcript request error', detail: err }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { id: transcriptId } = await transcriptResponse.json()

    // Étape 3 : polling jusqu'à complétion (max 60s)
    const pollUrl = `https://api.assemblyai.com/v2/transcript/${transcriptId}`
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000))

      const pollResponse = await fetch(pollUrl, {
        headers: { 'Authorization': apiKey },
      })
      const result = await pollResponse.json()

      if (result.status === 'completed') {
        return new Response(
          JSON.stringify({ text: result.text || '' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (result.status === 'error') {
        return new Response(
          JSON.stringify({ error: 'Transcription failed', detail: result.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      // status === 'processing' ou 'queued' → on continue
    }

    return new Response(
      JSON.stringify({ error: 'Transcription timeout' }),
      { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
