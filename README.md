# WasteNot - Sustainable Recycling Platform

A comprehensive recycling management platform built with Next.js, React, and Supabase. WasteNot helps communities track recycling efforts, reward recyclers with points, and manage collection centers efficiently.

## Features

### For Recyclers 🌱
- Track recycling history and earned points
- View and redeem vouchers from point catalogue
- Personal dashboard with statistics
- Multi-language support (English, Malay, Chinese)
- QR code/public ID for easy check-in at collection centers

### For Collection Center Staff 📊
- Quick recycler lookup by member code
- Record recycling transactions
- View transaction history and reports
- Monthly/yearly analytics

### For Administrators 👥
- User management (recyclers and staff)
- Voucher catalogue management
- System analytics and reports
- Recyclable items configuration

## Tech Stack

- **Frontend**: Next.js 14, React 18
- **Backend**: Supabase (PostgreSQL database, Authentication, Row Level Security)
- **Styling**: Custom CSS with responsive design
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Image Optimization**: Next.js Image component

## Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Supabase account
- (Optional) Google Maps API key for maps feature

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: Google Maps (for location features)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd WasteNot-main
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase Database**

Run the SQL scripts in `app/db-schema/` to create the necessary tables:
- `auto_generate_public_id.sql` - Creates function for auto-generating unique member IDs

Required tables:
- `profiles` - User profiles with roles (recycler, centre_staff, admin)
- `sessions` - Recycling sessions
- `transactions` - Individual item transactions
- `vouchers` - Reward vouchers
- `recyclable_items` - Types of recyclable materials

4. **Configure Supabase Authentication**
- Enable Email/Password authentication
- Set up email templates (optional)
- Configure RLS (Row Level Security) policies

5. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

```bash
npm run build
npm start
```

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

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

## Database Schema

See `app/db-schema/README.md` for detailed database structure and setup instructions.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

**Build Errors:**
- Ensure all environment variables are set
- Clear `.next` folder and rebuild: `rm -rf .next && npm run build`

**Authentication Issues:**
- Verify Supabase project URL and keys
- Check RLS policies in Supabase dashboard

**Database Connection:**
- Confirm Supabase service role key is correctly set
- Verify database tables exist

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

Built with ♻️ by the WasteNot Team
