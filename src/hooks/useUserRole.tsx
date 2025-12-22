
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole('user');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching role for user:', user.email);
        
        // Check user metadata directly for role
        const role = user.user_metadata?.role || 'user';
        console.log('User role from metadata:', role);
        setUserRole(role);
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setUserRole('user');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const isAdmin = userRole === 'admin';
  const canEdit = isAdmin;
  const canDelete = isAdmin;
  const canManageUsers = isAdmin;
  const canAccessSettings = isAdmin;

  return {
    userRole,
    isAdmin,
    canEdit,
    canDelete,
    canManageUsers,
    canAccessSettings,
    loading
  };
};
