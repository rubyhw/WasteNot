"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    Users,
    Package,
    Download,
    Calendar,
    UserPlus,
    PieChart,
    BarChart3
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart as RePieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from "recharts";

export default function DashboardPage() {
    // Top Level Metrics
    const [stats, setStats] = useState({ users: 0, items: 0, newUsers: 0 });

    // Analytics Data
    const [analyticsData, setAnalyticsData] = useState({
        trendData: [],
        materialData: [],
        centreData: [],
        exportData: []
    });
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);
    const [timeRange, setTimeRange] = useState('7d');

    useEffect(() => {
        loadTopStats();
    }, []);

    useEffect(() => {
        loadAnalytics();
    }, [timeRange]);

    async function loadTopStats() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        const { count: txCount } = await supabase.from("recycling_transactions").select("*", { count: "exact", head: true });
        const { count: newUserCount } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .neq('role', 'admin')
            .gte('created_at', sevenDaysAgo.toISOString());

        setStats({
            users: userCount || 0,
            items: txCount || 0,
            newUsers: newUserCount || 0
        });
    }

    async function loadAnalytics() {
        setLoadingAnalytics(true);
        try {
            const res = await fetch(`/api/admin/analytics?range=${timeRange}`);
            const data = await res.json();
            if (data.trendData) {
                setAnalyticsData(data);
            }
        } catch (error) {
            console.error("Failed to load analytics", error);
        } finally {
            setLoadingAnalytics(false);
        }
    }

    const handleExport = () => {
        if (!analyticsData.exportData.length) return alert("No data to export");

        const headers = ["ID", "Date", "Material", "Centre", "Quantity"];
        const csvContent = [
            headers.join(","),
            ...analyticsData.exportData.map(row =>
                `${row.id},${new Date(row.date).toLocaleDateString()},"${row.material}","${row.centre}",${row.quantity}`
            )
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `recycling_data_${timeRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Colors for Pie Chart
    const COLORS = ['#23a455', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="fade-in" style={{ paddingBottom: 60 }}>

            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ marginBottom: 8 }}>Overview</h1>
                <p className="lede" style={{ fontSize: 16, margin: 0 }}>
                    Welcome back, Admin. Here is your daily summary.
                </p>
            </div>

            {/* Top Row: Key Metrics */}
            <div className="grid">
                <StatCard
                    title="Total Users"
                    value={stats.users}
                    icon={Users}
                />
                <StatCard
                    title="Recycled Items"
                    value={stats.items}
                    icon={Package}
                />
                <StatCard
                    title="New Registered"
                    value={stats.newUsers}
                    icon={UserPlus}
                />
            </div>

            {/* Analytics Section */}
            <div style={{ marginTop: 40 }}>
                {/* Section Header with Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <h3 style={{ fontSize: 20, margin: 0, fontWeight: 600 }}>Platform Analytics</h3>
                        <div style={{ background: '#e2e8f0', borderRadius: 8, padding: 2, display: 'flex' }}>
                            {['7d', '30d', 'all'].map(range => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    style={{
                                        border: 'none',
                                        background: timeRange === range ? 'white' : 'transparent',
                                        padding: '4px 12px',
                                        borderRadius: 6,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: timeRange === range ? '#0f172a' : '#64748b',
                                        cursor: 'pointer',
                                        boxShadow: timeRange === range ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                    }}
                                >
                                    {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        className="btn"
                        style={{ background: 'white', borderColor: 'var(--border)', color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, height: 36, padding: '0 16px' }}
                    >
                        <Download size={14} />
                        Export CSV
                    </button>
                </div>

                {/* 1. Main Trend Graph */}
                <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
                    <div style={{ height: 350, width: '100%', background: 'linear-gradient(to bottom, #ffffff, #f8fafc)', padding: '24px 32px 16px 16px' }}>
                        {loadingAnalytics ? (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Loading Trend Data...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analyticsData.trendData}>
                                    <defs>
                                        <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#23a455" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#23a455" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="volume" stroke="#23a455" strokeWidth={3} fill="url(#colorVol)" name="Volume" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: '#fafafa', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                        Total Recycling Volume Trend
                    </div>
                </div>

                {/* 2. Breakdown Charts (Row) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>

                    {/* Material Distribution */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <PieChart size={18} color="var(--primary)" />
                                <h4 style={{ margin: 0, fontSize: 16 }}>Volume by Material</h4>
                            </div>
                        </div>
                        <div style={{ flex: 1, minHeight: 300 }}>
                            {loadingAnalytics ? (
                                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={analyticsData.materialData}
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {analyticsData.materialData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </RePieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Location Performance */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <BarChart3 size={18} color="#3b82f6" />
                                <h4 style={{ margin: 0, fontSize: 16 }}>Volume by Centre</h4>
                            </div>
                        </div>
                        <div style={{ flex: 1, minHeight: 300 }}>
                            {loadingAnalytics ? (
                                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analyticsData.centreData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                                        <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} name="Volume" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

// Stats Card Component
function StatCard({ title, value, icon: Icon }) {
    return (
        <div className="stat">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ padding: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 10 }}>
                    <Icon size={20} color="white" />
                </div>
            </div>
            <div>
                <div className="stat-value" style={{ color: 'white', fontSize: 32, marginBottom: 4 }}>{value}</div>
                <div className="stat-label" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{title}</div>
            </div>
        </div>
    );
}

// Custom Tooltip for Trend Graph
function CustomTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: '#0f172a', color: 'white', padding: '12px 16px', borderRadius: 12, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}>
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, opacity: 0.8 }}>{label}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#23a455' }}></span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{payload[0].value.toLocaleString()} units</span>
                </div>
            </div>
        );
    }
    return null;
}
