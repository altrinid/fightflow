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
matchMedia('(min-width: 960px)').addEventListener('change', (e) => e.matches && setMenu(false));

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

/* Registration form ------------------------------------------------------- */
const form = document.querySelector<HTMLFormElement>('[data-form]');

if (form) {
  const membership = form.querySelector<HTMLSelectElement>('#f-membership');
  const monthSelect = form.querySelector<HTMLSelectElement>('[data-month-select]');
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]');
  const submitLabel = submit?.querySelector<HTMLElement>('[data-submit-label]');
  const idleLabel = submitLabel?.textContent ?? '';

  // CTAs elsewhere on the page preselect a membership ("Basic wählen" …)
  document.querySelectorAll<HTMLElement>('[data-membership]').forEach((cta) =>
    cta.addEventListener('click', () => {
      const option = membership?.querySelector<HTMLOptionElement>(`option[data-id="${cta.dataset.membership}"]`);
      if (membership && option) membership.value = option.value;
    }),
  );

  // Keep the start-month list current even if the page was built long ago.
  if (monthSelect) {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat(form.dataset.locale, { month: 'long', year: 'numeric' });
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

    const data = new FormData(form);
    if (String(data.get('website') ?? '').trim()) {
      // Honeypot filled → bot. Pretend everything worked.
      show('success');
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const endpoint = form.dataset.endpoint;

    if (!endpoint) {
      // No backend configured: hand over to the visitor's e-mail app.
      const lines = ['name', 'email', 'phone', 'membership', 'month', 'experience', 'message']
        .map((name) => [labelOf(name), String(data.get(name) ?? '').trim()] as const)
        .filter(([, value]) => value)
        .map(([label, value]) => `${label}: ${value}`);
      const body = `${form.dataset.intro}\n\n${lines.join('\n')}\n`;
      const href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(form.dataset.subject ?? '')}&body=${encodeURIComponent(body)}`;
      window.location.href = href;
      show('mailto');
      return;
    }

    setBusy(true);
    try {
      const params = new URLSearchParams();
      data.forEach((value, key) => params.append(key, String(value)));
      const res = await fetch(endpoint, {
        method: 'POST',
        body: params,
        signal: 'timeout' in AbortSignal ? AbortSignal.timeout(20000) : undefined,
      });
      const json = (await res.json().catch(() => ({ ok: res.ok }))) as { ok?: boolean };
      if (!res.ok || json.ok === false) throw new Error('Request failed');
      form.reset();
      show('success');
    } catch {
      show('error');
    } finally {
      setBusy(false);
      form.querySelector('[role="status"]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}
