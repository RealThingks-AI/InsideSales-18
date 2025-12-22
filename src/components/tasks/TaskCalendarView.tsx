import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday } from 'date-fns';
import { Task } from '@/types/task';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface TaskCalendarViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
}

const priorityColors = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

const statusColors = {
  open: 'border-l-blue-500',
  in_progress: 'border-l-purple-500',
  completed: 'border-l-green-500 opacity-60',
  deferred: 'border-l-gray-500 opacity-60',
};

export const TaskCalendarView = ({ tasks, onEdit }: TaskCalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days for the start of the month
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(new Date(task.due_date), day);
    });
  };

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Padding days */}
          {paddingDays.map((_, index) => (
            <div key={`padding-${index}`} className="min-h-[100px] bg-muted/20 rounded-md" />
          ))}

          {/* Actual days */}
          {daysInMonth.map((day) => {
            const dayTasks = getTasksForDay(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] border rounded-md p-1 ${
                  isCurrentDay ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className={`text-right text-sm mb-1 ${
                  isCurrentDay ? 'font-bold text-primary' : 'text-muted-foreground'
                }`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1 overflow-y-auto max-h-[80px]">
                  {dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      onClick={() => onEdit(task)}
                      className={`w-full text-left text-xs p-1 rounded border-l-2 bg-card hover:bg-muted/50 transition-colors truncate ${
                        statusColors[task.status]
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${priorityColors[task.priority]}`} />
                        <span className="truncate">{task.title}</span>
                      </div>
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
