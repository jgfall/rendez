import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for admin operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// Test account credentials
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = 'test123456';

// Sample tour templates with blocks
// Note: For multi-day tours, duration_minutes = days * 24 * 60
const SAMPLE_TOURS = [
  {
    name: '3-Day Great White Shark Diving Expedition',
    city: 'Gansbaai, South Africa',
    duration_minutes: 4320, // 3 days * 24 * 60
    price_mode: 'per_person' as const,
    base_price_cents: 125000, // $1,250
    description: 'Experience the thrill of cage diving with great white sharks in the shark capital of the world. This multi-day expedition includes professional diving instruction, multiple dive opportunities, and accommodation in a coastal lodge.',
    cover_image_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80',
    blocks: [
      {
        sort_order: 0,
        type: 'transport' as const,
        client_title: 'Arrival & Welcome Briefing',
        description: 'Arrive at our coastal lodge in Gansbaai, the great white shark capital of the world. After check-in, you\'ll receive a comprehensive safety briefing and introduction to shark behavior. Our marine biologist will explain what to expect and answer all your questions. The lodge offers stunning ocean views and is just minutes from the harbor.',
        teaser_description: null,
        start_offset_minutes: 0,
        visibility: 'public' as const,
        venue_name: 'Shark Lodge Gansbaai',
        neighborhood: 'Gansbaai',
        lat: null,
        lng: null,
      },
      {
        sort_order: 1,
        type: 'activity' as const,
        client_title: 'Dive Equipment Fitting',
        description: 'Get fitted with professional-grade wetsuits, masks, and safety equipment. Our team ensures everything fits perfectly for maximum comfort and safety. You\'ll learn how to use the cage breathing apparatus and practice in our on-site pool before heading to sea.',
        teaser_description: null,
        start_offset_minutes: 60,
        visibility: 'public' as const,
        venue_name: 'Dive Center',
        neighborhood: 'Gansbaai Harbor',
        lat: null,
        lng: null,
      },
      {
        sort_order: 2,
        type: 'activity' as const,
        client_title: 'First Shark Cage Dive',
        description: 'Board our custom-built shark boat and head to Shark Alley, where great whites congregate year-round. After anchoring at the dive site, you\'ll enter the secure cage and experience your first face-to-face encounter with these magnificent predators. The water clarity is exceptional, and you\'ll be amazed by the size and grace of these apex predators swimming just inches away.',
        teaser_description: 'Enter the cage for your first encounter with great white sharks in their natural habitat—an experience that will stay with you forever.',
        start_offset_minutes: 180,
        visibility: 'reveal' as const,
        venue_name: 'Shark Alley',
        neighborhood: 'Dyer Island',
        lat: null,
        lng: null,
        image_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
      },
      {
        sort_order: 3,
        type: 'accommodation' as const,
        client_title: 'Lodge Accommodation',
        description: 'Return to the lodge for a well-deserved rest. Your room features ocean views, comfortable beds, and all modern amenities. The lodge has a communal area where you can share stories with other divers, watch footage from the day\'s dives, and enjoy South African wines.',
        teaser_description: null,
        start_offset_minutes: 480,
        visibility: 'public' as const,
        venue_name: 'Shark Lodge',
        neighborhood: 'Gansbaai',
        lat: null,
        lng: null,
      },
      {
        sort_order: 4,
        type: 'meal' as const,
        client_title: 'Welcome Dinner',
        description: 'Enjoy a traditional South African braai (barbecue) featuring fresh local seafood, grilled meats, and traditional sides. Our chef prepares everything over an open fire, and you\'ll dine under the stars with the sound of waves in the background. This is a perfect opportunity to bond with your fellow divers.',
        teaser_description: 'Savor a traditional South African braai under the stars, featuring the freshest local seafood and grilled specialties.',
        start_offset_minutes: 600,
        visibility: 'reveal' as const,
        venue_name: 'Lodge Restaurant',
        neighborhood: 'Gansbaai',
        lat: null,
        lng: null,
        image_url: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80',
      },
      {
        sort_order: 5,
        type: 'activity' as const,
        client_title: 'Early Morning Dive Session',
        description: 'Rise before dawn for the best shark viewing conditions. Early morning is when great whites are most active, and the light creates stunning underwater visibility. This session often includes multiple shark encounters, and our crew will help you capture incredible photos and videos.',
        teaser_description: 'Experience the magic of early morning diving when great whites are most active and the underwater visibility is at its peak.',
        start_offset_minutes: 1440, // Day 2, 6 AM
        visibility: 'reveal' as const,
        venue_name: 'Shark Alley',
        neighborhood: 'Dyer Island',
        lat: null,
        lng: null,
      },
      {
        sort_order: 6,
        type: 'activity' as const,
        client_title: 'Marine Conservation Presentation',
        description: 'Learn about great white shark conservation efforts and the critical role these predators play in ocean ecosystems. Our marine biologist will share insights from years of research and explain how your participation helps fund conservation programs. You\'ll also learn about the threats facing these magnificent creatures.',
        teaser_description: null,
        start_offset_minutes: 1680,
        visibility: 'public' as const,
        venue_name: 'Lodge Conference Room',
        neighborhood: 'Gansbaai',
        lat: null,
        lng: null,
      },
      {
        sort_order: 7,
        type: 'activity' as const,
        client_title: 'Afternoon Dive with Guaranteed Sighting',
        description: 'Our afternoon dive session has a 98% success rate for shark sightings. The crew uses proven techniques to attract sharks safely and ethically. You\'ll have extended time in the cage, and if conditions permit, you may even witness breaching behavior—sharks launching themselves out of the water in pursuit of prey.',
        teaser_description: 'Enjoy an extended afternoon dive session with our highest success rate for shark encounters—you might even witness the rare spectacle of breaching.',
        start_offset_minutes: 1980,
        visibility: 'reveal' as const,
        venue_name: 'Shark Alley',
        neighborhood: 'Dyer Island',
        lat: null,
        lng: null,
      },
      {
        sort_order: 8,
        type: 'activity' as const,
        client_title: 'Final Dive & Certification',
        description: 'Complete your final dive session and receive your Great White Shark Diving Certificate. This last dive is often the most memorable, as you\'ll be more comfortable in the water and can fully appreciate the experience. After returning to shore, you\'ll receive a digital photo and video package capturing your entire adventure.',
        teaser_description: 'Complete your certification dive and receive your official Great White Shark Diving Certificate, along with a complete photo and video package of your adventure.',
        start_offset_minutes: 2700, // Day 3
        visibility: 'reveal' as const,
        venue_name: 'Shark Alley',
        neighborhood: 'Dyer Island',
        lat: null,
        lng: null,
      },
    ],
  },
  {
    name: 'Paris Jazz Night: From Dance to Music',
    city: 'Paris',
    duration_minutes: 480, // 8 hours
    price_mode: 'per_person' as const,
    base_price_cents: 8900, // $89
    description: 'Experience the soul of Parisian jazz culture with a day-to-night journey through dance, coffee culture, and intimate live music. From a swing dance lesson to meeting the band, this is an authentic immersion into Paris\'s vibrant jazz scene.',
    cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80',
    blocks: [
      {
        sort_order: 0,
        type: 'activity' as const,
        client_title: 'Swing Dance Lesson at Place Colette',
        description: 'Begin your jazz journey with a swing dance lesson in the historic Place Colette, just steps from the Palais Royal. Under the guidance of a professional instructor, you\'ll learn the basics of Lindy Hop and Charleston in this beautiful public square. The lesson is designed for all levels, and you\'ll be dancing to classic jazz standards played live by a small ensemble. The energy is infectious, and you\'ll feel the rhythm of Parisian jazz culture from the very first step.',
        teaser_description: null,
        start_offset_minutes: 0,
        visibility: 'public' as const,
        venue_name: 'Place Colette',
        neighborhood: '1st Arrondissement',
        lat: null,
        lng: null,
        image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
      },
      {
        sort_order: 1,
        type: 'free_time' as const,
        client_title: 'Free Time to Explore',
        description: 'Take some time to explore the Palais Royal gardens, browse the arcades, or simply soak in the atmosphere of this historic neighborhood. The area is filled with art galleries, bookshops, and charming cafés.',
        teaser_description: null,
        start_offset_minutes: 90,
        visibility: 'public' as const,
        venue_name: null,
        neighborhood: '1st Arrondissement',
        lat: null,
        lng: null,
      },
      {
        sort_order: 2,
        type: 'meal' as const,
        client_title: 'Coffee at Le Nemours',
        description: 'Step into Le Nemours, a legendary café that has been a gathering place for artists, writers, and musicians since the 1930s. This Art Deco gem, located in the arcades of the Palais Royal, is where Django Reinhardt and other jazz legends once frequented. Sip on expertly prepared coffee while our guide shares stories of the jazz greats who have sat at these very tables. The café\'s atmosphere is timeless, with original fixtures and a sense of history that permeates every corner.',
        teaser_description: 'Visit the historic café where Django Reinhardt and other jazz legends once gathered—a timeless Art Deco space that captures the essence of Parisian jazz culture.',
        start_offset_minutes: 150,
        visibility: 'reveal' as const,
        venue_name: 'Le Nemours',
        neighborhood: '1st Arrondissement',
        lat: null,
        lng: null,
        image_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
      },
      {
        sort_order: 3,
        type: 'transport' as const,
        client_title: 'Evening Stroll to Marais',
        description: 'Take a leisurely walk through the historic Marais district as evening falls. We\'ll pass by hidden courtyards, art galleries, and the vibrant Jewish quarter, all while our guide shares stories about the neighborhood\'s connection to jazz history. The walk takes about 20 minutes and sets the perfect mood for the evening ahead.',
        teaser_description: null,
        start_offset_minutes: 210,
        visibility: 'public' as const,
        venue_name: null,
        neighborhood: 'Le Marais',
        lat: null,
        lng: null,
      },
      {
        sort_order: 4,
        type: 'activity' as const,
        client_title: 'Pre-Show at L\'Injuste',
        description: 'Arrive at L\'Injuste, one of Paris\'s most intimate and authentic jazz clubs. Tucked away in a basement venue in the Marais, this is where serious jazz aficionados come to hear world-class musicians in an unpretentious setting. Before the main performance, you\'ll enjoy a drink at the bar while listening to the soundcheck and feeling the energy build. The club\'s walls are covered with photos of jazz legends who have performed here, creating an atmosphere that\'s both historic and electric.',
        teaser_description: 'Enter one of Paris\'s most authentic jazz clubs, a hidden basement venue where world-class musicians perform in an intimate, unpretentious setting that serious jazz lovers treasure.',
        start_offset_minutes: 240,
        visibility: 'reveal' as const,
        venue_name: 'L\'Injuste',
        neighborhood: 'Le Marais',
        lat: null,
        lng: null,
        image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
      },
      {
        sort_order: 5,
        type: 'activity' as const,
        client_title: 'Meet the Band During Break',
        description: 'During the intermission, you\'ll have the exclusive opportunity to meet the musicians backstage. This is a rare chance to chat with professional jazz artists about their craft, ask questions about their instruments and influences, and learn about the Parisian jazz scene from an insider\'s perspective. Many of these musicians have played with international stars and have fascinating stories to share. You might even get to see their instruments up close and learn about the technical aspects of jazz performance.',
        teaser_description: 'Enjoy an exclusive backstage meeting with the musicians during intermission—a rare opportunity to connect with professional jazz artists and learn about their craft from the inside.',
        start_offset_minutes: 330,
        visibility: 'reveal' as const,
        venue_name: 'L\'Injuste',
        neighborhood: 'Le Marais',
        lat: null,
        lng: null,
      },
      {
        sort_order: 6,
        type: 'activity' as const,
        client_title: 'Second Set Performance',
        description: 'Return to your seats for the second set, now with a deeper appreciation for the music and the musicians. The second set is often more experimental and interactive, with extended solos and improvisation. You\'ll notice details you might have missed before, and the connection you\'ve made with the band will make the performance even more meaningful.',
        teaser_description: null,
        start_offset_minutes: 360,
        visibility: 'public' as const,
        venue_name: 'L\'Injuste',
        neighborhood: 'Le Marais',
        lat: null,
        lng: null,
      },
      {
        sort_order: 7,
        type: 'meal' as const,
        client_title: 'Late Night Bistro Dinner',
        description: 'After the show, we\'ll head to a traditional Parisian bistro nearby for a late dinner. This is where the real magic happens—sharing a meal and conversation about the music you\'ve just experienced. The bistro serves classic French comfort food, and you\'ll likely see other musicians and jazz enthusiasts who have come from the same show. It\'s the perfect end to an authentic Parisian jazz night.',
        teaser_description: 'Cap off the evening at a traditional bistro where musicians and jazz lovers gather after shows—the perfect place to reflect on the night\'s music over classic French comfort food.',
        start_offset_minutes: 420,
        visibility: 'reveal' as const,
        venue_name: 'Bistrot des Artistes',
        neighborhood: 'Le Marais',
        lat: null,
        lng: null,
        image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
      },
    ],
  },
  {
    name: 'Tokyo Midnight Ramen & Izakaya Crawl',
    city: 'Tokyo',
    duration_minutes: 300, // 5 hours
    price_mode: 'per_person' as const,
    base_price_cents: 7500, // $75
    description: 'Discover Tokyo\'s legendary late-night food scene with a guided tour through hidden izakayas and the city\'s most authentic ramen shops. Experience the real Tokyo that comes alive after dark.',
    cover_image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1200&q=80',
    blocks: [
      {
        sort_order: 0,
        type: 'activity' as const,
        client_title: 'Meet in Golden Gai',
        description: 'Begin your night in Golden Gai, a network of six narrow alleys in Shinjuku filled with over 200 tiny bars, each seating only a handful of people. This area is a time capsule of post-war Tokyo and has been a gathering place for artists, writers, and musicians for decades. We\'ll start with a drink at one of these intimate bars, where the owner will share stories about the neighborhood\'s history and the regulars who have been coming here for years.',
        teaser_description: null,
        start_offset_minutes: 0,
        visibility: 'public' as const,
        venue_name: 'Golden Gai',
        neighborhood: 'Shinjuku',
        lat: null,
        lng: null,
        image_url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
      },
      {
        sort_order: 1,
        type: 'meal' as const,
        client_title: 'First Izakaya Stop',
        description: 'Visit a traditional izakaya (Japanese pub) that\'s been family-run for three generations. This hidden spot, known only to locals, serves small plates designed to be shared over drinks. You\'ll try yakitori (grilled skewers), edamame, and other classic izakaya fare, all prepared using recipes passed down through the family. The atmosphere is warm and convivial, with regulars greeting each other and the staff like old friends.',
        teaser_description: 'Step into a three-generation family izakaya where time-honored recipes and a welcoming atmosphere create an authentic local experience.',
        start_offset_minutes: 60,
        visibility: 'reveal' as const,
        venue_name: 'Izakaya Hanako',
        neighborhood: 'Shinjuku',
        lat: null,
        lng: null,
        image_url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80',
      },
      {
        sort_order: 2,
        type: 'transport' as const,
        client_title: 'Walk to Memory Lane',
        description: 'Take a short walk to Omoide Yokocho (Memory Lane), also known as "Piss Alley" for its post-war history. This narrow alley is lined with tiny restaurants specializing in yakitori and other grilled foods. The atmosphere is electric, with the smell of charcoal grills and the sound of sizzling meat filling the air.',
        teaser_description: null,
        start_offset_minutes: 120,
        visibility: 'public' as const,
        venue_name: 'Omoide Yokocho',
        neighborhood: 'Shinjuku',
        lat: null,
        lng: null,
      },
      {
        sort_order: 3,
        type: 'meal' as const,
        client_title: 'Yakitori at Memory Lane',
        description: 'Stop at a tiny yakitori stall that seats only six people. The master chef, who has been grilling here for 40 years, will prepare skewers of chicken, pork, and vegetables over hot charcoal. Each skewer is perfectly seasoned and grilled to order. You\'ll sit at the counter, watching the master work while enjoying cold beer or sake. This is yakitori at its most authentic—simple, delicious, and made with decades of expertise.',
        teaser_description: 'Experience yakitori perfection at a 40-year-old stall where a master chef grills skewers over hot charcoal in a space that seats only six—authentic Tokyo at its finest.',
        start_offset_minutes: 150,
        visibility: 'reveal' as const,
        venue_name: 'Yakitori Master',
        neighborhood: 'Shinjuku',
        lat: null,
        lng: null,
        image_url: 'https://images.unsplash.com/photo-1609501676725-7186f3a6a24d?w=800&q=80',
      },
      {
        sort_order: 4,
        type: 'transport' as const,
        client_title: 'Train to Shibuya',
        description: 'Take the train to Shibuya, Tokyo\'s vibrant entertainment district. The short ride gives you a chance to see the city\'s famous nightlife energy as we travel through different neighborhoods.',
        teaser_description: null,
        start_offset_minutes: 210,
        visibility: 'public' as const,
        venue_name: null,
        neighborhood: 'Shibuya',
        lat: null,
        lng: null,
      },
      {
        sort_order: 5,
        type: 'activity' as const,
        client_title: 'Hidden Ramen Shop',
        description: 'Visit a ramen shop that doesn\'t appear in any guidebooks but is legendary among Tokyo locals. Located in a basement with no English signage, this place serves what many consider the best tonkotsu ramen in the city. The broth has been simmering for over 24 hours, creating a rich, creamy, and deeply flavorful base. The noodles are made fresh daily, and the chashu (pork) is melt-in-your-mouth tender. The shop seats only 10 people, and there\'s often a line, but it\'s absolutely worth the wait. The chef, who has been perfecting his recipe for 30 years, will explain the art of ramen making.',
        teaser_description: 'Discover a hidden basement ramen shop known only to locals, where a 30-year master chef serves what many consider Tokyo\'s finest tonkotsu ramen—a 24-hour broth and fresh daily noodles in an intimate 10-seat space.',
        start_offset_minutes: 240,
        visibility: 'reveal' as const,
        venue_name: 'Ramen Hideout',
        neighborhood: 'Shibuya',
        lat: null,
        lng: null,
        image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
      },
      {
        sort_order: 6,
        type: 'meal' as const,
        client_title: 'Final Izakaya & Sake Tasting',
        description: 'End the night at a modern izakaya that bridges traditional and contemporary Tokyo. Here, you\'ll enjoy a curated sake tasting with a sommelier who will explain the different styles and regions. The food menu features creative takes on izakaya classics, and the atmosphere is lively but sophisticated. This is where you\'ll reflect on your night of discovery and plan your next Tokyo food adventure.',
        teaser_description: 'Conclude your culinary journey with a curated sake tasting and creative izakaya dishes at a modern spot that perfectly captures contemporary Tokyo\'s food culture.',
        start_offset_minutes: 270,
        visibility: 'reveal' as const,
        venue_name: 'Izakaya Modern',
        neighborhood: 'Shibuya',
        lat: null,
        lng: null,
        image_url: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=80',
      },
    ],
  },
];

