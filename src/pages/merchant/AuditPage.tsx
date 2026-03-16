import { useState, useEffect, useCallback } from 'react';
import * as engine from '@/lib/backend-engine';
import { subscribe } from '@/lib/backend-store';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';
import type { AuditLog } from '@/types/domain';

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [, setTick] = useState(0);

  const reload = useCallback(() => {
    setLogs(engine.getAuditLogs());
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    reload();
    return subscribe(reload);
  }, [reload]);

  return (
    <div>
      <PageHeader title="Audit Trail" description="Complete activity history — all mutations logged" />
      <div className="p-6 space-y-2">
        {logs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No audit events yet</p>
          </div>
        )}
        {logs.map(log => (
          <Card key={log.id} className="glass">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{log.action.replace(/_/g, ' ')}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">{log.entity_type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                {log.detail_json && Object.keys(log.detail_json).length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {Object.entries(log.detail_json).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
