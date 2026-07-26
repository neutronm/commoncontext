export type ObjectType =
  | 'decision' | 'perspective' | 'task'
  | 'blocker' | 'open_question' | 'source_document';

export type EpistemicStatus =
  | 'verified_fact' | 'reported_fact' | 'perspective' | 'proposal';

export type LifecycleStatus = 'pending' | 'active' | 'superseded' | 'revoked';
export type Visibility = 'private' | 'shared';   // derived, never stored
export type Origin = 'seed' | 'assistant' | 'web';
export type Stance = 'acknowledged' | 'accepted' | 'disputed' | 'rejected';

export interface ParticipantResponseView {
  displayName: string;          // "Sara"
  stance: Stance;
  responseText: string | null;
  createdAt: string;            // ISO 8601
}

export interface ContextObjectView {
  id: string;
  text: string;
  type: ObjectType;
  epistemicStatus: EpistemicStatus;
  lifecycleStatus: LifecycleStatus;
  visibility: Visibility;
  origin: Origin;
  authorName: string;           // "Fred"
  ownerName: string;
  audienceNames: string[];      // ["Fred","Sara"]
  sourceReference: string | null;
  supersedesText: string | null;
  responses: ParticipantResponseView[];
  createdAt: string;
}

export interface ContextBundle {
  workspace: string;
  viewer: string;
  participants: string[];       // ["Fred","Sara"] — every member, fixed order
  agreed: ContextObjectView[];
  perspectives: ContextObjectView[];
  unresolved: ContextObjectView[];
  disputed: ContextObjectView[];
  openQuestions: ContextObjectView[];
  blockers: ContextObjectView[];
  sources: ContextObjectView[];
}

export interface Caller { userId: string; displayName: string; workspaceId: string; }
