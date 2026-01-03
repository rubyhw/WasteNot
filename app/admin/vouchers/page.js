"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2, X, AlertCircle, Tag } from "lucide-react";

export default function VouchersPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [term, setTerm] = useState("");
    const [leaders, setLeaders] = useState([]);

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        points_cost: 100,
        is_active: true
    });
    const [formLoading, setFormLoading] = useState(false);

useEffect(() => {
    (async () => {
        try {
            const res = await fetch('/api/leaderboard');
            const data = await res.json();
            setLeaders(data);
        } catch (error) {
            console.error(error);
        }
    })();
    loadData();
}, []);

    async function loadData() {
        try {
            const res = await fetch('/api/admin/vouchers');
            if (!res.ok) throw new Error("Failed to load vouchers");
            const vouchers = await res.json();
            setData(vouchers || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    // --- Actions ---

    const openAddModal = () => {
        setEditMode(false);
        setFormData({ name: "", description: "", points_cost: 100, is_active: true });
        setIsModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditMode(true);
        setSelectedItem(item);
        setFormData({
            name: item.name,
            description: item.description || "",
            points_cost: item.points_cost,
            is_active: item.is_active
        });
        setIsModalOpen(true);
    };

    const openDeleteModal = (item) => {
        setSelectedItem(item);
        setIsDeleteOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);

        try {
            const method = editMode ? "PUT" : "POST";
            const payload = editMode
                ? { ...formData, id: selectedItem.id }
                : formData;

            // Ensure points is int
            payload.points_cost = parseInt(payload.points_cost);

            const res = await fetch('/api/admin/vouchers', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            alert(editMode ? "Voucher updated successfully!" : "Voucher created successfully!");
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/admin/vouchers?id=${selectedItem.id}`, {
                method: 'DELETE'
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            alert("Voucher deleted successfully!");
            setIsDeleteOpen(false);
            loadData();
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    const filtered = data.filter(item =>
        item.name?.toLowerCase().includes(term.toLowerCase())
    );

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header Actions */}
            <div className="admin-toolbar">
                <div>
                    <h1 className="section-title">Rewards & Rankings</h1>
                    <p style={{ color: 'var(--muted)' }}>Manage redemption rewards and track top contributors</p>
                </div>
                <button
                    className="btn primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={openAddModal}
                >
                    <Plus size={16} />
                    Create Voucher
                </button>
            </div>

            {/* Main Grid Layout */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 350px', 
                gap: '24px', 
                alignItems: 'start' 
            }}>
            
            {/* LEFT COLUMN: Vouchers Table */}
            <div className="table-container" style={{ margin: 0 }}>
                <div className="table-actions-header">
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                        <input
                            type="text"
                            placeholder="Search vouchers..."
                            className="search-input"
                            style={{ paddingLeft: 36 }}
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                        Showing <strong>{filtered.length}</strong> rewards
                    </div>
                </div>

                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Voucher Name</th>
                            <th>Description</th>
                            <th>Cost (Pts)</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No vouchers found</td></tr>
                        ) : (
                            filtered.map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <div className="user-info-cell">
                                            <div className="avatar-circle" style={{ background: '#fff7ed', color: '#c2410c', borderColor: '#ffedd5' }}>
                                                <Tag size={16} />
                                            </div>
                                            <div className="user-name">{item.name}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: 12, fontFamily: 'monospace', maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.description || "-"}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{item.points_cost}</td>
                                    <td>
                                        <span className={`badge ${item.is_active ? 'badge-green' : 'badge-red'}`}>
                                            {item.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div className="action-buttons">
                                            <button className="btn-action edit" onClick={() => openEditModal(item)}><Pencil size={16} /></button>
                                            <button className="btn-action delete" onClick={() => openDeleteModal(item)}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

{/* RIGHT COLUMN: Leaderboard Sidebar */}
<aside style={{ 
    background: 'white', 
    borderRadius: '12px', 
    border: '1px solid #e2e8f0', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
}}>
    <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid #e2e8f0', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: '#f8fafc',
        borderTopLeftRadius: '12px',
        borderTopRightRadius: '12px'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={18} style={{ color: '#f59e0b' }} />
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Top Recyclers</h2>
        </div>
    </div>

    <div style={{ padding: '8px' }}>
        {leaders && leaders.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No data yet
            </div>
        ) : (
           (Array.isArray(leaders) ? leaders : []).map((user, index) => (
                <div key={user.id || index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '4px',
                    background: index === 0 ? '#fffbeb' : 'transparent'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ 
                            width: '20px', 
                            fontSize: '12px', 
                            fontWeight: 800, 
                            color: index === 0 ? '#f59e0b' : '#94a3b8' 
                        }}>
                            #{index + 1}
                        </span>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                                {user.public_id || 'Member'}
                            </div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>
                                Rank {index + 1}
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
                            {user.points_total || 0}
                        </div>
                        <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                            Points
                        </div>
                    </div>
                </div>
            ))
        )}
    </div>
</aside>
            </div>

            {/* Unified Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3 className="modal-title">{editMode ? "Edit Voucher" : "Create Voucher"}</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Voucher Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. $5 FairPrice Voucher"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-input"
                                        rows={3}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Terms and conditions..."
                                        style={{ resize: 'none' }}
                                    />
                                </div>
                                <div className="admin-grid-2-1" style={{ gap: 16, gridTemplateColumns: '1fr 1fr' }}>
                                    <div className="form-group">
                                        <label className="form-label">Points Cost</label>
                                        <input
                                            required
                                            type="number"
                                            className="form-input"
                                            value={formData.points_cost}
                                            onChange={e => setFormData({ ...formData, points_cost: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select
                                            className="form-input form-select"
                                            value={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                                        >
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn ghost"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={formLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn primary"
                                    disabled={formLoading}
                                >
                                    {formLoading ? 'Saving...' : (editMode ? 'Save Changes' : 'Create Voucher')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 400 }}>
                        <div className="modal-body" style={{ textAlign: 'center', paddingTop: 40 }}>
                            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="modal-title" style={{ fontSize: 20, marginBottom: 8 }}>Delete Voucher?</h3>
                            <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
                                Are you sure you want to delete <strong>{selectedItem?.name}</strong>? This action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button
                                    className="btn ghost"
                                    onClick={() => setIsDeleteOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn primary"
                                    style={{ background: '#DC2626', color: 'white', borderColor: '#DC2626', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)' }}
                                    onClick={handleDelete}
                                >
                                    Delete Voucher
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
