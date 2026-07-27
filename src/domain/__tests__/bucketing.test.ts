import { describe, expect, it } from 'vitest';

import { bucketContext } from '../context';
import type { ContextObjectView } from '../types';

const baseObject: ContextObjectView = {
  id: 'context-id',
  text: 'Fred owns the pricing page copy.',
  type: 'task',
  epistemicStatus: 'reported_fact',
  lifecycleStatus: 'active',
  visibility: 'shared',
  origin: 'seed',
  authorName: 'Fred',
  ownerName: 'Fred',
  audienceNames: ['Fred', 'Sara'],
  sourceReference: null,
  supersedesText: null,
  resolvesObjectId: null,
  resolvedByObjectId: null,
  responses: [
    {
      displayName: 'Fred',
      stance: 'accepted',
      responseText: null,
      createdAt: '2026-07-24T16:00:00.000Z',
    },
    {
      displayName: 'Sara',
      stance: 'accepted_with_condition',
      responseText: 'I need to review before it ships.',
      createdAt: '2026-07-24T16:00:00.000Z',
    },
  ],
  createdAt: '2026-07-24T16:00:00.000Z',
};

function bucket(object: ContextObjectView) {
  return bucketContext([object], {
    workspace: 'Launch planning',
    viewer: 'Sara',
    participants: ['Fred', 'Sara'],
  });
}

describe('bucketContext lifecycle semantics', () => {
  it('keeps accepted-with-condition first-class and unresolved', () => {
    const bundle = bucket(baseObject);

    expect(bundle.unresolved).toEqual([baseObject]);
    expect(bundle.agreed).toEqual([]);
    expect(bundle.disputed).toEqual([]);
  });

  it('moves resolved open questions out of active context buckets', () => {
    const resolvedQuestion: ContextObjectView = {
      ...baseObject,
      id: 'open-question-id',
      text: "Do we hold the launch if payments isn't live?",
      type: 'open_question',
      lifecycleStatus: 'resolved',
      resolvedByObjectId: 'decision-id',
      responses: [],
    };
    const bundle = bucket(resolvedQuestion);

    expect([
      ...bundle.agreed,
      ...bundle.perspectives,
      ...bundle.unresolved,
      ...bundle.disputed,
      ...bundle.openQuestions,
      ...bundle.blockers,
      ...bundle.sources,
    ]).toEqual([]);
  });
});
