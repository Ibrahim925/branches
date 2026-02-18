'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Plus, TreePine, Loader2 } from 'lucide-react';
import { MobileActionSheet } from '@/components/system/MobileActionSheet';
import { MobilePrimaryAction } from '@/components/system/MobilePrimaryAction';

type CreateGraphButtonProps = {
  triggerVariant?: 'card' | 'fab';
};

export function CreateGraphButton({ triggerVariant = 'card' }: CreateGraphButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // 1. Create the graph
    const { data: graph, error: graphError } = await supabase
      .from('graphs')
      .insert({
        name,
        description: description || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (graphError || !graph) {
      console.error('Error creating graph:', graphError);
      setError(graphError?.message || 'Failed to create tree. Please try again.');
      setLoading(false);
      return;
    }

    // 2. Add creator as admin member
    const { error: memberError } = await supabase
      .from('user_graph_memberships')
      .insert({
        profile_id: user.id,
        graph_id: graph.id,
        role: 'admin',
      });

    if (memberError) {
      console.error('Error adding membership:', memberError);
    }

    // 3. Create the user's own node in the tree
    await supabase.from('nodes').insert({
      graph_id: graph.id,
      first_name:
        user.user_metadata?.display_name ||
        user.email?.split('@')[0] ||
        'Me',
      claimed_by: user.id,
      created_by: user.id,
    });

    setLoading(false);
    setIsOpen(false);
    router.push(`/${graph.id}`);
    router.refresh();
  }

  return (
    <>
      {triggerVariant === 'card' ? (
        <motion.button
          whileHover={{ y: -4, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => setIsOpen(true)}
          className="hidden md:flex bg-white/40 backdrop-blur-sm rounded-2xl border-2 border-dashed border-stone/40 p-6 cursor-pointer hover:border-moss/40 hover:bg-moss/5 transition-all group flex-col items-center justify-center min-h-[200px]"
        >
          <div className="w-12 h-12 bg-stone/30 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-moss/20 transition-colors">
            <Plus className="w-6 h-6 text-bark/40 group-hover:text-moss transition-colors" />
          </div>
          <p className="text-sm font-medium text-bark/50 group-hover:text-moss transition-colors">
            Create New Tree
          </p>
        </motion.button>
      ) : (
        <MobilePrimaryAction
          label="Create tree"
          ariaLabel="Create new family tree"
          icon={<Plus className="w-6 h-6" />}
          onPress={() => setIsOpen(true)}
          hidden={isOpen}
        />
      )}

      <MobileActionSheet
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create a Family Tree"
        ariaLabel="Create a family tree"
        className="md:max-w-md"
      >
        <form onSubmit={handleCreate} className="mobile-sheet-body pt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-moss to-leaf rounded-xl flex items-center justify-center">
              <TreePine className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm text-bark/60">Start a new family space and invite members.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-earth mb-1.5">
              Tree Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., The Smith Family"
              className="w-full px-4 py-3 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-earth placeholder:text-bark/30 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-earth mb-1.5">
              Description <span className="text-bark/40 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A few words about your family tree..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-earth placeholder:text-bark/30 transition-all resize-none"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">
              {error}
            </p>
          ) : null}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-gradient-to-r from-moss to-leaf text-white py-3 rounded-xl font-medium shadow-lg shadow-moss/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <TreePine className="w-4 h-4" />
                Plant Your Tree
              </>
            )}
          </motion.button>
        </form>
      </MobileActionSheet>
    </>
  );
}
