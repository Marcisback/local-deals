import './styles.css';

import {
  approveCandidate,
  assignCandidateVenue,
  getCandidate,
  listCandidates,
  listVenues,
  publishCandidate,
  rejectCandidate
} from './api';
import type {
  CandidateItem,
  CandidateListStatus,
  CandidateSchedule,
  DealCandidate,
  InternalVenue
} from './types';

const appElement = document.querySelector<HTMLDivElement>('#app');

if (!appElement) {
  throw new Error('Application root was not found');
}

const app: HTMLDivElement = appElement;

let routeVersion = 0;

window.addEventListener('hashchange', () => void renderRoute());
void renderRoute();

async function renderRoute() {
  const version = ++routeVersion;
  const candidateId = readCandidateId();
  const listStatus = readListStatus();

  renderShell(candidateId ? 'Candidate detail' : `${humanize(listStatus)} candidates`, listStatus);

  if (candidateId) {
    await renderCandidateRoute(candidateId, listStatus, version);
  } else {
    await renderCandidateListRoute(listStatus, version);
  }
}

function renderShell(pageName: string, listStatus: CandidateListStatus) {
  app.replaceChildren();

  const header = element('header', 'app-header');
  const headerInner = element('div', 'app-header__inner');
  const brand = element('a', 'brand');
  brand.href = '#/';
  brand.append(element('span', 'brand__mark', 'LD'), element('span', '', 'Local Deals Review'));
  headerInner.append(brand, element('span', 'environment-label', 'Internal · development only'));
  header.append(headerInner);

  const main = element('main', 'page');
  const heading = element('div', 'page-heading');
  heading.append(element('p', 'eyebrow', 'Candidate staging'), element('h1', '', pageName));
  main.append(heading, renderStatusTabs(listStatus), element('div', 'route-content'));
  app.append(header, main);
}

async function renderCandidateListRoute(status: CandidateListStatus, version: number) {
  const content = routeContent();
  content.replaceChildren(renderLoading(`Loading ${status} candidates…`));

  try {
    const candidates = await listCandidates(status);
    if (version !== routeVersion) return;

    content.replaceChildren(renderCandidateList(candidates, status));
  } catch (error) {
    if (version !== routeVersion) return;
    content.replaceChildren(renderError(error, () => void renderRoute()));
  }
}

function renderCandidateList(candidates: DealCandidate[], status: CandidateListStatus) {
  if (candidates.length === 0) {
    const empty = element('section', 'empty-state panel');
    empty.append(
      element('h2', '', `No ${status} candidates`),
      element('p', 'muted', emptyListMessage(status))
    );
    return empty;
  }

  const panel = element('section', 'panel table-panel');
  const summary = element('div', 'panel-heading');
  summary.append(
    element('div', '', `${candidates.length} ${status} candidate${candidates.length === 1 ? '' : 's'}`),
    element('span', 'muted', 'Newest first')
  );

  const wrap = element('div', 'table-scroll');
  const table = element('table', 'data-table');
  const head = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const heading of ['Candidate', 'Source', 'Venue', 'Confidence', 'Created', 'Checked']) {
    headerRow.append(element('th', '', heading));
  }
  head.append(headerRow);

  const body = document.createElement('tbody');
  for (const candidate of candidates) {
    const row = document.createElement('tr');
    const titleCell = document.createElement('td');
    const titleLink = element('a', 'candidate-link', candidate.title?.trim() || 'Untitled candidate');
    titleLink.href = `#/candidates/${encodeURIComponent(candidate.id)}?from=${status}`;
    titleCell.append(titleLink, element('span', 'row-id', shortId(candidate.id)));

    const sourceCell = document.createElement('td');
    sourceCell.append(
      element('span', '', candidate.source.label || 'Unlabeled source'),
      element('span', 'cell-detail', humanize(candidate.source.type))
    );

    row.append(
      titleCell,
      sourceCell,
      tableCell(candidate.venue?.name || 'Unlinked', candidate.venue ? '' : 'muted'),
      tableCell(formatConfidence(candidate.confidence)),
      tableCell(formatDate(candidate.createdAt)),
      tableCell(formatDate(candidate.source.lastCheckedAt))
    );
    body.append(row);
  }

  table.append(head, body);
  wrap.append(table);
  panel.append(summary, wrap);
  return panel;
}

