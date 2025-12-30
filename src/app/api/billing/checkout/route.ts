import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Create Lemon Squeezy checkout session
 * This redirects to Lemon Squeezy hosted checkout
 */
export async function POST(request: NextRequest) {
  try {
    const { planType } = await request.json(); // 'monthly' | 'yearly'
    
    if (!planType || (planType !== 'monthly' && planType !== 'yearly')) {
      return NextResponse.json({ error: 'Invalid plan type. Must be "monthly" or "yearly"' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('ls_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Get Lemon Squeezy variant IDs from environment
    const variantIdMonthly = process.env.LEMON_SQUEEZY_VARIANT_ID_MONTHLY;
    const variantIdYearly = process.env.LEMON_SQUEEZY_VARIANT_ID_YEARLY;
    
    const variantId = planType === 'monthly' ? variantIdMonthly : variantIdYearly;

    if (!variantId) {
      return NextResponse.json({ 
        error: 'Lemon Squeezy variant ID not configured. Please set LEMON_SQUEEZY_VARIANT_ID_MONTHLY and LEMON_SQUEEZY_VARIANT_ID_YEARLY environment variables.' 
      }, { status: 500 });
    }

    // Build Lemon Squeezy checkout URL
    // Format: https://[store].lemonsqueezy.com/checkout/buy/[variant_id]?checkout[email]=[email]&checkout[custom][user_id]=[user_id]&checkout[custom][plan_type]=[plan_type]&checkout[redirect]=[redirect_url]
    const storeSlug = process.env.LEMON_SQUEEZY_STORE_SLUG;
    if (!storeSlug) {
      return NextResponse.json({ 
        error: 'Lemon Squeezy store slug not configured. Please set LEMON_SQUEEZY_STORE_SLUG environment variable.' 
      }, { status: 500 });
    }

    const checkoutUrl = new URL(`https://${storeSlug}.lemonsqueezy.com/checkout/buy/${variantId}`);
    checkoutUrl.searchParams.set('checkout[email]', user.email || '');
    checkoutUrl.searchParams.set('checkout[custom][user_id]', user.id);
    checkoutUrl.searchParams.set('checkout[custom][plan_type]', planType);
    checkoutUrl.searchParams.set('checkout[redirect]', `${appUrl}/app/settings/subscription?success=true`);
    checkoutUrl.searchParams.set('checkout[custom][app_url]', appUrl);

    return NextResponse.json({ url: checkoutUrl.toString() });
  } catch (error) {
    console.error('Error creating Lemon Squeezy checkout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout' },
      { status: 500 }
    );
  }
}

