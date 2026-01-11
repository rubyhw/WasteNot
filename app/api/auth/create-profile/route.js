import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request) {
  try {
    const { userId, fullName, email, role } = await request.json();

    // Use service role key for server-side operations (bypasses RLS)
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey || supabaseAnonKey
    );

    if (!userId) {
      console.error('User ID is missing in request');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if profile already exists (check by id which is the primary key)
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      console.log('Profile already exists for user:', userId);
      // Check if public_id is missing and generate it
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching existing profile:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch profile' },
          { status: 500 }
        );
      }

      // Only generate public_id for recyclers, not for centre_staff
      if (!profile.public_id && profile.role === 'recycler') {
        // Generate sequential public_id function (same logic as below)
        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('public_id')
          .not('public_id', 'is', null)
          .order('public_id', { ascending: false })
          .limit(1);

        let nextNumber = 1;
        if (existingProfiles && existingProfiles.length > 0) {
          const lastPublicId = existingProfiles[0].public_id;
          const match = lastPublicId?.match(/^WN(\d+)$/);
          if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
          } else {
            // Find max number from all profiles
            const { data: allProfiles } = await supabase
              .from('profiles')
              .select('public_id')
              .not('public_id', 'is', null);
            
            if (allProfiles) {
              let maxNumber = 0;
              allProfiles.forEach(p => {
                const m = p.public_id?.match(/^WN(\d+)$/);
                if (m) {
                  const num = parseInt(m[1], 10);
                  if (num > maxNumber) maxNumber = num;
                }
              });
              nextNumber = maxNumber + 1;
            }
          }
        }
        const newPublicId = `WN${String(nextNumber).padStart(6, '0')}`;

        // Update the profile
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({ public_id: newPublicId })
          .eq('id', userId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating public_id:', updateError);
          // Return profile anyway
          return NextResponse.json({
            success: true,
            profile: profile,
            message: 'Profile exists but public_id update failed'
          });
        }

        return NextResponse.json({
          success: true,
          profile: updatedProfile,
          message: 'Profile updated with public_id'
        });
      }

      return NextResponse.json({
        success: true,
        profile: profile,
        message: 'Profile already exists'
      });
    }

    // Generate sequential public_id in format WN0000031, WN0000032, etc.
    async function generateSequentialPublicId() {
      // Get the highest existing public_id number
      const { data: existingProfiles, error: fetchError } = await supabase
        .from('profiles')
        .select('public_id')
        .not('public_id', 'is', null)
        .order('public_id', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Error fetching existing public_ids:', fetchError);
        // Fallback: use a timestamp-based approach
        return `WN${String(Date.now()).slice(-6).padStart(6, '0')}`;
      }

      let nextNumber = 1;
      
      if (existingProfiles && existingProfiles.length > 0) {
        const lastPublicId = existingProfiles[0].public_id;
        // Extract number from format WN0000031
        const match = lastPublicId?.match(/^WN(\d+)$/);
        if (match) {
          const lastNumber = parseInt(match[1], 10);
          nextNumber = lastNumber + 1;
        } else {
          // If format doesn't match, find the highest number from all public_ids
          const { data: allProfiles } = await supabase
            .from('profiles')
            .select('public_id')
            .not('public_id', 'is', null);
          
          if (allProfiles) {
            let maxNumber = 0;
            allProfiles.forEach(profile => {
              const match = profile.public_id?.match(/^WN(\d+)$/);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNumber) maxNumber = num;
              }
            });
            nextNumber = maxNumber + 1;
          }
        }
      }

      // Format as WN0000031 (WN + 6-digit zero-padded number)
      return `WN${String(nextNumber).padStart(6, '0')}`;
    }

    // Validate and set role - ensure correct role is saved
    let validRole = 'recycler'; // Default role
    if (role === 'centre_staff') {
      validRole = 'centre_staff';
      console.log('Setting role to centre_staff for collection centre registration');
    } else if (role === 'recycler') {
      validRole = 'recycler';
      console.log('Setting role to recycler for normal user registration');
    } else {
      console.warn('Invalid role received:', role, '- defaulting to recycler');
      validRole = 'recycler';
    }
    
    // Log the role for debugging
    console.log('Creating profile with role:', validRole, 'for user:', userId, '(received role:', role, ')');

    // Create the profile in Supabase
    // Match the profiles table schema: id, full_name, role, points_total, created_at, public_id
    // Note: created_at will be set automatically by the database (default now() or trigger)
    // Ensure full_name is properly trimmed and not empty
    const trimmedFullName = fullName ? fullName.trim() : null;
    
    // Generate sequential public_id only for recyclers, not for centre_staff
    let publicIdForProfile = null;
    if (validRole === 'recycler') {
      publicIdForProfile = await generateSequentialPublicId();
    }
    
    const profileData = {
      id: userId, // Primary key - user ID from authentication
      full_name: trimmedFullName || null,
      role: validRole, // 'centre_staff' or 'recycler'
      points_total: 0, // Initialize points to 0 for new users
      public_id: publicIdForProfile // Sequential ID in format WN0000031 only for recyclers, null for centre_staff
      // created_at is handled by database default/trigger
    };
    
    console.log('Inserting profile data:', {
      id: profileData.id,
      full_name: profileData.full_name,
      role: profileData.role,
      points_total: profileData.points_total
    });
    
    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile in Supabase:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to create profile';
      if (error.code === '23505') {
        errorMessage = 'Profile already exists for this user';
      } else if (error.code === '23503') {
        errorMessage = 'Invalid user reference';
      } else if (error.message) {
        errorMessage = `Failed to create profile: ${error.message}`;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    if (!data) {
      console.error('No data returned from profile creation');
      return NextResponse.json(
        { error: 'Profile creation returned no data' },
        { status: 500 }
      );
    }

    // Verify the role was saved correctly in the database
    if (data && data.role) {
      if (data.role !== validRole) {
        console.error('❌ Role mismatch! Expected:', validRole, 'Got:', data.role);
        return NextResponse.json(
          { 
            error: 'Role mismatch in database',
            expected: validRole,
            actual: data.role
          },
          { status: 500 }
        );
      } else {
        console.log('✅ Profile created successfully with correct role:', data.role);
        console.log('   - ID:', data.id || userId);
        console.log('   - Role in profiles table:', data.role);
        console.log('   - Full name:', data.full_name);
        console.log('   - Points total:', data.points_total);
        console.log('   - Public ID:', data.public_id);
        console.log('   - Created at:', data.created_at);
      }
    } else {
      console.error('❌ Profile created but role is missing');
      return NextResponse.json(
        { error: 'Profile created but role is missing' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: data
    });

  } catch (error) {
    console.error('Unexpected error in create-profile:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}