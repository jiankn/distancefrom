/**
 * POST /api/contact
 *
 * Receives contact-form submissions and sends an email via Resend.
 * Free tier: 100 emails/day, 3 000/month — more than enough for a
 * contact form.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

const RESEND_URL = 'https://api.resend.com/emails';

export const POST: APIRoute = async ({ request }) => {
  /* ---- env ---- */
  const apiKey = import.meta.env.RESEND_API_KEY;
  const toEmail = import.meta.env.CONTACT_TO_EMAIL || 'boyz109@qq.com';

  if (!apiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Email service is not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  /* ---- parse form data ---- */
  let name: string, email: string, subject: string, message: string;
  try {
    const fd = await request.formData();
    name = (fd.get('name') as string)?.trim() ?? '';
    email = (fd.get('email') as string)?.trim() ?? '';
    subject = (fd.get('subject') as string)?.trim() ?? '';
    message = (fd.get('message') as string)?.trim() ?? '';

    // honeypot — if filled, silently succeed (bot trap)
    if (fd.get('_gotcha')) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid form data.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!name || !email || !subject || !message) {
    return new Response(
      JSON.stringify({ ok: false, error: 'All fields are required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  /* ---- send via Resend ---- */
  const subjectMap: Record<string, string> = {
    feedback: 'General Feedback',
    bug: 'Bug Report',
    feature: 'Feature Request',
    data: 'Data Correction',
    business: 'Business Inquiry',
    other: 'Other',
  };
  const subjectLabel = subjectMap[subject] ?? subject;

  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'DistanceFrom.co <onboarding@resend.dev>',
        to: [toEmail],
        reply_to: [email],
        subject: `[DistanceFrom] ${subjectLabel} — from ${name}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#0284c7;">New Contact Form Submission</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#64748b;width:100px;"><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;"><strong>Email</strong></td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
              <tr><td style="padding:8px 0;color:#64748b;"><strong>Subject</strong></td><td>${escapeHtml(subjectLabel)}</td></tr>
            </table>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">
            <div style="white-space:pre-wrap;line-height:1.6;color:#334155;">${escapeHtml(message)}</div>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">
            <p style="font-size:12px;color:#94a3b8;">Sent from distancefrom.co contact form</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('Resend API error:', res.status, body);
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to send email. Please try again later.' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Resend fetch error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Network error. Please try again later.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
