export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WeddingStyle =
  | "rustic"
  | "modern"
  | "classic"
  | "bohemian"
  | "minimalist"
  | "glam"
  | "cultural"
  | "other";

export type VendorType =
  | "photographer"
  | "videographer"
  | "dj"
  | "band"
  | "caterer"
  | "florist"
  | "baker"
  | "hair_makeup"
  | "officiant"
  | "rentals"
  | "venue"
  | "transportation"
  | "coordinator"
  | "photo_booth"
  | "other";

export type RsvpStatus = "pending" | "confirmed" | "declined" | "no_response";
export type MealChoice = "meat" | "fish" | "vegetarian" | "vegan" | "kids" | "other";
export type TableShape = "round" | "rectangle" | "square" | "sweetheart";
export type ItemStatus = "not_started" | "ordered" | "received" | "done";
export type BudgetItemType = "deposit" | "balance" | "tip" | "purchase";
export type MemberRole = "owner" | "partner" | "coordinator" | "viewer";
export type TimelineEventType = "pre_wedding" | "day_of";

export interface Database {
  public: {
    Tables: {
      weddings: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          partner1_name: string;
          partner2_name: string;
          wedding_date: string | null;
          venue_name: string | null;
          venue_address: string | null;
          venue_indoor_outdoor: "indoor" | "outdoor" | "mixed" | null;
          guest_count_estimate: number | null;
          budget_total: number | null;
          style: WeddingStyle | null;
          color_palette: string[] | null;
          bridal_party_size: number | null;
          partner1_attire: "dress" | "suit" | "undecided" | null;
          partner2_attire: "dress" | "suit" | "undecided" | null;
          ceremony_style: string | null;
          reception_format: string | null;
          cultural_elements: string | null;
          venue_curfew: string | null;
          rehearsal_dinner_date: string | null;
          rehearsal_dinner_location: string | null;
          honeymoon_departure: string | null;
          onboarding_completed: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["weddings"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["weddings"]["Insert"]>;
      };
      wedding_members: {
        Row: {
          id: string;
          wedding_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["wedding_members"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["wedding_members"]["Insert"]>;
      };
      vendors: {
        Row: {
          id: string;
          wedding_id: string;
          type: VendorType;
          company_name: string;
          contact_name: string | null;
          phone: string | null;
          email: string | null;
          contract_amount: number | null;
          deposit_amount: number | null;
          deposit_paid: boolean;
          balance_due_date: string | null;
          arrival_time: string | null;
          setup_time_minutes: number | null;
          setup_location: string | null;
          breakdown_time: string | null;
          meals_needed: number | null;
          notes: string | null;
          extra_details: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vendors"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["vendors"]["Insert"]>;
      };
      guests: {
        Row: {
          id: string;
          wedding_id: string;
          first_name: string;
          last_name: string;
          rsvp_status: RsvpStatus;
          meal_choice: MealChoice | null;
          dietary_restrictions: string | null;
          plus_one: boolean;
          plus_one_name: string | null;
          address: string | null;
          email: string | null;
          phone: string | null;
          table_id: string | null;
          relationship_tag: string | null;
          gift_description: string | null;
          thank_you_sent: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["guests"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["guests"]["Insert"]>;
      };
      tables: {
        Row: {
          id: string;
          wedding_id: string;
          number: number;
          name: string | null;
          capacity: number;
          shape: TableShape;
          position_x: number | null;
          position_y: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tables"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["tables"]["Insert"]>;
      };
      timeline_events: {
        Row: {
          id: string;
          wedding_id: string;
          type: TimelineEventType;
          event_date: string | null;
          event_time: string | null;
          title: string;
          description: string | null;
          assigned_to: string | null;
          sort_order: number;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["timeline_events"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["timeline_events"]["Insert"]>;
      };
      shopping_items: {
        Row: {
          id: string;
          wedding_id: string;
          category: string;
          item_name: string;
          status: ItemStatus;
          quantity: number;
          estimated_cost: number | null;
          actual_cost: number | null;
          search_terms: string | null;
          vendor_source: string | null;
          notes: string | null;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["shopping_items"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["shopping_items"]["Insert"]>;
      };
      budget_items: {
        Row: {
          id: string;
          wedding_id: string;
          category: string;
          description: string;
          amount: number;
          due_date: string | null;
          paid: boolean;
          paid_at: string | null;
          item_type: BudgetItemType;
          vendor_id: string | null;
          shopping_item_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["budget_items"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["budget_items"]["Insert"]>;
      };
      music_selections: {
        Row: {
          id: string;
          wedding_id: string;
          phase: string;
          song_title: string;
          artist: string | null;
          notes: string | null;
          is_do_not_play: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["music_selections"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["music_selections"]["Insert"]>;
      };
      packing_boxes: {
        Row: {
          id: string;
          wedding_id: string;
          label: string;
          assigned_to: string | null;
          vehicle: string | null;
          delivery_time: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["packing_boxes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["packing_boxes"]["Insert"]>;
      };
      packing_items: {
        Row: {
          id: string;
          box_id: string;
          shopping_item_id: string | null;
          item_name: string;
          packed: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["packing_items"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["packing_items"]["Insert"]>;
      };
      delegation_tasks: {
        Row: {
          id: string;
          wedding_id: string;
          task: string;
          assigned_to: string;
          contact: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["delegation_tasks"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["delegation_tasks"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
