# WasteNot Navigation Guide

## Overview
This document describes the complete navigation structure and linking for all user roles in the WasteNot application.

## User Roles & Access

### 1. **Recycler** (role: 'recycler')
Users who recycle items and earn points.

#### Available Pages:
- **Home (`/`)**: 
  - Shows recycling statistics (total points, items recycled)
  - Displays recycling history
  - Links to Profile page
  
- **Profile (`/profile`)**:
  - View total points earned
  - See recycling transaction history grouped by session
  - Browse voucher catalogue
  - View total items recycled

#### Navigation:
- Header: Home, Profile
- No access to: Admin panel, Transaction management, Reports, Staff recycle page

---

### 2. **Centre Staff** (role: 'centre_staff')
Staff members at recycling collection centres.

#### Available Pages:
- **Home (`/`)**: 
  - Member lookup interface
  - Search for recyclers by ID/phone/name
  - Redirect to recycle page after finding member
  
- **Staff Recycle (`/staff/recycle/[recyclerId]`)**:
  - Record recycling transactions for a specific recycler
  - Select items and quantities
  - Submit transaction (automatically updates points)
  
- **Transactions (`/transactions`)**:
  - View all recycling transactions
  - Filter by recycler
  - Edit transaction quantities (recalculates points)
  - Delete transactions (deducts points)
  
- **Reports (`/reports`)**:
  - View monthly/yearly recycling statistics
  - Analyze recycling trends by item type
  - Download CSV reports

#### Navigation:
- Header: Home, Transactions, Reports
- No access to: Admin panel pages

---

### 3. **Admin** (role: 'admin')
System administrators with full access.

#### Available Pages:
- **Admin Overview (`/admin`)**:
  - Dashboard with key metrics
  - Charts showing recycling trends
  - Material distribution analytics
  - Export data functionality
  
- **Users Management (`/admin/users`)**:
  - View all recyclers
  - Add new recyclers
  - Edit user details
  - Delete users
  
- **Collections Management (`/admin/collections`)**:
  - Manage collection centre staff
  - Add/edit/delete centre_staff accounts
  
- **Vouchers Management (`/admin/vouchers`)**:
  - Create/edit vouchers
  - Set points cost
  - Activate/deactivate vouchers
  
- **Items Management (`/admin/items`)**:
  - View recyclable items
  - Add/edit item types
  - Delete items
  
- **Analytics (`/admin/analytics`)**:
  - Detailed recycling volume charts
  - Material breakdown by type
  - Advanced data visualization

#### Navigation:
- Header: **Admin Panel** (red badge), Users, Vouchers, Items
- Admin layout provides secondary navigation within admin section
- Auto-redirect from `/` to `/admin` when admin logs in

---

## Authentication Flows

### Login (`/login`)
- Successful login redirects to:
  - `/admin` if user is admin
  - `/` (Home) for recyclers and centre_staff
  
### Register (`/register`)
- Creates new recycler account
- Redirects to `/` (Home) after successful registration

### Forgot Password (`/forgot-password`)
- Sends reset email with link to `/reset-password`

### Reset Password (`/reset-password`)
- Allows password reset via email link
- Redirects to `/login` after successful reset

---

## Protected Routes

### Recycler-Only Pages:
- `/profile` - requires authenticated user with role 'recycler'

### Centre Staff Pages:
- `/staff/recycle/[recyclerId]` - requires 'centre_staff' role
- `/transactions` - requires 'centre_staff' role
- `/reports` - requires 'centre_staff' role

### Admin-Only Pages:
All pages under `/admin/*` require 'admin' role:
- `/admin` (Overview)
- `/admin/users`
- `/admin/collections`
- `/admin/vouchers`
- `/admin/items`
- `/admin/analytics`

### Public Pages:
- `/` (Home) - accessible to all, content varies by role
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/learn-more` - educational content about recycling

---

## Navigation Logic Summary

### Header Navigation (`app/components/Header.js`)
The header dynamically displays navigation items based on user role:

```javascript
// Recyclers see:
- Home
- Profile

