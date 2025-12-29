"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";

export default function AnalyticsPage() {
    const [volumeData, setVolumeData] = useState([]);
    const [materialData, setMaterialData] = useState([]);
    const [loading, setLoading] = useState(true);

    const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            // Fetch all transactions with item details
            // Note: We need to join with item name if possible, or fetch items separately
            // Using simple fetch for now
            const { data: transactions, error } = await supabase
                .from("recycling_transactions")
                .select("quantity, item_id, created_at");

            if (error) throw error;

            const { data: items } = await supabase
                .from("recyclable_items")
                .select("id, name");

            const itemMap = {};
            if (items) {
                items.forEach(i => itemMap[i.id] = i.name);
            }

            if (transactions) {
                // Process for Material Type (Pie Chart)
                const typeCount = {};
                transactions.forEach((tx) => {
                    const name = itemMap[tx.item_id] || `ID ${tx.item_id}`;
                    typeCount[name] = (typeCount[name] || 0) + (tx.quantity || 0);
                });

                const pieData = Object.keys(typeCount).map((key) => ({
                    name: key,
                    value: typeCount[key],
                }));
                setMaterialData(pieData);

                // Process for Volume over time (Bar Chart - Mocking monthly aggregation for simplicity or using raw dates)
                // Grouping by date (simple substring)
                const dateVolume = {};
                transactions.forEach((tx) => {
                    const date = new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    dateVolume[date] = (dateVolume[date] || 0) + (tx.quantity || 0);
                });

                // Take last 7 days or entries for readability
                const barData = Object.keys(dateVolume).slice(-7).map(key => ({
                    name: key,
                    quantity: dateVolume[key]
                }));
                setVolumeData(barData);
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Recycling Analytics</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Material Type Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[400px]">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Recycling by Material Type</h3>
                    {loading ? (
                        <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                    ) : materialData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={materialData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {materialData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Volume Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[400px]">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Recycling Volume Trends</h3>
                    {loading ? (
                        <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                    ) : volumeData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={volumeData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Bar dataKey="quantity" fill="#23a455" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Location Stats Placeholder */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Location Statistics</h3>
                <p className="text-gray-500">Geographic distribution data visualization coming soon.</p>
            </div>
        </div>
    );
}
