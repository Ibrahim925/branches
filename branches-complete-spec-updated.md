# Branches: Technical Specification
**Real-Time Multiplayer Family Network**

---

## Overview

**Branches** is a private, real-time social network built around an interactive family tree. It combines genealogy visualization with modern social features—live chat, photo sharing, and memory feeds—all anchored to a **beautifully rendered, organic tree visualization** that multiple users edit simultaneously.

**Core Innovation:** A live-updating Directed Acyclic Graph (DAG) visualized as a **stunning, natural tree** with semantic zoom that scales from constellation view (glowing dots) to detailed profile cards, with zero-collision multiplayer editing and fluid, delightful animations throughout.

**Design Philosophy:** Every interaction should feel intuitive, fluid, and beautiful. The UI should have an organic, natural feel that mirrors the growth of an actual tree—branches extending, leaves unfurling, connections forming. Users should immediately understand how to navigate and interact without instruction.

---

## Problem & Solution

**Problem:** Family communication is fragmented. Group chats are noisy, social media is too public, genealogy apps focus on the dead and feel clinical.

**Solution:** A beautiful, self-organizing family map where:
- Updates attach to specific relatives (not a chaotic thread)
- The tree grows organically as members invite their own branches
- Everything is private, real-time, and visually intuitive
- **The visualization feels alive—like watching a real tree grow and flourish**

---

## Tech Stack

| Layer | Technology | Purpose | Why This Choice |
|-------|-----------|---------|----------------|
| **Frontend** | React 18 + TypeScript | UI components | Type safety, large ecosystem |
| **Framework** | **Next.js 14+** | Full-stack React framework | **SSR/SSG for landing page, App Router, built-in optimizations, better performance** |
| **Backend & DB** | **Supabase** | Auth, PostgreSQL DB, Realtime, Storage | **All-in-one:** Eliminates need for separate backend |
| **State** | **Zustand** | Client state | **Recommended:** Lighter than Redux, perfect for graph data |
| **Graph Layout** | **Dagre.js** | DAG coordinate calculation | Industry standard for hierarchical graphs |
| **Graph Render** | **React Flow** | Canvas + interactive nodes | Built for DAG visualization, handles performance |
| **Animation** | **Framer Motion** | Smooth transitions, micro-interactions | **Critical:** Declarative, performant, creates fluid feel |
| **Styling** | **Tailwind CSS** | Utility-first styling | Rapid UI development, excellent with React |
| **Forms** | **React Hook Form** | Form validation | Handles profile editing, less re-renders |
| **Media** | **Supabase Storage** | Avatar/photo hosting | Integrated: Same auth, automatic CDN |
| **Icons** | **Lucide React** | Beautiful, consistent icons | Lightweight, tree-first iconography |

### UI/UX Design Principles

**CRITICAL: The entire application must embody these principles:**

1. **Intuitive Navigation:** Zero learning curve. Users should understand interactions instinctively.
2. **Fluid Animations:** Every transition, every interaction should feel smooth and natural. No jarring movements.
3. **Organic Aesthetics:** Design language inspired by nature—soft curves, natural colors (earth tones, greens, warm neutrals), growth patterns.
4. **Responsive Delight:** Micro-interactions and feedback for every action (hover states, click feedback, success animations).
5. **Visual Hierarchy:** Clear focus on what matters. The tree is the hero, everything else supports it.
6. **Accessibility First:** Beautiful for everyone. WCAG 2.1 AA compliance minimum.

### Design Language Consistency

**Color Palette (Organic & Warm):**
```typescript
const brandColors = {
  // Primary - Warm earth tones
  bark: '#5D4E37',      // Deep brown, grounding
  moss: '#8B9D77',      // Soft green, growth
  leaf: '#A8C090',      // Fresh green, life
  
  // Accents - Natural highlights
  sunrise: '#E6B17E',   // Warm gold
  dewdrop: '#B8D4E8',   // Soft blue
  
  // Neutrals - Organic grays
  stone: '#E8E4DF',     // Light warm gray
  earth: '#3A3A3A',     // Deep charcoal
  
  // Functional
  success: '#7FAD6F',   // Natural green
  warning: '#D4A574',   // Amber
  error: '#C97064',     // Terracotta
}
```

**Typography:**
```typescript
const typography = {
  display: 'font-family: "Inter", sans-serif; font-weight: 600;',
  heading: 'font-family: "Inter", sans-serif; font-weight: 500;',
  body: 'font-family: "Inter", sans-serif; font-weight: 400;',
  caption: 'font-family: "Inter", sans-serif; font-weight: 400; font-size: 0.875rem;'
}
```

**Animation Standards:**
```typescript
const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Organic easing
  spring: { type: "spring", stiffness: 300, damping: 30 },
  gentle: { duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }
}
```

### Recommended Additions

**Image Optimization:**
- **next/image** (built-in): Automatic optimization, lazy loading, blur placeholders
- **sharp** (built-in with Next.js): Automatic image optimization
- Target: <200KB per avatar, <2MB per memory photo

**Notifications (Phase 3+):**
- **Supabase Edge Functions** + **Web Push API**: In-app notifications
- Alternative: **OneSignal** for cross-platform push (if going mobile)

**Monitoring:**
- **Sentry**: Error tracking (critical for production)
- **PostHog** or **Plausible**: Privacy-friendly analytics

**Development Tools:**
- **Zod**: Runtime type validation for API responses
- **ESLint + Prettier**: Code quality
- **Supabase CLI**: **REQUIRED** - All database operations, migrations, local development

### Tech Stack Alternatives Considered

| Component | Alternative | Why Not Recommended |
|-----------|-------------|---------------------|
| Graph Layout | **Cytoscape.js** | More complex, slower for large DAGs |
| Graph Render | **D3.js** | Too low-level, React Flow handles interactions better |
| State | **Redux Toolkit** | Overkill for this use case, more boilerplate |
| Database | **Firebase** | Weaker graph queries, no native PostgreSQL triggers |
| Realtime | **Ably/Pusher** | Supabase Realtime is free tier-friendly and integrated |
| Build Tool | **Vite** | Next.js provides better landing page performance, built-in optimizations, easier deployment |

