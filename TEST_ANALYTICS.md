# Analytics Testing Guide

## How to Test Admin Analytics

### 1. **Check if Admin Can Access Analytics**

Login as an admin user and navigate to:
- `/admin` - Main admin dashboard with analytics
- `/admin/analytics` - Dedicated analytics page

### 2. **What to Verify**

#### A. Admin Overview Page (`/admin`)
Should display:
- ✅ Total Users count
- ✅ Recycled Items count
- ✅ New Registered users (last 7 days)
- ✅ Platform Analytics section with:
  - Volume trend chart (line/area graph)
  - Material distribution (pie chart)
  - Centre performance (bar chart)
- ✅ Time range selector (7d, 30d, All Time)
- ✅ Export reports button

#### B. Analytics API Endpoint
Test the API directly: `/api/admin/analytics?range=7d`

Expected response structure:
```json
{
  "trendData": [
    { "name": "Dec 30", "volume": 150, "transactions": 5 }
  ],
  "materialData": [
    { "name": "Plastic Bottles", "value": 50 }
  ],
  "centreData": [
    { "name": "John Doe", "value": 100 }
  ],
  "exportData": [
    {
      "id": 1,
      "date": "2025-12-30T10:00:00Z",
      "material": "Plastic Bottles",
      "centre": "John Doe",
      "quantity": 10
    }
  ]
}
```

### 3. **Database Requirements**

For analytics to work, you need:

#### Tables:
- `recycling_transactions` with columns:
  - `id`
  - `session_id`
  - `recycler_id`
  - `collection_centre_id` (ID of centre_staff who recorded it)
  - `item_id` (recyclable item type)
  - `quantity` (integer: count or grams)
  - `created_at` (timestamp)

- `recyclable_items` with columns:
  - `id`
  - `name` (e.g., "Plastic Bottles", "Newspaper")

- `profiles` with columns:
  - `id`
  - `full_name`
  - `role` ('admin', 'centre_staff', 'recycler')

### 4. **Common Issues**

#### Issue: No data showing on charts
**Cause**: No transactions in database
**Solution**: Create test transactions:
1. Login as centre_staff
2. Search for a recycler
3. Record some recycling items
4. Check analytics again

#### Issue: "Unknown Centre" in centre chart
**Cause**: `collection_centre_id` doesn't match any centre_staff profile
**Solution**: Ensure transactions have valid `collection_centre_id` that matches a centre_staff user

#### Issue: Charts show but no material names
**Cause**: Item IDs don't match recyclable_items table
**Solution**: Verify `recyclable_items` table has entries with IDs 1-5

#### Issue: 403 Unauthorized
**Cause**: Not logged in as admin
**Solution**: Login with admin account (role = 'admin')

### 5. **Test Scenarios**

1. **Empty Database Test**
   - Expected: Charts render but show "No data" or empty state
   - Actual: Should see empty charts gracefully

2. **With Data Test**
   - Create 3-5 transactions with different materials
   - Expected: All charts populate with data
   - Verify trend chart shows dates
   - Verify pie chart shows material breakdown
   - Verify bar chart shows centre names

3. **Time Range Test**
   - Switch between 7d, 30d, and All Time
   - Expected: Charts update with filtered data
   - Loading spinner should appear briefly

4. **Export Test**
   - Click "Generate Reports" button
   - Try exporting each format:
     - Transaction Log (Raw Data)
     - Material Impact Report
     - Centre Performance Report
   - Expected: CSV files download successfully

### 6. **Quick SQL Verification**

Run these queries in Supabase SQL Editor:

```sql
-- Check if transactions exist
SELECT COUNT(*) FROM recycling_transactions;

-- Check transaction structure
SELECT * FROM recycling_transactions LIMIT 5;

-- Check if recyclable_items exist
SELECT * FROM recyclable_items;

-- Check centre_staff users
SELECT id, full_name FROM profiles WHERE role = 'centre_staff';

-- Verify collection_centre_id references
SELECT 
  rt.id,
  rt.collection_centre_id,
  p.full_name as centre_name
FROM recycling_transactions rt
LEFT JOIN profiles p ON rt.collection_centre_id = p.id
LIMIT 10;
```

### 7. **Expected Behavior**

✅ **Working Correctly If:**
- Analytics loads without errors
- Charts display data when transactions exist
- Time range filtering works
- CSV exports download successfully
- All material names appear (not just IDs)
- Centre names appear (not "Unknown Centre")

❌ **Problem If:**
- 403 error (not admin)
- 500 error (API issue)
- Charts empty when data exists
- "Unknown Centre" for all entries
- Item IDs showing instead of names
- Export buttons don't work

### 8. **Browser Console Check**

Open DevTools Console and look for:
- ✅ No error messages
- ✅ API call to `/api/admin/analytics?range=7d` succeeds (200 status)
- ❌ Any red error messages
- ❌ Failed API calls (403, 500 errors)

### 9. **Network Tab Inspection**

1. Open DevTools → Network tab
2. Reload admin page
3. Look for: `/api/admin/analytics?range=7d`
4. Check:
   - Status: Should be 200
   - Response: Should contain trendData, materialData, centreData, exportData
   - Headers: Should show Content-Type: application/json

### 10. **Manual API Test**

Using browser console or a tool like Postman:

```javascript
// In browser console (when logged in as admin)
fetch('/api/admin/analytics?range=7d')
  .then(r => r.json())
  .then(data => console.log(data));
```

Should return analytics object with all four data arrays.
