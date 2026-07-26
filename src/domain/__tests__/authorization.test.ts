import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import postgres, { type Sql } from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  bucketContext,
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
