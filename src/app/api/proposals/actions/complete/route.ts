import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { proposalId } = await request.json();
    
    if (!proposalId) {
      return NextResponse.json({ error: 'Missing proposalId' }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify proposal belongs to user and get full proposal data
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select(`
        id,
        slug,
        guide_id,
        client_id,
        tour_id,
        deposit_paid_at,
        total_price_cents,
        deposit_cents,
        remainder_cents,
        remainder_paid_at,
        stripe_payment_intent_id,
        stripe_customer_id,
        stripe_checkout_session_id
      `)
      .eq('id', proposalId)
      .eq('guide_id', user.id)
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (!proposal.deposit_paid_at) {
      return NextResponse.json({ error: 'Deposit must be paid before marking complete' }, { status: 400 });
    }

    // If remainder already paid, just mark as complete
    if (proposal.remainder_paid_at) {
      const { error: updateError } = await supabase
        .from('proposals')
        .update({
          completed_at: new Date().toISOString(),
          status: 'confirmed',
        })
        .eq('id', proposalId);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to mark complete' }, { status: 500 });
      }

      return NextResponse.json({ success: true, remainderAlreadyPaid: true });
    }

    // Calculate remainder amount automatically (if not already set)
    let remainderCents = proposal.remainder_cents;
    if (!remainderCents && proposal.total_price_cents && proposal.deposit_cents) {
      remainderCents = proposal.total_price_cents - proposal.deposit_cents;
    }

    // Mark as complete and set remainder amount
    const updateData: any = {
      completed_at: new Date().toISOString(),
      status: 'confirmed',
    };
    
    // Only update remainder_cents if it's not already set and we calculated one
    if (remainderCents && !proposal.remainder_cents) {
      updateData.remainder_cents = remainderCents;
    }

    const { error: updateError } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', proposalId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to mark complete' }, { status: 500 });
    }

    // If there's a remainder amount, charge the customer's card on file
    let paymentResult: { success: boolean; error?: string; paymentIntentId?: string } | null = null;
    
    if (remainderCents && remainderCents > 0) {
      try {
        // Get guide's profile for Stripe Connect and currency
        const { data: profile } = await supabase
          .from('profiles')
          .select('currency, stripe_account_id, stripe_charges_enabled')
          .eq('id', user.id)
          .single();

        const currency = (profile?.currency || 'USD').toLowerCase();
        const isTest = process.env.NODE_ENV === 'development';
        const useConnect = profile?.stripe_account_id && profile?.stripe_charges_enabled;
        
        // In production, require Connect for payments
        if (!isTest && !useConnect) {
          return NextResponse.json(
            { error: 'Guide has not enabled payments. Please contact the guide.' },
            { status: 400 }
          );
        }

        // Try to charge the customer's card on file
        if (proposal.stripe_customer_id || proposal.stripe_payment_intent_id || proposal.stripe_checkout_session_id) {
          try {
            let customerId = proposal.stripe_customer_id;
            let paymentMethodId: string | null = null;
            
            console.log(`[COMPLETE] Starting automatic charge for proposal ${proposalId}`);
            console.log(`[COMPLETE] Initial customer ID: ${customerId}`);
            console.log(`[COMPLETE] Payment intent ID: ${proposal.stripe_payment_intent_id}`);
            console.log(`[COMPLETE] Checkout session ID: ${proposal.stripe_checkout_session_id}`);

            // First, try to get payment method and customer ID from the original deposit payment intent
            if (proposal.stripe_payment_intent_id) {
              try {
                const depositPaymentIntent = await stripe.paymentIntents.retrieve(
                  proposal.stripe_payment_intent_id
                );
                
                console.log(`[COMPLETE] Deposit payment intent details:`, {
                  id: depositPaymentIntent.id,
                  customer: depositPaymentIntent.customer,
                  payment_method: depositPaymentIntent.payment_method,
                });
                
                // Get the payment method from the deposit payment intent
                paymentMethodId = depositPaymentIntent.payment_method as string | null;
                
                // Get customer ID from payment intent (always try to get it, even if we have one stored)
                if (depositPaymentIntent.customer) {
                  const intentCustomerId = depositPaymentIntent.customer as string;
                  
                  // If we don't have a customer ID or it's different, use the one from the payment intent
                  if (!customerId || customerId !== intentCustomerId) {
                    customerId = intentCustomerId;
                    
                    // Update the proposal with the customer ID if we found it
                    await supabase
                      .from('proposals')
                      .update({ stripe_customer_id: customerId })
                      .eq('id', proposalId);
                    
                    console.log(`[COMPLETE] Retrieved and stored customer ID ${customerId} from deposit payment intent`);
                  }
                } else {
                  console.log(`[COMPLETE] Deposit payment intent ${depositPaymentIntent.id} has no customer ID`);
                }
                
                console.log(`[COMPLETE] Retrieved payment method ${paymentMethodId} from deposit payment intent`);
              } catch (err) {
                console.error('[COMPLETE] Error retrieving deposit payment intent:', err);
              }
            }
            
            // If we still don't have a customer ID, try to get it from the checkout session
            if (!customerId && proposal.stripe_checkout_session_id) {
              try {
                const checkoutSession = await stripe.checkout.sessions.retrieve(
                  proposal.stripe_checkout_session_id,
                  { expand: ['payment_intent'] }
                );
                
                console.log(`[COMPLETE] Checkout session details:`, {
                  id: checkoutSession.id,
                  customer: checkoutSession.customer,
                  payment_intent: checkoutSession.payment_intent,
                });
                
                if (checkoutSession.customer) {
                  customerId = checkoutSession.customer as string;
                  
                  // Update the proposal with the customer ID
                  await supabase
                    .from('proposals')
                    .update({ stripe_customer_id: customerId })
                    .eq('id', proposalId);
                  
                  console.log(`[COMPLETE] Retrieved customer ID ${customerId} from checkout session`);
                } else if (checkoutSession.payment_intent) {
                  // Try to get customer from the payment intent in the checkout session
                  const pi = typeof checkoutSession.payment_intent === 'string'
                    ? await stripe.paymentIntents.retrieve(checkoutSession.payment_intent)
                    : checkoutSession.payment_intent;
                  
                  if (pi.customer) {
                    customerId = pi.customer as string;
                    
                    // Update the proposal with the customer ID
                    await supabase
                      .from('proposals')
                      .update({ stripe_customer_id: customerId })
                      .eq('id', proposalId);
                    
                    console.log(`[COMPLETE] Retrieved customer ID ${customerId} from checkout session payment intent`);
                  }
                }
              } catch (err) {
                console.error('[COMPLETE] Error retrieving checkout session:', err);
              }
            }
            
            // If we still don't have a customer ID but have a payment method, create a customer
            if (!customerId && paymentMethodId) {
              try {
                // Get client email for customer creation
                const { data: clientData } = await supabase
                  .from('clients')
                  .select('email, name')
                  .eq('id', proposal.client_id)
                  .single();
                
                if (clientData?.email) {
                  // Create a new customer with the client's email
                  const customer = await stripe.customers.create({
                    email: clientData.email,
                    name: clientData.name || undefined,
                    metadata: {
                      proposal_id: proposal.id,
                      client_id: proposal.client_id,
                    },
                  });
                  
                  customerId = customer.id;
                  
                  // Update the proposal with the customer ID
                  await supabase
                    .from('proposals')
                    .update({ stripe_customer_id: customerId })
                    .eq('id', proposalId);
                  
                  console.log(`[COMPLETE] Created new customer ${customerId} for client ${clientData.email}`);
                  
                  // Attach the payment method to the new customer
                  try {
                    await stripe.paymentMethods.attach(paymentMethodId, {
                      customer: customerId,
                    });
                    console.log(`[COMPLETE] Attached payment method ${paymentMethodId} to new customer ${customerId}`);
                  } catch (attachErr: any) {
                    console.error('[COMPLETE] Error attaching payment method to new customer:', attachErr);
                    // If attachment fails, we'll still try to use it
                  }
                } else {
                  console.log(`[COMPLETE] Cannot create customer: no client email found`);
                }
              } catch (err) {
                console.error('[COMPLETE] Error creating customer:', err);
              }
            }
            
            // If we have a payment method, check if it's attached to a customer
            if (paymentMethodId) {
              try {
                // Check if payment method is already attached to a customer
                const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
                
                if (pm.customer) {
                  // Payment method is already attached to a customer - use that customer
                  const attachedCustomerId = pm.customer as string;
                  if (!customerId || customerId !== attachedCustomerId) {
                    customerId = attachedCustomerId;
                    
                    // Update the proposal with the customer ID
                    await supabase
                      .from('proposals')
                      .update({ stripe_customer_id: customerId })
                      .eq('id', proposalId);
                    
                    console.log(`[COMPLETE] Payment method ${paymentMethodId} is attached to customer ${customerId}, using that customer`);
                  } else {
                    console.log(`[COMPLETE] Payment method ${paymentMethodId} already attached to customer ${customerId}`);
                  }
                } else if (customerId) {
                  // Payment method is not attached, but we have a customer ID - attach it
                  try {
                    await stripe.paymentMethods.attach(paymentMethodId, {
                      customer: customerId,
                    });
                    console.log(`[COMPLETE] Attached payment method ${paymentMethodId} to customer ${customerId}`);
                  } catch (attachErr: any) {
                    console.error('[COMPLETE] Error attaching payment method to customer:', attachErr);
                    // If attachment fails, we'll need to create a customer or fall back
                    if (attachErr.code !== 'resource_already_exists' && !attachErr.message?.includes('already attached')) {
                      console.log(`[COMPLETE] Cannot attach payment method, will create customer or fall back`);
                    }
                  }
                } else {
                  // Payment method is not attached and we don't have a customer ID
                  console.log(`[COMPLETE] Payment method ${paymentMethodId} is not attached to any customer, and no customer ID found`);
                }
              } catch (pmErr: any) {
                console.error('[COMPLETE] Error retrieving payment method details:', pmErr);
                // If we can't retrieve the payment method details, we can still try to use it
                // The payment intent creation will fail if there's an issue
              }
            }

            // If we still don't have a payment method but have customer ID, try to get saved payment methods
            if (!paymentMethodId && customerId) {
              try {
                const customer = await stripe.customers.retrieve(customerId);
                if (!customer.deleted) {
                  // Get all payment methods for this customer
                  const paymentMethods = await stripe.paymentMethods.list({
                    customer: customerId,
                    type: 'card',
                  });
                  
                  // Use the most recently added payment method
                  paymentMethodId = paymentMethods.data[0]?.id || null;
                  
                  if (paymentMethodId) {
                    console.log(`[COMPLETE] Found saved payment method ${paymentMethodId} for customer ${customerId}`);
                  }
                }
              } catch (err) {
                console.error('[COMPLETE] Error retrieving customer payment methods:', err);
              }
            }

            // If we have a payment method and customer ID, charge it directly
            if (paymentMethodId && customerId) {
              console.log(`[COMPLETE] Attempting to charge payment method ${paymentMethodId} for customer ${customerId || 'none'}`);
              // Calculate platform fee if enabled
              let applicationFeeAmount: number | undefined;
              if (useConnect && profile?.stripe_account_id) {
                const platformFeePercent = process.env.STRIPE_PLATFORM_FEE_PERCENT 
                  ? parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT) 
                  : null;
                const platformFeeFixedCents = process.env.STRIPE_PLATFORM_FEE_FIXED_CENTS
                  ? parseInt(process.env.STRIPE_PLATFORM_FEE_FIXED_CENTS)
                  : null;

                if (platformFeePercent) {
                  applicationFeeAmount = Math.round(remainderCents * (platformFeePercent / 100));
                } else if (platformFeeFixedCents) {
                  applicationFeeAmount = platformFeeFixedCents;
                }
              }

              // Create payment intent to charge the saved payment method
              // Use off_session: true for automatic charging (like subscription renewals)
              const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
                amount: remainderCents,
                currency: currency,
                payment_method: paymentMethodId,
                customer: customerId || undefined,
                confirm: true,
                off_session: true, // This is an off-session payment (no customer present)
                metadata: {
                  proposal_id: proposal.id,
                  slug: proposal.slug,
                  payment_type: 'remainder',
                  guide_id: user.id,
                },
              };

              // Add Connect destination and fee if enabled
              if (useConnect && profile?.stripe_account_id) {
                paymentIntentParams.transfer_data = {
                  destination: profile.stripe_account_id,
                };
                if (applicationFeeAmount) {
                  paymentIntentParams.application_fee_amount = applicationFeeAmount;
                }
              }

              try {
                console.log(`[COMPLETE] Creating payment intent with params:`, {
                  amount: remainderCents,
                  currency: currency,
                  payment_method: paymentMethodId,
                  customer: customerId || undefined,
                  off_session: true,
                  useConnect: useConnect,
                  destination: useConnect ? profile?.stripe_account_id : undefined,
                });
                
                const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
                
                console.log(`[COMPLETE] Payment intent created: ${paymentIntent.id}, status: ${paymentIntent.status}`);

                if (paymentIntent.status === 'succeeded') {
                  // Update proposal immediately
                  const { error: updateError } = await supabase
                    .from('proposals')
                    .update({
                      remainder_paid_at: new Date().toISOString(),
                      stripe_remainder_payment_intent_id: paymentIntent.id,
                    })
                    .eq('id', proposalId);

                  if (updateError) {
                    console.error('Error updating remainder payment:', updateError);
                    paymentResult = { success: false, error: 'Failed to update proposal' };
                  } else {
                    paymentResult = { success: true, paymentIntentId: paymentIntent.id };
                    console.log(`Remainder payment charged automatically for proposal ${proposalId}`);
                  }
                } else if (paymentIntent.status === 'requires_action') {
                  // Card requires authentication (3D Secure) - fall back to checkout
                  console.log(`Payment requires authentication for proposal ${proposalId}, falling back to checkout`);
                  paymentResult = null; // Will trigger checkout session creation
                } else {
                  // Payment failed or in unexpected state
                  paymentResult = { 
                    success: false, 
                    error: `Payment status: ${paymentIntent.status}` 
                  };
                }
              } catch (err: any) {
                // Handle Stripe errors
                console.error(`[COMPLETE] Error creating payment intent:`, {
                  code: err.code,
                  message: err.message,
                  type: err.type,
                  decline_code: err.decline_code,
                });
                
                if (err.code === 'authentication_required') {
                  // Card requires authentication - fall back to checkout
                  console.log(`[COMPLETE] Card requires authentication for proposal ${proposalId}, falling back to checkout`);
                  paymentResult = null; // Will trigger checkout session creation
                } else if (err.code === 'card_declined') {
                  console.log(`[COMPLETE] Card declined for proposal ${proposalId}, falling back to checkout`);
                  paymentResult = null; // Will trigger checkout session creation
                } else {
                  console.error(`[COMPLETE] Unexpected error during payment intent creation, falling back to checkout:`, err);
                  paymentResult = null; // Will trigger checkout session creation
                }
              }
            } else if (!paymentMethodId) {
              // No payment method available, fall back to checkout session
              console.log(`[COMPLETE] No payment method available for proposal ${proposalId}. Customer ID: ${customerId || 'none'}`);
              paymentResult = null;
            } else if (!customerId) {
              // Payment method available but no customer ID - cannot use off_session without customer
              console.log(`[COMPLETE] Payment method ${paymentMethodId} available but no customer ID found. Cannot charge off_session without customer.`);
              paymentResult = null;
            }
          } catch (chargeError) {
            console.error(`[COMPLETE] Error charging card on file for proposal ${proposalId}:`, chargeError);
            // Fall back to creating checkout session if automatic charge fails
            paymentResult = null;
          }
        } else {
          console.log(`[COMPLETE] No customer ID, payment intent ID, or checkout session ID found for proposal ${proposalId}`);
          paymentResult = null;
        }

        // Fallback: Create checkout session if automatic charge failed or not possible
        if (!paymentResult || !paymentResult.success) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          
          // In test mode, simulate payment
          if (isTest && !useConnect) {
            const { error: updateError } = await supabase
              .from('proposals')
              .update({
                remainder_paid_at: new Date().toISOString(),
                stripe_remainder_payment_intent_id: `test_pi_${Date.now()}`,
              })
              .eq('id', proposalId);

            if (updateError) {
              console.error('Error updating test remainder payment:', updateError);
            } else {
              paymentResult = { success: true };
            }
        } else {
            // Get client and tour info for checkout
        const { data: clientData } = await supabase
          .from('clients')
          .select('name, email')
          .eq('id', proposal.client_id)
          .single();

        const { data: tourData } = await supabase
          .from('tour_templates')
          .select('name')
          .eq('id', proposal.tour_id)
          .single();

        // Calculate platform fee if enabled
        let applicationFeeAmount: number | undefined;
        if (useConnect && profile?.stripe_account_id) {
          const platformFeePercent = process.env.STRIPE_PLATFORM_FEE_PERCENT 
            ? parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT) 
            : null;
          const platformFeeFixedCents = process.env.STRIPE_PLATFORM_FEE_FIXED_CENTS
            ? parseInt(process.env.STRIPE_PLATFORM_FEE_FIXED_CENTS)
            : null;

          if (platformFeePercent) {
            applicationFeeAmount = Math.round(remainderCents * (platformFeePercent / 100));
          } else if (platformFeeFixedCents) {
            applicationFeeAmount = platformFeeFixedCents;
          }
        }

            // Create checkout session as fallback
            // If we have a customer ID, use it so Stripe can show saved payment methods
        const sessionParams: Stripe.Checkout.SessionCreateParams = {
          payment_method_types: ['card'],
          mode: 'payment',
          line_items: [
            {
              price_data: {
                currency: currency,
                product_data: {
                  name: `Remainder: ${tourData?.name || 'Tour'}`,
                  description: `Remaining balance for ${clientData?.name || 'Client'}`,
                },
                unit_amount: remainderCents,
              },
              quantity: 1,
            },
          ],
          metadata: {
            proposal_id: proposal.id,
            slug: proposal.slug,
            payment_type: 'remainder',
            guide_id: user.id,
          },
              // Use customer ID if available (allows showing saved payment methods)
              customer: proposal.stripe_customer_id || undefined,
              customer_email: !proposal.stripe_customer_id ? (clientData?.email || undefined) : undefined,
          success_url: `${appUrl}/p/${proposal.slug}/success?session_id={CHECKOUT_SESSION_ID}&remainder=true`,
          cancel_url: `${appUrl}/p/${proposal.slug}`,
        };

        // Add Connect destination and fee if enabled
        if (useConnect && profile?.stripe_account_id) {
          sessionParams.payment_intent_data = {
            transfer_data: {
              destination: profile.stripe_account_id,
            },
          };
          if (applicationFeeAmount) {
            sessionParams.payment_intent_data.application_fee_amount = applicationFeeAmount;
          }
        }

          const session = await stripe.checkout.sessions.create(sessionParams);
            paymentResult = { 
              success: false, 
              error: 'checkout_required',
              paymentIntentId: session.url || undefined 
            };
          }
        }
      } catch (err) {
        console.error('Error processing remainder payment:', err);
        paymentResult = { 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        };
      }
    }

    // Prepare response data
    const checkoutUrl = paymentResult?.paymentIntentId && !paymentResult?.success 
      ? paymentResult.paymentIntentId 
      : null;
    
    const responseData = {
      success: true,
      remainderCents: remainderCents || null,
      remainderCharged: paymentResult?.success || false,
      checkoutUrl: checkoutUrl,
      error: paymentResult?.error || null,
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error marking proposal complete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

