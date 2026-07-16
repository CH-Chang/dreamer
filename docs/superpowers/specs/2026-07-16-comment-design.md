# Comment System Design

## Overview

Add a two-level nested comment system to the dream detail page. Comments can be attached to a dream or to individual media items (videos/comics). A merge/separate toggle controls how they display.

## Mention Flow

When saving a comment:
1. User types `@` + selects a name from dropdown
2. `@DisplayName` is inserted into content text
3. Before save, parse content for `@DisplayName` patterns, match against known thread participants, extract their emails
4. Store matched emails in `mentions` JSON array
5. On render, regex-replace `@DisplayName` with a styled link span

## Data Model

```
Comment {
  id: string            // UUID
  dream_id: string      // parent dream ID (for easy bulk query)
  target_type: 'dream' | 'video' | 'comic'
  target_id: string     // dream.id, video.id, or comic.id
  email: string         // author email
  content: string       // plain text with @username for mentions
  parent_id: string | null // null = root, non-null = reply to root
  mentions: string[]    // JSON array of mentioned user emails (future notification hook)
  created_at: string    // ISO 8601
  updated_at: string
}
```

## Sheet Schema

Sheet name: `comments`

Columns: `id, dream_id, target_type, target_id, email, content, parent_id, mentions, created_at, updated_at`

`mentions` stored as JSON string array. No relational integrity enforced at sheet level.

## Nesting Rules

- Max 2 levels: root comments (level 1) and replies to root (level 2)
- Only root comments show a reply button
- No reply-to-reply (clicking reply on a level 2 does nothing / no button shown)
- Replies display indented under their parent root comment, sorted by created_at ASC

## Storage & Query

### Repository: `ICommentRepository`

- `findByDreamId(dreamId: string): Promise<Comment[]>` — fetch all comments for a dream (used in merged mode, also used to build participant list for @mentions)
- `findByTarget(targetType: string, targetId: string): Promise<Comment[]>` — fetch comments for a specific target (used in separate mode)
- `create(input: CreateCommentInput): Promise<Comment>` — generate UUID, append sheet row, insert into AlaSQL
- `update(id: string, data: Partial<Comment>): Promise<Comment>` — edit content (no editing of other fields)
- `delete(id: string): Promise<void>` — soft delete (set content to '[deleted]', clear email to preserve privacy). Keep in DB so child replies remain structurally valid. Replies under a deleted root still render normally.

Added to repository factory as `getCommentRepository()`.

### AlaSQL

Add `'comments'` to `SHEET_NAMES` in `alaSqlService.ts`.

## UI Components

### CommentSection

Container component placed at bottom of DreamDetailPage.

- **Toggle**: "全部留言" | "按媒體分類" — controls display mode
- **Merged mode**: single CommentList with all comments sorted by created_at ASC
- **Separate mode**: dream-level CommentList, then each video/comic media block followed by its own CommentList
- Passes `dreamId` to `CommentService` for data fetching

### CommentList

Props: `comments: Comment[]`

- Groups comments by parent_id (root vs replies)
- Renders each root CommentItem with its children indented below
- Returns empty state if no comments

### CommentItem

Props: `comment, dreamId, onReply`

- Displays: avatar (if available), author name, relative timestamp, content
- Content rendering: parse `@username` with regex, wrap matches in `<span class="text-blue-400">` link (no action on click, just visual highlight)
- If `comment.email === currentUser.email`, show edit/delete actions
- Root comments show a "回覆" button that opens CommentForm in reply mode
- If content === '[deleted]', show "[已刪除]" in muted style

### CommentForm

Props: `dreamId, targetType, targetId, parentId?, onSubmit, onCancel`

- Textarea with `@` autocomplete
- On typing `@`, query unique emails from already-fetched comments for this dream
- Show dropdown sorted by most recent participant
- On select, insert `@displayName` into textarea
- Submit button → calls `CommentRepository.create()`
- Clear form on successful submit

## Integration

### DreamDetailPage

- Import `CommentSection`
- Place `<CommentSection dreamId={dream.id} />` after `<DreamMediaFeed />`

### DreamMediaFeed

- In separate mode, after each media item (VideoPlayer / ComicViewer), render its CommentList
- CommentList receives comments filtered to that target_type + target_id

### CommentService (new)

Lightweight service that:
- Calls CommentRepository
- Parses `@mentions` from content before saving (extract emails of mentioned users)
- No notification logic yet — just stores mentions array

## Future Hooks

- `mentions` field on Comment contains emails — future notification system can query unsent mentions
- Feed danmaku / bullet comments deferred
- Feed comment count and preview deferred

## Out of Scope (v1)

- Feed integration (comment count, preview)
- Notifications
- Edit history
- Rich text / markdown in comments
- Reactions / likes
- Report / moderation