### Why Next.js Over Vite?

**Next.js advantages for Branches:**
1. **Landing page performance** - SSG for blazing fast initial load
2. **Image optimization** - Automatic with next/image
3. **SEO-friendly** - Server-side rendering for marketing pages
4. **API routes** - Built-in for webhook handlers
5. **File-based routing** - Intuitive, clean structure
6. **Production-ready** - Vercel deployment is seamless

**What Next.js gives you that Vite doesn't:**
- Zero-config production builds
- Automatic code splitting
- Built-in image optimization
- Server components (for future performance gains)
- Better developer experience for full-stack apps

### Why Supabase Over Custom Backend?

**Supabase gives you:**
1. **PostgreSQL with RLS built-in** - Row-level security enforced at DB level
2. **Realtime subscriptions** - No need for Socket.io or separate WebSocket server
3. **Auth with Magic Links** - GoTrue handles passwordless authentication
4. **Storage with CDN** - Automatic image hosting and delivery
5. **Edge Functions** - Deploy serverless functions (for cycle checking, notifications)
6. **Auto-generated REST API** - PostgREST gives you instant CRUD endpoints
7. **Supabase CLI** - Complete local development environment with database branching

**What you'd need to build manually:**
- Auth system with email verification
- WebSocket server for real-time sync
- S3 bucket configuration + CDN
- API layer with authorization middleware
- Database migration system

**Cost comparison:**
- Supabase Free Tier: 500MB DB, 1GB storage, 2GB bandwidth
- Custom (Vercel + Planetscale + S3): $20-50/month minimum

**Verdict:** Supabase is perfect for this project. Only switch if you exceed 50,000 users.

---

## Landing Page Design Specification

**URL:** `https://branches.app` (or your domain)

**Goal:** Convert visitors into early adopters by demonstrating the magic of Branches through interactive examples and emotional storytelling.

### Design Approach: Organic & Alive

The landing page should feel like **walking through a garden** or **forest**—natural, inviting, with subtle animations that make it feel alive. Think: **Apple-level polish** meets **nature-inspired design**.

**Key Principles:**
- Minimal text, maximum impact
- Interactive demos embedded throughout (not screenshots)
- Smooth scroll animations (parallax, fade-ins, grow effects)
- Warm, inviting color palette
- Mobile-first responsive design

---

### Landing Page Structure

#### 1. Hero Section (Above the Fold)

**Visual:**
- Full-height section with subtle animated background (think: gentle floating particles, or slowly growing tree branches)
- Center-aligned content
- **Interactive mini-tree demo** showing 3-4 animated nodes that grow/connect on page load

**Content:**
```
[Animated tree logo - grows from seed to small tree on load]

Your family tree, reimagined.

A private space where your family grows together—
beautifully visualized, always connected, infinitely personal.

[CTA Button: "Start Your Tree" (primary, warm color)]
[CTA Button: "See How It Works" (secondary, scroll to demo)]

[Scroll indicator - animated down arrow]
```

**Animations:**
- Tree logo: Grows from small sapling (0.8s spring animation)
- Headline: Fade in + slight upward movement (0.6s delay)
- Subheading: Fade in (0.9s delay)
- CTAs: Fade in + scale (1.2s delay)
- Background: Subtle particle float (continuous)

**Implementation Note:**
```tsx
// components/landing/HeroSection.tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, delay: 0.3 }}
>
  <AnimatedTreeLogo /> {/* SVG with Framer Motion path animations */}
</motion.div>
```

---

#### 2. "Watch It Grow" Interactive Demo

**Visual:**
- Full-width section with dark/contrasting background
- **Live, embedded React Flow instance** showing a family tree being built in real-time
- Automated demo: Nodes appear one by one, edges connect, tree reorganizes

**Content:**
```
Watch your family tree come to life

[Interactive embedded tree showing:
 - First node appears (You)
 - Parent nodes grow above
 - Sibling nodes branch out
 - Children nodes extend below
 - Tree auto-rearranges beautifully]

Unlike traditional family trees, Branches is alive.
Add someone new, and the tree grows organically—
no manual positioning, no messy lines.

[Small text: "This is a live demo. Try clicking a node →"]
```

**Interactive Features:**
- Auto-play animation on scroll into view
- Users can click nodes to see profile cards
- Hover shows relationship labels
- Tree smoothly rearranges when nodes are added

**Animations:**
- Staggered node appearances (spring animations)
- Smooth edge drawing (path length animation)
- Tree re-layout transitions (position changes over 0.8s)

**Implementation:**
```tsx
// Embedded React Flow instance
<ReactFlowProvider>
  <DemoTree 
    autoPlay={true}
    interactive={true}
    onNodeClick={showMockProfile}
  />
</ReactFlowProvider>
```

---

#### 3. Feature Showcase: "More Than Just a Tree"

**Visual:**
- Three-column layout (mobile: vertical stack)
- Each feature has an **interactive micro-demo**
- Soft cards with hover effects

**Features:**

**Column 1: Live Updates**
```
[Animated icon: Bell with ripple effect]

Everyone's in sync

When cousin Sarah adds her baby,
everyone sees it instantly—
no refresh needed.

[Mini demo: Two side-by-side tree views,
 showing simultaneous update]
```

**Column 2: Private Memories**
```
[Animated icon: Photo frame with fade-in images]

Stories that stick around

Attach photos and memories to any person.
Grandma's recipes. Dad's fishing trip.
Your wedding day.

[Mini demo: Profile card with scrolling
 memory feed, real photos fading in/out]
```

**Column 3: Family Chat**
```
[Animated icon: Chat bubbles appearing]

Talk where it matters

Chat one-on-one, in groups,
or with the whole family tree.

[Mini demo: Animated chat interface
 showing messages appearing]
```

**Animations:**
- Icons: Continuous subtle animations (pulse, float)
- Cards: Lift on hover (translateY + shadow)
- Demos: Auto-play on scroll into view

---

#### 4. "Beautiful by Design" Visual Section

**Visual:**
- Full-width background with gradient (earth tones)
- Large showcase of the tree visualization
- Side-by-side comparison: "Traditional tree" vs "Branches tree"

