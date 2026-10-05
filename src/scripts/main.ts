/* FightFlow – the only JavaScript on the site (progressive enhancement). */

/* Header: solid background once the page is scrolled ---------------------- */
// An observed sentinel instead of reading scrollY: no scroll listener, no forced layout.
const header = document.querySelector<HTMLElement>('[data-header]');
if (header && 'IntersectionObserver' in window) {
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none';
  document.body.prepend(sentinel);
  new IntersectionObserver(([entry]) => header.toggleAttribute('data-scrolled', !entry?.isIntersecting)).observe(sentinel);
}

/* Mobile menu ------------------------------------------------------------- */
const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const toggleLabel = toggle?.querySelector<HTMLElement>('[data-menu-label]');

function setMenu(open: boolean) {
  if (!header || !toggle) return;
  header.toggleAttribute('data-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  if (toggleLabel) toggleLabel.textContent = (open ? toggle.dataset.labelClose : toggle.dataset.labelOpen) ?? '';
  document.documentElement.style.overflow = open ? 'hidden' : '';
}

toggle?.addEventListener('click', () => setMenu(!header?.hasAttribute('data-open')));
document.querySelectorAll('[data-nav-link]').forEach((link) => link.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && header?.hasAttribute('data-open')) {
    setMenu(false);
    toggle?.focus();
  }
});
matchMedia('(min-width: 1080px)').addEventListener('change', (e) => e.matches && setMenu(false));

/* Scroll reveal ----------------------------------------------------------- */
const revealEls = document.querySelectorAll<HTMLElement>('[data-reveal]');
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-in'));
}

/* Photo strips: focusable (keyboard-scrollable) only while they actually overflow */
const scrollers = document.querySelectorAll<HTMLElement>('[data-scroller]');
if (scrollers.length) {
  const update = () =>
    scrollers.forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 1) el.tabIndex = 0;
      else el.removeAttribute('tabindex');
    });
  // ResizeObserver reports every element once right after observe() – no forced layout at startup.
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(update);
    scrollers.forEach((el) => ro.observe(el));
  } else {
    requestAnimationFrame(update);
  }
}

/* Map: only load Google Maps after an explicit click (privacy + speed) ----- */
document.querySelector<HTMLButtonElement>('[data-map-load]')?.addEventListener('click', () => {
  const frame = document.querySelector<HTMLElement>('[data-map]');
  if (!frame?.dataset.src) return;
  const iframe = document.createElement('iframe');
  iframe.src = frame.dataset.src;
  iframe.title = frame.dataset.title ?? 'Map';
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'no-referrer-when-downgrade';
  iframe.allowFullscreen = true;
  frame.replaceChildren(iframe);
});

/* Registration form ------------------------------------------------------- */
type FieldKey = 'name' | 'email' | 'phone' | 'membership' | 'month' | 'date' | 'experience' | 'message';
interface GoogleFormTarget {
  action: string;
  fields: Partial<Record<FieldKey, string>>;
  values?: Partial<Record<FieldKey, Record<string, string>>>;
  dateType?: 'date' | 'text';
}
interface Session {
  weekday: number;
  start: string;
  end: string;
}

const form = document.querySelector<HTMLFormElement>('[data-form]');

