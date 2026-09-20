import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';

import Fastify from 'fastify';
import { Pool } from 'pg';

import { closeDatabasePool } from '../../db.js';
import { internalDealCandidateRoutes } from './deal-candidates.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run candidate action integration tests.');
}

const fixturePool = new Pool({ connectionString });
const venueId = randomUUID();
const fixtureCandidateIds: string[] = [];
const app = Fastify({ logger: false });
app.register(internalDealCandidateRoutes);

before(async () => {
  await fixturePool.query('select 1');
  await fixturePool.query(
    `
      insert into public.venues (
        id,
        name,
        venue_type,
        location,
        timezone,
        status,
        is_verified
      ) values (
        $1,
        'Candidate action test venue',
        'restaurant',
        st_setsrid(st_makepoint(-121.8896, 37.3361), 4326)::geography,
        'America/Los_Angeles',
        'active',
        true
      )
    `,
    [venueId]
  );
  await app.ready();
});

after(async () => {
  if (fixtureCandidateIds.length > 0) {
    await fixturePool.query('delete from public.deal_candidates where id = any($1::uuid[])', [fixtureCandidateIds]);
  }

  await fixturePool.query('delete from public.venues where id = $1', [venueId]);
  await app.close();
  await closeDatabasePool();
  await fixturePool.end();
});

test('approves a pending candidate and records the review timestamp', async () => {
  const candidateId = await createCandidate();

  const response = await reviewCandidate(candidateId, 'approve');

  assert.equal(response.statusCode, 200, response.body);
  const body = response.json<{
    candidate: { id: string; reviewStatus: string; reviewNote: string | null; reviewedAt: string };
  }>();
  assert.equal(body.candidate.id, candidateId);
  assert.equal(body.candidate.reviewStatus, 'approved');
  assert.equal(body.candidate.reviewNote, null);
  assert.ok(!Number.isNaN(Date.parse(body.candidate.reviewedAt)));
  assert.deepEqual(await getStoredReview(candidateId), {
    review_status: 'approved',
    review_notes: null,
    has_reviewed_at: true
  });
});

test('rejects a pending candidate with an optional review note', async () => {
  const candidateId = await createCandidate();

  const response = await reviewCandidate(candidateId, 'reject', {
    reviewNote: 'Schedule could not be confirmed.'
  });

  assert.equal(response.statusCode, 200, response.body);
  const body = response.json<{
    candidate: { id: string; reviewStatus: string; reviewNote: string | null; reviewedAt: string };
  }>();
  assert.equal(body.candidate.reviewStatus, 'rejected');
  assert.equal(body.candidate.reviewNote, 'Schedule could not be confirmed.');
  assert.deepEqual(await getStoredReview(candidateId), {
    review_status: 'rejected',
    review_notes: 'Schedule could not be confirmed.',
    has_reviewed_at: true
  });
});

test('does not allow an approved candidate to be rejected afterward', async () => {
  const candidateId = await createCandidate();
  assert.equal((await reviewCandidate(candidateId, 'approve')).statusCode, 200);

  const response = await reviewCandidate(candidateId, 'reject', { reviewNote: 'Changed mind' });

  assert.equal(response.statusCode, 409, response.body);
  assert.equal(response.json<{ candidate: { reviewStatus: string } }>().candidate.reviewStatus, 'approved');
  assert.equal((await getStoredReview(candidateId)).review_status, 'approved');
});

test('does not allow a rejected candidate to be approved afterward', async () => {
  const candidateId = await createCandidate();
  assert.equal((await reviewCandidate(candidateId, 'reject')).statusCode, 200);

  const response = await reviewCandidate(candidateId, 'approve');

  assert.equal(response.statusCode, 409, response.body);
  assert.equal(response.json<{ candidate: { reviewStatus: string } }>().candidate.reviewStatus, 'rejected');
  assert.equal((await getStoredReview(candidateId)).review_status, 'rejected');
});

