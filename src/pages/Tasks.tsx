import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { Task, TaskStatus } from '@/types/task';
import { TaskModal } from '@/components/tasks/TaskModal';
import { TaskListView } from '@/components/tasks/TaskListView';
import { TaskKanbanView } from '@/components/tasks/TaskKanbanView';
import { TaskCalendarView } from '@/components/tasks/TaskCalendarView';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, List, LayoutGrid, Calendar, Loader2 } from 'lucide-react';
type ViewMode = 'list' | 'kanban' | 'calendar';
const Tasks = () => {
  const {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask
  } = useTasks();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowModal(true);
  };
  const handleDelete = (taskId: string) => {
    setDeleteTaskId(taskId);
  };
  const confirmDelete = async () => {
    if (deleteTaskId) {
      await deleteTask(deleteTaskId);
      setDeleteTaskId(null);
    }
  };
  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    await updateTask(taskId, {
      status
    });
  };
  const handleToggleComplete = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'completed' ? 'open' : 'completed';
    await updateTask(task.id, {
      status: newStatus
    });
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTask(null);
  };
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-background">
        <div className="px-6 h-16 flex items-center border-b w-full">
          <div className="flex items-center justify-between w-full">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl text-foreground font-semibold">Tasks</h1>
            </div>
            <div className="flex items-center gap-3">
              <Tabs value={viewMode} onValueChange={v => setViewMode(v as ViewMode)}>
                <TabsList className="h-9">
                  <TabsTrigger value="list" className="flex items-center gap-1.5 text-xs px-2.5 h-8">
                    <List className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">List</span>
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="flex items-center gap-1.5 text-xs px-2.5 h-8">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Kanban</span>
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="flex items-center gap-1.5 text-xs px-2.5 h-8">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Calendar</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Button size="sm" onClick={() => setShowModal(true)}>
                Add Task
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-auto p-6">
        {/* Content based on view mode */}
        {viewMode === 'list' && <TaskListView tasks={tasks} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} onToggleComplete={handleToggleComplete} />}

        {viewMode === 'kanban' && <TaskKanbanView tasks={tasks} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />}

        {viewMode === 'calendar' && <TaskCalendarView tasks={tasks} onEdit={handleEdit} />}
      </div>

      {/* Task Modal */}
      <TaskModal open={showModal} onOpenChange={handleCloseModal} task={editingTask} onSubmit={createTask} onUpdate={updateTask} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default Tasks;