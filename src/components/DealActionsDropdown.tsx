
import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, Upload, Download, Columns } from "lucide-react";
import { Deal } from "@/types/deal";
import { useDealsImportExport } from "@/hooks/useDealsImportExport";

interface DealActionsDropdownProps {
  deals: Deal[];
  onImport: (deals: Partial<Deal>[]) => void;
  onRefresh: () => void;
  selectedDeals?: Deal[];
  onColumnCustomize?: () => void;
  showColumns?: boolean;
}

export const DealActionsDropdown = ({ 
  deals, 
  onImport, 
  onRefresh, 
  selectedDeals = [], 
  onColumnCustomize,
  showColumns = false 
}: DealActionsDropdownProps) => {
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

  return null;
};
