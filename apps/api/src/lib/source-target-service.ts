import type { QueryResultRow } from 'pg';

import { queryDatabase, withDatabaseTransaction } from '../db.js';
import type { ParsedSourceTargetCreate, ParsedSourceTargetUpdate, SourceTargetType } from './source-target-input.js';

export type CollectionRunStatus = 'running' | 'succeeded' | 'duplicate' | 'failed';

type SourceTargetRow = QueryResultRow & {
  id: string; venue_id: string | null; source_type: SourceTargetType; canonical_url: string;
  source_external_id: string | null; label: string | null; enabled: boolean; next_collect_at: Date | null;
  last_attempted_at: Date | null; last_succeeded_at: Date | null; last_run_status: CollectionRunStatus | null;
  last_outcome_code: string | null; created_at: Date; updated_at: Date;
};

type CollectionRunRow = QueryResultRow & {
  id: string; source_target_id: string; status: CollectionRunStatus; outcome_code: string | null;
  outcome_message: string | null; candidate_id: string | null; started_at: Date; finished_at: Date | null;
  created_at: Date;
};

export class DuplicateSourceTargetError extends Error {}

export async function createSourceTarget(input: ParsedSourceTargetCreate) {
  try {
    const result = await queryDatabase<SourceTargetRow>(`
      insert into public.source_targets
        (venue_id, source_type, canonical_url, source_external_id, label, enabled, next_collect_at)
      values ($1, $2, $3, $4, $5, $6, $7)
      returning *
    `, [input.venueId, input.sourceType, input.canonicalUrl, input.sourceExternalId, input.label, input.enabled, input.nextCollectAt]);
    return mapTarget(result.rows[0]!);
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateSourceTargetError('Source target already exists.');
    throw error;
  }
}

export async function listSourceTargets() {
  const result = await queryDatabase<SourceTargetRow>('select * from public.source_targets order by created_at desc, id');
  return result.rows.map(mapTarget);
}

export async function getSourceTarget(id: string) {
  const result = await queryDatabase<SourceTargetRow>('select * from public.source_targets where id = $1', [id]);
  return result.rows[0] ? mapTarget(result.rows[0]) : null;
}

export async function updateSourceTarget(id: string, input: ParsedSourceTargetUpdate) {
  const result = await queryDatabase<SourceTargetRow>(`
    update public.source_targets set
      label = case when $2 then $3 else label end,
      venue_id = case when $4 then $5::uuid else venue_id end,
      enabled = case when $6 then $7 else enabled end,
      next_collect_at = case when $8 then $9::timestamptz else next_collect_at end
    where id = $1
    returning *
  `, [id, 'label' in input, input.label ?? null, 'venueId' in input, input.venueId ?? null,
    'enabled' in input, input.enabled ?? false, 'nextCollectAt' in input, input.nextCollectAt ?? null]);
  return result.rows[0] ? mapTarget(result.rows[0]) : null;
}

export async function startCollectionRun(targetId: string) {
  return withDatabaseTransaction(async (client) => {
    const result = await client.query<CollectionRunRow>(`
      insert into public.source_collection_runs (source_target_id)
      values ($1) returning *
    `, [targetId]);
    const run = result.rows[0]!;
    await client.query(`
      update public.source_targets set
        last_attempted_at = $2, last_run_status = 'running', last_outcome_code = null
      where id = $1
    `, [targetId, run.started_at]);
    return mapRun(run);
  });
}

export async function completeCollectionRun(input: {
  runId: string; targetId: string; status: Exclude<CollectionRunStatus, 'running'>;
  outcomeCode: string; outcomeMessage: string; candidateId: string | null;
}) {
  return withDatabaseTransaction(async (client) => {
    const result = await client.query<CollectionRunRow>(`
      update public.source_collection_runs set
        status = $2, outcome_code = $3, outcome_message = $4, candidate_id = $5, finished_at = now()
      where id = $1 and status = 'running'
      returning *
    `, [input.runId, input.status, input.outcomeCode, input.outcomeMessage, input.candidateId]);
    const run = result.rows[0]!;
    await client.query(`
      update public.source_targets set
        last_run_status = $2, last_outcome_code = $3,
        last_succeeded_at = case when $2 in ('succeeded', 'duplicate') then $4 else last_succeeded_at end
      where id = $1
    `, [input.targetId, input.status, input.outcomeCode, run.finished_at]);
    return mapRun(run);
  });
}

export async function listCollectionRuns(targetId: string) {
  const result = await queryDatabase<CollectionRunRow>(`
    select * from public.source_collection_runs where source_target_id = $1 order by started_at desc, id
  `, [targetId]);
  return result.rows.map(mapRun);
}

export async function getCollectionRun(id: string) {
  const result = await queryDatabase<CollectionRunRow>('select * from public.source_collection_runs where id = $1', [id]);
  return result.rows[0] ? mapRun(result.rows[0]) : null;
}

function mapTarget(row: SourceTargetRow) {
  return {
    id: row.id, venueId: row.venue_id, sourceType: row.source_type, canonicalUrl: row.canonical_url,
    sourceExternalId: row.source_external_id, label: row.label, enabled: row.enabled,
    nextCollectAt: iso(row.next_collect_at), lastAttemptedAt: iso(row.last_attempted_at),
    lastSucceededAt: iso(row.last_succeeded_at), lastRunStatus: row.last_run_status,
    lastOutcomeCode: row.last_outcome_code, createdAt: iso(row.created_at)!, updatedAt: iso(row.updated_at)!
  };
}

function mapRun(row: CollectionRunRow) {
  return {
    id: row.id, sourceTargetId: row.source_target_id, status: row.status, outcomeCode: row.outcome_code,
    outcomeMessage: row.outcome_message, candidateId: row.candidate_id, startedAt: iso(row.started_at)!,
    finishedAt: iso(row.finished_at), createdAt: iso(row.created_at)!
  };
}

function iso(value: Date | string | null) {
  return value === null ? null : new Date(value).toISOString();
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
