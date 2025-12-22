import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { 
  Loader2, 
  Plus, 
  Trash2, 
  GripVertical, 
  Settings2, 
  Check, 
  X,
  Save
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface PipelineStage {
  id: string;
  stage_name: string;
  stage_order: number;
  stage_color: string;
  stage_probability: number;
  is_active: boolean;
  is_won_stage: boolean;
  is_lost_stage: boolean;
}

interface LeadStatus {
  id: string;
  status_name: string;
  status_color: string;
  status_order: number;
  is_active: boolean;
  is_converted_status: boolean;
}

const colorOptions = [
  '#3b82f6', '#6b7280', '#8b5cf6', '#f59e0b', '#10b981', 
  '#22c55e', '#ef4444', '#94a3b8', '#ec4899', '#14b8a6'
];

const PipelineSettings = () => {
  const { userRole } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingStage, setEditingStage] = useState<Partial<PipelineStage> | null>(null);
  const [editingStatus, setEditingStatus] = useState<Partial<LeadStatus> | null>(null);

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stagesRes, statusesRes] = await Promise.all([
        supabase.from('pipeline_stages').select('*').order('stage_order'),
        supabase.from('lead_statuses').select('*').order('status_order'),
      ]);

      if (stagesRes.error) throw stagesRes.error;
      if (statusesRes.error) throw statusesRes.error;

      setStages(stagesRes.data || []);
      setStatuses(statusesRes.data || []);
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
      toast.error('Failed to load pipeline settings');
    } finally {
      setLoading(false);
    }
  };

  const saveStage = async () => {
    if (!editingStage?.stage_name) return;
    setSaving(true);

    try {
      if (editingStage.id) {
        const { error } = await supabase
          .from('pipeline_stages')
          .update(editingStage)
          .eq('id', editingStage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pipeline_stages')
          .insert({
            stage_name: editingStage.stage_name,
            stage_color: editingStage.stage_color || '#3b82f6',
            stage_probability: editingStage.stage_probability || 0,
            is_active: editingStage.is_active ?? true,
            is_won_stage: editingStage.is_won_stage || false,
            is_lost_stage: editingStage.is_lost_stage || false,
            stage_order: stages.length,
          });
        if (error) throw error;
      }

      toast.success('Stage saved successfully');
      setShowStageModal(false);
      setEditingStage(null);
      fetchData();
    } catch (error) {
      console.error('Error saving stage:', error);
      toast.error('Failed to save stage');
    } finally {
      setSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!editingStatus?.status_name) return;
    setSaving(true);

    try {
      if (editingStatus.id) {
        const { error } = await supabase
          .from('lead_statuses')
          .update(editingStatus)
          .eq('id', editingStatus.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lead_statuses')
          .insert({
            status_name: editingStatus.status_name,
            status_color: editingStatus.status_color || '#6b7280',
            is_active: editingStatus.is_active ?? true,
            is_converted_status: editingStatus.is_converted_status || false,
            status_order: statuses.length,
          });
        if (error) throw error;
      }

      toast.success('Status saved successfully');
      setShowStatusModal(false);
      setEditingStatus(null);
      fetchData();
    } catch (error) {
      console.error('Error saving status:', error);
      toast.error('Failed to save status');
    } finally {
      setSaving(false);
    }
  };

  const deleteStage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Stage deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete stage');
    }
  };

  const deleteStatus = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lead_statuses')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Status deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Only administrators can manage pipeline settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Deal Pipeline Stages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Deal Pipeline Stages
              </CardTitle>
              <CardDescription>
                Customize the stages in your deal pipeline
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingStage({ stage_name: '', stage_color: '#3b82f6', stage_probability: 0 });
                setShowStageModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Stage
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stages.map((stage) => (
              <div
                key={stage.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: stage.stage_color }}
                  />
                  <span className="font-medium">{stage.stage_name}</span>
                  <Badge variant="outline">{stage.stage_probability}%</Badge>
                  {stage.is_won_stage && <Badge className="bg-green-500">Won</Badge>}
                  {stage.is_lost_stage && <Badge variant="destructive">Lost/Dropped</Badge>}
                  {!stage.is_active && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingStage(stage);
                      setShowStageModal(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteStage(stage.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lead Statuses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lead Statuses</CardTitle>
              <CardDescription>
                Define statuses for tracking leads
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingStatus({ status_name: '', status_color: '#6b7280' });
                setShowStatusModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Status
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {statuses.map((status) => (
              <div
                key={status.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: status.status_color }}
                  />
                  <span className="font-medium">{status.status_name}</span>
                  {status.is_converted_status && <Badge className="bg-green-500">Converted</Badge>}
                  {!status.is_active && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingStatus(status);
                      setShowStatusModal(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteStatus(status.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stage Edit Modal */}
      <Dialog open={showStageModal} onOpenChange={setShowStageModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStage?.id ? 'Edit Stage' : 'Add Stage'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Stage Name</Label>
              <Input
                value={editingStage?.stage_name || ''}
                onChange={(e) => setEditingStage(s => ({ ...s, stage_name: e.target.value }))}
                placeholder="Enter stage name"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      editingStage?.stage_color === color ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditingStage(s => ({ ...s, stage_color: color }))}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Probability (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={editingStage?.stage_probability || 0}
                onChange={(e) => setEditingStage(s => ({ ...s, stage_probability: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={editingStage?.is_active ?? true}
                onCheckedChange={(checked) => setEditingStage(s => ({ ...s, is_active: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Won Stage</Label>
              <Switch
                checked={editingStage?.is_won_stage || false}
                onCheckedChange={(checked) => setEditingStage(s => ({ ...s, is_won_stage: checked, is_lost_stage: false }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Lost/Dropped Stage</Label>
              <Switch
                checked={editingStage?.is_lost_stage || false}
                onCheckedChange={(checked) => setEditingStage(s => ({ ...s, is_lost_stage: checked, is_won_stage: false }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStageModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveStage} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Edit Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStatus?.id ? 'Edit Status' : 'Add Status'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status Name</Label>
              <Input
                value={editingStatus?.status_name || ''}
                onChange={(e) => setEditingStatus(s => ({ ...s, status_name: e.target.value }))}
                placeholder="Enter status name"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      editingStatus?.status_color === color ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditingStatus(s => ({ ...s, status_color: color }))}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={editingStatus?.is_active ?? true}
                onCheckedChange={(checked) => setEditingStatus(s => ({ ...s, is_active: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Converted Status</Label>
              <Switch
                checked={editingStatus?.is_converted_status || false}
                onCheckedChange={(checked) => setEditingStatus(s => ({ ...s, is_converted_status: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveStatus} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PipelineSettings;