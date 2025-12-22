
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LeadsCSVProcessor } from '@/hooks/import-export/leadsCSVProcessor';
import { LeadsCSVExporter } from '@/hooks/import-export/leadsCSVExporter';

interface Lead {
  id: string;
  lead_name: string;
  company_name?: string;
  email?: string;
  phone_no?: string;
  position?: string;
  created_by?: string;
  contact_owner?: string;
  lead_status?: string;
  created_time?: string;
  modified_time?: string;
  linkedin?: string;
  website?: string;
  contact_source?: string;
  industry?: string;
  country?: string;
  description?: string;
}

export const useSimpleLeadsImportExport = (onImportComplete: () => void) => {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async (file: File) => {
    setIsImporting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const text = await file.text();
      console.log('Starting leads import with new processor...');

      const processor = new LeadsCSVProcessor();
      const result = await processor.processCSV(text, {
        userId: user.id,
        onProgress: (processed, total) => {
          console.log(`Processing: ${processed}/${total}`);
        }
      });

      // Show results
      if (result.successCount > 0 || result.updateCount > 0) {
        toast({
          title: "Import Successful",
          description: `Successfully processed ${result.successCount + result.updateCount} leads (${result.successCount} new, ${result.updateCount} updated)${result.errorCount > 0 ? ` with ${result.errorCount} errors` : ''}`,
        });
      }

      if (result.errorCount > 0 && result.errors.length > 0) {
        const errorSample = result.errors.slice(0, 3).join(', ');
        toast({
          title: "Import Errors",
          description: `${result.errorCount} errors occurred. Sample: ${errorSample}${result.errors.length > 3 ? '...' : ''}`,
          variant: "destructive",
        });
      }

      onImportComplete();

    } catch (error: any) {
      console.error('Import failed:', error);
      toast({
        title: "Import Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_time', { ascending: false });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        toast({
          title: "No Data",
          description: "No leads to export.",
        });
        return;
      }

      console.log('Starting leads export with new exporter...');
      const exporter = new LeadsCSVExporter();
      const csvContent = await exporter.exportLeads(data);

      // Download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Exported ${data.length} leads to CSV.`,
      });

    } catch (error: any) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return {
    handleImport,
    handleExport,
    isImporting
  };
};
