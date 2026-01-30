import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@bosplan.com";

    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      throw new Error("Email service is not configured");
    }

    const { organizationName, fullName, email } = await req.json();

    console.log("Sending welcome email to:", { fullName, organizationName });

    // Get the recipient email from the authorization header if not provided
    let recipientEmail = email;
    
    if (!recipientEmail) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        // Extract user email from JWT if needed
        // For now, we'll skip if no email is provided
        console.log("No email provided and cannot extract from auth header");
        return new Response(
          JSON.stringify({ success: true, message: "No email to send to" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!recipientEmail) {
      console.log("Skipping email - no recipient");
      return new Response(
        JSON.stringify({ success: true, message: "No recipient email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Bosplan</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p>Hi there,</p>
          
          <p>Welcome to Bosplan — your account has now been successfully created.</p>
          
          <p>You can now log in and start using your Bosplan account.</p>
          
          <p>If you didn't create this account, please contact the Bosplan support team immediately.</p>
          
          <p style="margin-top: 30px;">
            Thanks,<br>
            Bosplan<br>
            <a href="mailto:support@bosplan.com" style="color: #0d7377;">support@bosplan.com</a><br>
            <a href="https://www.bosplan.com" style="color: #0d7377;">www.bosplan.com</a>
          </p>
        </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: "Welcome to Bosplan!",
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${response.status}`);
    }

    const result = await response.json();
    console.log("Email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error sending welcome email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
