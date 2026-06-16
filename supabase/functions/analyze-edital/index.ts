import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, provider, config } = await req.json()

    // Get the provider from request or fallback
    const targetProvider = provider || config?.provider || 'openai'
    let result = ''

    if (targetProvider === 'openai') {
      const apiKey = Deno.env.get('OPENAI_API_KEY')
      if (!apiKey) throw new Error('OPENAI_API_KEY não está configurada no backend')

      const model = config?.openai_model || 'gpt-4o'
      const prompt = config?.prompt || ''

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: `Analise o seguinte edital de licitação:\n\n${text}` }
          ],
          max_tokens: 3000,
          temperature: 0.3
        })
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro OpenAI: ${resp.status}`)
      }
      const data = await resp.json()
      result = data.choices[0].message.content

    } else if (targetProvider === 'mistral') {
      const apiKey = Deno.env.get('MISTRAL_API_KEY')
      if (!apiKey) throw new Error('MISTRAL_API_KEY não está configurada no backend')

      const model = config?.mistral_model || 'mistral-large-latest'
      const prompt = config?.prompt || ''

      const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: `Analise o seguinte edital de licitação:\n\n${text}` }
          ],
          max_tokens: 3000,
          temperature: 0.3
        })
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.message || `Erro Mistral: ${resp.status}`)
      }
      const data = await resp.json()
      result = data.choices[0].message.content
      
    } else {
      throw new Error(`Provedor não suportado no backend: ${targetProvider}`)
    }

    return new Response(
      JSON.stringify({ response: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
