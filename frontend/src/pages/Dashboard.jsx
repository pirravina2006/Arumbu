import { useState, useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import { reportsApi } from '../api/alertsApi';
import { useNavigate } from 'react-router-dom';

function StatCard({ label, value, subtext, bg, borderColor, textColor, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '20px',
        backgroundColor: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.boxShadow = 'none')}
    >
      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <h2 style={{ margin: '0 0 4px 0', fontSize: '32px', fontWeight: '800', color: textColor }}>
        {value ?? '—'}
      </h2>
      {subtext && (
        <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>{subtext}</p>
      )}
    </div>
  );
}

function QuickActionCard({ icon, title, description, bg, border, textColor, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '20px',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: textColor }}>
        {icon} {title}
      </h3>
      <p style={{ margin: 0, color: textColor, fontSize: '14px', opacity: 0.8 }}>{description}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  useEffect(() => {
    if (!user?.awc_code) return;

    const fetchAll = async () => {
      try {
        const reportRes = await reportsApi.getAWCReport(user.awc_code, year, month).catch(() => null);
        if (reportRes) setMonthlyReport(reportRes.data);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchAll();
  }, [user]);

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const monthName = now.toLocaleString('default', { month: 'long' });

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <img 
          src="/arumbu-logo.jpg" 
          alt="Arumbu Logo" 
          style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} 
        />
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '32px', fontWeight: '800', color: 'var(--primary-600)' }}>
            Arumbu
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '15px', fontWeight: '500' }}>
            Smart Health Monitoring System
          </p>
        </div>
      </div>
      
      <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '32px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700' }}>
          {getWelcomeMessage()}, {user?.name || 'Worker'}!
        </h2>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
          {user?.awc_code} · <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
        </p>
      </div>

      {/* Monthly Stats */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#374151' }}>
          {monthName} {year} — AWC Summary
        </h2>
        {statsLoading ? (
          <div style={{ padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', color: '#9ca3af', textAlign: 'center', fontSize: '14px' }}>
            Loading stats...
          </div>
        ) : monthlyReport ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <StatCard
              label="Total Children"
              value={monthlyReport.total_children}
              subtext="enrolled"
              bg="#eff6ff"
              borderColor="#bfdbfe"
              textColor="#1e40af"
              onClick={() => navigate('/children')}
            />
            <StatCard
              label="Measured"
              value={monthlyReport.measured_children}
              subtext={`${monthlyReport.total_children ? ((monthlyReport.measured_children / monthlyReport.total_children) * 100).toFixed(0) : 0}% coverage`}
              bg="#f0fdf4"
              borderColor="#bbf7d0"
              textColor="#15803d"
            />
            <StatCard
              label="SAM Cases"
              value={monthlyReport.sam_count}
              subtext={`${monthlyReport.sam_percentage}% of measured`}
              bg="#fee2e2"
              borderColor="#fca5a5"
              textColor="#dc2626"
              onClick={() => navigate('/reports')}
            />
            <StatCard
              label="MAM Cases"
              value={monthlyReport.mam_count}
              subtext={`${monthlyReport.mam_percentage}% of measured`}
              bg="#fff7ed"
              borderColor="#fdba74"
              textColor="#ea580c"
              onClick={() => navigate('/reports')}
            />
            <StatCard
              label="Normal"
              value={monthlyReport.normal_count}
              subtext={`${monthlyReport.normal_percentage}% of measured`}
              bg="#f0fdf4"
              borderColor="#86efac"
              textColor="#16a34a"
            />
          </div>
        ) : (
          <div style={{ padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', color: '#9ca3af', textAlign: 'center', fontSize: '14px' }}>
            No data available for this month. Start logging measurements to see stats.
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#374151' }}>Quick Actions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <QuickActionCard icon="👶" title="View Children" description="Manage enrolled children" bg="#eff6ff" border="#bfdbfe" textColor="#0c4a6e" onClick={() => navigate('/children')} />
        <QuickActionCard icon="➕" title="Register Child" description="Enroll a new child" bg="#f0fdf4" border="#bbf7d0" textColor="#15803d" onClick={() => navigate('/children/new')} />
        <QuickActionCard icon="⚖️" title="Log Measurement" description="Record weight & height" bg="#fef3c7" border="#fde68a" textColor="#92400e" onClick={() => navigate('/growth/new')} />
        <QuickActionCard icon="🍎" title="Log Diet" description="Record food intake" bg="#fce7f3" border="#fbcfe8" textColor="#831843" onClick={() => navigate('/nutrition/log')} />
        <QuickActionCard icon="📊" title="Reports" description="Monthly analytics" bg="#e0e7ff" border="#c7d2fe" textColor="#312e81" onClick={() => navigate('/reports')} />
      </div>

      {/* Info Panel */}
      <div style={{ backgroundColor: '#f9fafb', padding: '16px 20px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '600' }}>System Information</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280', fontSize: '14px' }}>
          <li style={{ marginBottom: '6px' }}>Role: <strong>{user?.role || 'Worker'}</strong> · AWC: <strong>{user?.awc_code || 'N/A'}</strong></li>
          <li>Log measurements regularly to keep data current.</li>
        </ul>
      </div>
    </div>
  );
}
