import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackupManifest {
  version: string;
  created_at: string;
  created_by: string;
  tables: {
    name: string;
    row_count: number;
  }[];
  total_records: number;
  include_audit_logs: boolean;
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

    // Create admin client for backup operations
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
      throw new Error('Only admins can create backups');
    }

    console.log('Starting backup creation for user:', user.email);

    const { includeAuditLogs = true } = await req.json().catch(() => ({}));

    // Tables to backup
    const tablesToBackup = [
      'accounts',
      'contacts',
      'leads',
      'deals',
      'deal_action_items',
      'lead_action_items',
      'notifications',
      'profiles',
      'saved_filters',
      'user_preferences',
      'user_roles',
      'dashboard_preferences',
      'yearly_revenue_targets',
      'page_permissions',
    ];

    if (includeAuditLogs) {
      tablesToBackup.push('security_audit_log');
    }

    const backupData: Record<string, any[]> = {};
    const manifest: BackupManifest = {
      version: '1.0',
      created_at: new Date().toISOString(),
      created_by: user.id,
      tables: [],
      total_records: 0,
      include_audit_logs: includeAuditLogs,
    };

    // Fetch data from each table
    for (const tableName of tablesToBackup) {
      try {
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select('*');

        if (error) {
          console.warn(`Error fetching ${tableName}:`, error.message);
          backupData[tableName] = [];
          manifest.tables.push({ name: tableName, row_count: 0 });
        } else {
          backupData[tableName] = data || [];
          manifest.tables.push({ name: tableName, row_count: data?.length || 0 });
          manifest.total_records += data?.length || 0;
        }
      } catch (err) {
        console.warn(`Failed to backup ${tableName}:`, err);
        backupData[tableName] = [];
        manifest.tables.push({ name: tableName, row_count: 0 });
      }
    }

    // Create backup JSON
    const backupContent = JSON.stringify({
      manifest,
      data: backupData,
    }, null, 2);

    // Generate file name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `backup_${timestamp}.json`;
    const filePath = `${user.id}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('backups')
      .upload(filePath, new Blob([backupContent], { type: 'application/json' }), {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload backup: ${uploadError.message}`);
    }

    // Get file size
    const sizeBytes = new Blob([backupContent]).size;

    // Save backup metadata
    const { data: backupRecord, error: dbError } = await supabaseAdmin
      .from('backups')
      .insert({
        file_name: fileName,
        file_path: filePath,
        size_bytes: sizeBytes,
        tables_count: manifest.tables.length,
        records_count: manifest.total_records,
        backup_type: 'manual',
        status: 'completed',
        manifest: manifest,
        created_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to save backup metadata: ${dbError.message}`);
    }

    // Clean up old backups (keep only last 10)
    const { data: allBackups } = await supabaseAdmin
      .from('backups')
      .select('id, file_path, created_at')
      .order('created_at', { ascending: false });

    if (allBackups && allBackups.length > 10) {
      const backupsToDelete = allBackups.slice(10);
      
      for (const oldBackup of backupsToDelete) {
        // Delete from storage
        await supabaseAdmin.storage
          .from('backups')
          .remove([oldBackup.file_path]);
        
        // Delete metadata
        await supabaseAdmin
          .from('backups')
          .delete()
          .eq('id', oldBackup.id);
      }
      
      console.log(`Cleaned up ${backupsToDelete.length} old backups`);
    }

    // Log the backup action
    await supabaseAdmin.rpc('log_security_event', {
      p_action: 'BACKUP_CREATED',
      p_resource_type: 'backup',
      p_resource_id: backupRecord.id,
      p_details: {
        file_name: fileName,
        tables_count: manifest.tables.length,
        records_count: manifest.total_records,
        size_bytes: sizeBytes,
      }
    });

    console.log('Backup created successfully:', fileName);

    return new Response(
      JSON.stringify({ 
        success: true, 
        backup: backupRecord,
        message: 'Backup created successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Backup creation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 500 
      }
    );
  }
});