**Content:**
```
Not your grandparents' family tree

Traditional genealogy apps feel clinical.
Branches feels alive.

[Split-screen comparison:
 Left: Boring boxes-and-lines tree
 Right: Beautiful Branches tree with avatars,
       colors, smooth curves, glowing connections]

Every tree is unique, just like your family.
```

**Animations:**
- Scroll-triggered: Traditional tree fades out, Branches tree grows in
- Branches tree: Nodes gently pulse, edges have flowing particles
- Parallax effect on background

---

#### 5. "How It Works" Timeline

**Visual:**
- Vertical timeline with interactive steps
- Each step triggers an animation/demo

**Steps:**

**Step 1:** Create your tree
```
[Demo: Empty canvas → "You" node appears]
Start with yourself. Takes 30 seconds.
```

**Step 2:** Add your family
```
[Demo: Parent, sibling, child nodes grow out]
Add parents, siblings, children.
The tree arranges itself.
```

**Step 3:** Invite them in
```
[Demo: Email invite animation → Node lights up]
Send a magic link. No passwords needed.
```

**Step 4:** Watch it grow
```
[Demo: Multiple people adding nodes simultaneously]
Everyone can add their branches.
Your tree becomes a living network.
```

**Animations:**
- Scroll-triggered: Steps appear one by one
- Each demo auto-plays when in viewport
- Timeline line draws progressively

---

#### 6. Social Proof Section

**Visual:**
- Testimonial cards with user avatars (illustrated, not real photos)
- Subtle float animation on cards

**Content:**
```
Families love Branches

[Card 1]
"Finally, a family group chat that doesn't get buried.
Everything is organized by person. Game changer."
— Maria, started a tree of 47 people

[Card 2]
"My kids use it more than Instagram.
They love seeing the family tree grow."
— James, father of 3

[Card 3]
"We discovered cousins we didn't know existed.
Branches brought our family together."
— The Chen Family, 6 branches across 3 countries
```

**Animations:**
- Cards: Staggered fade-in on scroll
- Gentle floating animation (continuous)
- Hover: Slight scale + shadow increase

---

#### 7. Final CTA Section

**Visual:**
- Clean, focused section
- Animated tree growing in background (subtle, not distracting)
- Large, clear CTA

**Content:**
```
Ready to plant your tree?

[CTA Button: "Start Free Today"]

No credit card. No complexity.
Just you, your family, and a beautiful tree.

[Small links below]
Privacy Policy | Terms | Contact
```

**Animations:**
- Background tree: Slow growth animation (loop)
- CTA button: Pulse animation (gentle, inviting)
- On hover: Scale + glow effect

---

### Landing Page Technical Implementation

**File Structure:**
```
app/
  (marketing)/
    page.tsx                    # Landing page
    layout.tsx                  # Marketing layout (no auth)
    components/
      HeroSection.tsx
      InteractiveDemoSection.tsx
      FeatureShowcase.tsx
      VisualComparison.tsx
      HowItWorksTimeline.tsx
      TestimonialsSection.tsx
      FinalCTA.tsx
      AnimatedTreeLogo.tsx
      DemoTree.tsx              # Embedded React Flow demo
```

**Key Libraries for Landing Page:**
```json
{
  "dependencies": {
    "framer-motion": "^10.16.4",    // All animations
    "react-intersection-observer": "^9.5.3",  // Scroll triggers
    "react-flow-renderer": "^11.10.1",  // Interactive tree demos
    "lucide-react": "^0.294.0"      // Icons
  }
}
```

**Performance Optimizations:**
```typescript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  // Static generation for landing page
  // Will be blazing fast
}

// app/(marketing)/page.tsx
export const metadata = {
  title: 'Branches - Your Family Tree, Reimagined',
  description: 'A private, beautiful space where your family grows together.',
  openGraph: {
    images: ['/og-image.jpg'],
  }
}
```

**Scroll Animation Pattern:**
```tsx
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

export function AnimatedSection({ children }) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
    >
      {children}
    </motion.div>
  );
}
```

---

## Database Schema

### Network & Identity
```sql
-- Authenticated users (managed by Supabase Auth)
-- This table auto-syncs with auth.users via trigger
profiles
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
  email text UNIQUE
  phone text
  display_name text
  created_at timestamptz DEFAULT now()
  updated_at timestamptz DEFAULT now()

-- Distinct family tree instances
graphs
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  name text NOT NULL
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE
  created_at timestamptz DEFAULT now()

  -- Add metadata
  description text
  cover_image_url text

-- Many-to-many: users can belong to multiple trees
user_graph_memberships
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE
  graph_id uuid REFERENCES graphs(id) ON DELETE CASCADE
  role text CHECK (role IN ('admin', 'editor', 'viewer'))
  joined_at timestamptz DEFAULT now()

  UNIQUE(profile_id, graph_id) -- Prevent duplicate memberships
```

