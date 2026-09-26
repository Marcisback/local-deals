import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';

import Fastify from 'fastify';
import { Pool } from 'pg';

import { closeDatabasePool } from '../../db.js';
import { ExtractionProviderError } from '../../lib/deal-extractor.js';
import { SourceFetchFailedError } from '../../lib/source-fetcher.js';
import { internalSourceTargetRoutes } from './source-targets.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required to run source target integration tests.');

const pool = new Pool({ connectionString });
const targetIds: string[] = [];
const candidateExternalIds: string[] = [];
let extractionCalls = 0;
let extractionFailure = false;

const app = Fastify({ logger: false });
app.register(internalSourceTargetRoutes, {
  fetchSource: async (url) => {
    if (url.includes('/fetch-failure')) throw new SourceFetchFailedError('sensitive provider detail');
    return {
      html: '<html><nav>Ignore me</nav><h1>Happy hour</h1><p>Monday 3 PM to 6 PM. $6 cocktails.</p></html>',
      finalUrl: url,
      responseBytes: 101
    };
  },
  extractCandidate: async () => {
    extractionCalls += 1;
    if (extractionFailure) throw new ExtractionProviderError('sensitive model response');
    return validExtraction();
  }
});

before(async () => {
  await pool.query('select 1');
  await app.ready();
});

after(async () => {
  await pool.query('delete from public.source_targets where id = any($1::uuid[])', [targetIds]);
  await pool.query('delete from public.deal_candidates where source_external_id = any($1::text[])', [candidateExternalIds]);
  await app.close();
  await closeDatabasePool();
  await pool.end();
});

test('canonical target identity is unique and target fields can be listed and updated', async () => {
  const id = randomUUID();
  const first = await createWebsiteTarget(`https://example.com/deals/${id}?utm_source=test&b=2&a=1#menu`, `target-${id}`);
  assert.equal(first.statusCode, 201, first.body);
  const target = first.json<{ sourceTarget: { id: string; canonicalUrl: string; enabled: boolean } }>().sourceTarget;
  targetIds.push(target.id);
  assert.equal(target.canonicalUrl, `https://example.com/deals/${id}?a=1&b=2`);

  const duplicate = await createWebsiteTarget(`https://example.com/deals/${id}?b=2&a=1&utm_medium=social`, `other-${id}`);
  assert.equal(duplicate.statusCode, 409, duplicate.body);

  const updated = await app.inject({ method: 'PATCH', url: `/internal/source-targets/${target.id}`,
    payload: { label: 'Updated label', enabled: false, nextCollectAt: '2027-01-02T03:04:05Z' } });
  assert.equal(updated.statusCode, 200, updated.body);
  assert.equal(updated.json<{ sourceTarget: { label: string; enabled: boolean } }>().sourceTarget.label, 'Updated label');
  assert.equal(updated.json<{ sourceTarget: { enabled: boolean } }>().sourceTarget.enabled, false);

  const list = await app.inject({ method: 'GET', url: '/internal/source-targets' });
  assert.equal(list.statusCode, 200);
  assert.ok(list.json<{ sourceTargets: { id: string }[] }>().sourceTargets.some((entry) => entry.id === target.id));
});

test('manual website collection creates one pending unpublished candidate and audits duplicate runs', async () => {
  const suffix = randomUUID();
  const externalId = `source-target-${suffix}`;
  candidateExternalIds.push(externalId);
  const created = await createWebsiteTarget(`https://example.com/happy-hour/${suffix}`, externalId);
  const target = created.json<{ sourceTarget: { id: string } }>().sourceTarget;
  targetIds.push(target.id);

  const first = await app.inject({ method: 'POST', url: `/internal/source-targets/${target.id}/collect` });
  assert.equal(first.statusCode, 201, first.body);
  const firstBody = first.json<{ collectionRun: { status: string; outcomeCode: string }; candidate: { id: string; reviewStatus: string } }>();
  assert.equal(firstBody.collectionRun.status, 'succeeded');
  assert.equal(firstBody.collectionRun.outcomeCode, 'candidate_created');
  assert.equal(firstBody.candidate.reviewStatus, 'pending');

  const persisted = await pool.query<{ review_status: string; published_deal_id: string | null }>(
    'select review_status, published_deal_id from public.deal_candidates where id = $1', [firstBody.candidate.id]);
  assert.deepEqual(persisted.rows[0], { review_status: 'pending', published_deal_id: null });

  const callsAfterFirst = extractionCalls;
  const second = await app.inject({ method: 'POST', url: `/internal/source-targets/${target.id}/collect` });
  assert.equal(second.statusCode, 200, second.body);
  assert.equal(second.json<{ collectionRun: { status: string; candidateId: string } }>().collectionRun.status, 'duplicate');
  assert.equal(second.json<{ collectionRun: { candidateId: string } }>().collectionRun.candidateId, firstBody.candidate.id);
  assert.equal(extractionCalls, callsAfterFirst);

  const inspected = await app.inject({ method: 'GET', url: `/internal/source-targets/${target.id}` });
  const audited = inspected.json<{ sourceTarget: { lastAttemptedAt: string; lastSucceededAt: string; lastRunStatus: string; lastOutcomeCode: string } }>().sourceTarget;
  assert.ok(audited.lastAttemptedAt);
  assert.ok(audited.lastSucceededAt);
  assert.equal(audited.lastRunStatus, 'duplicate');
  assert.equal(audited.lastOutcomeCode, 'candidate_duplicate');

  const runs = await app.inject({ method: 'GET', url: `/internal/source-targets/${target.id}/runs` });
  assert.equal(runs.json<{ collectionRuns: unknown[] }>().collectionRuns.length, 2);
});

