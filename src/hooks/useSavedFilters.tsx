
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface SavedFilter {
  id: string;
  name: string;
  filters: any;
  created_at: string;
  updated_at: string;
}

export const useSavedFilters = (filterType: string = 'deals') => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSavedFilters = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saved_filters')
        .select('*')
        .eq('user_id', user.id)
        .eq('filter_type', filterType)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedFilters(data || []);
    } catch (error) {
      console.error('Error fetching saved filters:', error);
      toast({
        title: "Error",
        description: "Failed to load saved filters",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveFilter = async (name: string, filters: any) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('saved_filters')
        .insert({
          user_id: user.id,
          name: name.trim(),
          filter_type: filterType,
          filters: filters
        })
        .select()
        .single();

      if (error) throw error;

      setSavedFilters(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Filter saved successfully",
      });
      return true;
    } catch (error) {
      console.error('Error saving filter:', error);
      toast({
        title: "Error",
        description: "Failed to save filter",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteFilter = async (filterId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('saved_filters')
        .delete()
        .eq('id', filterId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSavedFilters(prev => prev.filter(f => f.id !== filterId));
      toast({
        title: "Success",
        description: "Filter deleted successfully",
      });
      return true;
    } catch (error) {
      console.error('Error deleting filter:', error);
      toast({
        title: "Error",
        description: "Failed to delete filter",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSavedFilters();
  }, [user, filterType]);

  return {
    savedFilters,
    loading,
    saveFilter,
    deleteFilter,
    refetch: fetchSavedFilters
  };
};
