'use client';

export default function Badge({ role }) {
    const map = {
        admin: "badge-red",
        centre_staff: "badge-blue",
        recycler: "badge-green"
    };
    return (
        <span className={`badge ${map[role] || "badge-green"}`}>
            {role}
        </span>
    );
}