async function renderCandidateRoute(candidateId: string, listStatus: CandidateListStatus, version: number) {
  const content = routeContent();
  content.replaceChildren(renderLoading('Loading candidate…'));

  const state: DetailState = {
    candidate: null,
    busy: false,
    venueBusy: false,
    reviewNote: '',
    venueSearch: '',
    selectedVenueId: '',
    venues: [],
    feedback: null,
    publishError: null,
    listStatus
  };

  const paint = () => {
    if (version !== routeVersion || !state.candidate) return;
    content.replaceChildren(renderCandidateDetail(state, paint, version));
  };

  try {
    const [candidate, venues] = await Promise.all([getCandidate(candidateId), listVenues()]);
    state.candidate = candidate;
    state.venues = venues;
    state.selectedVenueId = candidate.venue?.id ?? '';
    if (version !== routeVersion) return;
    paint();
  } catch (error) {
    if (version !== routeVersion) return;
    content.replaceChildren(renderError(error, () => void renderRoute()));
  }
}

type DetailState = {
  candidate: DealCandidate | null;
  busy: boolean;
  venueBusy: boolean;
  reviewNote: string;
  venueSearch: string;
  selectedVenueId: string;
  venues: InternalVenue[];
  feedback: { kind: 'success' | 'error'; message: string } | null;
  publishError: string | null;
  listStatus: CandidateListStatus;
};

function renderCandidateDetail(state: DetailState, paint: () => void, version: number) {
  const candidate = state.candidate;
  if (!candidate) return renderLoading('Loading candidate…');

  const container = element('div', 'detail-page');
  const back = element('a', 'back-link', `← ${humanize(state.listStatus)} candidates`);
  back.href = listStatusHref(state.listStatus);
  container.append(back);

  if (state.feedback) {
    container.append(element('div', `feedback feedback--${state.feedback.kind}`, state.feedback.message));
  }

  const summary = element('section', 'panel detail-summary');
  const summaryTop = element('div', 'detail-summary__top');
  const titleGroup = element('div', 'detail-title');
  titleGroup.append(
    element('span', `status status--${candidate.reviewStatus}`, humanize(candidate.reviewStatus)),
    element('h2', '', candidate.title?.trim() || 'Untitled candidate'),
    element('p', 'muted mono', candidate.id)
  );
  const confidence = element('div', 'confidence-block');
  confidence.append(element('span', 'label', 'Confidence'), element('strong', '', formatConfidence(candidate.confidence)));
  summaryTop.append(titleGroup, confidence);

  const facts = element('dl', 'facts-grid');
  addFact(
    facts,
    'Venue',
    candidate.venue
      ? `${candidate.venue.name || 'Unnamed venue'} · ${candidate.venue.isVerified ? 'Verified' : 'Unverified'}`
      : 'Not linked'
  );
  addFact(facts, 'Created', formatDate(candidate.createdAt));
  addFact(facts, 'Last checked', formatDate(candidate.source.lastCheckedAt));
  addFact(facts, 'Discovered', formatDate(candidate.discoveredAt));
  summary.append(summaryTop, facts);
  container.append(summary);

  const grid = element('div', 'detail-grid');
  const mainColumn = element('div', 'detail-column');
  mainColumn.append(
    renderTextPanel('Description', candidate.description, 'No normalized description.'),
    renderSchedules(candidate.schedules),
    renderItems(candidate.items),
    renderTextPanel('Raw evidence', candidate.rawText, 'No raw evidence was stored.', true)
  );

  const sideColumn = element('aside', 'detail-column');
  sideColumn.append(renderVenuePanel(state, paint, version), renderSource(candidate), renderPublication(candidate));
  if (candidate.reviewStatus === 'pending' || candidate.reviewStatus === 'approved') {
    sideColumn.append(renderActions(state, paint, version));
  }

  grid.append(mainColumn, sideColumn);
  container.append(grid);
  return container;
}

