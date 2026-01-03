'use client';
import { useEffect, useState } from 'react';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
    async function fetchLeaders() {
      try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        
        // ✅ FIX: Extract the 'leaderboard' array from the data object
        // Use '|| []' to prevent crashes if the array is missing
        setLeaders(data.leaderboard || []); 
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
        setLeaders([]); // Fallback to empty array on error
      } finally {
        setLoading(false);
      }
    }
    fetchLeaders();
  }, []);

  if (loading) return <p className="text-gray-500">Loading rankings...</p>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100">
      <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center">
        🏆 Global Leaderboard
      </h3>
      <div className="space-y-3">
        {leaders.map((user, index) => (
          <div key={index} className="flex justify-between items-center p-2 rounded-lg hover:bg-green-50 transition-colors">
            <div className="flex items-center gap-3">
              <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-400 text-white' : 'bg-gray-100'}`}>
                {index + 1}
              </span>
              <span className="font-medium text-gray-700">{user.username || 'Anonymous'}</span>
            </div>
            <span className="text-green-600 font-bold">{user.total_points} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}