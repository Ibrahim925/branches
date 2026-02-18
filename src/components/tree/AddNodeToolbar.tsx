'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  UserPlus,
  Heart,
  Loader2,
  Users,
} from 'lucide-react';

interface AddNodeToolbarProps {
  graphId: string;
  selectedNodeId?: string | null;
  onNodeAdded?: () => void;
  forceOpen?: boolean;
  initialRelationship?: RelationshipType;
  onClose?: () => void;
}

type RelationshipType = 'parent_child' | 'partnership' | 'is_parent' | 'none';

export function AddNodeToolbar({
  graphId,
  selectedNodeId,
  onNodeAdded,
  forceOpen,
  initialRelationship = 'none',
  onClose,
}: AddNodeToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [relationship, setRelationship] = useState<RelationshipType>('none');

  // Synchronize with forceOpen
  useEffect(() => {
    if (forceOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(true);
      setRelationship(initialRelationship);
    }
  }, [forceOpen, initialRelationship]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Create the node
    const { data: newNode, error: nodeError } = await supabase
      .from('nodes')
      .insert({
        graph_id: graphId,
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        birthdate: birthdate || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (nodeError || !newNode) {
      console.error('Error creating node:', nodeError);
      setLoading(false);
      return;
    }

    // Create edge if a relationship is selected and a node is selected
    if (relationship !== 'none' && selectedNodeId) {
      const edgesToInsert = [];

      if (relationship === 'parent_child' || relationship === 'is_parent') {
        const isActuallyParent = relationship === 'is_parent';
        // Primary connection
        edgesToInsert.push({
          graph_id: graphId,
          source_id: isActuallyParent ? newNode.id : selectedNodeId,
          target_id: isActuallyParent ? selectedNodeId : newNode.id,
          type: 'parent_child' as const,
          created_by: user.id,
        });

        if (!isActuallyParent) {
          // Check for spouse/partner to add as second parent (only when adding a child)
          const { data: partners } = await supabase
            .from('edges')
            .select('source_id, target_id')
            .eq('graph_id', graphId)
            .eq('type', 'partnership')
            .or(`source_id.eq.${selectedNodeId},target_id.eq.${selectedNodeId}`);

          if (partners && partners.length > 0) {
            const partnerEdge = partners[0];
            const spouseId =
              partnerEdge.source_id === selectedNodeId
                ? partnerEdge.target_id
                : partnerEdge.source_id;

            edgesToInsert.push({
              graph_id: graphId,
              source_id: spouseId,
              target_id: newNode.id,
              type: 'parent_child' as const,
              created_by: user.id,
            });
          }
        }
      } else {
        // Partnership
        edgesToInsert.push({
          graph_id: graphId,
          source_id: selectedNodeId,
          target_id: newNode.id,
          type: 'partnership' as const,
          created_by: user.id,
        });
      }

      await supabase.from('edges').insert(edgesToInsert);
    }

    // Reset form
    setFirstName('');
    setLastName('');
    setBirthdate('');
    setRelationship('none');
    setIsOpen(false);
    setLoading(false);
    onNodeAdded?.();
  }

  return (
    <>
      {/* Floating action button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="tap-target fixed bottom-[calc(var(--safe-area-bottom)+var(--mobile-tab-bar-offset)+2rem)] right-8 md:bottom-[calc(var(--safe-area-bottom)+2rem)] w-14 h-14 bg-gradient-to-br from-moss to-leaf rounded-2xl shadow-xl shadow-moss/30 flex items-center justify-center text-white hover:shadow-2xl transition-shadow z-20"
        aria-label="Add family member"
        type="button"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
              onClick={handleClose}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[calc(var(--safe-area-top)+1rem)] pb-[calc(var(--safe-area-bottom)+1rem)]"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Add family member modal"
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[min(90vh,var(--app-vh))] overflow-y-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-moss/20 to-leaf/20 rounded-xl flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-moss" />
                    </div>
                    <h2 className="text-xl font-semibold text-earth">
                      Add Family Member
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="tap-target w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone/40 transition-colors"
                    aria-label="Close add family member modal"
                  >
                    <X className="w-4 h-4 text-bark/40" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-earth mb-1.5">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jane"
                        className="w-full px-4 py-3 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-earth placeholder:text-bark/30 transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-earth mb-1.5">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Smith"
                        className="w-full px-4 py-3 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-earth placeholder:text-bark/30 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-earth mb-1.5">
                      Birthdate{' '}
                      <span className="text-bark/40 font-normal">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={birthdate}
                      onChange={(e) => setBirthdate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone focus:outline-none focus:ring-2 focus:ring-moss/50 focus:border-moss text-earth transition-all"
                    />
                  </div>

                  {/* Relationship selector (only if a node is selected) */}
                  {selectedNodeId && (
                    <div>
                      <label className="block text-sm font-medium text-earth mb-2">
                        Relationship to selected person
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setRelationship('none')}
                          className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                            relationship === 'none'
                              ? 'border-moss bg-moss/10 text-moss'
                              : 'border-stone text-bark/50 hover:border-moss/40'
                          }`}
                        >
                          None
                        </button>
                        <button
                          type="button"
                          onClick={() => setRelationship('is_parent')}
                          className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                            relationship === 'is_parent'
                              ? 'border-moss bg-moss/10 text-moss'
                              : 'border-stone text-bark/50 hover:border-moss/40'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          Parent
                        </button>
                        <button
                          type="button"
                          onClick={() => setRelationship('parent_child')}
                          className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                            relationship === 'parent_child'
                              ? 'border-moss bg-moss/10 text-moss'
                              : 'border-stone text-bark/50 hover:border-moss/40'
                          }`}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Child
                        </button>
                        <button
                          type="button"
                          onClick={() => setRelationship('partnership')}
                          className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                            relationship === 'partnership'
                              ? 'border-sunrise bg-sunrise/10 text-sunrise'
                              : 'border-stone text-bark/50 hover:border-sunrise/40'
                          }`}
                        >
                          <Heart className="w-3.5 h-3.5" />
                          Partner
                        </button>
                      </div>
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading || !firstName.trim()}
                    className="w-full bg-gradient-to-r from-moss to-leaf text-white py-3 rounded-xl font-medium shadow-lg shadow-moss/20 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add to Tree
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