function renderVenuePanel(state: DetailState, paint: () => void, version: number) {
  const candidate = state.candidate as DealCandidate;
  const panel = panelWithHeading('Linked venue');

  if (candidate.venue) {
    const current = element('div', 'venue-current');
    current.append(
      element('strong', '', candidate.venue.name || 'Unnamed venue'),
      element(
        'span',
        candidate.venue.isVerified ? 'verification verification--verified' : 'verification verification--unverified',
        candidate.venue.isVerified ? 'Verified venue' : 'Unverified venue'
      )
    );
    panel.append(current);
  } else {
    panel.append(
      element('div', 'publish-message publish-message--warning', 'A verified venue must be linked before publication.')
    );
  }

  if (candidate.publishedDealId) {
    panel.append(element('p', 'muted action-copy', 'The venue link is locked after publication.'));
    return panel;
  }

  const searchForm = element('form', 'venue-search');
  const searchInput = element('input', 'venue-search__input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search venue name or city';
  searchInput.value = state.venueSearch;
  searchInput.disabled = state.venueBusy || state.busy;
  searchInput.addEventListener('input', () => {
    state.venueSearch = searchInput.value;
  });
  const searchButton = actionButton('Search', 'button button--secondary', state.venueBusy || state.busy, state.venueBusy);
  searchButton.type = 'submit';
  searchForm.append(searchInput, searchButton);
  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    void searchVenues(state, paint, version);
  });

  const selectLabel = element('label', 'field-label', 'Existing venue');
  selectLabel.htmlFor = 'candidate-venue';
  const select = element('select', 'venue-select');
  select.id = 'candidate-venue';
  select.disabled = state.venueBusy || state.busy;
  const placeholder = element('option', '', state.venues.length > 0 ? 'Select a venue' : 'No matching venues');
  placeholder.value = '';
  select.append(placeholder);
  for (const venue of state.venues) {
    const location = [venue.city, venue.region].filter(Boolean).join(', ');
    const option = element(
      'option',
      '',
      `${venue.name}${location ? ` — ${location}` : ''} (${venue.isVerified ? 'verified' : 'unverified'})`
    );
    option.value = venue.id;
    option.selected = venue.id === state.selectedVenueId;
    select.append(option);
  }
  select.addEventListener('change', () => {
    state.selectedVenueId = select.value;
  });

  const isUnchanged = state.selectedVenueId === (candidate.venue?.id ?? '');
  const assignButton = actionButton(
    candidate.venue ? 'Change linked venue' : 'Link venue',
    'button button--secondary',
    state.venueBusy || state.busy || !state.selectedVenueId || isUnchanged,
    state.venueBusy
  );
  assignButton.addEventListener('click', () => {
    void linkVenue(state, paint, version);
  });

  panel.append(searchForm, selectLabel, select, assignButton);
  return panel;
}

async function searchVenues(state: DetailState, paint: () => void, version: number) {
  if (state.venueBusy || state.busy) return;

  state.venueBusy = true;
  state.feedback = null;
  paint();

  try {
    state.venues = await listVenues(state.venueSearch);
    if (version !== routeVersion) return;
    if (!state.venues.some((venue) => venue.id === state.selectedVenueId)) {
      state.selectedVenueId = '';
    }
  } catch (error) {
    if (version !== routeVersion) return;
    state.feedback = { kind: 'error', message: errorMessage(error) };
  } finally {
    if (version === routeVersion) {
      state.venueBusy = false;
      paint();
    }
  }
}

async function linkVenue(state: DetailState, paint: () => void, version: number) {
  if (state.venueBusy || state.busy || !state.candidate || !state.selectedVenueId) return;

  state.venueBusy = true;
  state.feedback = null;
  paint();

  try {
    await assignCandidateVenue(state.candidate.id, state.selectedVenueId);
    const refreshed = await getCandidate(state.candidate.id);
    if (version !== routeVersion) return;
    state.candidate = refreshed;
    state.selectedVenueId = refreshed.venue?.id ?? '';
    state.publishError = null;
    state.feedback = {
      kind: 'success',
      message: `Linked ${refreshed.venue?.name || 'venue'}. Publication was not started.`
    };
  } catch (error) {
    if (version !== routeVersion) return;
    state.feedback = { kind: 'error', message: errorMessage(error) };
  } finally {
    if (version === routeVersion) {
      state.venueBusy = false;
      paint();
    }
  }
}

