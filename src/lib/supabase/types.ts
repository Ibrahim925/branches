export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string | null;
                    phone: string | null;
                    display_name: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email?: string | null;
                    phone?: string | null;
                    display_name?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string | null;
                    phone?: string | null;
                    display_name?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            graphs: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    cover_image_url: string | null;
                    created_by: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    cover_image_url?: string | null;
                    created_by: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string | null;
                    cover_image_url?: string | null;
                    created_by?: string;
                    created_at?: string;
                };
            };
            user_graph_memberships: {
                Row: {
                    id: string;
                    profile_id: string;
                    graph_id: string;
                    role: 'admin' | 'editor' | 'viewer';
                    joined_at: string;
                };
                Insert: {
                    id?: string;
                    profile_id: string;
                    graph_id: string;
                    role?: 'admin' | 'editor' | 'viewer';
                    joined_at?: string;
                };
                Update: {
                    id?: string;
                    profile_id?: string;
                    graph_id?: string;
                    role?: 'admin' | 'editor' | 'viewer';
                    joined_at?: string;
                };
            };
            nodes: {
                Row: {
                    id: string;
                    graph_id: string;
                    first_name: string;
                    last_name: string | null;
                    birthdate: string | null;
                    death_date: string | null;
                    bio: string | null;
                    avatar_url: string | null;
                    claimed_by: string | null;
                    x: number | null;
                    y: number | null;
                    created_at: string;
                    updated_at: string;
                    created_by: string | null;
                };
                Insert: {
                    id?: string;
                    graph_id: string;
                    first_name: string;
                    last_name?: string | null;
                    birthdate?: string | null;
                    death_date?: string | null;
                    bio?: string | null;
                    avatar_url?: string | null;
                    claimed_by?: string | null;
                    x?: number | null;
                    y?: number | null;
                    created_at?: string;
                    updated_at?: string;
                    created_by?: string | null;
                };
                Update: {
                    id?: string;
                    graph_id?: string;
                    first_name?: string;
                    last_name?: string | null;
                    birthdate?: string | null;
                    death_date?: string | null;
                    bio?: string | null;
                    avatar_url?: string | null;
                    claimed_by?: string | null;
                    x?: number | null;
                    y?: number | null;
                    created_at?: string;
                    updated_at?: string;
                    created_by?: string | null;
                };
            };
            edges: {
                Row: {
                    id: string;
                    graph_id: string;
                    source_id: string;
                    target_id: string;
                    type: 'parent_child' | 'partnership';
                    created_at: string;
                    created_by: string | null;
                };
                Insert: {
                    id?: string;
                    graph_id: string;
                    source_id: string;
                    target_id: string;
                    type: 'parent_child' | 'partnership';
                    created_at?: string;
                    created_by?: string | null;
                };
                Update: {
                    id?: string;
                    graph_id?: string;
                    source_id?: string;
                    target_id?: string;
                    type?: 'parent_child' | 'partnership';
                    created_at?: string;
                    created_by?: string | null;
                };
            };
            conversations: {
                Row: {
                    id: string;
                    graph_id: string;
                    type: 'direct' | 'group' | 'tree';
                    name: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    graph_id: string;
                    type: 'direct' | 'group' | 'tree';
                    name?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    graph_id?: string;
                    type?: 'direct' | 'group' | 'tree';
                    name?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            conversation_participants: {
                Row: {
                    id: string;
                    conversation_id: string;
                    user_id: string;
                    joined_at: string;
                };
                Insert: {
                    id?: string;
                    conversation_id: string;
                    user_id: string;
                    joined_at?: string;
                };
                Update: {
                    id?: string;
                    conversation_id?: string;
                    user_id?: string;
                    joined_at?: string;
                };
            };
            messages: {
                Row: {
                    id: string;
                    conversation_id: string;
                    sender_id: string;
                    content: string | null;
                    image_url: string | null;
                    image_type: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    conversation_id: string;
                    sender_id: string;
                    content?: string | null;
                    image_url?: string | null;
                    image_type?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    conversation_id?: string;
                    sender_id?: string;
                    content?: string | null;
                    image_url?: string | null;
                    image_type?: string | null;
                    created_at?: string;
                };
            };
            message_reads: {
                Row: {
                    id: string;
                    conversation_id: string;
                    user_id: string;
                    last_read_at: string;
                };
                Insert: {
                    id?: string;
                    conversation_id: string;
                    user_id: string;
                    last_read_at?: string;
                };
                Update: {
                    id?: string;
                    conversation_id?: string;
                    user_id?: string;
                    last_read_at?: string;
                };
            };
            conversation_typing: {
                Row: {
                    conversation_id: string;
                    user_id: string;
                    updated_at: string;
                };
                Insert: {
                    conversation_id: string;
                    user_id: string;
                    updated_at?: string;
                };
                Update: {
                    conversation_id?: string;
                    user_id?: string;
                    updated_at?: string;
                };
            };
            invites: {
                Row: {
                    id: string;
                    graph_id: string;
                    invited_by: string;
                    email: string | null;
                    token: string;
                    role: 'admin' | 'editor' | 'viewer';
                    status: 'pending' | 'accepted' | 'expired';
                    claimed_by: string | null;
                    node_id: string | null;
                    created_at: string;
                    expires_at: string;
                };
                Insert: {
                    id?: string;
                    graph_id: string;
                    invited_by: string;
                    email?: string | null;
                    token?: string;
                    role?: 'admin' | 'editor' | 'viewer';
                    status?: 'pending' | 'accepted' | 'expired';
                    claimed_by?: string | null;
                    node_id?: string | null;
                    created_at?: string;
                    expires_at?: string;
                };
                Update: {
                    id?: string;
                    graph_id?: string;
                    invited_by?: string;
                    email?: string | null;
                    token?: string;
                    role?: 'admin' | 'editor' | 'viewer';
                    status?: 'pending' | 'accepted' | 'expired';
                    claimed_by?: string | null;
                    node_id?: string | null;
                    created_at?: string;
                    expires_at?: string;
                };
            };
        };
    };
};
