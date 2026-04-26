import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/services/supabaseClient';
import Card from '@/components/common/Card';

const ADMIN_EMAILS = ['liam@whatisnext.io'];

interface MetricsSnapshot {
  snapshot_date: string;
  total_users: number;
  paid_users: number;
  conversion_rate: number;
  day7_retention: number;
  day84_completion: number;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-base-border last:border-0">
      <span className="text-base-subtext text-sm">{label}</span>
      <span className="font-heading text-base-text font-semibold text-sm">{value}</span>
    </div>
  );
}

export default function AdminMetricsPage() {
  const { authUser } = useAppStore();
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState<MetricsSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);

  const isAdmin = authUser && ADMIN_EMAILS.includes(authUser.email);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/', { replace: true });
      return;
    }
    loadSnapshots();
  }, [isAdmin]);

  async function loadSnapshots() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('metrics_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(10);
    if (err) setError(err.message);
    else setSnapshots(data ?? []);
    setLoading(false);
  }

  async function triggerCompute() {
    setTriggering(true);
    try {
      const { error: fnErr } = await supabase.functions.invoke('compute-weekly-metrics');
      if (fnErr) throw fnErr;
      await loadSnapshots();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to trigger compute');
    } finally {
      setTriggering(false);
    }
  }

  if (!isAdmin) return null;

  const latest = snapshots[0];

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-base-text tracking-wide">Admin</h1>
        <button
          onClick={triggerCompute}
          disabled={triggering}
          className="text-xs font-heading text-accent-green border border-accent-green/30 rounded px-3 py-1.5 disabled:opacity-50"
        >
          {triggering ? 'Computing…' : 'Compute Now'}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {loading && (
        <p className="text-base-subtext text-sm">Loading…</p>
      )}

      {!loading && latest && (
        <Card>
          <p className="font-heading text-xs text-base-subtext tracking-widest uppercase mb-3">
            Latest — {latest.snapshot_date}
          </p>
          <MetricRow label="Total Users" value={latest.total_users.toLocaleString()} />
          <MetricRow label="Brotherhood (Paid)" value={latest.paid_users.toLocaleString()} />
          <MetricRow
            label="Conversion Rate"
            value={`${(latest.conversion_rate * 100).toFixed(1)}%`}
          />
          <MetricRow
            label="Day-7 Retention"
            value={`${(latest.day7_retention * 100).toFixed(1)}%`}
          />
          <MetricRow
            label="Day-84 Completion"
            value={`${(latest.day84_completion * 100).toFixed(1)}%`}
          />
        </Card>
      )}

      {!loading && snapshots.length > 1 && (
        <Card>
          <p className="font-heading text-xs text-base-subtext tracking-widest uppercase mb-3">
            History
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-base-muted border-b border-base-border">
                  <th className="pb-2 pr-3 font-medium">Date</th>
                  <th className="pb-2 pr-3 font-medium text-right">Users</th>
                  <th className="pb-2 pr-3 font-medium text-right">Paid</th>
                  <th className="pb-2 pr-3 font-medium text-right">Conv%</th>
                  <th className="pb-2 pr-3 font-medium text-right">D7 Ret%</th>
                  <th className="pb-2 font-medium text-right">D84%</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.slice(1).map((s) => (
                  <tr key={s.snapshot_date} className="border-b border-base-border/40">
                    <td className="py-1.5 pr-3 text-base-subtext">{s.snapshot_date}</td>
                    <td className="py-1.5 pr-3 text-base-text text-right">{s.total_users}</td>
                    <td className="py-1.5 pr-3 text-base-text text-right">{s.paid_users}</td>
                    <td className="py-1.5 pr-3 text-base-text text-right">
                      {(s.conversion_rate * 100).toFixed(1)}
                    </td>
                    <td className="py-1.5 pr-3 text-base-text text-right">
                      {(s.day7_retention * 100).toFixed(1)}
                    </td>
                    <td className="py-1.5 text-base-text text-right">
                      {(s.day84_completion * 100).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && snapshots.length === 0 && !error && (
        <Card>
          <p className="text-base-subtext text-sm text-center py-4">
            No metrics yet. Tap "Compute Now" to generate the first snapshot.
          </p>
        </Card>
      )}
    </div>
  );
}