function renderSource(candidate: DealCandidate) {
  const panel = panelWithHeading('Source');
  const facts = element('dl', 'stacked-facts');
  addFact(facts, 'Label', candidate.source.label || '—');
  addFact(facts, 'Type', humanize(candidate.source.type));
  addFact(facts, 'External ID', candidate.source.externalId || '—');
  addFact(facts, 'Source published', formatDate(candidate.source.publishedAt));

  const linkRow = element('div', 'source-link');
  linkRow.append(element('span', 'label', 'URL'));
  const link = safeExternalLink(candidate.source.url);
  linkRow.append(link);
  panel.append(facts, linkRow);
  return panel;
}

function renderPublication(candidate: DealCandidate) {
  const panel = panelWithHeading('Publication');
  if (!candidate.publishedDealId) {
    panel.append(element('p', 'muted', 'Not published. Publication remains separate from review approval.'));
    return panel;
  }

  const facts = element('dl', 'stacked-facts');
  addFact(facts, 'Production deal ID', candidate.publishedDealId, true);
  addFact(facts, 'Published', formatDate(candidate.publishedAt));
  panel.append(facts);
  return panel;
}

function renderActions(state: DetailState, paint: () => void, version: number) {
  const candidate = state.candidate as DealCandidate;
  const panel = panelWithHeading('Actions');

  if (candidate.reviewStatus === 'approved') {
    panel.append(element('p', 'muted action-copy', 'This candidate is approved. Publication remains a separate action.'));
    if (!candidate.publishedDealId) {
      const publishBlocker = getLocalPublishBlocker(candidate);
      if (publishBlocker) {
        panel.append(element('div', 'publish-message publish-message--warning', publishBlocker));
      }
      if (state.publishError) {
        panel.append(element('div', 'publish-message publish-message--error', state.publishError));
      }

      const publishButton = actionButton(
        'Publish candidate',
        'button button--primary',
        state.busy || state.venueBusy || Boolean(publishBlocker),
        state.busy
      );
      publishButton.addEventListener('click', () => {
        void runAction(
          state,
          paint,
          version,
          async () => {
            const result = await publishCandidate(candidate.id);
            state.listStatus = 'published';
            return `Published deal ${shortId(result.dealId)} with ${result.scheduleCount} schedule${result.scheduleCount === 1 ? '' : 's'} and ${result.itemCount} item${result.itemCount === 1 ? '' : 's'}.`;
          },
          'publish'
        );
      });
      panel.append(publishButton);
    }
    return panel;
  }

  const approveButton = actionButton('Approve', 'button button--primary', state.busy || state.venueBusy, state.busy);
  approveButton.addEventListener('click', () => {
    void runAction(state, paint, version, async () => {
      await approveCandidate(candidate.id);
      state.listStatus = 'approved';
      return 'Candidate approved. It has not been published.';
    });
  });

  const divider = element('div', 'action-divider');
  divider.append(element('span', '', 'or reject'));
  const label = element('label', 'field-label', 'Review note (optional)');
  label.htmlFor = 'review-note';
  const textarea = element('textarea', 'review-note');
  textarea.id = 'review-note';
  textarea.rows = 4;
  textarea.maxLength = 2000;
  textarea.placeholder = 'Reason the candidate should not proceed';
  textarea.value = state.reviewNote;
  textarea.disabled = state.busy || state.venueBusy;
  textarea.addEventListener('input', () => {
    state.reviewNote = textarea.value;
  });

  const rejectButton = actionButton(
    'Reject candidate',
    'button button--danger',
    state.busy || state.venueBusy,
    state.busy
  );
  rejectButton.addEventListener('click', () => {
    void runAction(state, paint, version, async () => {
      await rejectCandidate(candidate.id, state.reviewNote);
      state.listStatus = 'rejected';
      return 'Candidate rejected.';
    });
  });

  panel.append(
    element('p', 'muted action-copy', 'Approval changes review state only; it does not publish.'),
    approveButton,
    divider,
    label,
    textarea,
    rejectButton
  );
  return panel;
}

