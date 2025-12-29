export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type BlockVisibility = 'public' | 'vague' | 'secret' | 'reveal';
export type BlockType = 'activity' | 'transport' | 'meal' | 'free_time' | 'accommodation' | 'other';
export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'deposit_paid' | 'confirmed' | 'archived';
export type PriceMode = 'per_person' | 'flat';
export type BusinessStage = 'just_starting' | 'established';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          timezone: string;
          currency: string;
          deposit_percentage: number;
          business_name: string | null;
          logo_url: string | null;
          profile_photo_url: string | null;
          business_stage: BusinessStage | null;
          website_url: string | null;
          phone: string | null;
          bio: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          timezone?: string;
          currency?: string;
          business_name?: string | null;
          logo_url?: string | null;
          business_stage?: BusinessStage | null;
          website_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          timezone?: string;
          currency?: string;
          deposit_percentage?: number;
          business_name?: string | null;
          logo_url?: string | null;
          business_stage?: BusinessStage | null;
          website_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          onboarding_completed?: boolean;
          updated_at?: string;
        };
      };
      tour_templates: {
        Row: {
          id: string;
          guide_id: string;
          name: string;
          city: string | null;
          duration_minutes: number;
          price_mode: PriceMode;
          base_price_cents: number;
          description: string | null;
          cover_image_url: string | null;
          is_time_bound: boolean;
          allowed_days_of_week: number[] | null;
          preferred_start_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          guide_id: string;
          name: string;
          city?: string | null;
          duration_minutes?: number;
          price_mode?: PriceMode;
          base_price_cents?: number;
          description?: string | null;
          cover_image_url?: string | null;
          is_time_bound?: boolean;
          allowed_days_of_week?: number[] | null;
          preferred_start_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          guide_id?: string;
          name?: string;
          city?: string | null;
          duration_minutes?: number;
          price_mode?: PriceMode;
          base_price_cents?: number;
          description?: string | null;
          cover_image_url?: string | null;
          is_time_bound?: boolean;
          allowed_days_of_week?: number[] | null;
          preferred_start_time?: string | null;
          updated_at?: string;
        };
      };
      tour_blocks: {
        Row: {
          id: string;
          tour_id: string;
          guide_id: string;
          sort_order: number;
          type: BlockType;
          client_title: string;
          description: string | null;
          teaser_description: string | null;
          start_offset_minutes: number;
          duration_minutes: number;
          image_url: string | null;
          visibility: BlockVisibility;
          venue_name: string | null;
          neighborhood: string | null;
          address: string | null;
          lat: number | null;
          lng: number | null;
          hide_until_deposit: boolean;
          pre_deposit_title: string | null;
          pre_deposit_description: string | null;
          post_deposit_title: string | null;
          post_deposit_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tour_id: string;
          guide_id: string;
          sort_order?: number;
          type?: BlockType;
          client_title: string;
          description?: string | null;
          teaser_description?: string | null;
          start_offset_minutes?: number;
          duration_minutes?: number;
          image_url?: string | null;
          visibility?: BlockVisibility;
          venue_name?: string | null;
          neighborhood?: string | null;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          hide_until_deposit?: boolean;
          pre_deposit_title?: string | null;
          pre_deposit_description?: string | null;
          post_deposit_title?: string | null;
          post_deposit_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tour_id?: string;
          guide_id?: string;
          sort_order?: number;
          type?: BlockType;
          client_title?: string;
          description?: string | null;
          teaser_description?: string | null;
          start_offset_minutes?: number;
          duration_minutes?: number;
          image_url?: string | null;
          visibility?: BlockVisibility;
          venue_name?: string | null;
          neighborhood?: string | null;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          hide_until_deposit?: boolean;
          pre_deposit_title?: string | null;
          pre_deposit_description?: string | null;
          post_deposit_title?: string | null;
          post_deposit_description?: string | null;
          updated_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          guide_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          guide_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          guide_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
      };
      proposals: {
        Row: {
          id: string;
          guide_id: string;
          tour_id: string;
          client_id: string;
          slug: string;
          status: ProposalStatus;
          scheduled_at: string | null;
          group_size: number | null;
          total_price_cents: number | null;
          deposit_cents: number;
          deposit_paid_at: string | null;
          remainder_cents: number | null;
          remainder_paid_at: string | null;
          completed_at: string | null;
          manual_unlock: boolean;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          stripe_remainder_session_id: string | null;
          stripe_remainder_payment_intent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          guide_id: string;
          tour_id: string;
          client_id: string;
          slug: string;
          status?: ProposalStatus;
          scheduled_at?: string | null;
          group_size?: number | null;
          total_price_cents?: number | null;
          deposit_cents: number;
          deposit_paid_at?: string | null;
          remainder_cents?: number | null;
          remainder_paid_at?: string | null;
          completed_at?: string | null;
          manual_unlock?: boolean;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_remainder_session_id?: string | null;
          stripe_remainder_payment_intent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          guide_id?: string;
          tour_id?: string;
          client_id?: string;
          slug?: string;
          status?: ProposalStatus;
          scheduled_at?: string | null;
          group_size?: number | null;
          total_price_cents?: number | null;
          deposit_cents?: number;
          deposit_paid_at?: string | null;
          remainder_cents?: number | null;
          remainder_paid_at?: string | null;
          completed_at?: string | null;
          manual_unlock?: boolean;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_remainder_session_id?: string | null;
          stripe_remainder_payment_intent_id?: string | null;
          updated_at?: string;
        };
      };
    };
    Functions: {
      get_public_proposal_by_slug: {
        Args: { slug_param: string };
        Returns: Json;
      };
    };
  };
}

// Helper types for use in components
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type TourTemplate = Database['public']['Tables']['tour_templates']['Row'];
export type TourBlock = Database['public']['Tables']['tour_blocks']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type Proposal = Database['public']['Tables']['proposals']['Row'];

// Public proposal type (returned by RPC)
export interface PublicProposal {
  id: string;
  slug: string;
  status: ProposalStatus;
  scheduled_at: string | null;
  group_size: number | null;
  total_price_cents: number | null;
  deposit_cents: number;
  is_unlocked: boolean;
  tour: {
    name: string;
    city: string | null;
    duration_minutes: number;
    description: string | null;
    cover_image_url: string | null;
  };
  client: {
    name: string;
  };
  blocks: PublicBlock[];
  guide: {
    full_name: string | null;
    business_name: string | null;
    logo_url: string | null;
    profile_photo_url: string | null;
    bio: string | null;
    average_rating: number | null;
    review_count: number | null;
  };
}

export interface PublicBlock {
  id: string;
  sort_order: number;
  type: BlockType;
  client_title: string;
  description: string | null; // This will be teaser_description if locked and visibility is 'reveal'
  start_offset_minutes: number;
  image_url: string | null;
  visibility: BlockVisibility;
  hide_until_deposit?: boolean; // Included so frontend can detect hidden blocks
  // These are only included if unlocked or visibility is public/vague
  venue_name: string | null;
  neighborhood: string | null; // Shown before deposit
  address: string | null; // Shown after deposit
  lat: number | null;
  lng: number | null;
}