### The DAG (Core Graph Structure)
```sql
-- Individuals (nodes)
-- IMPORTANT: Nodes can exist WITHOUT being claimed by users
-- Use cases: deceased relatives, children, unclaimed family members
nodes
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  graph_id uuid REFERENCES graphs(id) ON DELETE CASCADE

  -- Identity
  first_name text NOT NULL
  last_name text
  birthdate date
  death_date date -- Track deceased members
  bio text

  -- Media
  avatar_url text

  -- Ownership (NULLABLE - not all nodes have user accounts)
  claimed_by uuid REFERENCES profiles(id) ON DELETE SET NULL

  -- Layout cache
  x float -- Cached Dagre position
  y float -- Cached Dagre position

  -- Metadata
  created_at timestamptz DEFAULT now()
  updated_at timestamptz DEFAULT now()
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL -- Who added this node

  -- Indexes for performance
  CREATE INDEX idx_nodes_graph ON nodes(graph_id)
  CREATE INDEX idx_nodes_claimed ON nodes(claimed_by) WHERE claimed_by IS NOT NULL

-- Relationships (edges)
edges
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  graph_id uuid REFERENCES graphs(id) ON DELETE CASCADE
  source_id uuid REFERENCES nodes(id) ON DELETE CASCADE
  target_id uuid REFERENCES nodes(id) ON DELETE CASCADE
  type text CHECK (type IN ('parent_child', 'partnership'))

  created_at timestamptz DEFAULT now()
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL

  -- Prevent duplicate edges
  UNIQUE(source_id, target_id, type)

  -- Indexes
  CREATE INDEX idx_edges_graph ON edges(graph_id)
  CREATE INDEX idx_edges_source ON edges(source_id)
  CREATE INDEX idx_edges_target ON edges(target_id)

-- Content attached to nodes
-- CRITICAL: Memories are scoped to a specific graph
-- This prevents cross-contamination when users are in multiple trees
memories
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  node_id uuid REFERENCES nodes(id) ON DELETE CASCADE
  graph_id uuid REFERENCES graphs(id) ON DELETE CASCADE -- ADDED: Scope to graph
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE

  -- Content
  body_text text
  media_url text
  media_type text CHECK (media_type IN ('image', 'video', 'audio'))

  -- Engagement
  created_at timestamptz DEFAULT now()

  -- Indexes
  CREATE INDEX idx_memories_node ON memories(node_id)
  CREATE INDEX idx_memories_graph ON memories(graph_id) -- ADDED: Query by graph
  CREATE INDEX idx_memories_author ON memories(author_id) -- ADDED: Query by author
  CREATE INDEX idx_memories_created ON memories(created_at DESC)

  -- Constraint: Ensure node and memory are in same graph
  CONSTRAINT check_memory_graph_consistency CHECK (
    graph_id = (SELECT graph_id FROM nodes WHERE id = node_id)
  )
```

### Real-Time Chat
```sql
-- Chat rooms: 1-on-1, group, OR whole-tree conversations
conversations
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  graph_id uuid REFERENCES graphs(id) ON DELETE CASCADE

  -- Type determines scope
  type text CHECK (type IN ('direct', 'group', 'tree')) NOT NULL

  -- Metadata
  title text -- Required for groups, auto-generated for direct chats

  -- Tree-level chats: All graph members auto-included
  -- Group chats: Specific members via conversation_participants
  -- Direct chats: Exactly 2 participants

  created_at timestamptz DEFAULT now()
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL

  CREATE INDEX idx_conversations_graph ON conversations(graph_id)
  CREATE INDEX idx_conversations_type ON conversations(type)

-- Membership roster
-- For 'direct' and 'group' types only
-- Tree-level chats don't use this table (all graph members implied)
conversation_participants
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE

  joined_at timestamptz DEFAULT now()

  UNIQUE(conversation_id, profile_id)

  CREATE INDEX idx_conv_participants_conv ON conversation_participants(conversation_id)
  CREATE INDEX idx_conv_participants_profile ON conversation_participants(profile_id)

-- Messages
messages
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE

  -- Content
  body text NOT NULL
  media_url text
  media_type text CHECK (media_type IN ('image', 'video', 'file'))

  -- Metadata
  created_at timestamptz DEFAULT now()
  updated_at timestamptz DEFAULT now()
  edited boolean DEFAULT false
  deleted boolean DEFAULT false

  CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC)
  CREATE INDEX idx_messages_sender ON messages(sender_id)

-- Read receipts
message_reads
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE
  reader_id uuid REFERENCES profiles(id) ON DELETE CASCADE
  read_at timestamptz DEFAULT now()

  UNIQUE(message_id, reader_id)

  CREATE INDEX idx_message_reads_message ON message_reads(message_id)
  CREATE INDEX idx_message_reads_reader ON message_reads(reader_id)
```

### Invitations
```sql
-- Invite system: Anyone in the tree can invite others
invites
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  graph_id uuid REFERENCES graphs(id) ON DELETE CASCADE
  node_id uuid REFERENCES nodes(id) ON DELETE CASCADE -- Pre-created node they'll claim

  -- Invite metadata
  invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL
  email text -- Can be null if inviting via link
  phone text
  token text UNIQUE NOT NULL -- Secure random token for magic link

  -- State
  status text CHECK (status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending'
  expires_at timestamptz DEFAULT (now() + interval '7 days')

  created_at timestamptz DEFAULT now()
  accepted_at timestamptz

  CREATE INDEX idx_invites_token ON invites(token)
  CREATE INDEX idx_invites_graph ON invites(graph_id)
  CREATE INDEX idx_invites_email ON invites(email)
  CREATE INDEX idx_invites_status ON invites(status)
```

---

## Tree Visualization: Beautiful, Not Basic

**CRITICAL:** The tree visualization is the heart of Branches. It must be **stunning, organic, and alive**—not a generic node-and-line graph.

### Design Vision

Think of a real tree in nature:
- **Trunk:** Strong, central, grounding (root ancestor)
- **Branches:** Organic curves, not straight lines (parent-child relationships)
- **Leaves:** Individual nodes with character (family members)
- **Growth:** New branches extend naturally (new members)
- **Seasons:** Subtle animations suggest life (gentle sway, pulse)

**Visual Characteristics:**
1. **Organic Edges:** Smooth Bézier curves, not straight lines
2. **Natural Node Styling:** Circular avatars with soft shadows, subtle borders
3. **Depth & Hierarchy:** Visual weight for generations (older = larger/more prominent)
4. **Color & Life:** Living members in color, departed in sepia/grayscale
5. **Animations:** Gentle pulse on active nodes, smooth growth for new additions

### Custom React Flow Styling

