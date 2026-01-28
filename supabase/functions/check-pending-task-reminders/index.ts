import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Find tasks that:
    // 1. Have assignment_status = 'pending'
    // 2. Were assigned more than 1 hour ago (use updated_at as proxy)
    // 3. Haven't had a reminder sent in the last hour
    const { data: pendingTasks, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .select(`
        id,
        title,
        organization_id,
        created_by_user_id,
        assigned_user_id,
        last_reminder_sent_at,
        updated_at
      `)
      .eq("assignment_status", "pending")
      .not("created_by_user_id", "is", null)
      .not("assigned_user_id", "is", null)
      .lt("updated_at", oneHourAgo);

    if (tasksError) {
      console.error("Error fetching pending tasks:", tasksError);
      throw tasksError;
    }

    console.log(`Found ${pendingTasks?.length || 0} pending tasks older than 1 hour`);

    let remindersSent = 0;

    for (const task of pendingTasks || []) {
      // Skip if reminder was sent in the last hour
      if (task.last_reminder_sent_at) {
        const lastReminder = new Date(task.last_reminder_sent_at);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (lastReminder > hourAgo) {
          console.log(`Skipping task ${task.id} - reminder sent recently`);
          continue;
        }
      }

      // Get assignee name
      const { data: assigneeProfile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", task.assigned_user_id)
        .single();

      const assigneeName = assigneeProfile?.full_name || "The assignee";

      // Create notification for the task creator
      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: task.created_by_user_id,
          organization_id: task.organization_id,
          type: "task_request_reminder",
          title: "Task Request Pending",
          message: `${assigneeName} has not responded to your task request yet: ${task.title || "Untitled"}`,
          reference_id: task.id,
          reference_type: "task",
        });

      if (notifError) {
        console.error(`Error creating reminder notification for task ${task.id}:`, notifError);
        continue;
      }

      // Update task to record reminder was sent
      const { error: updateError } = await supabaseAdmin
        .from("tasks")
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq("id", task.id);

      if (updateError) {
        console.error(`Error updating last_reminder_sent_at for task ${task.id}:`, updateError);
      } else {
        remindersSent++;
        console.log(`Sent reminder for task ${task.id}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${remindersSent} reminder notifications`,
        tasksChecked: pendingTasks?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error in check-pending-task-reminders:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});