import type { FastifyPluginAsync } from 'fastify';
import type { QueryResultRow } from 'pg';

import { withDatabaseTransaction } from '../../db.js';

const ALLOWED_SOURCE_TYPES = [
  'official_website',
  'instagram',
  'facebook',
  'business_submission',
  'user_submission',
  'manual',
  'other'
] as const;

type SourceType = (typeof ALLOWED_SOURCE_TYPES)[number];

type DealCandidateRequestBody = {
  source?: {
    type?: unknown;
    url?: unknown;
    externalId?: unknown;
    label?: unknown;
    publishedAt?: unknown;
  };
  venueId?: unknown;
  title?: unknown;
  description?: unknown;
  rawText?: unknown;
  confidence?: unknown;
  schedules?: unknown;
  items?: unknown;
};

type ParsedCandidate = {
  source: {
    type: SourceType;
    url: string;
    externalId: string | null;
    label: string | null;
    publishedAt: string | null;
  };
  venueId: string | null;
  title: string | null;
  description: string | null;
  rawText: string | null;
  confidence: number | null;
  schedules: ParsedCandidateSchedule[];
  items: ParsedCandidateItem[];
};

type ParsedCandidateSchedule = {
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  endsAtVenueClose: boolean;
  rawScheduleText: string | null;
  confidence: number | null;
};

type ParsedCandidateItem = {
  name: string | null;
  category: string | null;
  description: string | null;
  dealPrice: number | null;
  regularPrice: number | null;
  discountText: string | null;
  rawItemText: string | null;
  sortOrder: number;
  confidence: number | null;
};

type CreatedCandidateRow = QueryResultRow & {
  id: string;
};

export const internalDealCandidateRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: DealCandidateRequestBody }>('/internal/deal-candidates', async (request, reply) => {
    const parsed = parseDealCandidateRequest(request.body);

    if (!parsed.ok) {
      return reply.code(400).send({ error: parsed.error });
    }

    try {
      const result = await withDatabaseTransaction(async (client) => {
        if (parsed.value.venueId) {
          const venueResult = await client.query<{ id: string }>(
            'select id from public.venues where id = $1',
            [parsed.value.venueId]
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
            parsed.value.venueId,
            parsed.value.source.url,
            parsed.value.source.type,
            parsed.value.source.label,
            parsed.value.source.externalId,
            parsed.value.title,
            parsed.value.description,
            parsed.value.rawText,
            parsed.value.source.publishedAt,
            parsed.value.confidence
          ]
        );

        const candidateId = candidateResult.rows[0].id;

        for (const schedule of parsed.value.schedules) {
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

        for (const item of parsed.value.items) {
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
          scheduleCount: parsed.value.schedules.length,
          itemCount: parsed.value.items.length
        };
      });

      if (result.kind === 'invalid_venue') {
        return reply.code(400).send({
          error: 'Invalid request body: venueId'
        });
      }

      return reply.code(201).send({
        candidate: {
          id: result.candidateId,
          reviewStatus: 'pending',
          scheduleCount: result.scheduleCount,
          itemCount: result.itemCount
        }
      });
    } catch (error) {
      if (isDuplicateCandidateError(error)) {
        return reply.code(409).send({
          error: 'Candidate already exists for this source'
        });
      }

      app.log.error({ err: error }, 'Deal candidate ingestion failed');

      return reply.code(500).send({
        error: 'Unable to create deal candidate'
      });
    }
  });
};

function parseDealCandidateRequest(body: DealCandidateRequestBody | undefined) {
  if (!body || typeof body !== 'object') {
    return invalid('Invalid request body');
  }

  const source = body.source;
  if (!source || typeof source !== 'object') {
    return invalid('Invalid request body: source');
  }

  const sourceType = parseSourceType(source.type);
  if (!sourceType.ok) {
    return sourceType;
  }

  const sourceUrl = parseSourceUrl(source.url);
  if (!sourceUrl.ok) {
    return sourceUrl;
  }

  const sourceExternalId = parseOptionalString(source.externalId, 'source.externalId');
  if (!sourceExternalId.ok) {
    return sourceExternalId;
  }

  const sourceLabel = parseOptionalString(source.label, 'source.label');
  if (!sourceLabel.ok) {
    return sourceLabel;
  }

  const sourcePublishedAt = parseOptionalTimestamp(source.publishedAt, 'source.publishedAt');
  if (!sourcePublishedAt.ok) {
    return sourcePublishedAt;
  }

  const venueId = parseOptionalUuid(body.venueId, 'venueId');
  if (!venueId.ok) {
    return venueId;
  }

  const title = parseOptionalString(body.title, 'title');
  if (!title.ok) {
    return title;
  }

  const description = parseOptionalString(body.description, 'description');
  if (!description.ok) {
    return description;
  }

  const rawText = parseOptionalString(body.rawText, 'rawText');
  if (!rawText.ok) {
    return rawText;
  }

  const confidence = parseOptionalConfidence(body.confidence, 'confidence');
  if (!confidence.ok) {
    return confidence;
  }

  const schedules = parseSchedules(body.schedules);
  if (!schedules.ok) {
    return schedules;
  }

  const items = parseItems(body.items);
  if (!items.ok) {
    return items;
  }

  return {
    ok: true as const,
    value: {
      source: {
        type: sourceType.value,
        url: sourceUrl.value,
        externalId: sourceExternalId.value,
        label: sourceLabel.value,
        publishedAt: sourcePublishedAt.value
      },
      venueId: venueId.value,
      title: title.value,
      description: description.value,
      rawText: rawText.value,
      confidence: confidence.value,
      schedules: schedules.value,
      items: items.value
    }
  };
}

