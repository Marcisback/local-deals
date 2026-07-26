import type { FastifyPluginAsync } from 'fastify';

import { queryDatabase } from '../db.js';

const DEFAULT_RADIUS_MILES = 5;
const MAX_RADIUS_MILES = 25;
const METERS_PER_MILE = 1609.344;

type NearbyDealsQuery = {
  lat?: string;
  lng?: string;
  radiusMiles?: string;
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
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export const dealRoutes: FastifyPluginAsync = async (app) => {
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
          with user_location as (
            select
              st_setsrid(st_makepoint($1, $2), 4326)::geography as point,
              $3::double precision as radius_meters
          ),
          ranked_deals as (
            select
              v.id as venue_id,
              v.name as venue_name,
              v.venue_type,
              v.city,
              v.region,
              d.id as deal_id,
              d.title as deal_title,
              d.description as deal_description,
              round((st_distance(v.location, ul.point) / $4::double precision)::numeric, 2)::double precision as distance_miles,
              ds.day_of_week,
              ds.start_time::text as start_time,
              ds.end_time::text as end_time,
              row_number() over (
                partition by d.id
                order by
                  st_distance(v.location, ul.point),
                  ds.day_of_week,
                  ds.start_time,
                  ds.end_time
              ) as row_number
            from public.venues v
            cross join user_location ul
            join public.deals d on d.venue_id = v.id
            join public.deal_schedule_windows ds on ds.deal_id = d.id
            where
              v.status = 'active'
              and d.status = 'active'
              and st_dwithin(v.location, ul.point, ul.radius_meters)
              and (d.starts_on is null or d.starts_on <= timezone(v.timezone, now())::date)
              and (d.ends_on is null or d.ends_on >= timezone(v.timezone, now())::date)
              and ds.day_of_week = extract(dow from timezone(v.timezone, now()))::int
              and timezone(v.timezone, now())::time >= ds.start_time
              and timezone(v.timezone, now())::time < ds.end_time
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
            day_of_week,
            start_time,
            end_time
          from ranked_deals
          where row_number = 1
          order by distance_miles asc, venue_name asc, deal_title asc
        `,
        [
          parsed.value.lng,
          parsed.value.lat,
          parsed.value.radiusMiles * METERS_PER_MILE,
          METERS_PER_MILE
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

  return {
    ok: true as const,
    value: {
      lat: lat.value,
      lng: lng.value,
      radiusMiles
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
