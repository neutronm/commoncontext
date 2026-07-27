import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  bucketContext,
  createChangeProposal,
  createProposal,
  getAuthorizedObjects,
  getObjectForReview,
  getWorkspaceParticipants,
  resolveCaller,
  respondToObject,
} from '../context';
import type { Caller, ContextBundle, ContextObjectView } from '../types';

const texts = {
  P2: 'Every time we get close to a date Fred adds another must-have. I think the scope is the problem, not the timeline.',
  S1: 'The first release ships in August.',
  S2: 'The first release ships July 30.',
  S3: 'Sara owns the onboarding flow through launch.',
  S4: "Fred's view: engineering time is the main risk to the launch.",
  S5: "Sara's view: expanding scope is the main risk to the launch.",
  S6: 'The payments integration is waiting on vendor approval.',
  S7: "Do we hold the launch if payments isn't live?",
  S8: 'No paid marketing spend before launch.',
  S9: 'Weekly sync, July 20 — Agreed August release window. Discussed payments dependency. Date not fixed to a specific day.',
  S10: 'Fred owns the pricing page copy.',
} as const;

let sql: Sql;
let fred: Caller;
let sara: Caller;
let saraObjects: ContextObjectView[];

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for domain tests`);
  return value;
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function bucketTexts(
  bundle: ContextBundle,
  bucket: keyof Pick<
    ContextBundle,
    | 'agreed'
    | 'perspectives'
    | 'unresolved'
    | 'disputed'
    | 'openQuestions'
    | 'blockers'
    | 'sources'
  >,
): string[] {
  return bundle[bucket].map((object) => object.text).sort();
}

function expectCanonicalIsoTimestamp(value: string): void {
  expect(value).toMatch(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  );
  expect(new Date(value).toISOString()).toBe(value);
}

describe('domain authorization and bucketing', () => {
  beforeAll(async () => {
    const databaseUrl = requiredEnv('DATABASE_URL');
    const fredToken = requiredEnv('DEMO_TOKEN_FRED');
    const saraToken = requiredEnv('DEMO_TOKEN_SARA');
    sql = postgres(databaseUrl, { max: 1, fetch_types: false });

    const initPath = fileURLToPath(
      new URL('../../../supabase/migrations/0001_init.sql', import.meta.url),
    );
    const seedPath = fileURLToPath(
      new URL('../../../supabase/migrations/0002_seed.sql', import.meta.url),
    );

    await sql.file(initPath);
    const seedSql = (await readFile(seedPath, 'utf8'))
      .replaceAll(":'fred_token'", sqlString(fredToken))
      .replaceAll(":'sara_token'", sqlString(saraToken));
    await sql.unsafe(seedSql);

    fred = await resolveCaller(sql, fredToken);
    sara = await resolveCaller(sql, saraToken);
    saraObjects = await getAuthorizedObjects(sql, sara);
  });

  afterAll(async () => {
    await sql?.end({ timeout: 5 });
  });

  it('does not return Fred-authored private objects to Sara', () => {
    expect(
      saraObjects.filter(
        (object) =>
          object.visibility === 'private' && object.authorName === 'Fred',
      ),
    ).toHaveLength(0);
  });

  it('does not expose September anywhere in Sara authorized output', () => {
    expect(JSON.stringify(saraObjects)).not.toMatch(/september/i);
  });

  it('returns exactly 11 authorized objects for Fred and Sara', async () => {
    await expect(getAuthorizedObjects(sql, fred)).resolves.toHaveLength(11);
    await expect(getAuthorizedObjects(sql, sara)).resolves.toHaveLength(11);
  });

  it('returns ordered audienceNames arrays when type fetching is disabled', async () => {
    const sharedObject = saraObjects.find((object) => object.text === texts.S1);
    expect(sharedObject?.audienceNames).toEqual(['Fred', 'Sara']);
    expect(
      saraObjects.find((object) => object.text === texts.P2)?.audienceNames,
    ).toEqual(['Sara']);
    expect(
      saraObjects.every((object) => Array.isArray(object.audienceNames)),
    ).toBe(true);

    const reviewObject = await getObjectForReview(
      sql,
      sharedObject!.id,
      sara,
    );
    expect(reviewObject.audienceNames).toEqual(['Fred', 'Sara']);
    expect(Array.isArray(reviewObject.audienceNames)).toBe(true);
  });

  it('returns canonical ISO timestamps for objects and responses', async () => {
    const objects = await getAuthorizedObjects(sql, sara);
    for (const object of objects) {
      expectCanonicalIsoTimestamp(object.createdAt);
      for (const response of object.responses) {
        expectCanonicalIsoTimestamp(response.createdAt);
      }
    }
    expect(objects.flatMap((object) => object.responses).length).toBeGreaterThan(
      0,
    );
  });

  it('routes Fred proposals to Sara for review', async () => {
    const proposal = await createProposal(sql, {
      caller: fred,
      text: 'We agreed to launch on August 15.',
      type: 'decision',
      epistemicStatus: 'proposal',
    });

    try {
      expect(proposal).toEqual({
        id: expect.any(String),
        reviewPath: `/review/${proposal.id}?as=sara`,
      });
    } finally {
      await sql`
        delete from context_objects
        where id = ${proposal.id}::uuid
      `;
    }
  });

  it('routes Sara proposals to Fred for review', async () => {
    const proposal = await createProposal(sql, {
      caller: sara,
      text: 'We agreed to launch on August 15.',
      type: 'decision',
      epistemicStatus: 'proposal',
    });

    try {
      expect(proposal).toEqual({
        id: expect.any(String),
        reviewPath: `/review/${proposal.id}?as=fred`,
      });
    } finally {
      await sql`
        delete from context_objects
        where id = ${proposal.id}::uuid
      `;
    }
  });

  it('proposes replacement wording without editing the original object', async () => {
    const originalText = 'The launch brief uses the August release window.';
    const replacementText =
      'The launch brief uses an August release window without a fixed date.';
    const original = await createProposal(sql, {
      caller: fred,
      text: originalText,
      type: 'decision',
      epistemicStatus: 'proposal',
    });

    try {
      await respondToObject(sql, {
        caller: sara,
        objectId: original.id,
        stance: 'accepted',
      });

      const replacement = await createChangeProposal(sql, {
        caller: sara,
        objectId: original.id,
        text: replacementText,
        origin: 'web',
      });
      const [originalBeforeReview, replacementBeforeReview] =
        await Promise.all([
          getObjectForReview(sql, original.id, sara),
          getObjectForReview(sql, replacement.id, sara),
        ]);

      expect(replacement.reviewPath).toBe(
        `/review/${replacement.id}?as=fred`,
      );
      expect(originalBeforeReview).toMatchObject({
        lifecycleStatus: 'active',
        text: originalText,
      });
      expect(replacementBeforeReview).toMatchObject({
        lifecycleStatus: 'pending',
        supersedesText: originalText,
        text: replacementText,
      });
      expect(replacementBeforeReview.responses).toEqual([
        expect.objectContaining({
          displayName: 'Sara',
          stance: 'accepted',
        }),
      ]);

      await respondToObject(sql, {
        caller: fred,
        objectId: replacement.id,
        stance: 'rejected',
        responseText: 'Keep the existing wording.',
      });

      await expect(
        getObjectForReview(sql, original.id, fred),
      ).resolves.toMatchObject({
        lifecycleStatus: 'active',
        text: originalText,
      });
      await expect(
        getObjectForReview(sql, replacement.id, fred),
      ).resolves.toMatchObject({
        lifecycleStatus: 'revoked',
        text: replacementText,
      });

      const retry = await createChangeProposal(sql, {
        caller: fred,
        objectId: original.id,
        text: 'The launch brief uses an August release window after scope review.',
        origin: 'assistant',
      });

      await expect(
        getObjectForReview(sql, retry.id, sara),
      ).resolves.toMatchObject({
        lifecycleStatus: 'pending',
        supersedesText: originalText,
        text: 'The launch brief uses an August release window after scope review.',
      });
    } finally {
      await sql`
        delete from context_objects
        where id = ${original.id}::uuid
      `;
    }
  });

  it('supersedes the original only after everyone accepts its replacement', async () => {
    const original = await createProposal(sql, {
      caller: sara,
      text: 'The pricing review happens on Thursday.',
      type: 'task',
      epistemicStatus: 'proposal',
    });

    try {
      await respondToObject(sql, {
        caller: fred,
        objectId: original.id,
        stance: 'accepted',
      });
      const replacement = await createChangeProposal(sql, {
        caller: fred,
        objectId: original.id,
        text: 'The pricing review happens before launch.',
        origin: 'assistant',
      });

      await respondToObject(sql, {
        caller: sara,
        objectId: replacement.id,
        stance: 'accepted',
      });

      await expect(
        getObjectForReview(sql, original.id, fred),
      ).resolves.toMatchObject({
        lifecycleStatus: 'superseded',
        text: 'The pricing review happens on Thursday.',
      });
      await expect(
        getObjectForReview(sql, replacement.id, fred),
      ).resolves.toMatchObject({
        lifecycleStatus: 'active',
        supersedesText: 'The pricing review happens on Thursday.',
        text: 'The pricing review happens before launch.',
        responses: expect.arrayContaining([
          expect.objectContaining({
            displayName: 'Fred',
            stance: 'accepted',
          }),
          expect.objectContaining({
            displayName: 'Sara',
            stance: 'accepted',
          }),
        ]),
      });
    } finally {
      await sql`
        delete from context_objects
        where id = ${original.id}::uuid
      `;
    }
  });

  it('does not let a private object become a shared change proposal', async () => {
    const privateObject = saraObjects.find(
      (object) => object.text === texts.P2,
    );
    expect(privateObject).toBeDefined();

    await expect(
      createChangeProposal(sql, {
        caller: sara,
        objectId: privateObject!.id,
        text: 'This replacement must not reveal the private original.',
        origin: 'assistant',
      }),
    ).rejects.toThrow('Unable to propose a change');
  });

  it.each([
    ['blocker', 'blockers'],
    ['open_question', 'openQuestions'],
    ['source_document', 'sources'],
  ] as const)(
    'keeps a pending %s replacement unresolved',
    (type, specializedBucket) => {
      const template = saraObjects.find(
        (object) => object.text === texts.S1,
      );
      expect(template).toBeDefined();
      const pendingReplacement: ContextObjectView = {
        ...template!,
        id: randomUUID(),
        type,
        text: `Pending ${type} replacement`,
        epistemicStatus: 'proposal',
        lifecycleStatus: 'pending',
        sourceReference: null,
        supersedesText: template!.text,
        responses: [
          {
            displayName: 'Sara',
            stance: 'accepted',
            responseText: null,
            createdAt: template!.createdAt,
          },
        ],
      };
      const bundle = bucketContext([pendingReplacement], {
        workspace: 'Launch planning',
        viewer: 'Sara',
        participants: ['Fred', 'Sara'],
      });

      expect(bundle.unresolved).toEqual([pendingReplacement]);
      expect(bundle[specializedBucket]).toEqual([]);
    },
  );

  it('excludes a revoked replacement from assistant context buckets', () => {
    const template = saraObjects.find(
      (object) => object.text === texts.S1,
    );
    expect(template).toBeDefined();
    const revokedReplacement: ContextObjectView = {
      ...template!,
      id: randomUUID(),
      text: 'A declined replacement kept only in the audit trail.',
      epistemicStatus: 'proposal',
      lifecycleStatus: 'revoked',
      supersedesText: template!.text,
      responses: [
        {
          displayName: 'Fred',
          stance: 'accepted',
          responseText: null,
          createdAt: template!.createdAt,
        },
        {
          displayName: 'Sara',
          stance: 'rejected',
          responseText: 'Keep the original.',
          createdAt: template!.createdAt,
        },
      ],
    };
    const bundle = bucketContext([revokedReplacement], {
      workspace: 'Launch planning',
      viewer: 'Sara',
      participants: ['Fred', 'Sara'],
    });

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

  it('does not let authors respond to their own proposals', async () => {
    const proposal = await createProposal(sql, {
      caller: fred,
      text: 'Only the other founder can respond to this proposal.',
      type: 'decision',
      epistemicStatus: 'proposal',
    });

    try {
      await expect(
        respondToObject(sql, {
          caller: fred,
          objectId: proposal.id,
          stance: 'rejected',
        }),
      ).rejects.toThrow('Caller cannot respond');

      await expect(
        getObjectForReview(sql, proposal.id, fred),
      ).resolves.toMatchObject({
        lifecycleStatus: 'pending',
        responses: [],
      });
    } finally {
      await sql`
        delete from context_objects
        where id = ${proposal.id}::uuid
      `;
    }
  });

  it('throws when respondToObject caller is outside the audience', async () => {
    const target = saraObjects.find((object) => object.text === texts.S1);
    expect(target).toBeDefined();

    await expect(
      respondToObject(sql, {
        caller: {
          userId: randomUUID(),
          displayName: 'Outsider',
          workspaceId: sara.workspaceId,
        },
        objectId: target!.id,
        stance: 'accepted',
      }),
    ).rejects.toThrow();
  });

  it('throws when resolveCaller receives an unknown token', async () => {
    await expect(resolveCaller(sql, 'garbage-token')).rejects.toThrow();
  });

  it('places each seeded Sara-visible object in the specified bucket or nowhere', async () => {
    const participants = await getWorkspaceParticipants(sql, sara.workspaceId);
    const bundle = bucketContext(saraObjects, {
      workspace: 'Launch planning',
      viewer: 'Sara',
      participants,
    });

    expect(bucketTexts(bundle, 'agreed')).toEqual(
      [texts.S1, texts.S3, texts.S8].sort(),
    );
    expect(bucketTexts(bundle, 'perspectives')).toEqual(
      [texts.S4, texts.S5, texts.P2].sort(),
    );
    expect(bucketTexts(bundle, 'blockers')).toEqual([texts.S6]);
    expect(bucketTexts(bundle, 'openQuestions')).toEqual([texts.S7]);
    expect(bucketTexts(bundle, 'disputed')).toEqual([texts.S10]);
    expect(bucketTexts(bundle, 'sources')).toEqual([texts.S9]);
    expect(bucketTexts(bundle, 'unresolved')).toEqual([]);

    const bucketed = [
      ...bundle.agreed,
      ...bundle.perspectives,
      ...bundle.unresolved,
      ...bundle.disputed,
      ...bundle.openQuestions,
      ...bundle.blockers,
      ...bundle.sources,
    ];
    expect(bucketed).toHaveLength(10);
    expect(new Set(bucketed.map((object) => object.id)).size).toBe(10);
    expect(bucketed.map((object) => object.text)).not.toContain(texts.S2);
  });
});