async function runAction(
  state: DetailState,
  paint: () => void,
  version: number,
  action: () => Promise<string>,
  errorPlacement: 'top' | 'publish' = 'top'
) {
  if (state.busy || state.venueBusy || !state.candidate) return;

  state.busy = true;
  state.feedback = null;
  state.publishError = null;
  paint();

  try {
    const message = await action();
    const refreshed = await getCandidate(state.candidate.id);
    if (version !== routeVersion) return;
    state.candidate = refreshed;
    window.history.replaceState(
      null,
      '',
      `#/candidates/${encodeURIComponent(refreshed.id)}?from=${state.listStatus}`
    );
    syncStatusTabs(state.listStatus);
    state.feedback = { kind: 'success', message };
  } catch (error) {
    if (version !== routeVersion) return;
    const message = errorMessage(error);
    if (errorPlacement === 'publish') {
      state.publishError = message;
    } else {
      state.feedback = { kind: 'error', message };
    }
  } finally {
    if (version === routeVersion) {
      state.busy = false;
      paint();
    }
  }
}

function renderSchedules(schedules: CandidateSchedule[]) {
  const panel = panelWithHeading(`Schedules (${schedules.length})`);
  if (schedules.length === 0) {
    panel.append(element('p', 'muted', 'No normalized schedules.'));
    return panel;
  }

  const wrap = element('div', 'table-scroll');
  const table = element('table', 'data-table data-table--compact');
  table.append(tableHeader(['Day', 'Time', 'Confidence', 'Raw schedule']));
  const body = document.createElement('tbody');
  for (const schedule of schedules) {
    const row = document.createElement('tr');
    row.append(
      tableCell(dayName(schedule.dayOfWeek)),
      tableCell(formatScheduleTime(schedule)),
      tableCell(formatConfidence(schedule.confidence)),
      tableCell(schedule.rawScheduleText || '—')
    );
    body.append(row);
  }
  table.append(body);
  wrap.append(table);
  panel.append(wrap);
  return panel;
}

function renderItems(items: CandidateItem[]) {
  const panel = panelWithHeading(`Items (${items.length})`);
  if (items.length === 0) {
    panel.append(element('p', 'muted', 'No structured items.'));
    return panel;
  }

  const wrap = element('div', 'table-scroll');
  const table = element('table', 'data-table data-table--compact');
  table.append(tableHeader(['Item', 'Category', 'Deal price', 'Regular price', 'Discount']));
  const body = document.createElement('tbody');
  for (const item of items) {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.append(element('strong', '', item.name || 'Unnamed item'));
    if (item.description) nameCell.append(element('span', 'cell-detail', item.description));
    row.append(
      nameCell,
      tableCell(item.category ? humanize(item.category) : '—'),
      tableCell(formatMoney(item.dealPrice)),
      tableCell(formatMoney(item.regularPrice)),
      tableCell(item.discountText || '—')
    );
    body.append(row);
  }
  table.append(body);
  wrap.append(table);
  panel.append(wrap);
  return panel;
}

function renderTextPanel(title: string, value: string | null, fallback: string, preserve = false) {
  const panel = panelWithHeading(title);
  const content = preserve ? element('pre', 'raw-evidence', value || fallback) : element('p', 'long-copy', value || fallback);
  if (!value) content.classList.add('muted');
  panel.append(content);
  return panel;
}

function panelWithHeading(title: string) {
  const panel = element('section', 'panel content-panel');
  panel.append(element('h3', '', title));
  return panel;
}

function renderLoading(message: string) {
  const loading = element('div', 'loading panel');
  loading.append(element('span', 'spinner'), element('span', '', message));
  return loading;
}

function renderError(error: unknown, retry: () => void) {
  const panel = element('section', 'error-state panel');
  const button = actionButton('Try again', 'button button--secondary', false);
  button.addEventListener('click', retry);
  panel.append(element('h2', '', 'Could not load this view'), element('p', 'muted', errorMessage(error)), button);
  return panel;
}

function routeContent() {
  const content = document.querySelector<HTMLDivElement>('.route-content');
  if (!content) throw new Error('Route content was not found');
  return content;
}

