"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2, X, AlertCircle, Package } from "lucide-react";

export default function ItemsPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [term, setTerm] = useState("");

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: ""
    });
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const res = await fetch('/api/admin/items');
            if (!res.ok) throw new Error("Failed to load items");
            const items = await res.json();
            setData(items || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    // --- Actions ---

    const openAddModal = () => {
        setEditMode(false);
        setFormData({ name: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditMode(true);
        setSelectedItem(item);
        setFormData({
            name: item.name
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

            const res = await fetch('/api/admin/items', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            alert(editMode ? "Item updated successfully!" : "Item added successfully!");
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
            const res = await fetch(`/api/admin/items?id=${selectedItem.id}`, {
                method: 'DELETE'
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            alert("Item deleted successfully!");
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
        <div>
            {/* Header Actions */}
            <div className="admin-toolbar">
                <div>
                    <h1 className="section-title">Items Database</h1>
                    <p style={{ color: 'var(--muted)' }}>Manage recyclable materials</p>
                </div>
                <button
                    className="btn primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={openAddModal}
                >
                    <Plus size={16} />
                    Add Item
                </button>
            </div>

            {/* Table */}
            <div className="table-container">
                <div className="table-actions-header">
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                        <input
                            type="text"
                            placeholder="Search items..."
                            className="search-input"
                            style={{ paddingLeft: 36 }}
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                        Showing <strong>{filtered.length}</strong> items
                    </div>
                </div>

                <table className="admin-table">
                    <thead>
                        <tr>
                            <th style={{ width: 80 }}>ID</th>
                            <th>Item Name</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No items found</td></tr>
                        ) : (
                            filtered.map(item => (
                                <tr key={item.id}>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--muted)' }}>
                                        #{item.id}
                                    </td>
                                    <td>
                                        <div className="user-info-cell">
                                            <div className="avatar-circle" style={{ background: '#f5f5f5', color: '#525252', borderColor: '#e5e5e5' }}>
                                                <Package size={16} />
                                            </div>
                                            <div className="user-name">{item.name}</div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-action edit"
                                                title="Edit Item"
                                                onClick={() => openEditModal(item)}
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                className="btn-action delete"
                                                title="Delete Item"
                                                onClick={() => openDeleteModal(item)}
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
                            <h3 className="modal-title">{editMode ? "Edit Item" : "Add New Item"}</h3>
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
                                    <label className="form-label">Item Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Plastic Bottle"
                                    />
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
                                    {formLoading ? 'Saving...' : (editMode ? 'Save Changes' : 'Add Item')}
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
                            <h3 className="modal-title" style={{ fontSize: 20, marginBottom: 8 }}>Delete Item?</h3>
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
                                    Delete Item
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
