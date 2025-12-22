import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, Upload, Download, Columns } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Deal } from "@/types/deal";
import { useDealsImportExport } from "@/hooks/useDealsImportExport";

interface DealsSettingsDropdownProps {
  deals: Deal[];
  onRefresh: () => void;
  selectedDeals?: Deal[];
  onColumnCustomize?: () => void;
  showColumns?: boolean;
}

export const DealsSettingsDropdown = ({ 
  deals, 
  onRefresh, 
  selectedDeals = [], 
  onColumnCustomize,
  showColumns = false 
}: DealsSettingsDropdownProps) => {
  const { handleImport, handleExportAll, handleExportSelected } = useDealsImportExport({
    onRefresh
  });

  const handleExportClick = () => {
    if (selectedDeals.length > 0) {
      const selectedIds = selectedDeals.map(deal => deal.id);
      handleExportSelected(deals, selectedIds);
    } else {
      handleExportAll(deals);
    }
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await handleImport(file);
        } catch (error) {
          console.error('Import failed:', error);
        }
      }
    };
    input.click();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border z-50">
            <DropdownMenuItem onClick={handleImportClick}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportClick}>
              <Download className="w-4 h-4 mr-2" />
              Export {selectedDeals.length > 0 ? `(${selectedDeals.length})` : 'All'}
            </DropdownMenuItem>
            {showColumns && onColumnCustomize && (
              <DropdownMenuItem onClick={onColumnCustomize}>
                <Columns className="w-4 h-4 mr-2" />
                Columns
              </DropdownMenuItem>
            )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