function readCandidateId() {
  const match = window.location.hash.match(/^#\/candidates\/([^/?#]+)(?:\?.*)?$/);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function readListStatus(): CandidateListStatus {
  const candidateMatch = window.location.hash.match(/^#\/candidates\/[^/?#]+(?:\?(.*))?$/);
  if (candidateMatch?.[1]) {
    const status = new URLSearchParams(candidateMatch[1]).get('from');
    if (isCandidateListStatus(status)) return status;
  }

  const pathStatus = window.location.hash.match(/^#\/(approved|published|rejected)\/?$/)?.[1] ?? 'pending';
  return isCandidateListStatus(pathStatus) ? pathStatus : 'pending';
}

function isCandidateListStatus(value: string | null): value is CandidateListStatus {
  return value === 'pending' || value === 'approved' || value === 'published' || value === 'rejected';
}

function renderStatusTabs(activeStatus: CandidateListStatus) {
  const nav = element('nav', 'status-tabs');
  nav.setAttribute('aria-label', 'Candidate status');

  for (const status of ['pending', 'approved', 'published', 'rejected'] as const) {
    const link = element('a', `status-tab${status === activeStatus ? ' status-tab--active' : ''}`, humanize(status));
    link.href = listStatusHref(status);
    link.dataset.status = status;
    if (status === activeStatus) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }

  return nav;
}

function listStatusHref(status: CandidateListStatus) {
  return status === 'pending' ? '#/' : `#/${status}`;
}

function syncStatusTabs(activeStatus: CandidateListStatus) {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('.status-tab')) {
    const isActive = link.dataset.status === activeStatus;
    link.classList.toggle('status-tab--active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

function emptyListMessage(status: CandidateListStatus) {
  switch (status) {
    case 'pending':
      return 'Newly extracted candidates appear here until they are reviewed.';
    case 'approved':
      return 'Approved, unpublished candidates appear here.';
    case 'published':
      return 'Published candidates remain available here for inspection.';
    case 'rejected':
      return 'Rejected candidates remain available here for reference.';
  }
}

function getLocalPublishBlocker(candidate: DealCandidate) {
  if (!candidate.venue) {
    return 'A verified venue must be linked before publication.';
  }
  if (!candidate.venue.isVerified) {
    return 'The linked venue must be verified before publication.';
  }
  if (!candidate.title?.trim()) {
    return 'A nonblank title is required before publication.';
  }
  if (candidate.schedules.length === 0) {
    return 'At least one normalized schedule is required before publication.';
  }
  if (
    candidate.schedules.some(
      (schedule) =>
        !schedule.startTime ||
        (schedule.endsAtVenueClose && schedule.endTime !== null) ||
        (!schedule.endsAtVenueClose && (!schedule.endTime || schedule.endTime <= schedule.startTime))
    )
  ) {
    return 'Every schedule must contain valid normalized times before publication.';
  }
  if (candidate.items.some((item) => !item.name?.trim())) {
    return 'Every structured item must have a name before publication.';
  }
  return null;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function tableCell(text: string, className = '') {
  return element('td', className, text);
}

function tableHeader(headings: string[]) {
  const head = document.createElement('thead');
  const row = document.createElement('tr');
  for (const heading of headings) row.append(element('th', '', heading));
  head.append(row);
  return head;
}

function actionButton(label: string, className: string, disabled: boolean, busy = disabled) {
  const button = element('button', className, busy ? 'Working…' : label);
  button.type = 'button';
  button.disabled = disabled;
  return button;
}

function addFact(list: HTMLDListElement, label: string, value: string, monospace = false) {
  const group = element('div', 'fact');
  group.append(element('dt', '', label), element('dd', monospace ? 'mono' : '', value));
  list.append(group);
}

function safeExternalLink(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      const link = element('a', 'external-link', url);
      link.href = parsed.toString();
      link.target = '_blank';
      link.rel = 'noreferrer';
      return link;
    }
  } catch {
    // Render invalid legacy source URLs as text rather than navigable links.
  }
  return element('span', 'muted break-word', url || '—');
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function formatConfidence(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

function formatMoney(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value);
}

function formatScheduleTime(schedule: CandidateSchedule) {
  const start = formatTime(schedule.startTime);
  if (schedule.endsAtVenueClose) return `${start} – close`;
  return `${start} – ${formatTime(schedule.endTime)}`;
}

function formatTime(value: string | null) {
  if (!value) return '—';
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value;
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2000, 0, 1, hour, minute)
  );
}

function dayName(day: number) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day] ?? `Day ${day}`;
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}