export async function GET() {
  try {
    // Check if test user exists by trying to get user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      // Fallback: try to sign in to check if user exists
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (signInError || !signInData.user) {
        return NextResponse.json({
          exists: false,
          email: TEST_EMAIL,
        });
      }

      const userId = signInData.user.id;

      // Get profile info
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, onboarding_completed, full_name')
        .eq('id', userId)
        .single();

      // Get tour count
      const { count: tourCount } = await supabaseAdmin
        .from('tour_templates')
        .select('*', { count: 'exact', head: true })
        .eq('guide_id', userId);

      // Sign out to clean up
      await supabaseAdmin.auth.signOut();

      return NextResponse.json({
        exists: true,
        email: TEST_EMAIL,
        userId,
        profile: profile || null,
        tour_count: tourCount || 0,
      });
    }

    // Find user in list
    const testUser = users.users.find(u => u.email === TEST_EMAIL);

    if (!testUser) {
      return NextResponse.json({
        exists: false,
        email: TEST_EMAIL,
      });
    }

    // Get profile info
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, onboarding_completed, full_name')
      .eq('id', testUser.id)
      .single();

    // Get tour count
    const { count: tourCount } = await supabaseAdmin
      .from('tour_templates')
      .select('*', { count: 'exact', head: true })
      .eq('guide_id', testUser.id);

    return NextResponse.json({
      exists: true,
      email: TEST_EMAIL,
      userId: testUser.id,
      profile: profile || null,
      tour_count: tourCount || 0,
    });
  } catch (error: any) {
    return NextResponse.json({
      exists: false,
      email: TEST_EMAIL,
      error: error.message,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only allow in development or with explicit authorization
    if (process.env.NODE_ENV === 'production' && !request.headers.get('x-test-auth')) {
      return NextResponse.json(
        { error: 'Test setup is only available in development' },
        { status: 403 }
      );
    }

    // Allow custom email via request body
    const body = await request.json().catch(() => ({}));
    const email = body.email || TEST_EMAIL;
    const password = body.password || TEST_PASSWORD;

    // Verify service role key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { 
          error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is not set',
          hint: 'This is required for test account creation. Add it to your .env.local file.'
        },
        { status: 500 }
      );
    }

    // Find or create test user
    let userId: string | undefined;
    
    // Try to sign in first
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.user) {
      // User doesn't exist, create it using admin API (bypasses email confirmation)
      console.log('Attempting to create user with admin API...');
      const { data: adminUserData, error: adminUserError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          test_account: true,
        },
      });

      if (adminUserError) {
        console.error('Admin API error:', adminUserError);
        
        // Provide helpful error messages
        const errorMessage = adminUserError.message || 'Unknown error';
        let hint = '';
        
        if (errorMessage.includes('not allowed')) {
          hint = 'Check your Supabase project settings: Authentication > Settings > Email Auth. Make sure "Enable email signup" is enabled, and check if there are any email domain restrictions.';
        } else if (errorMessage.includes('already registered')) {
          // User might exist but we couldn't sign in - try to find them
          const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = usersData?.users.find(u => u.email === email);
          if (existingUser) {
            userId = existingUser.id;
            // Continue with setup using existing user
          } else {
            return NextResponse.json(
              { 
                error: `User with email ${email} already exists but could not be accessed`,
                hint: 'Try using a different email address'
              },
              { status: 500 }
            );
          }
        }
        
        if (!userId) {
          return NextResponse.json(
            { 
              error: `Failed to create test user: ${errorMessage}`,
              hint: hint || 'Try using a different email address or check your Supabase project settings. You may need to manually create the user in Supabase dashboard first.'
            },
            { status: 500 }
          );
        }
      } else if (adminUserData?.user) {
        userId = adminUserData.user.id;
      } else {
        return NextResponse.json(
          { 
            error: 'User creation succeeded but no user data was returned',
            hint: 'Check your Supabase logs for more details'
          },
          { status: 500 }
        );
      }
    } else {
      userId = signInData.user.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Failed to get or create user ID' },
        { status: 500 }
      );
    }

    // Reset onboarding status
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        onboarding_completed: false,
        full_name: 'Test Guide',
        timezone: 'America/New_York',
        currency: 'USD',
      }, {
        onConflict: 'id',
      });

    if (profileError) {
      return NextResponse.json(
        { error: `Failed to reset profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    // Delete existing tour templates for this user (clean slate)
    const { data: existingTours } = await supabaseAdmin
      .from('tour_templates')
      .select('id')
      .eq('guide_id', userId);

    if (existingTours && existingTours.length > 0) {
      const tourIds = existingTours.map(t => t.id);
      
      // Delete blocks first (foreign key constraint)
      await supabaseAdmin
        .from('tour_blocks')
        .delete()
        .in('tour_id', tourIds);

      // Then delete tours
      await supabaseAdmin
        .from('tour_templates')
        .delete()
        .in('id', tourIds);
    }

    // Create sample tours
    const createdTours = [];
    for (const tourTemplate of SAMPLE_TOURS) {
      const { blocks, ...tourData } = tourTemplate;
      
      // Create tour
      const { data: tour, error: tourError } = await supabaseAdmin
        .from('tour_templates')
        .insert({
          ...tourData,
          guide_id: userId,
        })
        .select()
        .single();

      if (tourError || !tour) {
        console.error('Failed to create tour:', tourError);
        continue;
      }

      // Create blocks
      if (blocks && blocks.length > 0) {
        const { error: blocksError } = await supabaseAdmin
          .from('tour_blocks')
          .insert(
            blocks.map(block => ({
              ...block,
              tour_id: tour.id,
              guide_id: userId,
            }))
          );

        if (blocksError) {
          console.error('Failed to create blocks:', blocksError);
        } else {
          createdTours.push({
            id: tour.id,
            name: tour.name,
            blocks_count: blocks.length,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test account setup complete',
      account: {
        email,
        password: '***', // Don't return password in response
        userId,
      },
      tours_created: createdTours.length,
      tours: createdTours,
    });
  } catch (error: any) {
    console.error('Test setup error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

