import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduledMessage {
  id: string;
  school_id: string;
  sender_user_id: string;
  recipient_user_ids: string[];
  subject: string | null;
  content: string;
  message_type: string;
  scheduled_at: string;
  status: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("[process-scheduled-messages] Starting scheduled message processing...");

    // Find all pending scheduled messages that are due
    const now = new Date().toISOString();
    const { data: pendingMessages, error: fetchError } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("[process-scheduled-messages] Error fetching pending messages:", fetchError);
      throw fetchError;
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log("[process-scheduled-messages] No pending messages to process");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending messages" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[process-scheduled-messages] Found ${pendingMessages.length} messages to process`);

    let successCount = 0;
    let failCount = 0;

    for (const msg of pendingMessages as ScheduledMessage[]) {
      try {
        console.log(`[process-scheduled-messages] Processing message ${msg.id}`);

        // Create the actual admin message - use empty string if subject is null
        const { data: newMsg, error: msgError } = await supabase
          .from("admin_messages")
          .insert({
            school_id: msg.school_id,
            sender_user_id: msg.sender_user_id,
            subject: msg.subject || "",
            content: msg.content,
            attachment_urls: [],
          })
          .select()
          .single();

        if (msgError) {
          console.error(`[process-scheduled-messages] Failed to create message ${msg.id}:`, msgError);
          // Mark as failed
          await supabase
            .from("scheduled_messages")
            .update({ status: "failed" })
            .eq("id", msg.id);
          failCount++;
          continue;
        }

        // Create recipients
        const recipientInserts = msg.recipient_user_ids.map((recipientId) => ({
          message_id: newMsg.id,
          recipient_user_id: recipientId,
        }));

        const { error: recipientError } = await supabase
          .from("admin_message_recipients")
          .insert(recipientInserts);

        if (recipientError) {
          console.error(`[process-scheduled-messages] Failed to create recipients for ${msg.id}:`, recipientError);
        }

        // Create notifications for each recipient
        const notificationInserts = msg.recipient_user_ids.map((recipientId) => ({
          school_id: msg.school_id,
          user_id: recipientId,
          type: "message",
          title: "New message",
          body: msg.subject || msg.content.substring(0, 60),
          entity_type: "admin_message",
          entity_id: newMsg.id,
          created_by: msg.sender_user_id,
        }));

        const { error: notifError } = await supabase
          .from("app_notifications")
          .insert(notificationInserts);

        if (notifError) {
          console.error(`[process-scheduled-messages] Failed to create notifications for ${msg.id}:`, notifError);
        }

        // Mark scheduled message as sent
        const { error: updateError } = await supabase
          .from("scheduled_messages")
          .update({ 
            status: "sent", 
            sent_at: new Date().toISOString() 
          })
          .eq("id", msg.id);

        if (updateError) {
          console.error(`[process-scheduled-messages] Failed to update status for ${msg.id}:`, updateError);
        } else {
          console.log(`[process-scheduled-messages] Successfully sent message ${msg.id}`);
          successCount++;
        }
      } catch (err) {
        console.error(`[process-scheduled-messages] Error processing message ${msg.id}:`, err);
        // Mark as failed
        await supabase
          .from("scheduled_messages")
          .update({ status: "failed" })
          .eq("id", msg.id);
        failCount++;
      }
    }

    console.log(`[process-scheduled-messages] Completed. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingMessages.length,
        successful: successCount,
        failed: failCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[process-scheduled-messages] Fatal error:", errMsg);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
