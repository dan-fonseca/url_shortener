import './style.css';
import { createLink, getStats, type CreatedLink } from './api';

const STORAGE_KEY = 'shortly:links';
const MAX_HISTORY = 20;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const form = $<HTMLFormElement>('shorten-form');
const urlInput = $<HTMLInputElement>('url');
const aliasInput = $<HTMLInputElement>('alias');
const ttlSelect = $<HTMLSelectElement>('ttl');
const submitBtn = $<HTMLButtonElement>('submit');
const errorEl = $<HTMLParagraphElement>('error');
const resultEl = $<HTMLElement>('result');
const shortUrlEl = $<HTMLAnchorElement>('short-url');
const copyBtn = $<HTMLButtonElement>('copy');
const refreshBtn = $<HTMLButtonElement>('refresh');
const table = $<HTMLTableElement>('links');
const emptyEl = $<HTMLParagraphElement>('empty');

interface StoredLink extends CreatedLink {
  clicks?: number;
}

function loadHistory(): StoredLink[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveHistory(links: StoredLink[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links.slice(0, MAX_HISTORY)));
  } catch {
    // Storage may be unavailable (private mode); history is a convenience only.
  }
}

function renderHistory(links = loadHistory()) {
  const tbody = table.tBodies[0]!;
  tbody.replaceChildren(
    ...links.map((link) => {
      const row = document.createElement('tr');
      const shortCell = Object.assign(document.createElement('td'), { className: 'truncate' });
      const a = Object.assign(document.createElement('a'), {
        href: link.shortUrl,
        textContent: link.shortUrl.replace(/^https?:\/\//, ''),
        target: '_blank',
        rel: 'noopener',
      });
      shortCell.append(a);
      const dest = Object.assign(document.createElement('td'), {
        textContent: link.url,
        title: link.url,
        className: 'truncate',
      });
      const clicks = Object.assign(document.createElement('td'), {
        textContent: link.clicks === undefined ? '—' : String(link.clicks),
        className: 'num',
      });
      const expires = Object.assign(document.createElement('td'), {
        textContent: link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'Never',
      });
      row.append(shortCell, dest, clicks, expires);
      return row;
    }),
  );
  table.hidden = links.length === 0;
  emptyEl.hidden = links.length > 0;
}

function showError(message: string | null) {
  errorEl.textContent = message ?? '';
  errorEl.hidden = !message;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError(null);
  resultEl.hidden = true;

  const url = urlInput.value.trim();
  if (!url) return showError('Enter a URL to shorten.');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Shortening…';
  try {
    const created = await createLink({
      url: /^https?:\/\//i.test(url) ? url : `https://${url}`,
      alias: aliasInput.value.trim() || undefined,
      ttlDays: ttlSelect.value ? Number(ttlSelect.value) : undefined,
    });
    shortUrlEl.href = created.shortUrl;
    shortUrlEl.textContent = created.shortUrl;
    resultEl.hidden = false;
    copyBtn.textContent = 'Copy';

    const history = [
      { ...created, clicks: 0 },
      ...loadHistory().filter((l) => l.code !== created.code),
    ];
    saveHistory(history);
    renderHistory(history);
    form.reset();
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Something went wrong.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Shorten';
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shortUrlEl.href);
    copyBtn.textContent = 'Copied!';
  } catch {
    copyBtn.textContent = 'Copy failed';
  }
});

refreshBtn.addEventListener('click', async () => {
  refreshBtn.disabled = true;
  const history = loadHistory();
  const refreshed = await Promise.all(
    history.map(async (link): Promise<StoredLink | null> => {
      try {
        return { ...link, ...(await getStats(link.code)) };
      } catch {
        return null; // Expired or deleted: drop it from history.
      }
    }),
  );
  const alive = refreshed.filter((l): l is StoredLink => l !== null);
  saveHistory(alive);
  renderHistory(alive);
  refreshBtn.disabled = false;
});

renderHistory();