test('collection failure is audited with a controlled message and creates no candidate', async () => {
  const suffix = randomUUID();
  const externalId = `source-target-${suffix}`;
  candidateExternalIds.push(externalId);
  const created = await createWebsiteTarget(`https://example.com/fetch-failure/${suffix}`, externalId);
  const targetId = created.json<{ sourceTarget: { id: string } }>().sourceTarget.id;
  targetIds.push(targetId);

  const response = await app.inject({ method: 'POST', url: `/internal/source-targets/${targetId}/collect` });
  assert.equal(response.statusCode, 502, response.body);
  const run = response.json<{ collectionRun: { status: string; outcomeCode: string; outcomeMessage: string } }>().collectionRun;
  assert.deepEqual(run, { ...run, status: 'failed', outcomeCode: 'collection_failed', outcomeMessage: 'Unable to collect source.' });
  const count = await pool.query<{ count: string }>('select count(*)::text as count from public.deal_candidates where source_external_id = $1', [externalId]);
  assert.equal(count.rows[0]?.count, '0');
});

test('model extraction failure is audited and creates no candidate', async () => {
  const suffix = randomUUID();
  const externalId = `source-target-${suffix}`;
  candidateExternalIds.push(externalId);
  const created = await createWebsiteTarget(`https://example.com/model-failure/${suffix}`, externalId);
  const targetId = created.json<{ sourceTarget: { id: string } }>().sourceTarget.id;
  targetIds.push(targetId);

  extractionFailure = true;
  const response = await app.inject({ method: 'POST', url: `/internal/source-targets/${targetId}/collect` });
  extractionFailure = false;

  assert.equal(response.statusCode, 502, response.body);
  const run = response.json<{ collectionRun: { status: string; outcomeCode: string; outcomeMessage: string } }>().collectionRun;
  assert.equal(run.status, 'failed');
  assert.equal(run.outcomeCode, 'extraction_failed');
  assert.equal(run.outcomeMessage, 'Unable to extract deal candidate.');
  const count = await pool.query<{ count: string }>('select count(*)::text as count from public.deal_candidates where source_external_id = $1', [externalId]);
  assert.equal(count.rows[0]?.count, '0');
});

test('unconfigured Instagram collection is audited and creates no candidate', async () => {
  const shortcode = `Code_${randomUUID().replaceAll('-', '')}`;
  candidateExternalIds.push(shortcode);
  const created = await app.inject({ method: 'POST', url: '/internal/source-targets', payload: {
    source: { type: 'instagram', url: `https://instagram.com/reel/${shortcode}/?utm_source=test`, externalId: null, label: 'Instagram' }
  }});
  assert.equal(created.statusCode, 201, created.body);
  const targetId = created.json<{ sourceTarget: { id: string; canonicalUrl: string; sourceExternalId: string } }>().sourceTarget.id;
  targetIds.push(targetId);

  const response = await app.inject({ method: 'POST', url: `/internal/source-targets/${targetId}/collect` });
  assert.equal(response.statusCode, 501, response.body);
  assert.equal(response.json<{ collectionRun: { status: string; outcomeCode: string } }>().collectionRun.status, 'failed');
  assert.equal(response.json<{ collectionRun: { outcomeCode: string } }>().collectionRun.outcomeCode, 'collector_not_configured');
  const count = await pool.query<{ count: string }>('select count(*)::text as count from public.deal_candidates where source_external_id = $1', [shortcode]);
  assert.equal(count.rows[0]?.count, '0');
});

async function createWebsiteTarget(url: string, externalId: string) {
  return app.inject({ method: 'POST', url: '/internal/source-targets', payload: {
    source: { type: 'official_website', url, externalId, label: 'Official deals' }, venueId: null
  }});
}

function validExtraction() {
  return {
    hasDeal: true, title: 'Happy hour', description: 'Discounted drinks.', confidence: 0.95,
    noDealReason: null,
    schedules: [{ dayOfWeek: 1, startTime: '15:00', endTime: '18:00', endsAtVenueClose: false,
      rawScheduleText: 'Monday 3 PM to 6 PM', confidence: 0.96 }],
    items: [{ name: 'Cocktail', category: 'cocktail', description: null, dealPrice: 6,
      regularPrice: null, discountText: null, rawItemText: '$6 cocktails', confidence: 0.94 }]
  };
}
