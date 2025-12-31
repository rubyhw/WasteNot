# WasteNot - Sustainable Recycling Platform

A comprehensive recycling management platform built with Next.js, React, and Supabase. WasteNot helps communities track recycling efforts, reward recyclers with points, and manage collection centers efficiently.


Open [http://localhost:3000](http://localhost:3000) in your browser.


Live Demo: 🔗 https://waste-not-phi.vercel.app/

## Project Structure

```
WasteNot-main/
├── app/
│   ├── admin/              # Admin dashboard pages
│   ├── api/                # API routes
│   ├── components/         # Reusable React components
│   ├── config/            # Configuration files (items, translations)
│   ├── contexts/          # React Context providers
│   ├── staff/             # Staff pages
│   ├── profile/           # User profile page
│   ├── transactions/      # Transaction management
│   └── globals.css        # Global styles
├── lib/
│   ├── supabase.js        # Supabase client configuration
│   └── admin-auth.js      # Admin authentication helper
├── public/                # Static assets
└── README.md
```

## User Roles

1. **Recycler** (Default)
   - Can view personal recycling history
   - Earn and redeem points
   - Access profile and voucher catalogue

2. **Centre Staff**
   - Can record recycling transactions
   - View transaction history
   - Generate reports

3. **Admin**
   - Full system access
   - User and voucher management
   - System-wide analytics

## Key Features Implementation

### Authentication & Authorization
- Supabase Auth with email/password
- Role-based access control (RBAC)
- Protected routes with middleware

### Points System
- Automatic points calculation based on recyclable items
- Point redemption for vouchers
- Transaction history tracking

### Multi-language Support
- English, Malay (Bahasa Melayu), Chinese (中文)
- Client-side language switching
- Persistent language preference

### Analytics Dashboard
- Real-time recycling statistics
- Material breakdown charts
- Collection center performance metrics


