import type { QueryResultRow } from 'pg';

import { queryDatabase, withDatabaseTransaction } from '../db.js';
import type { CandidateSourceType, ParsedCandidateInput } from './candidate-input.js';

type CreatedCandidateRow = QueryResultRow & {
  id: string;
};

type ReviewedCandidateRow = QueryResultRow & {
  review_status: 'approved' | 'rejected';
  review_notes: string | null;
  reviewed_at: Date;
};

type CandidateStatusRow = QueryResultRow & {
  review_status: 'pending' | 'approved' | 'rejected' | 'needs_review';
};

type CandidateReviewRow = QueryResultRow & {
  id: string;
  venue_id: string | null;
  venue_name: string | null;
  source_url: string;
  source_type: CandidateSourceType;
  source_label: string | null;
  source_external_id: string | null;
  source_published_at: Date | null;
  source_last_checked_at: Date | null;
  title: string | null;
  description: string | null;
  raw_text: string | null;
  confidence: number | null;
  review_status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  discovered_at: Date;
  created_at: Date;
  updated_at: Date;
  schedules: CandidateReviewSchedule[];
  items: CandidateReviewItem[];
};

type CandidateReviewSchedule = {
  id: string;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  endsAtVenueClose: boolean;
  rawScheduleText: string | null;
  confidence: number | null;
  createdAt: string;
};

type CandidateReviewItem = {
  id: string;
  name: string | null;
  category: string | null;
  description: string | null;
  dealPrice: number | null;
  regularPrice: number | null;
  discountText: string | null;
  rawItemText: string | null;
  sortOrder: number;
  confidence: number | null;
  createdAt: string;
};

export type CandidateReview = ReturnType<typeof mapCandidateReviewRow>;

export type CreateCandidateResult =
  | {
      kind: 'created';
      candidateId: string;
      scheduleCount: number;
      itemCount: number;
    }
  | {
      kind: 'invalid_venue';
    };

export type ReviewCandidateResult =
  | {
      kind: 'reviewed';
      candidateId: string;
      reviewStatus: 'approved' | 'rejected';
      reviewNote: string | null;
      reviewedAt: string;
    }
  | {
      kind: 'not_found';
    }
  | {
      kind: 'not_pending';
      candidateId: string;
      reviewStatus: 'approved' | 'rejected' | 'needs_review';
    };

export async function findExistingCandidateByExternalId(sourceType: CandidateSourceType, externalId: string) {
  const result = await queryDatabase<{ id: string }>(
    `
      select id
      from public.deal_candidates
      where source_type = $1 and source_external_id = $2
      limit 1
    `,
    [sourceType, externalId]
  );

  return result.rows[0]?.id ?? null;
}

export async function venueExists(venueId: string) {
  const result = await queryDatabase<{ exists: boolean }>(
    'select exists(select 1 from public.venues where id = $1) as exists',
    [venueId]
  );

  return result.rows[0]?.exists ?? false;
}

export async function listPendingDealCandidates(): Promise<CandidateReview[]> {
  const result = await queryCandidateReviews(null);
  return result.rows.map(mapCandidateReviewRow);
}

export async function getDealCandidateById(candidateId: string): Promise<CandidateReview | null> {
  const result = await queryCandidateReviews(candidateId);
  const row = result.rows[0];
  return row ? mapCandidateReviewRow(row) : null;
}

export async function reviewDealCandidate(
  candidateId: string,
  reviewStatus: 'approved' | 'rejected',
  reviewNote: string | null
): Promise<ReviewCandidateResult> {
  return withDatabaseTransaction(async (client) => {
    const updateResult = await client.query<ReviewedCandidateRow>(
      `
        update public.deal_candidates
        set
          review_status = $2,
          review_notes = $3,
          reviewed_at = now()
        where id = $1 and review_status = 'pending'
        returning review_status, review_notes, reviewed_at
      `,
      [candidateId, reviewStatus, reviewNote]
    );
    const reviewedCandidate = updateResult.rows[0];

    if (reviewedCandidate) {
      return {
        kind: 'reviewed' as const,
        candidateId,
        reviewStatus: reviewedCandidate.review_status,
        reviewNote: reviewedCandidate.review_notes,
        reviewedAt: reviewedCandidate.reviewed_at.toISOString()
      };
    }

    const existingResult = await client.query<CandidateStatusRow>(
      'select review_status from public.deal_candidates where id = $1',
      [candidateId]
    );
    const existingCandidate = existingResult.rows[0];

    if (!existingCandidate) {
      return { kind: 'not_found' as const };
    }

    return {
      kind: 'not_pending' as const,
      candidateId,
      reviewStatus: existingCandidate.review_status as 'approved' | 'rejected' | 'needs_review'
    };
  });
}

