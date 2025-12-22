import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log("sync-profile-names: Starting sync...");

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error("sync-profile-names: Error fetching auth users:", authError);
      throw authError;
    }

    console.log(`sync-profile-names: Found ${authUsers.users.length} auth users`);

    let updatedCount = 0;
    const updates: { id: string; oldName: string; newName: string }[] = [];

    for (const user of authUsers.users) {
      // Extract display name from user metadata
      const metadata = user.user_metadata || {};
      const displayName = metadata.full_name || metadata.name || metadata.display_name || null;
      
      if (!displayName) {
        console.log(`sync-profile-names: No display name found for user ${user.id}`);
        continue;
      }

      // Check current profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error(`sync-profile-names: Error fetching profile for ${user.id}:`, profileError);
        continue;
      }

      // Only update if the current full_name is different and looks like an email
      const currentName = profile?.full_name;
      const needsUpdate = !currentName || 
                          currentName.includes('@') || 
                          currentName !== displayName;

      if (needsUpdate && profile) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            full_name: displayName,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error(`sync-profile-names: Error updating profile for ${user.id}:`, updateError);
        } else {
          updates.push({ 
            id: user.id, 
            oldName: currentName || 'null', 
            newName: displayName 
          });
          updatedCount++;
          console.log(`sync-profile-names: Updated ${user.id}: "${currentName}" -> "${displayName}"`);
        }
      } else if (!profile) {
        // Create profile if it doesn't exist
        const { error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: user.id,
            full_name: displayName,
            "Email ID": user.email
          });

        if (insertError) {
          console.error(`sync-profile-names: Error creating profile for ${user.id}:`, insertError);
        } else {
          updates.push({ id: user.id, oldName: 'NEW', newName: displayName });
          updatedCount++;
          console.log(`sync-profile-names: Created profile for ${user.id} with name "${displayName}"`);
        }
      }
    }

    console.log(`sync-profile-names: Sync complete. Updated ${updatedCount} profiles.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${updatedCount} profile names`,
        updates 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("sync-profile-names: Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});