function parseSchedules(input: unknown) {
  if (input === undefined) {
    return { ok: true as const, value: [] as ParsedCandidateSchedule[] };
  }

  if (!Array.isArray(input)) {
    return invalid('Invalid request body: schedules');
  }

  const schedules: ParsedCandidateSchedule[] = [];

  for (const [index, entry] of input.entries()) {
    if (!entry || typeof entry !== 'object') {
      return invalid(`Invalid request body: schedules[${index}]`);
    }

    const schedule = entry as Record<string, unknown>;
    const dayOfWeek = parseDayOfWeek(schedule.dayOfWeek, `schedules[${index}].dayOfWeek`);
    if (!dayOfWeek.ok) {
      return dayOfWeek;
    }

    const startTime = parseOptionalTime(schedule.startTime, `schedules[${index}].startTime`);
    if (!startTime.ok) {
      return startTime;
    }

    const endTime = parseOptionalTime(schedule.endTime, `schedules[${index}].endTime`);
    if (!endTime.ok) {
      return endTime;
    }

    const endsAtVenueClose = parseOptionalBoolean(schedule.endsAtVenueClose, `schedules[${index}].endsAtVenueClose`);
    if (!endsAtVenueClose.ok) {
      return endsAtVenueClose;
    }

    const rawScheduleText = parseOptionalString(schedule.rawScheduleText, `schedules[${index}].rawScheduleText`);
    if (!rawScheduleText.ok) {
      return rawScheduleText;
    }

    const confidence = parseOptionalConfidence(schedule.confidence, `schedules[${index}].confidence`);
    if (!confidence.ok) {
      return confidence;
    }

    schedules.push({
      dayOfWeek: dayOfWeek.value,
      startTime: startTime.value,
      endTime: endTime.value,
      endsAtVenueClose: endsAtVenueClose.value ?? false,
      rawScheduleText: rawScheduleText.value,
      confidence: confidence.value
    });
  }

  return { ok: true as const, value: schedules };
}

function parseItems(input: unknown) {
  if (input === undefined) {
    return { ok: true as const, value: [] as ParsedCandidateItem[] };
  }

  if (!Array.isArray(input)) {
    return invalid('Invalid request body: items');
  }

  const items: ParsedCandidateItem[] = [];

  for (const [index, entry] of input.entries()) {
    if (!entry || typeof entry !== 'object') {
      return invalid(`Invalid request body: items[${index}]`);
    }

    const item = entry as Record<string, unknown>;
    const name = parseOptionalString(item.name, `items[${index}].name`);
    if (!name.ok) {
      return name;
    }

    const category = parseOptionalString(item.category, `items[${index}].category`);
    if (!category.ok) {
      return category;
    }

    const description = parseOptionalString(item.description, `items[${index}].description`);
    if (!description.ok) {
      return description;
    }

    const dealPrice = parseOptionalNonNegativeNumber(item.dealPrice, `items[${index}].dealPrice`);
    if (!dealPrice.ok) {
      return dealPrice;
    }

    const regularPrice = parseOptionalNonNegativeNumber(item.regularPrice, `items[${index}].regularPrice`);
    if (!regularPrice.ok) {
      return regularPrice;
    }

    const discountText = parseOptionalString(item.discountText, `items[${index}].discountText`);
    if (!discountText.ok) {
      return discountText;
    }

    const rawItemText = parseOptionalString(item.rawItemText, `items[${index}].rawItemText`);
    if (!rawItemText.ok) {
      return rawItemText;
    }

    const sortOrder = parseOptionalSortOrder(item.sortOrder, `items[${index}].sortOrder`, index);
    if (!sortOrder.ok) {
      return sortOrder;
    }

    const confidence = parseOptionalConfidence(item.confidence, `items[${index}].confidence`);
    if (!confidence.ok) {
      return confidence;
    }

    items.push({
      name: name.value,
      category: category.value,
      description: description.value,
      dealPrice: dealPrice.value,
      regularPrice: regularPrice.value,
      discountText: discountText.value,
      rawItemText: rawItemText.value,
      sortOrder: sortOrder.value,
      confidence: confidence.value
    });
  }

  return { ok: true as const, value: items };
}

