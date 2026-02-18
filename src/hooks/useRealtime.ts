'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type RealtimeChannel } from '@supabase/supabase-js';

type ChangePayload = {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Record<string, unknown>;
    old: Record<string, unknown>;
    table: string;
};

export function useRealtimeGraph(
    graphId: string,
    onNodeChange?: (payload: ChangePayload) => void,
    onEdgeChange?: (payload: ChangePayload) => void
) {
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(`graph-${graphId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'nodes',
                    filter: `graph_id=eq.${graphId}`,
                },
                (payload) => {
                    onNodeChange?.({
                        eventType: payload.eventType,
                        new: payload.new as Record<string, unknown>,
                        old: payload.old as Record<string, unknown>,
                        table: 'nodes',
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'edges',
                    filter: `graph_id=eq.${graphId}`,
                },
                (payload) => {
                    onEdgeChange?.({
                        eventType: payload.eventType,
                        new: payload.new as Record<string, unknown>,
                        old: payload.old as Record<string, unknown>,
                        table: 'edges',
                    });
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [graphId, onNodeChange, onEdgeChange]);

    return channelRef;
}

export function useRealtimeMessages(
    conversationId: string,
    onNewMessage?: (message: Record<string, unknown>) => void
) {
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(`chat-${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    onNewMessage?.(payload.new as Record<string, unknown>);
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, onNewMessage]);

    return channelRef;
}
