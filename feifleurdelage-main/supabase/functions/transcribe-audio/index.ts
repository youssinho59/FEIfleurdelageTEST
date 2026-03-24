import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioData = new Uint8Array(arrayBuffer)

    // 1. Upload audio vers AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') || '',
        'Content-Type': 'application/octet-stream',
      },
      body: audioData,
    })
    const { upload_url } = await uploadResponse.json()

    // 2. Lance la transcription
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: 'fr',
      }),
    })
    const { id } = await transcriptResponse.json()

    // 3. Polling jusqu'à completion
    let transcript = null
    while (!transcript || transcript.status === 'processing' || transcript.status === 'queued') {
      await new Promise(r => setTimeout(r, 1000))
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: { 'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') || '' },
      })
      transcript = await pollResponse.json()
    }

    if (transcript.status === 'error') throw new Error(transcript.error)

    return new Response(
      JSON.stringify({ text: transcript.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