function parseSourceType(input: unknown) {
  if (typeof input !== 'string' || !ALLOWED_SOURCE_TYPES.includes(input as SourceType)) {
    return invalid('Invalid request body: source.type');
  }

  return { ok: true as const, value: input as SourceType };
}

function parseSourceUrl(input: unknown) {
  if (typeof input !== 'string' || input.trim() === '') {
    return invalid('Invalid request body: source.url');
  }

  try {
    const url = new URL(input.trim());

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return invalid('Invalid request body: source.url');
    }

    return { ok: true as const, value: url.toString() };
  } catch {
    return invalid('Invalid request body: source.url');
  }
}

function parseOptionalString(input: unknown, field: string) {
  if (input === undefined || input === null) {
    return { ok: true as const, value: null };
  }

  if (typeof input !== 'string') {
    return invalid(`Invalid request body: ${field}`);
  }

  const trimmed = input.trim();
  return { ok: true as const, value: trimmed === '' ? null : trimmed };
}

function parseOptionalTimestamp(input: unknown, field: string) {
  if (input === undefined || input === null) {
    return { ok: true as const, value: null };
  }

  if (typeof input !== 'string') {
    return invalid(`Invalid request body: ${field}`);
  }

  const trimmed = input.trim();
  if (trimmed === '') {
    return { ok: true as const, value: null };
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return invalid(`Invalid request body: ${field}`);
  }

  return { ok: true as const, value: new Date(parsed).toISOString() };
}

function parseOptionalUuid(input: unknown, field: string) {
  if (input === undefined || input === null) {
    return { ok: true as const, value: null };
  }

  if (typeof input !== 'string') {
    return invalid(`Invalid request body: ${field}`);
  }

  const trimmed = input.trim();
  if (trimmed === '') {
    return { ok: true as const, value: null };
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
    return invalid(`Invalid request body: ${field}`);
  }

  return { ok: true as const, value: trimmed };
}

function parseOptionalConfidence(input: unknown, field: string) {
  if (input === undefined || input === null) {
    return { ok: true as const, value: null };
  }

  if (typeof input !== 'number' || !Number.isFinite(input) || input < 0 || input > 1) {
    return invalid(`Invalid request body: ${field}`);
  }

  return { ok: true as const, value: input };
}

function parseDayOfWeek(input: unknown, field: string) {
  if (typeof input !== 'number' || !Number.isInteger(input) || input < 0 || input > 6) {
    return invalid(`Invalid request body: ${field}`);
  }

  return { ok: true as const, value: input };
}

function parseOptionalTime(input: unknown, field: string) {
  if (input === undefined || input === null) {
    return { ok: true as const, value: null };
  }

  if (typeof input !== 'string') {
    return invalid(`Invalid request body: ${field}`);
  }

  const trimmed = input.trim();
  if (trimmed === '') {
    return { ok: true as const, value: null };
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(trimmed)) {
    return invalid(`Invalid request body: ${field}`);
  }

  return { ok: true as const, value: trimmed };
}

function parseOptionalBoolean(input: unknown, field: string) {
  if (input === undefined) {
    return { ok: true as const, value: null };
  }

  if (typeof input !== 'boolean') {
    return invalid(`Invalid request body: ${field}`);
  }

  return { ok: true as const, value: input };
}

function parseOptionalNonNegativeNumber(input: unknown, field: string) {
  if (input === undefined || input === null) {
    return { ok: true as const, value: null };
  }

  if (typeof input !== 'number' || !Number.isFinite(input) || input < 0) {
    return invalid(`Invalid request body: ${field}`);
  }

  return { ok: true as const, value: input };
}

function parseOptionalSortOrder(input: unknown, field: string, fallback: number) {
  if (input === undefined) {
    return { ok: true as const, value: fallback };
  }

  if (typeof input !== 'number' || !Number.isInteger(input) || input < 0) {
    return invalid(`Invalid request body: ${field}`);
  }

  return { ok: true as const, value: input };
}

function isDuplicateCandidateError(error: unknown) {
  return (
    isDatabaseError(error) &&
    error.code === '23505' &&
    error.constraint === 'deal_candidates_source_type_external_id_uidx'
  );
}

function isDatabaseError(error: unknown): error is { code?: unknown; constraint?: unknown } {
  return typeof error === 'object' && error !== null;
}

function invalid(error: string) {
  return { ok: false as const, error };
}