```tsx
// components/tree/CustomNode.tsx
import { motion } from 'framer-motion';
import { Handle, Position } from 'reactflow';
import Image from 'next/image';

interface CustomNodeProps {
  data: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    birthYear?: number;
    isAlive: boolean;
    isClaimed: boolean;
  };
  selected: boolean;
}

export function CustomNode({ data, selected }: CustomNodeProps) {
  return (
    <motion.div
      className={`
        relative rounded-full
        ${data.isAlive ? 'ring-2 ring-leaf' : 'ring-2 ring-stone grayscale'}
        ${selected ? 'ring-4 ring-sunrise shadow-xl' : 'shadow-lg'}
        transition-all duration-300
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Avatar */}
      <div className="w-16 h-16 rounded-full overflow-hidden bg-stone">
        {data.avatarUrl ? (
          <Image
            src={data.avatarUrl}
            alt={`${data.firstName} ${data.lastName}`}
            width={64}
            height={64}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-moss to-leaf text-white font-semibold text-xl">
            {data.firstName[0]}{data.lastName?.[0]}
          </div>
        )}
      </div>

      {/* Name label (on hover or always show) */}
      <motion.div
        className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-white px-3 py-1 rounded-full shadow-md text-sm"
        initial={{ opacity: 0, y: -10 }}
        whileHover={{ opacity: 1, y: 0 }}
      >
        {data.firstName} {data.lastName}
      </motion.div>

      {/* Unclaimed indicator */}
      {!data.isClaimed && (
        <motion.div
          className="absolute -top-1 -right-1 w-4 h-4 bg-sunrise rounded-full border-2 border-white"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}

      {/* Connection handles */}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </motion.div>
  );
}
```

### Custom Edge Styling (Organic Curves)

```tsx
// components/tree/CustomEdge.tsx
import { getBezierPath, EdgeProps } from 'reactflow';
import { motion } from 'framer-motion';

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <g>
      {/* Background glow */}
      <motion.path
        d={edgePath}
        fill="none"
        stroke="rgba(139, 157, 119, 0.2)"
        strokeWidth={8}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />
      
      {/* Main branch line */}
      <motion.path
        d={edgePath}
        fill="none"
        stroke="#8B9D77"
        strokeWidth={3}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />

      {/* Animated particles flowing along edge */}
      <motion.circle
        r={3}
        fill="#A8C090"
        initial={{ offsetDistance: '0%' }}
        animate={{ offsetDistance: '100%' }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      >
        <animateMotion dur="3s" repeatCount="indefinite">
          <mpath href={`#${id}`} />
        </animateMotion>
      </motion.circle>
    </g>
  );
}
```

### Zoom Levels & Semantic Visualization

```typescript
// utils/treeVisualization.ts

export enum ZoomLevel {
  CONSTELLATION = 'constellation',  // < 0.3 zoom - Just glowing dots
  OVERVIEW = 'overview',            // 0.3 - 0.6 - Small avatars
  DETAILED = 'detailed',            // 0.6 - 1.2 - Full cards
  INTIMATE = 'intimate',            // > 1.2 - Expanded profiles
}

export function getNodeComponent(zoomLevel: ZoomLevel) {
  switch (zoomLevel) {
    case ZoomLevel.CONSTELLATION:
      return ConstellationNode;  // Just a pulsing dot
    case ZoomLevel.OVERVIEW:
      return OverviewNode;       // Small avatar, no text
    case ZoomLevel.DETAILED:
      return DetailedNode;       // Avatar + name + year
    case ZoomLevel.INTIMATE:
      return IntimateNode;       // Full card with bio snippet
  }
}

// Example: Constellation node (far zoom out)
function ConstellationNode({ data }) {
  return (
    <motion.div
      className="w-3 h-3 rounded-full bg-leaf shadow-lg"
      animate={{
        opacity: [0.6, 1, 0.6],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}
```

### Interactive Features

**On Node Hover:**
```typescript
// Subtle elevation + glow
transform: translateY(-4px);
box-shadow: 0 20px 40px rgba(139, 157, 119, 0.3);
```

**On Node Click:**
```typescript
// Open profile sidebar (slide in from right)
// Show: Full bio, memories feed, relationships
// Actions: Edit, Add child, Add partner, Message
```

**On Node Drag:**
```typescript
// Temporary manual positioning (saved to DB)
// Other users see smooth transition to new position
// Tree re-layout respects manual placements
```

**Multi-Select Mode:**
```typescript
// Hold Shift + click multiple nodes
// Actions: Create group chat, Export GEDCOM, Move to different branch
```

### Performance Optimizations

```typescript
// Only render visible nodes (viewport culling)
const visibleNodes = nodes.filter(node => 
  isInViewport(node, viewport, zoom)
);

// LOD (Level of Detail) based on zoom
const nodeComponent = useMemo(() => 
  getNodeComponent(getCurrentZoomLevel(zoom)),
  [zoom]
);

// Memoize expensive calculations
const layoutedNodes = useMemo(() => 
  calculateDagreLayout(nodes, edges),
  [nodes, edges]
);
```

---

## Application Routes & Navigation

### Route Structure (Next.js App Router)

```
app/
  (marketing)/
    page.tsx                    # Landing page
    about/page.tsx
    privacy/page.tsx
    terms/page.tsx
    layout.tsx                  # Public layout
  
  (auth)/
    login/page.tsx              # Magic link login
    verify/page.tsx             # Email verification
    layout.tsx                  # Auth layout
  
  (app)/
    layout.tsx                  # App layout (with sidebar, auth required)
    dashboard/page.tsx          # Graph selector
    [graphId]/
      page.tsx                  # Tree visualization (main app)
      settings/page.tsx         # Graph settings
      members/page.tsx          # Member management
      invites/page.tsx          # Invite new members
      memories/page.tsx         # Memory feed
      chat/
        page.tsx                # Chat list
        [conversationId]/page.tsx  # Chat thread
    
    profile/page.tsx            # User profile settings
    
  api/
    webhooks/
      supabase/route.ts         # Supabase webhooks
```

### Navigation UX

**Primary Navigation (App Layout):**
```tsx
// app/(app)/layout.tsx
<Sidebar>
  {/* Tree Selector (if multiple graphs) */}
  <TreeDropdown currentGraph={currentGraph} />
  
  {/* Main navigation */}
  <NavItem icon={TreeIcon} href={`/${graphId}`}>Tree View</NavItem>
  <NavItem icon={MessageCircleIcon} href={`/${graphId}/chat`}>Chat</NavItem>
  <NavItem icon={ImageIcon} href={`/${graphId}/memories`}>Memories</NavItem>
  <NavItem icon={UsersIcon} href={`/${graphId}/members`}>Members</NavItem>
  
  {/* Bottom actions */}
  <NavItem icon={SettingsIcon} href={`/${graphId}/settings`}>Settings</NavItem>
  <NavItem icon={UserIcon} href="/profile">My Profile</NavItem>
</Sidebar>
```

**Fluid Transitions:**
```typescript
// Every route change should feel smooth
// Use Framer Motion's AnimatePresence

<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.25 }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

---

## Phase 1: Core Graph CRUD & Visualization (Weeks 1-3)

**Goal:** Users can create a family tree, add nodes, and see the beautiful visualization.

### Week 1: Project Setup & Database

**Supabase Setup (Using Supabase CLI):**
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase project
supabase init

# Start local Supabase (includes PostgreSQL, Auth, Storage, Realtime)
supabase start

# This gives you:
# - Local PostgreSQL: postgresql://postgres:postgres@localhost:54322/postgres
# - Studio UI: http://localhost:54323
# - API URL: http://localhost:54321
# - Anon key: (shown in terminal)

# Create first migration
supabase migration new initial_schema

# Edit supabase/migrations/TIMESTAMP_initial_schema.sql
# (Add all schema from Database Schema section above)

# Apply migration locally
supabase db reset

# When ready to deploy to production
supabase link --project-ref your-project-ref
supabase db push
```

**Next.js Setup:**
```bash
# Create Next.js project with TypeScript
npx create-next-app@latest branches --typescript --tailwind --app --src-dir

# Install dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install zustand
npm install reactflow
npm install dagre @types/dagre
npm install framer-motion
npm install react-hook-form zod @hookform/resolvers
npm install lucide-react
npm install date-fns

# Dev dependencies
npm install -D @types/node
npm install -D prettier eslint-config-prettier
npm install -D @playwright/test
```

**Environment Setup:**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key

# For production (add to Vercel)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Database Schema Implementation:**

Create migration file:
```bash
supabase migration new core_schema
```

Add to `supabase/migrations/YYYYMMDDHHMMSS_core_schema.sql`:
```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (syncs with auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  phone TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Graphs table
CREATE TABLE graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-graph memberships
CREATE TABLE user_graph_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  graph_id UUID REFERENCES graphs(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'editor',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, graph_id)
);

-- Nodes (individuals in tree)
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES graphs(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  birthdate DATE,
  death_date DATE,
  bio TEXT,
  avatar_url TEXT,
  claimed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  x FLOAT,
  y FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_nodes_graph ON nodes(graph_id);
CREATE INDEX idx_nodes_claimed ON nodes(claimed_by) WHERE claimed_by IS NOT NULL;

-- Edges (relationships)
CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES graphs(id) ON DELETE CASCADE,
  source_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  target_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('parent_child', 'partnership')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(source_id, target_id, type)
);

CREATE INDEX idx_edges_graph ON edges(graph_id);
CREATE INDEX idx_edges_source ON edges(source_id);
CREATE INDEX idx_edges_target ON edges(target_id);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_graph_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, update their own
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Graphs: Only members can view
CREATE POLICY "Graphs viewable by members"
  ON graphs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_graph_memberships
      WHERE graph_id = graphs.id
      AND profile_id = auth.uid()
    )
  );

