import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
          <title>Welcome to BosPlan</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0d7377; margin-bottom: 10px;">Welcome to BosPlan!</h1>
          </div>
          
          <p>Hi ${fullName || "there"},</p>
          
          <p>Welcome to BosPlan! We're excited to have ${organizationName || "you"} on board.</p>
          
          <p>Your account has been successfully created and you can now start using all of our features:</p>
          
          <ul style="margin: 20px 0;">
            <li><strong>Task Flow</strong> - Manage your projects efficiently</li>
            <li><strong>Magic Merge</strong> - Combine and process documents</li>
            <li><strong>TaskPopulate</strong> - Auto-generate tasks from templates</li>
            <li><strong>Data Rooms</strong> - Secure document sharing</li>
          </ul>
          
          <p>If you have any questions, feel free to reach out to our support team.</p>
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            The BosPlan Team
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
        subject: `Welcome to BosPlan, ${fullName || ""}!`.trim(),
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
