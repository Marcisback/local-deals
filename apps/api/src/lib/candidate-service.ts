import type { QueryResultRow } from 'pg';

import { queryDatabase, withDatabaseTransaction } from '../db.js';
import type { CandidateSourceType, ParsedCandidateInput } from './candidate-input.js';

type CreatedCandidateRow = QueryResultRow & {
  id: string;
};

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
