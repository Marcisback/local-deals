import './styles.css';

import {
  approveCandidate,
  getCandidate,
  listPendingCandidates,
  publishCandidate,
  rejectCandidate
} from './api';
import type { CandidateItem, CandidateSchedule, DealCandidate } from './types';

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

  renderShell(candidateId ? 'Candidate detail' : 'Pending candidates');

  if (candidateId) {
    await renderCandidateRoute(candidateId, version);
  } else {
    await renderPendingRoute(version);
  }
}

function renderShell(pageName: string) {
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
  main.append(heading, element('div', 'route-content'));
  app.append(header, main);
}

async function renderPendingRoute(version: number) {
  const content = routeContent();
  content.replaceChildren(renderLoading('Loading pending candidates…'));

  try {
    const candidates = await listPendingCandidates();
    if (version !== routeVersion) return;

    content.replaceChildren(renderPendingCandidates(candidates));
  } catch (error) {
    if (version !== routeVersion) return;
    content.replaceChildren(renderError(error, () => void renderRoute()));
  }
}

function renderPendingCandidates(candidates: DealCandidate[]) {
  if (candidates.length === 0) {
    const empty = element('section', 'empty-state panel');
    empty.append(
      element('h2', '', 'No candidates are waiting for review'),
      element('p', 'muted', 'Newly extracted candidates will appear here while their review status is pending.')
    );
    return empty;
  }

  const panel = element('section', 'panel table-panel');
  const summary = element('div', 'panel-heading');
  summary.append(
    element('div', '', `${candidates.length} pending candidate${candidates.length === 1 ? '' : 's'}`),
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
    titleLink.href = `#/candidates/${encodeURIComponent(candidate.id)}`;
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

async function renderCandidateRoute(candidateId: string, version: number) {
  const content = routeContent();
  content.replaceChildren(renderLoading('Loading candidate…'));

  const state: DetailState = {
    candidate: null,
    busy: false,
    reviewNote: '',
    feedback: null
  };

  const paint = () => {
    if (version !== routeVersion || !state.candidate) return;
    content.replaceChildren(renderCandidateDetail(state, paint, version));
  };

  try {
    state.candidate = await getCandidate(candidateId);
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
  reviewNote: string;
  feedback: { kind: 'success' | 'error'; message: string } | null;
};

function renderCandidateDetail(state: DetailState, paint: () => void, version: number) {
  const candidate = state.candidate;
  if (!candidate) return renderLoading('Loading candidate…');

  const container = element('div', 'detail-page');
  const back = element('a', 'back-link', '← Pending candidates');
  back.href = '#/';
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
  addFact(facts, 'Venue', candidate.venue?.name || 'Not linked');
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
  sideColumn.append(renderSource(candidate), renderPublication(candidate));
  if (candidate.reviewStatus === 'pending' || candidate.reviewStatus === 'approved') {
    sideColumn.append(renderActions(state, paint, version));
  }

  grid.append(mainColumn, sideColumn);
  container.append(grid);
  return container;
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
    panel.append(element('p', 'muted action-copy', 'This candidate is approved and ready for explicit publication.'));
    if (!candidate.publishedDealId) {
      const publishButton = actionButton('Publish candidate', 'button button--primary', state.busy);
      publishButton.addEventListener('click', () => {
        void runAction(
          state,
          paint,
          version,
          async () => {
            const result = await publishCandidate(candidate.id);
            return `Published deal ${shortId(result.dealId)} with ${result.scheduleCount} schedule${result.scheduleCount === 1 ? '' : 's'} and ${result.itemCount} item${result.itemCount === 1 ? '' : 's'}.`;
          }
        );
      });
      panel.append(publishButton);
    }
    return panel;
  }

  const approveButton = actionButton('Approve', 'button button--primary', state.busy);
  approveButton.addEventListener('click', () => {
    void runAction(state, paint, version, async () => {
      await approveCandidate(candidate.id);
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
  textarea.disabled = state.busy;
  textarea.addEventListener('input', () => {
    state.reviewNote = textarea.value;
  });

  const rejectButton = actionButton('Reject candidate', 'button button--danger', state.busy);
  rejectButton.addEventListener('click', () => {
    void runAction(state, paint, version, async () => {
      await rejectCandidate(candidate.id, state.reviewNote);
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
  action: () => Promise<string>
) {
  if (state.busy || !state.candidate) return;

  state.busy = true;
  state.feedback = null;
  paint();

  try {
    const message = await action();
    const refreshed = await getCandidate(state.candidate.id);
    if (version !== routeVersion) return;
    state.candidate = refreshed;
    state.feedback = { kind: 'success', message };
  } catch (error) {
    if (version !== routeVersion) return;
    state.feedback = { kind: 'error', message: errorMessage(error) };
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
  const match = window.location.hash.match(/^#\/candidates\/([^/?#]+)$/);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
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

function actionButton(label: string, className: string, disabled: boolean) {
  const button = element('button', className, disabled ? 'Working…' : label);
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
