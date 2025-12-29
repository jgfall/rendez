-- Migration: Create test account for landing page screenshots
-- Creates a pro account with tours, bookings, proposals, and revenue data

-- First, create a test user in auth.users (if not exists)
-- Note: This requires the user to be created in Supabase Auth first
-- The user email should be: demo@rendez.to
-- You'll need to create this user manually in Supabase Auth dashboard

-- Test user ID (replace with actual UUID from auth.users after creating the user)
-- For now, we'll use a placeholder and you can update it
DO $$
DECLARE
  test_user_id UUID;
  test_tour_1_id UUID;
  test_tour_2_id UUID;
  test_tour_3_id UUID;
  test_client_1_id UUID;
  test_client_2_id UUID;
  test_client_3_id UUID;
  test_client_4_id UUID;
  test_client_5_id UUID;
  test_proposal_id UUID;
BEGIN
  -- Get the test user ID (assuming email is demo@rendez.to)
  SELECT id INTO test_user_id
  FROM auth.users
  WHERE email = 'demo@rendez.to'
  LIMIT 1;

  -- If user doesn't exist, exit
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'Test user with email demo@rendez.to not found. Please create the user in Supabase Auth first.';
  END IF;

  -- Create or update profile with pro subscription
  INSERT INTO profiles (
    id,
    full_name,
    timezone,
    currency,
    business_name,
    logo_url,
    profile_photo_url,
    bio,
    business_stage,
    onboarding_completed,
    subscription_plan,
    subscription_status,
    stripe_subscription_id,
    stripe_customer_id,
    subscription_current_period_end,
    subscription_cancel_at_period_end,
    deposit_percentage,
    created_at,
    updated_at
  ) VALUES (
    test_user_id,
    'Sarah Martinez',
    'America/New_York',
    'USD',
    'Hidden Gems Tours',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    'Award-winning tour guide with 10+ years of experience showing travelers the hidden gems of New York City. Specializing in food tours, street art walks, and neighborhood explorations.',
    'established',
    true,
    'pro',
    'active',
    'sub_test_screenshots_123',
    'cus_test_screenshots_123',
    NOW() + INTERVAL '1 month',
    false,
    30,
    NOW() - INTERVAL '6 months',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    business_name = EXCLUDED.business_name,
    subscription_plan = 'pro',
    subscription_status = 'active',
    subscription_current_period_end = EXCLUDED.subscription_current_period_end,
    updated_at = NOW();

  -- Create 3 tour templates
  -- Tour 1: Food Tour
  INSERT INTO tour_templates (
    id,
    guide_id,
    name,
    city,
    duration_minutes,
    price_mode,
    base_price_cents,
    description,
    cover_image_url,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    test_user_id,
    'East Village Food & Culture Walk',
    'New York',
    240,
    'per_person',
    8500, -- $85 per person
    'Discover the best hidden food spots in the East Village while learning about the neighborhood''s rich history and culture. Includes tastings at 6 local establishments.',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=800&fit=crop',
    NOW() - INTERVAL '3 months',
    NOW() - INTERVAL '1 week'
  )
  RETURNING id INTO test_tour_1_id;

  -- Tour 2: Street Art Tour
  INSERT INTO tour_templates (
    id,
    guide_id,
    name,
    city,
    duration_minutes,
    price_mode,
    base_price_cents,
    description,
    cover_image_url,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    test_user_id,
    'Brooklyn Street Art & Graffiti Tour',
    'New York',
    180,
    'per_person',
    6500, -- $65 per person
    'Explore the vibrant street art scene in Bushwick and Williamsburg. See works by famous artists and learn about the stories behind the murals.',
    'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=1200&h=800&fit=crop',
    NOW() - INTERVAL '2 months',
    NOW() - INTERVAL '3 days'
  )
  RETURNING id INTO test_tour_2_id;

  -- Tour 3: Neighborhood Tour
  INSERT INTO tour_templates (
    id,
    guide_id,
    name,
    city,
    duration_minutes,
    price_mode,
    base_price_cents,
    description,
    cover_image_url,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    test_user_id,
    'Greenwich Village Literary History Walk',
    'New York',
    120,
    'flat',
    20000, -- $200 flat rate
    'Walk in the footsteps of famous writers and poets who called Greenwich Village home. Visit historic cafes, bookstores, and landmarks.',
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&h=800&fit=crop',
    NOW() - INTERVAL '1 month',
    NOW() - INTERVAL '1 day'
  )
  RETURNING id INTO test_tour_3_id;

  -- Add blocks to Tour 1 (Food Tour)
  INSERT INTO tour_blocks (tour_id, guide_id, sort_order, type, client_title, description, start_offset_minutes, visibility, venue_name, neighborhood) VALUES
    (test_tour_1_id, test_user_id, 0, 'activity', 'Welcome & Introduction', 'Meet at Astor Place and learn about the East Village''s transformation from immigrant neighborhood to cultural hub.', 0, 'public', 'Astor Place', 'East Village'),
    (test_tour_1_id, test_user_id, 1, 'meal', 'Ukrainian Pastry Shop', 'Sample traditional Eastern European pastries at a family-owned bakery that''s been here since 1957.', 15, 'public', 'Veselka', 'East Village'),
    (test_tour_1_id, test_user_id, 2, 'activity', 'Historic St. Mark''s Place', 'Walk down the famous street that was once the center of counterculture in NYC.', 45, 'public', 'St. Mark''s Place', 'East Village'),
    (test_tour_1_id, test_user_id, 3, 'meal', 'Secret Ramen Spot', 'Hidden gem ramen shop known only to locals. The chef trained in Tokyo for 10 years.', 75, 'reveal', 'Secret Location', 'East Village'),
    (test_tour_1_id, test_user_id, 4, 'activity', 'Community Garden Visit', 'Explore one of the neighborhood''s beautiful community gardens and learn about urban farming.', 120, 'public', '6th & B Community Garden', 'East Village'),
    (test_tour_1_id, test_user_id, 5, 'meal', 'Artisanal Pizza Tasting', 'Try authentic Neapolitan-style pizza at a spot that imports ingredients from Italy weekly.', 150, 'public', 'Motorino', 'East Village'),
    (test_tour_1_id, test_user_id, 6, 'meal', 'Craft Cocktail Experience', 'End the tour with a signature cocktail at a speakeasy-style bar with Prohibition-era vibes.', 210, 'secret', 'Secret Bar', 'East Village');

  -- Add blocks to Tour 2 (Street Art Tour)
  INSERT INTO tour_blocks (tour_id, guide_id, sort_order, type, client_title, description, start_offset_minutes, visibility, venue_name, neighborhood) VALUES
    (test_tour_2_id, test_user_id, 0, 'activity', 'Meet at Jefferson L Station', 'Start your street art journey in the heart of Bushwick''s art district.', 0, 'public', 'Jefferson L Station', 'Bushwick'),
    (test_tour_2_id, test_user_id, 1, 'activity', 'Bushwick Collective Murals', 'See large-scale murals by world-renowned street artists including Blek le Rat and Shepard Fairey.', 15, 'public', 'Bushwick Collective', 'Bushwick'),
    (test_tour_2_id, test_user_id, 2, 'activity', 'Hidden Alleyway Gallery', 'Explore a secret alleyway filled with smaller pieces and tags from local artists.', 60, 'reveal', 'Secret Alley', 'Bushwick'),
    (test_tour_2_id, test_user_id, 3, 'activity', 'Williamsburg Waterfront Art', 'Walk along the waterfront to see how street art integrates with the urban landscape.', 90, 'public', 'Williamsburg Waterfront', 'Williamsburg'),
    (test_tour_2_id, test_user_id, 4, 'activity', 'Artist Studio Visit', 'Meet a local street artist in their studio and see works in progress (subject to availability).', 120, 'secret', 'Private Studio', 'Williamsburg'),
    (test_tour_2_id, test_user_id, 5, 'meal', 'Coffee Break', 'Refuel at a hip coffee shop that doubles as an art gallery.', 150, 'public', 'Devoción', 'Williamsburg');

  -- Add blocks to Tour 3 (Literary Tour)
  INSERT INTO tour_blocks (tour_id, guide_id, sort_order, type, client_title, description, start_offset_minutes, visibility, venue_name, neighborhood) VALUES
    (test_tour_3_id, test_user_id, 0, 'activity', 'Washington Square Park', 'Start where many literary greats found inspiration, including Henry James and Edith Wharton.', 0, 'public', 'Washington Square Park', 'Greenwich Village'),
    (test_tour_3_id, test_user_id, 1, 'activity', 'The White Horse Tavern', 'Visit the bar where Dylan Thomas spent his last night and where Jack Kerouac wrote.', 20, 'public', 'White Horse Tavern', 'Greenwich Village'),
    (test_tour_3_id, test_user_id, 2, 'activity', 'Strand Bookstore', 'Browse the famous "18 miles of books" at this iconic independent bookstore.', 50, 'public', 'Strand Bookstore', 'East Village'),
    (test_tour_3_id, test_user_id, 3, 'activity', 'Edgar Allan Poe House', 'See the former home of the master of macabre (now a private residence).', 70, 'public', '85 W 3rd St', 'Greenwich Village'),
    (test_tour_3_id, test_user_id, 4, 'meal', 'Literary Cafe', 'End at a historic cafe where writers have gathered for over a century.', 100, 'public', 'Cafe Reggio', 'Greenwich Village');

  -- Create test clients
  INSERT INTO clients (id, guide_id, name, email, phone, created_at, updated_at) VALUES
    (gen_random_uuid(), test_user_id, 'Jennifer Chen', 'jennifer.chen@example.com', '+1-555-0101', NOW() - INTERVAL '4 months', NOW() - INTERVAL '1 week')
    RETURNING id INTO test_client_1_id;

  INSERT INTO clients (id, guide_id, name, email, phone, created_at, updated_at) VALUES
    (gen_random_uuid(), test_user_id, 'Michael Rodriguez', 'm.rodriguez@example.com', '+1-555-0102', NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 days')
    RETURNING id INTO test_client_2_id;

  INSERT INTO clients (id, guide_id, name, email, phone, created_at, updated_at) VALUES
    (gen_random_uuid(), test_user_id, 'Emily Thompson', 'emily.t@example.com', '+1-555-0103', NOW() - INTERVAL '2 months', NOW() - INTERVAL '5 days')
    RETURNING id INTO test_client_3_id;

  INSERT INTO clients (id, guide_id, name, email, phone, created_at, updated_at) VALUES
    (gen_random_uuid(), test_user_id, 'David Kim', 'david.kim@example.com', '+1-555-0104', NOW() - INTERVAL '1 month', NOW() - INTERVAL '3 days')
    RETURNING id INTO test_client_4_id;

  INSERT INTO clients (id, guide_id, name, email, phone, created_at, updated_at) VALUES
    (gen_random_uuid(), test_user_id, 'Lisa Anderson', 'lisa.a@example.com', '+1-555-0105', NOW() - INTERVAL '2 weeks', NOW())
    RETURNING id INTO test_client_5_id;

  -- Create proposals with various statuses and dates
  -- Completed tours (with full payment)
  INSERT INTO proposals (
    guide_id, tour_id, client_id, slug, status, scheduled_at, group_size,
    total_price_cents, deposit_cents, remainder_cents,
    deposit_paid_at, remainder_paid_at,
    stripe_checkout_session_id, stripe_payment_intent_id, stripe_remainder_session_id, stripe_remainder_payment_intent_id,
    stripe_customer_id,
    created_at, updated_at
  ) VALUES
    -- Past completed tour
    (test_user_id, test_tour_1_id, test_client_1_id, 'food-tour-jennifer-' || substr(md5(random()::text), 1, 8),
     'confirmed', NOW() - INTERVAL '2 weeks', 4, 34000, 10200, 23800,
     NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '2 weeks',
     'cs_test_1', 'pi_test_1', 'cs_test_1r', 'pi_test_1r',
     'cus_test_1',
     NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 weeks'),
    
    -- Another past completed tour
    (test_user_id, test_tour_2_id, test_client_2_id, 'street-art-michael-' || substr(md5(random()::text), 1, 8),
     'confirmed', NOW() - INTERVAL '1 week', 2, 13000, 3900, 9100,
     NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '1 week',
     'cs_test_2', 'pi_test_2', 'cs_test_2r', 'pi_test_2r',
     'cus_test_2',
     NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '1 week');

  -- Pending bookings (deposit paid, remainder pending)
  INSERT INTO proposals (
    guide_id, tour_id, client_id, slug, status, scheduled_at, group_size,
    total_price_cents, deposit_cents, remainder_cents,
    deposit_paid_at,
    stripe_checkout_session_id, stripe_payment_intent_id,
    stripe_customer_id,
    created_at, updated_at
  ) VALUES
    -- Upcoming tour with deposit paid
    (test_user_id, test_tour_1_id, test_client_3_id, 'food-tour-emily-' || substr(md5(random()::text), 1, 8),
     'deposit_paid', NOW() + INTERVAL '3 days', 3, 25500, 7650, 17850,
     NOW() - INTERVAL '1 week',
     'cs_test_3', 'pi_test_3',
     'cus_test_3',
     NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '1 week'),
    
    -- Another upcoming tour with deposit paid
    (test_user_id, test_tour_3_id, test_client_4_id, 'literary-david-' || substr(md5(random()::text), 1, 8),
     'deposit_paid', NOW() + INTERVAL '1 week', 2, 20000, 6000, 14000,
     NOW() - INTERVAL '5 days',
     'cs_test_4', 'pi_test_4',
     'cus_test_4',
     NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '5 days');

  -- Outgoing proposals (sent/viewed but not paid)
  INSERT INTO proposals (
    guide_id, tour_id, client_id, slug, status, scheduled_at, group_size,
    total_price_cents, deposit_cents, remainder_cents,
    created_at, updated_at
  ) VALUES
    -- Sent proposal
    (test_user_id, test_tour_2_id, test_client_5_id, 'street-art-lisa-' || substr(md5(random()::text), 1, 8),
     'sent', NOW() + INTERVAL '2 weeks', 4, 26000, 7800, 18200,
     NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
    
    -- Viewed proposal
    (test_user_id, test_tour_1_id, test_client_2_id, 'food-tour-michael-2-' || substr(md5(random()::text), 1, 8),
     'viewed', NOW() + INTERVAL '3 weeks', 5, 42500, 12750, 29750,
     NOW() - INTERVAL '1 week', NOW() - INTERVAL '2 days'),
    
    -- Draft proposal
    (test_user_id, test_tour_3_id, test_client_1_id, 'literary-jennifer-' || substr(md5(random()::text), 1, 8),
     'draft', NOW() + INTERVAL '1 month', 3, 20000, 6000, 14000,
     NOW() - INTERVAL '1 day', NOW());

  -- Create more proposals to fill the calendar (various dates over next 2 months)
  -- Use a loop to create proposals with proper random values
  FOR i IN 1..20 LOOP
    DECLARE
      tour_choice INT := (i % 3);
      client_choice INT := (i % 5);
      selected_tour_id UUID;
      selected_client_id UUID;
      group_size_val INT := 2 + floor(random() * 5)::INT;
      base_price INT;
      total_price INT;
      deposit_amount INT;
      remainder_amount INT;
      proposal_status_val proposal_status;
      deposit_paid_date TIMESTAMPTZ;
      remainder_paid_date TIMESTAMPTZ;
    BEGIN
      -- Select tour
      IF tour_choice = 0 THEN
        selected_tour_id := test_tour_1_id;
        base_price := 8500;
      ELSIF tour_choice = 1 THEN
        selected_tour_id := test_tour_2_id;
        base_price := 6500;
      ELSE
        selected_tour_id := test_tour_3_id;
        base_price := 20000; -- Flat rate
      END IF;

      -- Select client
      IF client_choice = 0 THEN
        selected_client_id := test_client_1_id;
      ELSIF client_choice = 1 THEN
        selected_client_id := test_client_2_id;
      ELSIF client_choice = 2 THEN
        selected_client_id := test_client_3_id;
      ELSIF client_choice = 3 THEN
        selected_client_id := test_client_4_id;
      ELSE
        selected_client_id := test_client_5_id;
      END IF;

      -- Calculate pricing
      IF tour_choice = 2 THEN
        -- Flat rate tour
        total_price := base_price;
        deposit_amount := 6000;
        remainder_amount := 14000;
      ELSE
        -- Per person tour
        total_price := base_price * group_size_val;
        deposit_amount := floor(total_price * 0.3);
        remainder_amount := total_price - deposit_amount;
      END IF;

      -- Determine status
      IF random() < 0.3 THEN
        proposal_status_val := 'confirmed';
        deposit_paid_date := NOW() - INTERVAL '1 week';
        remainder_paid_date := NOW() - INTERVAL '3 days';
      ELSIF random() < 0.6 THEN
        proposal_status_val := 'deposit_paid';
        deposit_paid_date := NOW() - INTERVAL '1 week';
        remainder_paid_date := NULL;
      ELSIF random() < 0.8 THEN
        proposal_status_val := 'viewed';
        deposit_paid_date := NULL;
        remainder_paid_date := NULL;
      ELSE
        proposal_status_val := 'sent';
        deposit_paid_date := NULL;
        remainder_paid_date := NULL;
      END IF;

      -- Insert proposal
      INSERT INTO proposals (
        guide_id, tour_id, client_id, slug, status, scheduled_at, group_size,
        total_price_cents, deposit_cents, remainder_cents,
        deposit_paid_at, remainder_paid_at,
        stripe_checkout_session_id, stripe_payment_intent_id,
        stripe_customer_id,
        created_at, updated_at
      ) VALUES (
        test_user_id,
        selected_tour_id,
        selected_client_id,
        'tour-' || i || '-' || substr(md5(random()::text), 1, 8),
        proposal_status_val,
        NOW() + (i || ' days')::INTERVAL,
        group_size_val,
        total_price,
        deposit_amount,
        remainder_amount,
        deposit_paid_date,
        remainder_paid_date,
        'cs_test_' || i,
        'pi_test_' || i,
        'cus_test_' || i,
        NOW() - INTERVAL '2 weeks',
        NOW() - INTERVAL '1 day'
      );
    END;
  END LOOP;

  RAISE NOTICE 'Test account created successfully!';
  RAISE NOTICE 'User ID: %', test_user_id;
  RAISE NOTICE 'Tours created: 3';
  RAISE NOTICE 'Proposals created: 25+';
END $$;

-- Add comment
COMMENT ON TABLE profiles IS 'Test account demo@rendez.to created for landing page feature demonstrations';

