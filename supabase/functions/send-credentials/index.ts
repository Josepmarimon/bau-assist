import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailData {
  to: string
  subject: string
  html: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user making the request
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get request body
    const { subjectId } = await req.json()

    if (!subjectId) {
      return new Response(
        JSON.stringify({ error: 'Subject ID is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get subject details including credentials
    const { data: subject, error: subjectError } = await supabaseClient
      .from('subjects')
      .select('id, code, name, username, password')
      .eq('id', subjectId)
      .single()

    if (subjectError || !subject) {
      return new Response(
        JSON.stringify({ error: 'Subject not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!subject.username || !subject.password) {
      return new Response(
        JSON.stringify({ error: 'Subject does not have credentials configured' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get teachers assigned to this subject
    const { data: assignments, error: assignmentsError } = await supabaseClient
      .from('teaching_assignments')
      .select(`
        teacher:teachers(
          id,
          name,
          email
        )
      `)
      .eq('subject_id', subjectId)

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
      return new Response(
        JSON.stringify({ error: 'Error fetching teacher assignments' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract unique teachers with emails
    const teachers = assignments
      ?.map(a => a.teacher)
      .filter((teacher, index, self) => 
        teacher?.email && 
        index === self.findIndex(t => t?.id === teacher?.id)
      ) || []

    if (teachers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No teachers with email addresses found for this subject' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Prepare email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Credencials Guia Docent - ${subject.name}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0ea5e9; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
            .label { font-weight: bold; color: #6b7280; margin-bottom: 5px; }
            .value { font-family: monospace; background: #f3f4f6; padding: 10px; border-radius: 4px; margin-bottom: 15px; }
            .footer { margin-top: 30px; font-size: 14px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Credencials Guia Docent</h1>
            </div>
            <div class="content">
              <p>Benvolgut/da professor/a,</p>
              
              <p>Us fem arribar les credencials d'accés per a la guia docent de l'assignatura:</p>
              
              <h2 style="color: #1f2937;">${subject.name}</h2>
              <p style="color: #6b7280;">Codi: ${subject.code}</p>
              
              <div class="credentials">
                <div class="label">Usuari:</div>
                <div class="value">${subject.username}</div>
                
                <div class="label">Contrasenya:</div>
                <div class="value">${subject.password}</div>
              </div>
              
              <p>Aquestes credencials us permetran accedir a la plataforma de guies docents per actualitzar la informació de l'assignatura.</p>
              
              <div class="footer">
                <p>Aquest és un missatge automàtic generat per BAU Assist. Si teniu alguna incidència, poseu-vos en contacte amb el departament corresponent.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    // Send emails using Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const emailPromises = teachers.map(teacher => 
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'BAU Assist <no-reply@bau-assist.com>',
          to: teacher.email,
          subject: `Credencials Guia Docent - ${subject.name} (${subject.code})`,
          html: emailHtml,
        }),
      })
    )

    const results = await Promise.allSettled(emailPromises)
    
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    // Log the email send event
    await supabaseClient
      .from('email_logs')
      .insert({
        subject_id: subjectId,
        sent_by: user.id,
        recipients_count: teachers.length,
        successful_count: successful,
        failed_count: failed,
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful,
        failed: failed,
        total: teachers.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in send-credentials function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})