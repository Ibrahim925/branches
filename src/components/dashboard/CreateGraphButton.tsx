'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, TreePine, Loader2 } from 'lucide-react';

export function CreateGraphButton() {
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
      {/* Button */}
      <motion.button
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="bg-white/40 backdrop-blur-sm rounded-2xl border-2 border-dashed border-stone/40 p-6 cursor-pointer hover:border-moss/40 hover:bg-moss/5 transition-all group flex flex-col items-center justify-center min-h-[200px]"
      >
        <div className="w-12 h-12 bg-stone/30 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-moss/20 transition-colors">
          <Plus className="w-6 h-6 text-bark/40 group-hover:text-moss transition-colors" />
        </div>
        <p className="text-sm font-medium text-bark/50 group-hover:text-moss transition-colors">
          Create New Tree
        </p>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-moss to-leaf rounded-xl flex items-center justify-center">
                      <TreePine className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-earth">
                      Create a Family Tree
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone/40 transition-colors"
                  >
                    <X className="w-4 h-4 text-bark/40" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleCreate} className="space-y-4">
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
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-earth mb-1.5">
                      Description{' '}
                      <span className="text-bark/40 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="A few words about your family tree..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-earth placeholder:text-bark/30 transition-all resize-none"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">
                      {error}
                    </p>
                  )}

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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
