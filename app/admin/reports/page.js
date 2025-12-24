"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { FileText, Download, Calendar } from "lucide-react";

export default function ReportsPage() {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const generateReport = async () => {
        setIsGenerating(true);
        try {
            let query = supabase
                .from("recycling_transactions")
                .select(`
            *,
            recycler:recycler_id(full_name),
            item:item_id(name)
        `)
                .order("created_at", { ascending: false });

            if (startDate) {
                query = query.gte("created_at", new Date(startDate).toISOString());
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query = query.lte("created_at", end.toISOString());
            }

            const { data, error } = await query;

            if (error) throw error;

            if (!data || data.length === 0) {
                alert("No data found for the selected period.");
                return;
            }

            const headers = ["Transaction ID", "Date", "Recycler", "Item", "Quantity (g/unit)", "Centre ID"];
            const csvContent = [
                headers.join(","),
                ...data.map((row) =>
                    [
                        row.id,
                        new Date(row.created_at).toLocaleDateString(),
                        `"${row.recycler?.full_name || 'Unknown'}"`,
                        `"${row.item?.name || 'Unknown'}"`,
                        row.quantity,
                        row.collection_centre_id,
                    ].join(",")
                ),
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `recycling_report_${new Date().toISOString().split("T")[0]}.csv`);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Error generating report:", error);
            alert("Failed to generate report.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reports & Exports</h1>
                <p className="text-gray-500 mt-2">Generate and download detailed analytics reports.</p>
            </div>

            <div className="max-w-2xl">
                <div className="bg-white p-8 rounded-2xl border border-[#dfe8e0] shadow-[0_4px_20px_rgba(35,164,85,0.05)]">
                    <div className="flex items-start gap-5 mb-8">
                        <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
                            <FileText size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Transaction History Export</h3>
                            <p className="text-gray-500 mt-1 leading-relaxed">
                                Download a complete CSV record of all recycling transactions. Useful for external analysis or auditing purposes.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Calendar size={16} className="text-[#23a455]" />
                                Start Date
                            </label>
                            <input
                                type="date"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#23a455] focus:border-transparent transition-all"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Calendar size={16} className="text-[#23a455]" />
                                End Date
                            </label>
                            <input
                                type="date"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#23a455] focus:border-transparent transition-all"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        onClick={generateReport}
                        disabled={isGenerating}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#23a455] text-white rounded-xl shadow-lg shadow-green-900/10 hover:shadow-green-900/20 hover:bg-[#1c8c48] transition-all font-semibold disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Generating Report...
                            </>
                        ) : (
                            <>
                                <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                                Download CSV Report
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
