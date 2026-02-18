# Tree-Based Memory System (Technical Spec)

## Terminology
- Product term: **Tree**
- Existing schema term: **Graph** (`graphs`, `user_graph_memberships`)

## Data Model

### Existing entities
- `profiles`: user metadata
- `graphs`: shared tree/container
- `user_graph_memberships`: user membership + role per tree
- `nodes`: person nodes in tree hierarchy (optional `claimed_by` user)
- `memories`: memory records scoped to exactly one tree (`graph_id`)

### New entity
- `memory_subjects`
  - `memory_id -> memories.id`
  - `subject_user_id -> profiles.id`
  - `tagged_by -> profiles.id`
  - unique `(memory_id, subject_user_id)`

### Ownership and context
- Author is `memories.author_id`
- Tagged subjects are `memory_subjects.subject_user_id` (N subjects per memory)
- Each memory belongs to one tree via `memories.graph_id`

## Security / RLS
- `memory_subjects` select: tree members only (via `memories.graph_id`)
- `memory_subjects` insert/delete: memory author only
- subject tagging allowed only when subject is a member of same tree

## Write Path
- New RPC: `create_memory_with_subjects(...)`
  - validates auth
  - validates tree membership
  - validates node belongs to tree (if supplied)
  - validates at least one subject
  - validates each subject is a tree member
  - inserts into `memories` + `memory_subjects` in one transaction

## Feed Requirements Mapping

### Tree-level feed
- Source: `memories where graph_id = :treeId`
- Enriched with:
  - author name (`profiles`)
  - subject names (`memory_subjects + profiles`)

### Dashboard base feed
- Source: all `memories` across viewer memberships
- Label each item with source tree (`graphs.name`)

### Node sidebar preview
- Source: recent memories in current tree where:
  - tagged subject = selected node’s claimed user, and/or
  - `memories.node_id = selected_node_id` (fallback for unclaimed nodes)

### Global profile view
- Route: `/profile/[userId]`
- Source: memories tagged to `userId` across shared trees only:
  - trees returned by subject memberships visible to viewer
  - filtered by `memory_subjects.subject_user_id = userId`

## UI Entry Points
- Tree node sidebar: **Create Memory** button in `NodeDetailSidebar`
- Tree memories page: existing **Add Memory** button
- Both use shared `CreateMemoryModal` with subject tag selection
