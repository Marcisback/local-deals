import type { FastifyPluginAsync } from 'fastify';

import { queryDatabase } from '../db.js';

const DEFAULT_RADIUS_MILES = 5;
const MAX_RADIUS_MILES = 25;
const METERS_PER_MILE = 1609.344;
const ALLOWED_VENUE_TYPES = ['restaurant', 'bar', 'brewery', 'cafe'] as const;

type VenueType = (typeof ALLOWED_VENUE_TYPES)[number];

type DealRoutesOptions = {
  now?: () => Date;
};

type NearbyDealsQuery = {
  lat?: string;
  lng?: string;
  radiusMiles?: string;
  venueType?: string;
};

type NearbyDealRow = {
  venue_id: string;
  venue_name: string;
  venue_type: string;
  city: string | null;
  region: string | null;
  deal_id: string;
  deal_title: string;
  deal_description: string | null;
  distance_miles: number;
  availability: 'active_now' | 'later_today';
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export const dealRoutes: FastifyPluginAsync<DealRoutesOptions> = async (app, options) => {
  app.get<{ Querystring: NearbyDealsQuery }>('/deals/nearby', async (request, reply) => {
    const parsed = parseNearbyDealsQuery(request.query);

    if (!parsed.ok) {
      return reply.code(400).send({
        error: parsed.error
      });
    }

    try {
      const result = await queryDatabase<NearbyDealRow>(
        `
          with request_context as (
            select coalesce($6::timestamptz, now()) as current_time
          ),
          user_location as (
            select
              st_setsrid(st_makepoint($1, $2), 4326)::geography as point,
              $3::double precision as radius_meters
          ),
          venue_context as (
            select
              v.id as venue_id,
              v.name as venue_name,
              v.venue_type,
              v.city,
              v.region,
              v.location,
              v.timezone,
              v.status as venue_status,
              v.is_verified as venue_is_verified,
              ul.point,
              ul.radius_meters,
              timezone(v.timezone, rc.current_time) as local_now,
              timezone(v.timezone, rc.current_time)::date as local_date,
              extract(dow from timezone(v.timezone, rc.current_time))::int as local_dow,
              ((extract(dow from timezone(v.timezone, rc.current_time))::int + 6) % 7) as previous_dow
            from public.venues v
            cross join user_location ul
            cross join request_context rc
          ),
          deal_occurrences as (
            select
              vc.venue_id,
              vc.venue_name,
              vc.venue_type,
              vc.city,
              vc.region,
              d.id as deal_id,
              d.title as deal_title,
              d.description as deal_description,
              round((st_distance(vc.location, vc.point) / $4::double precision)::numeric, 2)::double precision as distance_miles,
              case
                when vc.local_now >= occurrence.schedule_start_at then 'active_now'
                else 'later_today'
              end as availability,
              ds.day_of_week,
              ds.start_time::text as start_time,
              coalesce(ds.end_time::text, venue_close.resolved_end_time::text) as end_time,
              occurrence.schedule_start_at
            from venue_context vc
            join public.deals d on d.venue_id = vc.venue_id
            join public.deal_schedule_windows ds on ds.deal_id = d.id
            cross join lateral (
              select
                case
                  when ds.day_of_week = vc.local_dow then vc.local_date
                  when ds.ends_at_venue_close = true and ds.day_of_week = vc.previous_dow then vc.local_date - 1
                  else null
                end as source_date
            ) schedule_date
            cross join lateral (
              select schedule_date.source_date::timestamp + ds.start_time as schedule_start_at
            ) occurrence
            left join lateral (
              -- Until-close windows resolve against venue hours for the schedule's source day,
              -- including a previous-day occurrence that remains active after midnight.
              select
                vh.close_time as resolved_end_time,
                schedule_date.source_date::timestamp + vh.close_time
                  + case when vh.closes_next_day then interval '1 day' else interval '0' end as schedule_end_at
              from public.venue_hours vh
              where
                ds.ends_at_venue_close = true
                and vh.venue_id = vc.venue_id
                and vh.day_of_week = ds.day_of_week
                and schedule_date.source_date is not null
                and schedule_date.source_date::timestamp + vh.open_time <= occurrence.schedule_start_at
                and schedule_date.source_date::timestamp + vh.close_time
                  + case when vh.closes_next_day then interval '1 day' else interval '0' end
                  > occurrence.schedule_start_at
              order by schedule_end_at asc
              limit 1
            ) venue_close on true
            cross join lateral (
              select coalesce(
                schedule_date.source_date::timestamp + ds.end_time,
                venue_close.schedule_end_at
              ) as schedule_end_at
            ) occurrence_end
            where
              vc.venue_status = 'active'
              and vc.venue_is_verified = true
              and d.status = 'active'
              and d.verification_status = 'verified'
              and st_dwithin(vc.location, vc.point, vc.radius_meters)
              and ($5::text is null or vc.venue_type = $5::text)
              and (d.starts_on is null or d.starts_on <= vc.local_now::date)
              and (d.ends_on is null or d.ends_on >= vc.local_now::date)
              and occurrence.schedule_start_at is not null
              and occurrence_end.schedule_end_at is not null
              and vc.local_now < occurrence_end.schedule_end_at
          ),
          ranked_deals as (
            select
              deal_occurrences.*,
              row_number() over (
                partition by deal_id
                order by
                  case availability when 'active_now' then 0 else 1 end,
                  case when availability = 'later_today' then schedule_start_at end,
                  day_of_week,
                  start_time,
                  end_time
              ) as row_number
            from deal_occurrences
          )
          select
            venue_id,
            venue_name,
            venue_type,
            city,
            region,
            deal_id,
            deal_title,
            deal_description,
            distance_miles,
            availability,
            day_of_week,
            start_time,
            end_time
          from ranked_deals
          where row_number = 1
          order by
            case availability when 'active_now' then 0 else 1 end,
            case when availability = 'later_today' then schedule_start_at end asc,
            distance_miles asc,
            venue_name asc,
            deal_title asc
        `,
        [
          parsed.value.lng,
          parsed.value.lat,
          parsed.value.radiusMiles * METERS_PER_MILE,
          METERS_PER_MILE,
          parsed.value.venueType ?? null,
          options.now?.() ?? null
        ]
      );

      return {
        deals: result.rows.map((row) => ({
          venue: {
            id: row.venue_id,
            name: row.venue_name,
            venueType: row.venue_type,
            city: row.city,
            region: row.region
          },
          deal: {
            id: row.deal_id,
            title: row.deal_title,
            description: row.deal_description
          },
          distanceMiles: row.distance_miles,
          availability: row.availability,
          schedule: {
            dayOfWeek: row.day_of_week,
            startTime: row.start_time,
            endTime: row.end_time
          }
        }))
      };
    } catch (error) {
      app.log.error({ err: error }, 'Nearby deals query failed');

      return reply.code(503).send({
        error: 'Unable to load nearby deals'
      });
    }
  });
};

function parseNearbyDealsQuery(query: NearbyDealsQuery) {
  const lat = parseNumberParam(query.lat, 'lat');
  if (!lat.ok) {
    return lat;
  }

  if (lat.value < -90 || lat.value > 90) {
    return { ok: false as const, error: 'Invalid query parameter: lat' };
  }

  const lng = parseNumberParam(query.lng, 'lng');
  if (!lng.ok) {
    return lng;
  }

  if (lng.value < -180 || lng.value > 180) {
    return { ok: false as const, error: 'Invalid query parameter: lng' };
  }

  let radiusMiles = DEFAULT_RADIUS_MILES;

  if (query.radiusMiles !== undefined) {
    const parsedRadius = parseNumberParam(query.radiusMiles, 'radiusMiles');

    if (!parsedRadius.ok) {
      return parsedRadius;
    }

    if (parsedRadius.value <= 0 || parsedRadius.value > MAX_RADIUS_MILES) {
      return { ok: false as const, error: 'Invalid query parameter: radiusMiles' };
    }

    radiusMiles = parsedRadius.value;
  }

  const venueType = parseVenueTypeParam(query.venueType);
  if (!venueType.ok) {
    return venueType;
  }

  return {
    ok: true as const,
    value: {
      lat: lat.value,
      lng: lng.value,
      radiusMiles,
      venueType: venueType.value
    }
  };
}

function parseNumberParam(value: string | undefined, name: 'lat' | 'lng' | 'radiusMiles') {
  if (value === undefined || value.trim() === '') {
    return {
      ok: false as const,
      error: `Invalid query parameter: ${name}`
    };
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return {
      ok: false as const,
      error: `Invalid query parameter: ${name}`
    };
  }

  return {
    ok: true as const,
    value: parsed
  };
}

function parseVenueTypeParam(value: string | undefined) {
  if (value === undefined) {
    return {
      ok: true as const,
      value: undefined
    };
  }

  if (isVenueType(value)) {
    return {
      ok: true as const,
      value
    };
  }

  return {
    ok: false as const,
    error: 'Invalid query parameter: venueType'
  };
}

function isVenueType(value: string): value is VenueType {
  return ALLOWED_VENUE_TYPES.some((allowedType) => allowedType === value);
}
