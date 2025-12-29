"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Plus, Pencil, Trash2, X, AlertCircle } from "lucide-react";
import Badge from "@/app/components/Badge";

export default function CollectionsPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [term, setTerm] = useState("");

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        fullName: "",
        role: "centre_staff" // Default to centre_staff
    });
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const res = await fetch('/api/admin/users?role=centre_staff');
            if (!res.ok) throw new Error("Failed to load staff");
            const data = await res.json();
            setUsers(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    // --- Actions ---

    const openAddModal = () => {
        setEditMode(false);
        setFormData({ email: "", password: "", fullName: "", role: "centre_staff" });
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditMode(true);
        setSelectedUser(user);
        setFormData({
            email: user.email || "",
            password: "",
            fullName: user.full_name,
            role: user.role
        });
        setIsModalOpen(true);
    };

    const openDeleteModal = (user) => {
        setSelectedUser(user);
        setIsDeleteOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);

        try {
            const method = editMode ? "PUT" : "POST";
            const payload = {
                ...formData,
                id: selectedUser?.id
            };

            const res = await fetch('/api/admin/users', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            alert(editMode ? "Staff updated successfully!" : "Staff created successfully!");
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
            const res = await fetch(`/api/admin/users?id=${selectedUser.id}`, {
                method: 'DELETE'
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            alert("Staff deleted successfully!");
            setIsDeleteOpen(false);
            loadData();
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    const filtered = users.filter(u =>
        u.full_name?.toLowerCase().includes(term.toLowerCase())
    );

    return (
        <div>
            {/* Header Actions */}
            <div className="admin-toolbar">
                <div>
                    <h1 className="section-title">Collection Centres</h1>
                    <p style={{ color: 'var(--muted)' }}>Manage staff and locations</p>
                </div>
                <button
                    className="btn primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={openAddModal}
                >
                    <Plus size={16} />
                    Add Staff
                </button>
            </div>

            {/* Table */}
            <div className="table-container">
                <div className="table-actions-header">
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                        <input
                            type="text"
                            placeholder="Search staff..."
                            className="search-input"
                            style={{ paddingLeft: 36 }}
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                        Showing <strong>{filtered.length}</strong> staff
                    </div>
                </div>

                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Staff Name</th>
                            <th>Role</th>
                            <th style={{ textAlign: 'right' }}>Public ID</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No staff found</td></tr>
                        ) : (
                            filtered.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-info-cell">
                                            <div className="avatar-circle" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#dbeafe' }}>
                                                {user.full_name?.[0]?.toUpperCase() || "S"}
                                            </div>
                                            <span className="user-name">{user.full_name || "Unknown"}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <Badge role={user.role} />
                                    </td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 14 }}>
                                        {user.public_id || "-"}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-action edit"
                                                title="Edit Staff"
                                                onClick={() => openEditModal(user)}
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                className="btn-action delete"
                                                title="Delete Staff"
                                                onClick={() => openDeleteModal(user)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Unified Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3 className="modal-title">{editMode ? "Edit Staff" : "Add Centre Staff"}</h3>
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
                                    <label className="form-label">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="form-input"
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                {!editMode && <div className="form-group">
                                    <label className="form-label">Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        required={!editMode}
                                    />
                                </div>}
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select
                                        className="form-input form-select"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="centre_staff">Centre Staff</option>
                                    </select>
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
                                    {formLoading ? 'Saving...' : (editMode ? 'Save Changes' : 'Create Staff')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Delete Modal */}
            {isDeleteOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 400 }}>
                        <div className="modal-body" style={{ textAlign: 'center', paddingTop: 40 }}>
                            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="modal-title" style={{ fontSize: 20, marginBottom: 8 }}>Delete Staff?</h3>
                            <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
                                Are you sure you want to delete <strong>{selectedUser?.full_name}</strong>?
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
                                    Delete Staff
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