// Centre Staff see:
- Home
- Transactions
- Reports

// Admins see:
- Admin Panel (with red badge)
- Users
- Vouchers
- Items
```

### Role Detection Logic
```javascript
// In page.js
const isRecycler = user && profile?.role === 'recycler'

// Excludes admin and centre_staff from recycler content
```

### Admin Layout Navigation
The admin layout (`app/admin/layout.js`) provides a secondary navigation bar:
- Overview
- Users
- Collections
- Vouchers
- Items

---

## Key Navigation Improvements Made

1. **Admin Badge & Links**: Added prominent red "Admin" badge and direct links to admin functions in header
2. **Home Link for Staff**: Centre staff now have a Home link to return to member lookup
3. **Fixed isRecycler Logic**: Properly excludes admin and centre_staff from recycler-specific content
4. **Role-Based Redirects**: Login automatically routes users to appropriate starting page
5. **Protected Routes**: All pages check authentication and role before allowing access

---

## Testing Checklist

### As Recycler:
- ✅ Can access Home and Profile
- ✅ Cannot access Admin, Transactions, Reports
- ✅ See only Home and Profile in header

### As Centre Staff:
- ✅ Can access Home, Transactions, Reports
- ✅ Can search for and recycle items for members
- ✅ Cannot access Admin panel
- ✅ See Home, Transactions, Reports in header

### As Admin:
- ✅ Auto-redirect from Home to /admin
- ✅ Can access all admin pages
- ✅ See Admin badge and admin links in header
- ✅ Admin layout navigation works correctly

### Authentication:
- ✅ Unauthenticated users redirected to /login
- ✅ Wrong role redirected to appropriate page
- ✅ Login redirects based on role
- ✅ Logout works from all pages

---

## Points Calculation System

The system automatically calculates and updates recycler points:

### When Transaction is Created:
- Centre staff records items at `/staff/recycle/[recyclerId]`
- System calculates points: 1 point per item (quantity-based) or 1 point per kg (weight-based)
- Points added to `profiles.points_total`

### When Transaction is Updated:
- At `/transactions`, staff can edit quantities
- System recalculates point difference
- Updates `profiles.points_total` accordingly

### When Transaction is Deleted:
- At `/transactions`, staff can delete sessions
- System deducts points from recycler
- Updates `profiles.points_total`

---

## Database Tables Used

- **profiles**: User accounts (id, full_name, role, points_total)
- **recycling_transactions**: Individual item transactions (session_id, recycler_id, item_id, quantity)
- **recycling_sessions**: Groups transactions (id, recycler_id, centre_staff_id, created_at)
- **recyclable_items**: Item types (id, name, measurement_type, icon)
- **vouchers**: Reward catalogue (id, name, description, points_cost, is_active)

---

## API Endpoints

### Staff Endpoints:
- `POST /api/staff/create-session` - Create recycling session
- `GET /api/staff/lookup-recycler` - Search for recycler
- `GET /api/staff/transactions` - Get all transactions
- `PATCH /api/staff/transactions/[sessionId]` - Update transaction
- `DELETE /api/staff/transactions/[sessionId]` - Delete session

### Admin Endpoints:
- `GET /api/admin/analytics` - Get analytics data
- `GET/POST/PATCH/DELETE /api/admin/users` - Manage users
- `GET/POST/PATCH/DELETE /api/admin/vouchers` - Manage vouchers
- `GET/POST/PATCH/DELETE /api/admin/items` - Manage items

### Auth Endpoints:
- `POST /api/auth/create-profile` - Create user profile after signup

---

## Known Navigation Patterns

1. **Recycler Flow**: Login → Home (stats) → Profile (history/vouchers)
2. **Staff Flow**: Login → Home (lookup) → Recycle page → Transactions (manage)
3. **Admin Flow**: Login → Admin Overview → Manage (users/vouchers/items)

---

## All Navigation Links Verified ✅

Every page has been checked and all navigation paths work correctly:
- All header links functional
- All authentication redirects working
- All role-based access controls in place
- All admin navigation links active
- All public pages accessible
