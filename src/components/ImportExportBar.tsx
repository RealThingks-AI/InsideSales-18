
import { Deal } from "@/types/deal";
import { DealActionsDropdown } from "./DealActionsDropdown";

interface ImportExportBarProps {
  deals: Deal[];
  onImport: (deals: Partial<Deal>[]) => void;
  onExport: (selectedDeals?: Deal[]) => void;
  selectedDeals?: Deal[];
  onRefresh: () => void;
}

export const ImportExportBar = ({ deals, onImport, onExport, selectedDeals, onRefresh }: ImportExportBarProps) => {
  return (
    <DealActionsDropdown
      deals={deals}
      onImport={onImport}
      onRefresh={onRefresh}
      selectedDeals={selectedDeals || []}
    />
  );
};
