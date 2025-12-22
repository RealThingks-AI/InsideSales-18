
import { useAuth } from '@/hooks/useAuth';
import { getExportFilename } from '@/utils/exportUtils';
import { SimpleDealsCSVProcessor } from './import-export/simpleDealsCSVProcessor';
import { DealsCSVExporter } from './import-export/dealsCSVExporter';
import { toast } from '@/hooks/use-toast';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { supabase } from '@/integrations/supabase/client';

interface DealsImportExportOptions {
  onRefresh: () => void;
}

export const useDealsImportExport = ({ onRefresh }: DealsImportExportOptions) => {
  const { user } = useAuth();
  const { logSecurityEvent } = useSecurityAudit();
  
  const handleImport = async (file: File) => {
    console.log('useDealsImportExport: Starting import process with standardized YYYY-MM-DD date format');

    if (!user?.id) {
      const errorMsg = 'User not authenticated. Please log in and try again.';
      console.error('useDealsImportExport: No user ID available');
      toast({
        title: "Authentication Error",
        description: errorMsg,
        variant: "destructive",
      });
      throw new Error(errorMsg);
    }

    if (!file) {
      const errorMsg = 'No file provided for import';
      console.error('useDealsImportExport:', errorMsg);
      toast({
        title: "File Error",
        description: errorMsg,
        variant: "destructive",
      });
      throw new Error(errorMsg);
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      const errorMsg = 'Please select a CSV file';
      console.error('useDealsImportExport: Invalid file type:', file.type);
      toast({
        title: "Invalid File Type",
        description: errorMsg,
        variant: "destructive",
      });
      throw new Error(errorMsg);
    }

    try {
      console.log(`useDealsImportExport: Starting import of ${file.name} (${file.size} bytes)`);
      
      // Log import attempt
      await logSecurityEvent('DATA_IMPORT', 'deals', undefined, {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        module: 'deals',
        timestamp: new Date().toISOString()
      });
      
      // Show initial loading toast
      toast({
        title: "Import Started",
        description: `Processing ${file.name} with YYYY-MM-DD date format validation...`,
      });

      const text = await file.text();
      console.log('useDealsImportExport: File content loaded, length:', text.length);
      
      if (!text || text.trim().length === 0) {
        throw new Error('CSV file is empty or could not be read');
      }

      // Basic CSV validation
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row');
      }

      console.log('useDealsImportExport: CSV has', lines.length, 'lines (including header)');

      const processor = new SimpleDealsCSVProcessor();
      console.log('useDealsImportExport: Starting processing with YYYY-MM-DD date format validation');
      
      const result = await processor.processCSV(text, {
        userId: user.id,
        onProgress: (processed, total) => {
          console.log(`useDealsImportExport: Progress ${processed}/${total}`);
        }
      });

      console.log('useDealsImportExport: Processing complete:', result);

      const { successCount, updateCount, errorCount, errors } = result;

      // Generate success message
      let message = '';
      if (successCount > 0) message += `${successCount} new deals imported`;
      if (updateCount > 0) message += message ? `, ${updateCount} updated` : `${updateCount} deals updated`;
      if (errorCount > 0) message += message ? `, ${errorCount} errors` : `${errorCount} errors occurred`;

      if (successCount > 0 || updateCount > 0) {
        // Log successful import
        await logSecurityEvent('DATA_IMPORT_SUCCESS', 'deals', undefined, {
          file_name: file.name,
          file_size: file.size,
          records_imported: successCount,
          records_updated: updateCount,
          total_records_processed: successCount + updateCount + errorCount,
          module: 'deals',
          timestamp: new Date().toISOString()
        });
        
        toast({
          title: "Import Successful",
          description: message || "Import completed successfully with standardized date formats",
        });
        
        console.log('useDealsImportExport: Import successful - triggering real-time refresh...');
        
        // Trigger immediate refresh for both List & Kanban views
        onRefresh();
        
        // Dispatch custom event for real-time updates in other components
        window.dispatchEvent(new CustomEvent('deals-data-updated', {
          detail: { successCount, updateCount, source: 'csv-import' }
        }));
      } else if (errorCount > 0) {
        // Log failed import
        await logSecurityEvent('DATA_IMPORT_FAILED', 'deals', undefined, {
          file_name: file.name,
          file_size: file.size,
          error_count: errorCount,
          errors: errors.slice(0, 5), // Log first 5 errors
          module: 'deals',
          timestamp: new Date().toISOString()
        });
        
        // Check if errors contain date format issues and provide specific guidance
        const hasDateErrors = errors.some(error => error.includes('Invalid date format'));
        const errorDescription = hasDateErrors 
          ? "Date format errors detected. Please use YYYY-MM-DD format for all dates."
          : message + (errors.length > 0 ? `. First error: ${errors[0]}` : '');
        
        toast({
          title: "Import Failed",
          description: errorDescription,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import Info",
          description: "No new deals were imported",
        });
      }

      if (errorCount > 0 && errors.length > 0) {
        console.log('useDealsImportExport: Import errors:', errors.slice(0, 10));
      }

      return result;

    } catch (error: any) {
      console.error('useDealsImportExport: Import failed with error:', error);
      console.error('useDealsImportExport: Error stack:', error.stack);
      
      const errorMessage = error.message || "Failed to import CSV file. Please check the file format and ensure dates are in YYYY-MM-DD format.";
      
      toast({
        title: "Import Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  };

  const handleExportAll = async (data: any[]) => {
    console.log(`useDealsImportExport: Exporting all deals with YYYY-MM-DD date format:`, data?.length || 0, 'records');
    const filename = getExportFilename('deals', 'all');
    
    // Log export attempt
    await logSecurityEvent('DATA_EXPORT', 'deals', undefined, {
      export_type: 'CSV',
      export_scope: 'all',
      record_count: data?.length || 0,
      file_name: filename,
      module: 'deals',
      timestamp: new Date().toISOString()
    });
    
    const exporter = new DealsCSVExporter();
    await exporter.exportToCSV(data, filename);
  };

  const handleExportSelected = async (data: any[], selectedIds: string[]) => {
    const selectedData = data.filter(item => selectedIds.includes(item.id));
    const filename = getExportFilename('deals', 'selected');
    console.log(`useDealsImportExport: Exporting selected deals with YYYY-MM-DD date format:`, selectedData.length, 'records');
    
    // Log export attempt
    await logSecurityEvent('DATA_EXPORT', 'deals', undefined, {
      export_type: 'CSV',
      export_scope: 'selected',
      record_count: selectedData.length,
      selected_ids: selectedIds.slice(0, 10), // Log first 10 IDs
      file_name: filename,
      module: 'deals',
      timestamp: new Date().toISOString()
    });
    
    const exporter = new DealsCSVExporter();
    await exporter.exportToCSV(selectedData, filename);
  };

  const handleExportFiltered = async (filteredData: any[]) => {
    const filename = getExportFilename('deals', 'filtered');
    console.log(`useDealsImportExport: Exporting filtered deals with YYYY-MM-DD date format:`, filteredData.length, 'records');
    
    // Log export attempt
    await logSecurityEvent('DATA_EXPORT', 'deals', undefined, {
      export_type: 'CSV',
      export_scope: 'filtered',
      record_count: filteredData.length,
      file_name: filename,
      module: 'deals',
      timestamp: new Date().toISOString()
    });
    
    const exporter = new DealsCSVExporter();
    await exporter.exportToCSV(filteredData, filename);
  };

  return {
    handleImport,
    handleExportAll,
    handleExportSelected,
    handleExportFiltered
  };
};
