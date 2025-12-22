import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target } from "lucide-react";

interface AccountScoreBadgeProps {
  score: number;
  showProgress?: boolean;
}

export const AccountScoreBadge = ({ score, showProgress = false }: AccountScoreBadgeProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (score >= 60) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    if (score >= 20) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Hot';
    if (score >= 60) return 'Warm';
    if (score >= 40) return 'Neutral';
    if (score >= 20) return 'Cold';
    return 'New';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  if (showProgress) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            Score
          </span>
          <span className="font-medium">{score}/100</span>
        </div>
        <div className="relative">
          <Progress value={score} className="h-2" />
          <div 
            className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{getScoreLabel(score)}</p>
      </div>
    );
  }

  return (
    <Badge className={`gap-1 ${getScoreColor(score)}`}>
      <TrendingUp className="h-3 w-3" />
      {score}
    </Badge>
  );
};

interface AccountSegmentBadgeProps {
  segment: string;
}

export const AccountSegmentBadge = ({ segment }: AccountSegmentBadgeProps) => {
  const getSegmentColor = (segment: string) => {
    switch (segment?.toLowerCase()) {
      case 'enterprise': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'mid-market': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'smb': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'startup': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'customer': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'prospect': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Badge className={getSegmentColor(segment)}>
      {segment || 'Prospect'}
    </Badge>
  );
};

export const SEGMENT_OPTIONS = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'customer', label: 'Customer' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'mid-market', label: 'Mid-Market' },
  { value: 'smb', label: 'SMB' },
  { value: 'startup', label: 'Startup' },
];
