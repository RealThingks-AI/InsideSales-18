import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create admin client for restore operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create user client for auth check
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated and is admin
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const userRole = roleData?.role || user.user_metadata?.role || 'user';
    if (userRole !== 'admin') {
      throw new Error('Only admins can restore backups');
    }

    const { backupId } = await req.json();
    if (!backupId) {
      throw new Error('Backup ID is required');
    }

    console.log('Starting restore for backup:', backupId, 'by user:', user.email);

    // Get backup metadata
    const { data: backup, error: backupError } = await supabaseAdmin
      .from('backups')
      .select('*')
      .eq('id', backupId)
      .single();

    if (backupError || !backup) {
      throw new Error('Backup not found');
    }

    // Download backup file
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('backups')
      .download(backup.file_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download backup file');
    }

    const backupContent = JSON.parse(await fileData.text());
    const { manifest, data: backupData } = backupContent;

    console.log('Restore manifest:', manifest);

    // Validate manifest
    if (!manifest || !manifest.version || !backupData) {
      throw new Error('Invalid backup file format');
    }

    // Log restore start
    await supabaseAdmin.rpc('log_security_event', {
      p_action: 'RESTORE_STARTED',
      p_resource_type: 'backup',
      p_resource_id: backupId,
      p_details: {
        backup_file: backup.file_name,
        tables_count: manifest.tables.length,
        records_count: manifest.total_records,
      }
    });

    // Tables to restore in order (respecting foreign key constraints)
    const restoreOrder = [
      'profiles',
      'user_roles',
      'user_preferences',
      'dashboard_preferences',
      'accounts',
      'contacts',
      'leads',
      'deals',
      'deal_action_items',
      'lead_action_items',
      'notifications',
      'saved_filters',
      'yearly_revenue_targets',
      'page_permissions',
    ];

    // Optional: include audit logs if they were in the backup
    if (manifest.include_audit_logs && backupData['security_audit_log']) {
      restoreOrder.push('security_audit_log');
    }

    const errors: string[] = [];
    const restoredTables: string[] = [];

    // Restore each table
    for (const tableName of restoreOrder) {
      if (!backupData[tableName]) {
        console.log(`Skipping ${tableName} - not in backup`);
        continue;
      }

      try {
        const records = backupData[tableName];
        
        if (records.length === 0) {
          console.log(`Skipping ${tableName} - no records`);
          restoredTables.push(tableName);
          continue;
        }

        // Delete existing data first (for non-critical tables)
        // Skip deletion for profiles and user_roles to preserve current users
        if (!['profiles', 'user_roles'].includes(tableName)) {
          const { error: deleteError } = await supabaseAdmin
            .from(tableName)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

          if (deleteError) {
            console.warn(`Warning deleting ${tableName}:`, deleteError.message);
          }
        }

        // Insert backup data in batches
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          
          const { error: insertError } = await supabaseAdmin
            .from(tableName)
            .upsert(batch, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            });

          if (insertError) {
            console.warn(`Warning inserting ${tableName}:`, insertError.message);
            errors.push(`${tableName}: ${insertError.message}`);
          }
        }

        restoredTables.push(tableName);
        console.log(`Restored ${tableName}: ${records.length} records`);
      } catch (err: any) {
        console.error(`Error restoring ${tableName}:`, err);
        errors.push(`${tableName}: ${err.message}`);
      }
    }

    // Log restore completion
    await supabaseAdmin.rpc('log_security_event', {
      p_action: 'RESTORE_COMPLETED',
      p_resource_type: 'backup',
      p_resource_id: backupId,
      p_details: {
        backup_file: backup.file_name,
        restored_tables: restoredTables,
        errors: errors,
        success: errors.length === 0,
      }
    });

    console.log('Restore completed with', errors.length, 'errors');

    return new Response(
      JSON.stringify({ 
        success: errors.length === 0,
        restored_tables: restoredTables,
        errors: errors,
        message: errors.length === 0 
          ? 'Restore completed successfully' 
          : `Restore completed with ${errors.length} errors`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Restore error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 500 
      }
    );
  }
});
