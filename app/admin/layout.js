"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    LayoutDashboard,
    Users,
    Store,
    Ticket,
    Database,
    BarChart3,
    FileText
} from "lucide-react";
import "./admin.css"; // Import the new CSS file

export default function AdminLayout({ children }) {
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        async function check() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

            if (profile?.role !== 'admin') {
                router.push("/");
            } else {
                setAuthorized(true);
            }
        }
        check();
    }, [router]);

    if (!authorized) {
        return <div style={{ padding: 40, textAlign: 'center' }}>Loading Admin Portal...</div>;
    }

    const links = [
        { name: "Overview", href: "/admin", icon: LayoutDashboard },
        { name: "Users", href: "/admin/users", icon: Users },
        { name: "Collections", href: "/admin/collections", icon: Store },
        { name: "Vouchers", href: "/admin/vouchers", icon: Ticket },
        { name: "Items", href: "/admin/items", icon: Database },
    ];

    return (
        <div>
            {/* CSS-Styled Navigation Bar */}
            <div className="admin-nav-strip">
                <div className="admin-nav-container">
                    <div className="admin-nav-links">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`admin-nav-link ${isActive ? 'active' : ''}`}
                                >
                                    <Icon size={18} />
                                    <span>{link.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="admin-main">
                {children}
            </main>
        </div>
    );
}