if (form) {
  const typeRadios = form.querySelectorAll<HTMLInputElement>('input[name="type"]');
  const membership = form.querySelector<HTMLSelectElement>('#f-membership');
  const monthSelect = form.querySelector<HTMLSelectElement>('[data-month-select]');
  const sessionSelect = form.querySelector<HTMLSelectElement>('[data-session-select]');
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]');
  const submitLabel = submit?.querySelector<HTMLElement>('[data-submit-label]');
  const idleLabel = submitLabel?.textContent ?? '';
  const gforms = JSON.parse(form.dataset.gforms || '{}') as Partial<Record<'trial' | 'membership', GoogleFormTarget | null>>;
  const locale = form.dataset.locale;

  const currentType = () => (form.querySelector<HTMLInputElement>('input[name="type"]:checked')?.value ?? 'trial') as 'trial' | 'membership';
  const setType = (type: string) => typeRadios.forEach((r) => (r.checked = r.value === type));

  // Any CTA on the page can preselect the request type and the membership.
  document.querySelectorAll<HTMLElement>('[data-form-type]').forEach((cta) =>
    cta.addEventListener('click', () => {
      setType(cta.dataset.formType ?? 'trial');
      const id = cta.dataset.membership;
      const option = id ? membership?.querySelector<HTMLOptionElement>(`option[data-id="${id}"]`) : null;
      if (membership && option) membership.value = option.value;
    }),
  );

  // Keep date lists current even if the page was built long ago.
  const now = new Date();
  if (sessionSelect) {
    const sessions = JSON.parse(form.dataset.sessions || '[]') as Session[];
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' });
    const minutes = now.getHours() * 60 + now.getMinutes();
    const upcoming: HTMLOptionElement[] = [];
    for (let i = 0; upcoming.length < 6 && i < 21; i++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      for (const s of sessions) {
        const [h = 0, m = 0] = s.start.split(':').map(Number);
        if (s.weekday === date.getDay() && (i > 0 || h * 60 + m > minutes)) {
          const label = `${fmt.format(date)} · ${s.start}–${s.end}`;
          const option = new Option(label, label);
          option.dataset.iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          upcoming.push(option);
        }
      }
    }
    if (upcoming.length) sessionSelect.replaceChildren(...upcoming);
  }
  if (monthSelect) {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
    const months = Array.from({ length: 6 }, (_, i) => fmt.format(new Date(now.getFullYear(), now.getMonth() + i, 1)));
    if (monthSelect.options[0]?.value !== months[0]) {
      const preselect = now.getDate() >= 15 ? 1 : 0;
      monthSelect.replaceChildren(...months.map((m, i) => new Option(m, m, i === preselect, i === preselect)));
    }
  }

  const show = (kind: 'success' | 'mailto' | 'error' | null) => {
    form.querySelectorAll<HTMLElement>('[data-msg]').forEach((msg) => {
      msg.hidden = msg.dataset.msg !== kind;
    });
  };

  const setBusy = (busy: boolean) => {
    if (!submit) return;
    submit.disabled = busy;
    if (submitLabel) submitLabel.textContent = busy ? (submit.dataset.sending ?? idleLabel) : idleLabel;
  };

  /** Visible label text of a field, without the "(optional)" hint. */
  const labelOf = (name: string): string => {
    const field = form.elements.namedItem(name);
    const el = field instanceof RadioNodeList ? null : (field as HTMLElement | null);
    const labelEl = el?.id
      ? form.querySelector(`label[for="${el.id}"]`)
      : form.querySelector(`input[name="${name}"]`)?.closest('fieldset')?.querySelector('legend');
    return labelEl?.firstChild?.textContent?.trim() || name;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    show(null);

    const raw = new FormData(form);
    if (String(raw.get('website') ?? '').trim()) {
      show('success'); // honeypot → bot; pretend it worked
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const type = currentType();
    const keys: FieldKey[] =
      type === 'trial'
        ? ['name', 'email', 'phone', 'date', 'experience', 'message']
        : ['name', 'email', 'phone', 'membership', 'month', 'experience', 'message'];
    const values = Object.fromEntries(keys.map((k) => [k, String(raw.get(k) ?? '').trim()])) as Record<FieldKey, string>;
    const target = gforms[type];
    const endpoint = form.dataset.endpoint;

    if (!target && !endpoint) {
      // No backend configured: hand over to the visitor's e-mail app.
      const lines = keys.filter((k) => values[k]).map((k) => `${labelOf(k)}: ${values[k]}`);
      const subject = type === 'trial' ? form.dataset.subjectTrial : form.dataset.subjectMembership;
      const body = `${form.dataset.intro}\n\n${lines.join('\n')}\n`;
      window.location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject ?? '')}&body=${encodeURIComponent(body)}`;
      show('mailto');
      return;
    }

    setBusy(true);
    try {
      if (target) {
        // The club's own Google Form – keeps its existing e-mail automation.
        const params = new URLSearchParams();
        for (const k of keys) {
          const entry = target.fields[k];
          if (!entry || !values[k]) continue;
          if (k === 'date' && target.dateType === 'date') {
            // Google date question: separate year/month/day parameters
            const [y, mo, da] = (sessionSelect?.selectedOptions[0]?.dataset.iso ?? '').split('-');
            if (y && mo && da) {
              params.append(`${entry}_year`, y);
              params.append(`${entry}_month`, String(Number(mo)));
              params.append(`${entry}_day`, String(Number(da)));
            }
            continue;
          }
          params.append(entry, target.values?.[k]?.[values[k]] ?? values[k]);
        }
        await fetch(target.action, { method: 'POST', mode: 'no-cors', body: params });
      } else if (endpoint) {
        const params = new URLSearchParams({ type, lang: String(raw.get('lang') ?? ''), consent: String(raw.get('consent') ?? '') });
        for (const k of keys) params.append(k, values[k]);
        const res = await fetch(endpoint, {
          method: 'POST',
          body: params,
          signal: 'timeout' in AbortSignal ? AbortSignal.timeout(20000) : undefined,
        });
        const json = (await res.json().catch(() => ({ ok: res.ok }))) as { ok?: boolean };
        if (!res.ok || json.ok === false) throw new Error('Request failed');
      }
      form.reset();
      setType(type);
      show('success');
    } catch {
      show('error');
    } finally {
      setBusy(false);
      form.querySelector('[role="status"]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}
