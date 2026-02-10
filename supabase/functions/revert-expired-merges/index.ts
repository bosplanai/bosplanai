import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];

    // Find temporary merges that have expired (end date <= today) and are still pending revert
    const { data: expiredMerges, error: fetchError } = await supabaseAdmin
      .from("task_merge_logs")
      .select("*")
      .eq("status", "pending_revert")
      .eq("merge_type", "temporary")
      .lte("temporary_end_date", today);

    if (fetchError) {
      console.error("Error fetching expired merges:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredMerges?.length || 0} expired temporary merges to revert`);

    let revertedCount = 0;

    for (const merge of expiredMerges || []) {
      try {
        const tasks = Array.isArray(merge.tasks_transferred)
          ? merge.tasks_transferred
          : JSON.parse(merge.tasks_transferred || "[]");

        const taskIds = tasks.map((t: { id: string }) => t.id);

        for (const taskId of taskIds) {
          // Remove target user assignment
          await supabaseAdmin
            .from("task_assignments")
            .delete()
            .eq("task_id", taskId)
            .eq("user_id", merge.target_user_id);

          // Check if source user already has an assignment
          const { data: existing } = await supabaseAdmin
            .from("task_assignments")
            .select("id")
            .eq("task_id", taskId)
            .eq("user_id", merge.source_user_id)
            .single();

          if (!existing) {
            // Re-assign to original owner
            await supabaseAdmin
              .from("task_assignments")
              .insert({
                task_id: taskId,
                user_id: merge.source_user_id,
                assigned_by: merge.performed_by,
                status: "accepted",
              });
          }

          // Update the task's primary assignee back to the source user
          await supabaseAdmin
            .from("tasks")
            .update({
              assigned_user_id: merge.source_user_id,
              assignment_status: "accepted",
            })
            .eq("id", taskId);
        }

        // Mark merge as reverted
        const { error: updateError } = await supabaseAdmin
          .from("task_merge_logs")
          .update({
            status: "reverted",
            reverted_at: new Date().toISOString(),
          })
          .eq("id", merge.id);

        if (updateError) {
          console.error(`Error updating merge log ${merge.id}:`, updateError);
          continue;
        }

        // Notify the admin who performed the merge
        await supabaseAdmin
          .from("notifications")
          .insert({
            user_id: merge.performed_by,
            organization_id: merge.organization_id,
            type: "merge_auto_reverted",
            title: "Temporary Merge Expired",
            message: `A temporary merge of ${taskIds.length} task(s) has automatically reverted. Tasks have been returned to their original owner.`,
            reference_id: merge.id,
            reference_type: "merge_log",
          });

        revertedCount++;
        console.log(`Reverted merge ${merge.id} (${taskIds.length} tasks)`);
      } catch (mergeError) {
        console.error(`Error reverting merge ${merge.id}:`, mergeError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reverted ${revertedCount} expired temporary merges`,
        mergesChecked: expiredMerges?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error in revert-expired-merges:", error);
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
