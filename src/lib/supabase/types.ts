export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string | null;
                    phone: string | null;
                    display_name: string | null;
                    first_name: string | null;
                    last_name: string | null;
                    avatar_url: string | null;
                    avatar_zoom: number | null;
                    avatar_focus_x: number | null;
                    avatar_focus_y: number | null;
                    gender: string | null;
                    bio: string | null;
                    birthdate: string | null;
                    onboarding_completed: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email?: string | null;
                    phone?: string | null;
                    display_name?: string | null;
                    first_name?: string | null;
                    last_name?: string | null;
                    avatar_url?: string | null;
                    avatar_zoom?: number | null;
                    avatar_focus_x?: number | null;
                    avatar_focus_y?: number | null;
                    gender?: string | null;
                    bio?: string | null;
                    birthdate?: string | null;
                    onboarding_completed?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string | null;
                    phone?: string | null;
                    display_name?: string | null;
                    first_name?: string | null;
                    last_name?: string | null;
                    avatar_url?: string | null;
                    avatar_zoom?: number | null;
                    avatar_focus_x?: number | null;
                    avatar_focus_y?: number | null;
                    gender?: string | null;
                    bio?: string | null;
                    birthdate?: string | null;
                    onboarding_completed?: boolean;
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
            memories: {
                Row: {
                    id: string;
                    graph_id: string;
                    node_id: string | null;
                    author_id: string;
                    type: 'story' | 'photo' | 'document';
                    title: string | null;
                    content: string | null;
                    media_url: string | null;
                    media_type: string | null;
                    media_zoom: number | null;
                    media_focus_x: number | null;
                    media_focus_y: number | null;
                    event_date: string | null;
                    tags: string[];
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    graph_id: string;
                    node_id?: string | null;
                    author_id: string;
                    type: 'story' | 'photo' | 'document';
                    title?: string | null;
                    content?: string | null;
                    media_url?: string | null;
                    media_type?: string | null;
                    media_zoom?: number | null;
                    media_focus_x?: number | null;
                    media_focus_y?: number | null;
                    event_date?: string | null;
                    tags?: string[];
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    graph_id?: string;
                    node_id?: string | null;
                    author_id?: string;
                    type?: 'story' | 'photo' | 'document';
                    title?: string | null;
                    content?: string | null;
                    media_url?: string | null;
                    media_type?: string | null;
                    media_zoom?: number | null;
                    media_focus_x?: number | null;
                    media_focus_y?: number | null;
                    event_date?: string | null;
                    tags?: string[];
                    created_at?: string;
                    updated_at?: string;
                };
            };
            memory_comments: {
                Row: {
                    id: string;
                    memory_id: string;
                    author_id: string;
                    content: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    memory_id: string;
                    author_id: string;
                    content: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    memory_id?: string;
                    author_id?: string;
                    content?: string;
                    created_at?: string;
                };
            };
            memory_likes: {
                Row: {
                    id: string;
                    memory_id: string;
                    user_id: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    memory_id: string;
                    user_id: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    memory_id?: string;
                    user_id?: string;
                    created_at?: string;
                };
            };
            memory_subjects: {
                Row: {
                    id: string;
                    memory_id: string;
                    subject_user_id: string | null;
                    subject_node_id: string | null;
                    tagged_by: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    memory_id: string;
                    subject_user_id?: string | null;
                    subject_node_id?: string | null;
                    tagged_by: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    memory_id?: string;
                    subject_user_id?: string | null;
                    subject_node_id?: string | null;
                    tagged_by?: string;
                    created_at?: string;
                };
            };
        };
        Functions: {
            accept_invite: {
                Args: {
                    _token: string;
                };
                Returns: Array<{
                    graph_id: string;
                    node_id: string | null;
                }>;
            };
            get_invite_preview: {
                Args: {
                    _token: string;
                };
                Returns: Array<{
                    invite_id: string;
                    graph_id: string;
                    graph_name: string;
                    role: 'admin' | 'editor' | 'viewer';
                    status: 'pending' | 'accepted' | 'expired';
                    expires_at: string;
                    is_expired: boolean;
                    invite_claimed_by: string | null;
                    node_id: string | null;
                    node_first_name: string | null;
                    node_last_name: string | null;
                    node_claimed_by: string | null;
                }>;
            };
            claim_tree_node: {
                Args: {
                    _graph_id: string;
                    _node_id: string;
                };
                Returns: string;
            };
            unclaim_tree_node: {
                Args: {
                    _graph_id: string;
                    _node_id: string;
                };
                Returns: string;
            };
            create_memory_with_subjects: {
                Args: {
                    _graph_id: string;
                    _node_id: string | null;
                    _type: string;
                    _title: string;
                    _content: string | null;
                    _media_url: string | null;
                    _media_type: string | null;
                    _event_date: string | null;
                    _tags: string[] | null;
                    _subject_user_ids: string[] | null;
                    _subject_node_ids: string[] | null;
                    _media_zoom?: number | null;
                    _media_focus_x?: number | null;
                    _media_focus_y?: number | null;
                };
                Returns: string;
            };
        };
    };
};