-- Users can create new graphs
CREATE POLICY "Users can create graphs"
  ON graphs FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Admins can update/delete their graphs
CREATE POLICY "Admins can modify graphs"
  ON graphs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_graph_memberships
      WHERE graph_id = graphs.id
      AND profile_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Nodes: Viewable by graph members
CREATE POLICY "Nodes viewable by graph members"
  ON nodes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_graph_memberships
      WHERE graph_id = nodes.graph_id
      AND profile_id = auth.uid()
    )
  );

-- Editors can create nodes
CREATE POLICY "Editors can create nodes"
  ON nodes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_graph_memberships
      WHERE graph_id = nodes.graph_id
      AND profile_id = auth.uid()
      AND role IN ('admin', 'editor')
    )
  );

-- Editors can update nodes
CREATE POLICY "Editors can update nodes"
  ON nodes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_graph_memberships
      WHERE graph_id = nodes.graph_id
      AND profile_id = auth.uid()
      AND role IN ('admin', 'editor')
    )
  );

-- Edges: Same policies as nodes
CREATE POLICY "Edges viewable by graph members"
  ON edges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_graph_memberships
      WHERE graph_id = edges.graph_id
      AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create edges"
  ON edges FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_graph_memberships
      WHERE graph_id = edges.graph_id
      AND profile_id = auth.uid()
      AND role IN ('admin', 'editor')
    )
  );
```

Apply migration:
```bash
supabase db reset  # Applies all migrations
```

### Week 2: Authentication & Basic UI

**Supabase Auth Setup:**
```typescript
// lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function createClient() {
  return createClientComponentClient();
}

// lib/supabase/server.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export function createServerClient() {
  return createServerComponentClient({ cookies });
}
```

**Magic Link Login:**
```tsx
// app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone to-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full"
      >
        <h1 className="text-3xl font-semibold text-earth mb-2">
          Welcome to Branches
        </h1>
        <p className="text-gray-600 mb-8">
          Enter your email to get started
        </p>

        {!sent ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-lg border border-stone focus:outline-none focus:ring-2 focus:ring-moss"
              required
            />
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full bg-moss text-white py-3 rounded-lg font-medium hover:bg-bark transition-colors"
            >
              Send Magic Link
            </motion.button>
          </form>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center p-6 bg-leaf/10 rounded-lg"
          >
            <p className="text-lg text-earth">
              Check your email! 📧
            </p>
            <p className="text-sm text-gray-600 mt-2">
              We sent a magic link to {email}
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
```

**Dashboard (Graph Selector):**
```tsx
// app/(app)/dashboard/page.tsx
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GraphCard } from '@/components/dashboard/GraphCard';
import { CreateGraphButton } from '@/components/dashboard/CreateGraphButton';

export default async function DashboardPage() {
  const supabase = createServerClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: memberships } = await supabase
    .from('user_graph_memberships')
    .select('*, graphs(*)')
    .eq('profile_id', session.user.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone/30 to-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-semibold text-earth mb-2">
          Your Family Trees
        </h1>
        <p className="text-gray-600 mb-8">
          Select a tree to view or create a new one
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memberships?.map((membership) => (
            <GraphCard
              key={membership.id}
              graph={membership.graphs}
              role={membership.role}
            />
          ))}
          
          <CreateGraphButton />
        </div>
      </div>
    </div>
  );
}
```

### Week 3: Tree Visualization

**State Management (Zustand):**
```typescript
// stores/treeStore.ts
import { create } from 'zustand';
import { Node, Edge } from 'reactflow';

