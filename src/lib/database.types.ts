export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            credit_cards: {
                Row: {
                    closing_day: number
                    color: string | null
                    created_at: string
                    due_day: number
                    id: string
                    last_4_digits: string | null
                    limit_amount: number | null
                    name: string
                    user_id: string
                }
                Insert: {
                    closing_day: number
                    color?: string | null
                    created_at?: string
                    due_day: number
                    id?: string
                    last_4_digits?: string | null
                    limit_amount?: number | null
                    name: string
                    user_id: string
                }
                Update: {
                    closing_day?: number
                    color?: string | null
                    created_at?: string
                    due_day?: number
                    id?: string
                    last_4_digits?: string | null
                    limit_amount?: number | null
                    name?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "credit_cards_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            debts: {
                Row: {
                    created_at: string
                    debt_type: string | null
                    due_day: number | null
                    id: string
                    interest_rate: number | null
                    minimum_payment: number | null
                    name: string
                    remaining_amount: number
                    specific_due_date: string | null
                    total_amount: number
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    debt_type?: string | null
                    due_day?: number | null
                    id?: string
                    interest_rate?: number | null
                    minimum_payment?: number | null
                    name: string
                    remaining_amount: number
                    specific_due_date?: string | null
                    total_amount: number
                    user_id: string
                }
                Update: {
                    created_at?: string
                    debt_type?: string | null
                    due_day?: number | null
                    id?: string
                    interest_rate?: number | null
                    minimum_payment?: number | null
                    name?: string
                    remaining_amount?: number
                    specific_due_date?: string | null
                    total_amount?: number
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "debts_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            invoices: {
                Row: {
                    amount: number | null
                    closing_date: string | null
                    created_at: string
                    credit_card_id: string
                    due_date: string | null
                    id: string
                    month: number
                    status: string | null
                    year: number
                }
                Insert: {
                    amount?: number | null
                    closing_date?: string | null
                    created_at?: string
                    credit_card_id: string
                    due_date?: string | null
                    id?: string
                    month: number
                    status?: string | null
                    year: number
                }
                Update: {
                    amount?: number | null
                    closing_date?: string | null
                    created_at?: string
                    credit_card_id?: string
                    due_date?: string | null
                    id?: string
                    month?: number
                    status?: string | null
                    year?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "invoices_credit_card_id_fkey"
                        columns: ["credit_card_id"]
                        isOneToOne: false
                        referencedRelation: "credit_cards"
                        referencedColumns: ["id"]
                    },
                ]
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    full_name: string | null
                    id: string
                    updated_at: string | null
                    username: string | null
                    website: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    full_name?: string | null
                    id: string
                    updated_at?: string | null
                    username?: string | null
                    website?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    full_name?: string | null
                    id?: string
                    updated_at?: string | null
                    username?: string | null
                    website?: string | null
                }
                Relationships: []
            }
            push_subscriptions: {
                Row: {
                    id: string
                    user_id: string
                    endpoint: string
                    keys: Json
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    endpoint: string
                    keys: Json
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    endpoint?: string
                    keys?: Json
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            recurring_payments: {
                Row: {
                    active: boolean | null
                    amount: number
                    category: string | null
                    created_at: string
                    day_of_month: number
                    id: string
                    name: string
                    user_id: string
                }
                Insert: {
                    active?: boolean | null
                    amount: number
                    category?: string | null
                    created_at?: string
                    day_of_month: number
                    id?: string
                    name: string
                    user_id: string
                }
                Update: {
                    active?: boolean | null
                    amount?: number
                    category?: string | null
                    created_at?: string
                    day_of_month?: number
                    id?: string
                    name?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "recurring_payments_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            transactions: {
                Row: {
                    amount: number
                    category: string | null
                    created_at: string
                    date: string
                    description: string
                    id: string
                    installments_current: number | null
                    installments_total: number | null
                    invoice_id: string | null
                    type: string | null
                    user_id: string
                }
                Insert: {
                    amount: number
                    category?: string | null
                    created_at?: string
                    date: string
                    description: string
                    id?: string
                    installments_current?: number | null
                    installments_total?: number | null
                    invoice_id?: string | null
                    type?: string | null
                    user_id: string
                }
                Update: {
                    amount?: number
                    category?: string | null
                    created_at?: string
                    date?: string
                    description?: string
                    id?: string
                    installments_current?: number | null
                    installments_total?: number | null
                    invoice_id?: string | null
                    type?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "transactions_invoice_id_fkey"
                        columns: ["invoice_id"]
                        isOneToOne: false
                        referencedRelation: "invoices"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "transactions_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