export async function createDealCandidate(input: ParsedCandidateInput): Promise<CreateCandidateResult> {
  return withDatabaseTransaction(async (client) => {
    if (input.venueId) {
      const venueResult = await client.query<{ id: string }>(
        'select id from public.venues where id = $1',
        [input.venueId]
      );

      if (venueResult.rowCount === 0) {
        return {
          kind: 'invalid_venue' as const
        };
      }
    }

    const candidateResult = await client.query<CreatedCandidateRow>(
      `
        insert into public.deal_candidates (
          venue_id,
          source_url,
          source_type,
          source_label,
          source_external_id,
          title,
          description,
          raw_text,
          source_published_at,
          source_last_checked_at,
          review_status,
          confidence
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, now(), 'pending', $10
        )
        returning id
      `,
      [
        input.venueId,
        input.source.url,
        input.source.type,
        input.source.label,
        input.source.externalId,
        input.title,
        input.description,
        input.rawText,
        input.source.publishedAt,
        input.confidence
      ]
    );

    const candidateId = candidateResult.rows[0].id;

    for (const schedule of input.schedules) {
      await client.query(
        `
          insert into public.deal_candidate_schedule_windows (
            candidate_id,
            day_of_week,
            start_time,
            end_time,
            ends_at_venue_close,
            raw_schedule_text,
            confidence
          ) values ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          candidateId,
          schedule.dayOfWeek,
          schedule.startTime,
          schedule.endTime,
          schedule.endsAtVenueClose,
          schedule.rawScheduleText,
          schedule.confidence
        ]
      );
    }

    for (const item of input.items) {
      await client.query(
        `
          insert into public.deal_candidate_items (
            candidate_id,
            name,
            category,
            description,
            deal_price,
            regular_price,
            discount_text,
            raw_item_text,
            sort_order,
            confidence
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          candidateId,
          item.name,
          item.category,
          item.description,
          item.dealPrice,
          item.regularPrice,
          item.discountText,
          item.rawItemText,
          item.sortOrder,
          item.confidence
        ]
      );
    }

    return {
      kind: 'created' as const,
      candidateId,
      scheduleCount: input.schedules.length,
      itemCount: input.items.length
    };
  });
}

function queryCandidateReviews(candidateId: string | null) {
  return queryDatabase<CandidateReviewRow>(
    `
      select
        c.id,
        c.venue_id,
        v.name as venue_name,
        c.source_url,
        c.source_type,
        c.source_label,
        c.source_external_id,
        c.source_published_at,
        c.source_last_checked_at,
        c.title,
        c.description,
        c.raw_text,
        c.confidence::double precision as confidence,
        c.review_status,
        c.discovered_at,
        c.created_at,
        c.updated_at,
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', cs.id,
              'dayOfWeek', cs.day_of_week,
              'startTime', cs.start_time::text,
              'endTime', cs.end_time::text,
              'endsAtVenueClose', cs.ends_at_venue_close,
              'rawScheduleText', cs.raw_schedule_text,
              'confidence', cs.confidence::double precision,
              'createdAt', cs.created_at
            )
            order by cs.day_of_week, cs.start_time nulls last, cs.id
          )
          from public.deal_candidate_schedule_windows cs
          where cs.candidate_id = c.id
        ), '[]'::jsonb) as schedules,
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', ci.id,
              'name', ci.name,
              'category', ci.category,
              'description', ci.description,
              'dealPrice', ci.deal_price::double precision,
              'regularPrice', ci.regular_price::double precision,
              'discountText', ci.discount_text,
              'rawItemText', ci.raw_item_text,
              'sortOrder', ci.sort_order,
              'confidence', ci.confidence::double precision,
              'createdAt', ci.created_at
            )
            order by ci.sort_order, ci.id
          )
          from public.deal_candidate_items ci
          where ci.candidate_id = c.id
        ), '[]'::jsonb) as items
      from public.deal_candidates c
      left join public.venues v on v.id = c.venue_id
      where
        ($1::uuid is null and c.review_status = 'pending')
        or c.id = $1::uuid
      order by c.created_at desc, c.id
    `,
    [candidateId]
  );
}

function mapCandidateReviewRow(row: CandidateReviewRow) {
  return {
    id: row.id,
    source: {
      type: row.source_type,
      url: row.source_url,
      label: row.source_label,
      externalId: row.source_external_id,
      publishedAt: row.source_published_at?.toISOString() ?? null,
      lastCheckedAt: row.source_last_checked_at?.toISOString() ?? null
    },
    venue: row.venue_id
      ? {
          id: row.venue_id,
          name: row.venue_name
        }
      : null,
    title: row.title,
    description: row.description,
    rawText: row.raw_text,
    confidence: row.confidence,
    reviewStatus: row.review_status,
    schedules: row.schedules.map((schedule) => ({
      ...schedule,
      createdAt: new Date(schedule.createdAt).toISOString()
    })),
    items: row.items.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt).toISOString()
    })),
    discoveredAt: row.discovered_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}
