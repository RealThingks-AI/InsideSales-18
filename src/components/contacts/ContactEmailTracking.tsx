import { Mail, MousePointer, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ContactEmailTrackingProps {
  emailOpens: number;
  emailClicks: number;
  engagementScore: number;
}

export const ContactEmailTracking = ({
  emailOpens,
  emailClicks,
  engagementScore,
}: ContactEmailTrackingProps) => {
  const openRate = emailOpens > 0 ? Math.min((emailOpens / 10) * 100, 100) : 0;
  const clickRate = emailClicks > 0 && emailOpens > 0 ? (emailClicks / emailOpens) * 100 : 0;

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500" />
            Email Opens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{emailOpens}</div>
          <Progress value={openRate} className="mt-2 h-1" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MousePointer className="h-4 w-4 text-green-500" />
            Email Clicks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{emailClicks}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {clickRate.toFixed(1)}% click rate
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{engagementScore}</div>
          <Progress value={engagementScore} className="mt-2 h-1" />
        </CardContent>
      </Card>
    </div>
  );
};