interface TreeState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: string | null;
  
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNode: (id: string | null) => void;
  
  addNode: (node: Node) => void;
  updateNode: (id: string, data: Partial<Node['data']>) => void;
  deleteNode: (id: string) => void;
  
  addEdge: (edge: Edge) => void;
  deleteEdge: (id: string) => void;
}

export const useTreeStore = create<TreeState>((set) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (id) => set({ selectedNode: id }),
  
  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, node]
  })),
  
  updateNode: (id, data) => set((state) => ({
    nodes: state.nodes.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, ...data } } : node
    )
  })),
  
  deleteNode: (id) => set((state) => ({
    nodes: state.nodes.filter((node) => node.id !== id),
    edges: state.edges.filter((edge) => 
      edge.source !== id && edge.target !== id
    )
  })),
  
  addEdge: (edge) => set((state) => ({
    edges: [...state.edges, edge]
  })),
  
  deleteEdge: (id) => set((state) => ({
    edges: state.edges.filter((edge) => edge.id !== id)
  })),
}));
```

**Dagre Layout Utility:**
```typescript
// utils/dagreLayout.ts
import dagre from 'dagre';
import { Node, Edge } from 'reactflow';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
) {
  const nodeWidth = 80;
  const nodeHeight = 80;

  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: 100,  // Vertical spacing between generations
    nodesep: 60,   // Horizontal spacing between siblings
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
```

**Main Tree View:**
```tsx
// app/(app)/[graphId]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { createClient } from '@/lib/supabase/client';
import { getLayoutedElements } from '@/utils/dagreLayout';
import { CustomNode } from '@/components/tree/CustomNode';
import { CustomEdge } from '@/components/tree/CustomEdge';
import { NodeDetailSidebar } from '@/components/tree/NodeDetailSidebar';
import { AddNodeToolbar } from '@/components/tree/AddNodeToolbar';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

export default function TreePage({ params }: { params: { graphId: string } }) {
  const supabase = createClient();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Load graph data
  useEffect(() => {
    loadGraphData();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel(`graph:${params.graphId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nodes',
          filter: `graph_id=eq.${params.graphId}`,
        },
        () => loadGraphData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'edges',
          filter: `graph_id=eq.${params.graphId}`,
        },
        () => loadGraphData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.graphId]);

  async function loadGraphData() {
    // Fetch nodes
    const { data: nodesData } = await supabase
      .from('nodes')
      .select('*')
      .eq('graph_id', params.graphId);

    // Fetch edges
    const { data: edgesData } = await supabase
      .from('edges')
      .select('*')
      .eq('graph_id', params.graphId);

    if (!nodesData || !edgesData) return;

    // Convert to React Flow format
    const flowNodes = nodesData.map((node) => ({
      id: node.id,
      type: 'custom',
      data: {
        firstName: node.first_name,
        lastName: node.last_name,
        avatarUrl: node.avatar_url,
        birthYear: node.birthdate ? new Date(node.birthdate).getFullYear() : null,
        isAlive: !node.death_date,
        isClaimed: !!node.claimed_by,
      },
      position: { x: node.x || 0, y: node.y || 0 },
    }));

    const flowEdges = edgesData.map((edge) => ({
      id: edge.id,
      source: edge.source_id,
      target: edge.target_id,
      type: 'custom',
      data: { type: edge.type },
    }));

    // Apply Dagre layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      flowNodes,
      flowEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }

  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNode(node.id);
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge = {
        ...connection,
        type: 'custom',
      };
      setEdges((eds) => addEdge(newEdge, eds));
      
      // Save to database
      saveEdge(connection);
    },
    [setEdges]
  );

  async function saveEdge(connection: Connection) {
    await supabase.from('edges').insert({
      graph_id: params.graphId,
      source_id: connection.source,
      target_id: connection.target,
      type: 'parent_child', // Default type
    });
  }

  return (
    <div className="h-screen w-full bg-gradient-to-br from-stone/20 via-white to-leaf/10">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultEdgeOptions={{
          animated: false,
          style: { stroke: '#8B9D77' },
        }}
      >
        <Background color="#E8E4DF" gap={16} />
        <Controls className="bg-white/90 backdrop-blur border-stone" />
        <MiniMap
          nodeColor={(node) => {
            return node.data.isAlive ? '#A8C090' : '#E8E4DF';
          }}
          className="bg-white/90 backdrop-blur border-stone"
        />
      </ReactFlow>

      {/* Floating toolbar */}
      <AddNodeToolbar graphId={params.graphId} />

      {/* Node details sidebar */}
      {selectedNode && (
        <NodeDetailSidebar
          nodeId={selectedNode}
          graphId={params.graphId}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
```

---

## Phase 2: Realtime Collaboration & Chat (Weeks 4-6)

### Realtime Updates

**Subscribe to Graph Changes:**
```typescript
// hooks/useRealtimeGraph.ts
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useRealtimeGraph(graphId: string, onUpdate: () => void) {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`graph:${graphId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nodes',
          filter: `graph_id=eq.${graphId}`,
        },
        (payload) => {
          console.log('Node changed:', payload);
          onUpdate();
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
          console.log('Edge changed:', payload);
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [graphId, onUpdate]);
}
```

### Chat Implementation

**Chat Interface:**
```tsx
// app/(app)/[graphId]/chat/[conversationId]/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  profiles: {
    display_name: string;
    avatar_url: string;
  };
}

export default function ChatPage({
  params,
}: {
  params: { graphId: string; conversationId: string };
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    getCurrentUser();
    subscribeToMessages();
  }, [params.conversationId]);

  async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  }

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(display_name, avatar_url)')
      .eq('conversation_id', params.conversationId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
    scrollToBottom();
  }

  function subscribeToMessages() {
    const channel = supabase
      .channel(`conversation:${params.conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${params.conversationId}`,
        },
        async (payload) => {
          // Fetch full message with profile data
          const { data } = await supabase
            .from('messages')
            .select('*, profiles(display_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await supabase.from('messages').insert({
      conversation_id: params.conversationId,
      sender_id: currentUserId,
      body: newMessage.trim(),
    });

    setNewMessage('');
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-stone/10 to-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const isOwn = message.sender_id === currentUserId;
            
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-md px-4 py-2 rounded-2xl
                    ${isOwn 
                      ? 'bg-moss text-white rounded-br-sm' 
                      : 'bg-stone text-earth rounded-bl-sm'
                    }
                  `}
                >
                  {!isOwn && (
                    <p className="text-xs text-gray-600 mb-1">
                      {message.profiles.display_name}
                    </p>
                  )}
                  <p>{message.body}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="border-t border-stone bg-white p-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-full border border-stone focus:outline-none focus:ring-2 focus:ring-moss"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="bg-moss text-white p-3 rounded-full hover:bg-bark transition-colors"
          >
            <Send size={20} />
          </motion.button>
        </div>
      </form>
    </div>
  );
}
```

---

## Phase 3: Memories & Media (Weeks 7-8)

**Memory Feed:**
```tsx
// components/memories/MemoryFeed.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Heart, MessageCircle } from 'lucide-react';

interface Memory {
  id: string;
  body_text: string;
  media_url: string | null;
  created_at: string;
  author_id: string;
  node_id: string;
  profiles: {
    display_name: string;
    avatar_url: string;
  };
  nodes: {
    first_name: string;
    last_name: string;
  };
}

export function MemoryFeed({ graphId }: { graphId: string }) {
  const supabase = createClient();
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    loadMemories();
    subscribeToMemories();
  }, [graphId]);

  async function loadMemories() {
    const { data } = await supabase
      .from('memories')
      .select(`
        *,
        profiles(display_name, avatar_url),
        nodes(first_name, last_name)
      `)
      .eq('graph_id', graphId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setMemories(data);
  }

  function subscribeToMemories() {
    const channel = supabase
      .channel(`memories:${graphId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'memories',
          filter: `graph_id=eq.${graphId}`,
        },
        () => loadMemories()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {memories.map((memory, index) => (
        <motion.article
          key={memory.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
        >
          {/* Header */}
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-moss">
              {memory.profiles.avatar_url ? (
                <Image
                  src={memory.profiles.avatar_url}
                  alt={memory.profiles.display_name}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                  {memory.profiles.display_name[0]}
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-earth">
                {memory.profiles.display_name}
              </p>
              <p className="text-sm text-gray-500">
                shared a memory about{' '}
                <span className="font-medium">
                  {memory.nodes.first_name} {memory.nodes.last_name}
                </span>
              </p>
            </div>
          </div>

          {/* Image */}
          {memory.media_url && (
            <div className="relative aspect-video">
              <Image
                src={memory.media_url}
                alt="Memory"
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Body */}
          <div className="p-4">
            <p className="text-earth leading-relaxed">{memory.body_text}</p>
            <p className="text-sm text-gray-500 mt-2">
              {new Date(memory.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Actions */}
          <div className="px-4 pb-4 flex gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 text-gray-600 hover:text-moss transition-colors"
            >
              <Heart size={20} />
              <span className="text-sm">Like</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 text-gray-600 hover:text-moss transition-colors"
            >
              <MessageCircle size={20} />
              <span className="text-sm">Comment</span>
            </motion.button>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
```

---

## Deployment Guide

### Using Supabase CLI for Production

**1. Link to Production Project:**
```bash
# Link local project to Supabase cloud
supabase link --project-ref your-production-ref

# Get your project ref from Supabase dashboard
# Settings > General > Reference ID
```

**2. Push Database Changes:**
```bash
# Push all migrations to production
supabase db push

# Or reset production database (CAUTION: destroys data)
supabase db reset --db-url postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-REF].supabase.co:5432/postgres
```

**3. Deploy Edge Functions:**
```bash
# If you have edge functions
supabase functions deploy function-name

# Deploy all functions
supabase functions deploy
```

**4. Vercel Deployment:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY (for admin operations)
```

### CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Deploy Database Migrations
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Network Growth** | 10 nodes added per originator | Average edges created |
| **Activation Rate** | 60% of invited users claim nodes | Conversion from invite click → profile completion |
| **Retention** | 40% weekly active | Users who log in 1x/week |
| **Engagement** | 3 memories posted per week | Median posts per active graph |
| **Performance** | < 2s initial load | Lighthouse score > 90 |
| **Animation Smoothness** | 60fps animations | Frame rate monitoring |

---

## Quick Start for Developers

```bash
# 1. Clone repo
git clone <repo-url>
cd branches

# 2. Install dependencies
npm install

# 3. Install Supabase CLI
npm install -g supabase

# 4. Start local Supabase
supabase init
supabase start

# 5. Apply migrations
supabase db reset

# 6. Configure environment
cp .env.example .env.local
# Add Supabase credentials from terminal output

# 7. Run Next.js dev server
npm run dev

# 8. Open browser
# Landing page: http://localhost:3000
# App: http://localhost:3000/dashboard
# Supabase Studio: http://localhost:54323
```

**First Task:** Implement landing page with interactive demos, then Phase 1 core graph CRUD + visualization.

---

## Additional Notes

- **Privacy First:** All graphs are private by default. No public search or discovery.
- **No Friend Requests:** You're either in the tree (invited) or you're not.
- **Data Portability:** Users can export their graph as JSON (Phase 4 feature).
- **Conflict Resolution:** Last-write-wins for node edits. Use `updated_at` timestamps.
- **Tree Merging:** Out of scope for MVP. When two families connect via marriage, they remain separate graphs. Users can be members of both.
- **Accessibility:** WCAG 2.1 AA compliant. Keyboard navigation, screen reader support, high contrast mode.
- **Mobile Experience:** Fully responsive. Tree view optimized for touch (pinch-to-zoom, pan gestures).

---

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [React Flow Docs](https://reactflow.dev/)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Dagre Wiki](https://github.com/dagrejs/dagre/wiki)
- [Tailwind CSS](https://tailwindcss.com/docs)
