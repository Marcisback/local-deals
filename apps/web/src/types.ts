export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_review';

export type CandidateSchedule = {
  id: string;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  endsAtVenueClose: boolean;
  rawScheduleText: string | null;
  confidence: number | null;
  createdAt: string;
};

export type CandidateItem = {
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

export type DealCandidate = {
  id: string;
  source: {
    type: string;
    url: string;
    label: string | null;
    externalId: string | null;
    publishedAt: string | null;
    lastCheckedAt: string | null;
  };
  venue: {
    id: string;
    name: string | null;
  } | null;
  title: string | null;
  description: string | null;
  rawText: string | null;
  confidence: number | null;
  reviewStatus: ReviewStatus;
  schedules: CandidateSchedule[];
  items: CandidateItem[];
  discoveredAt: string;
  createdAt: string;
  updatedAt: string;
  publishedDealId: string | null;
  publishedAt: string | null;
};

export type PublicationResult = {
  candidateId: string;
  dealId: string;
  publicationStatus: 'published' | 'already_published';
  scheduleCount: number;
  itemCount: number;
};