test('repeating the same review action returns the existing state safely', async () => {
  const candidateId = await createCandidate();
  assert.equal((await reviewCandidate(candidateId, 'approve')).statusCode, 200);

  const repeatedResponse = await reviewCandidate(candidateId, 'approve');

  assert.equal(repeatedResponse.statusCode, 409, repeatedResponse.body);
  assert.deepEqual(repeatedResponse.json(), {
    error: 'Deal candidate is no longer pending',
    candidate: {
      id: candidateId,
      reviewStatus: 'approved'
    }
  });
});

test('returns not found when reviewing a missing candidate', async () => {
  const response = await reviewCandidate(randomUUID(), 'approve');

  assert.equal(response.statusCode, 404, response.body);
  assert.deepEqual(response.json(), { error: 'Deal candidate not found' });
});

test('rejects a malformed candidate id', async () => {
  const response = await reviewCandidate('not-a-uuid', 'reject', { reviewNote: 'Invalid request' });

  assert.equal(response.statusCode, 400, response.body);
  assert.deepEqual(response.json(), { error: 'Invalid candidate id' });
});

test('reviewed candidates leave the pending list', async () => {
  const candidateId = await createCandidate();
  assert.ok((await getPendingCandidateIds()).has(candidateId));

  assert.equal((await reviewCandidate(candidateId, 'approve')).statusCode, 200);

  assert.ok(!(await getPendingCandidateIds()).has(candidateId));
});

test('review actions do not create or update production deals', async () => {
  const candidateId = await createCandidate(venueId);
  const before = await getProductionDealSnapshot();

  assert.equal((await reviewCandidate(candidateId, 'approve')).statusCode, 200);

  assert.deepEqual(await getProductionDealSnapshot(), before);
});

async function createCandidate(linkedVenueId: string | null = null) {
  const candidateId = randomUUID();
  fixtureCandidateIds.push(candidateId);

  await fixturePool.query(
    `
      insert into public.deal_candidates (
        id,
        venue_id,
        source_url,
        source_type,
        source_external_id,
        title,
        review_status
      ) values ($1, $2, $3, 'manual', $4, 'Candidate action fixture', 'pending')
    `,
    [
      candidateId,
      linkedVenueId,
      `https://example.com/candidate-action/${candidateId}`,
      `candidate-action-${candidateId}`
    ]
  );

  return candidateId;
}

async function reviewCandidate(
  candidateId: string,
  action: 'approve' | 'reject',
  payload?: { reviewNote: unknown }
) {
  return app.inject({
    method: 'POST',
    url: `/internal/deal-candidates/${candidateId}/${action}`,
    ...(payload === undefined ? {} : { payload })
  });
}

async function getStoredReview(candidateId: string) {
  const result = await fixturePool.query<{
    review_status: string;
    review_notes: string | null;
    has_reviewed_at: boolean;
  }>(
    `
      select
        review_status,
        review_notes,
        reviewed_at is not null as has_reviewed_at
      from public.deal_candidates
      where id = $1
    `,
    [candidateId]
  );

  return result.rows[0];
}

async function getPendingCandidateIds() {
  const response = await app.inject({
    method: 'GET',
    url: '/internal/deal-candidates'
  });
  assert.equal(response.statusCode, 200, response.body);

  const body = response.json<{ candidates: Array<{ id: string }> }>();
  return new Set(body.candidates.map((candidate) => candidate.id));
}

async function getProductionDealSnapshot() {
  const result = await fixturePool.query<{
    deal_count: string;
    schedule_count: string;
    item_count: string;
    source_count: string;
    verification_count: string;
  }>(
    `
      select
        (select count(*)::text from public.deals where venue_id = $1) as deal_count,
        (
          select count(*)::text
          from public.deal_schedule_windows ds
          join public.deals d on d.id = ds.deal_id
          where d.venue_id = $1
        ) as schedule_count,
        (
          select count(*)::text
          from public.deal_items di
          join public.deals d on d.id = di.deal_id
          where d.venue_id = $1
        ) as item_count,
        (
          select count(*)::text
          from public.deal_sources source
          join public.deals d on d.id = source.deal_id
          where d.venue_id = $1
        ) as source_count,
        (
          select count(*)::text
          from public.deal_verifications verification
          join public.deals d on d.id = verification.deal_id
          where d.venue_id = $1
        ) as verification_count
    `,
    [venueId]
  );

  return result.rows[0];
}
