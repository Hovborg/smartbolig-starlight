const KEY = 'smartbolig-motion-v1';

// One owner for motion, including explicit opt-in when the OS requests less motion.
export function mountHomeMotion(win, doc, control) {
  const media = win.matchMedia('(prefers-reduced-motion: reduce)');
  const button = control.querySelector('[data-motion-toggle]');
  const reset = control.querySelector('[data-motion-system]');
  const status = control.querySelector('[data-motion-status]');
  let preference = 'auto';
  try {
    const saved = win.localStorage.getItem(KEY);
    if (['on', 'off'].includes(saved)) preference = saved;
  } catch { /* Storage may be disabled; this page still has working controls. */ }
  let enabled = false;
  const seen = new WeakSet();
  const visible = new Set();
  const stages = [...doc.querySelectorAll('[data-motion-stage]')];
  const reveals = [...doc.querySelectorAll('.home-section__heading, .home-navigator__rows li, .home-news-row, .home-fieldguide__steps li, .home-featured__lead, .home-featured__list li, .home-trust__item, .home-closing, .home-hero__text > *')];
  const reveal = (element) => {
    if (!enabled || doc.hidden || seen.has(element)) return;
    seen.add(element);
    element.classList.add('home-reveal-play');
  };
  function render() {
    enabled = preference === 'on' || (preference === 'auto' && !media.matches);
    // A cancelled entrance is complete too: never replay it on resume or tab focus.
    if (!enabled || doc.hidden) reveals.forEach(element => element.classList.remove('home-reveal-play'));
    doc.documentElement.dataset.homeMotion = enabled && !doc.hidden ? 'on' : 'off';
    button.textContent = enabled ? control.dataset.pause : control.dataset.start;
    button.setAttribute('aria-pressed', String(enabled));
    reset.hidden = preference === 'auto';
    status.textContent = preference === 'auto' ? control.dataset.system : control.dataset.manual;
    visible.forEach(reveal);
  }
  function save(next) {
    preference = next;
    try { win.localStorage.setItem(KEY, next); } catch { /* Optional persistence. */ }
    render();
  }
  const toggle = () => save(enabled ? 'off' : 'on');
  const followSystem = () => save('auto');
  const finishEntrance = (event) => {
    if (event.animationName === 'home-reveal') event.target.classList.remove('home-reveal-play');
  };
  const storage = (event) => {
    if (event.key !== KEY && event.key !== null) return;
    preference = ['on', 'off'].includes(event.newValue) ? event.newValue : 'auto';
    render();
  };
  const observers = [];
  if (win.IntersectionObserver) {
    const loops = new win.IntersectionObserver(entries => {
      for (const entry of entries) entry.target.dataset.motionInView = String(entry.isIntersecting);
    }, { rootMargin: '40px' });
    stages.forEach(element => { element.dataset.motionInView = 'false'; loops.observe(element); });
    const entrances = new win.IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) { visible.add(entry.target); reveal(entry.target); }
        else visible.delete(entry.target);
      }
    }, { threshold: 0.12 });
    reveals.forEach(element => entrances.observe(element));
    observers.push(loops, entrances);
  } else stages.forEach(element => { element.dataset.motionInView = 'true'; });
  button.addEventListener('click', toggle);
  reset.addEventListener('click', followSystem);
  media.addEventListener('change', render);
  doc.addEventListener('visibilitychange', render);
  doc.addEventListener('animationend', finishEntrance);
  win.addEventListener('storage', storage);
  render();
  control.hidden = false;
  return () => {
    observers.forEach(observer => observer.disconnect());
    button.removeEventListener('click', toggle);
    reset.removeEventListener('click', followSystem);
    media.removeEventListener('change', render);
    doc.removeEventListener('visibilitychange', render);
    doc.removeEventListener('animationend', finishEntrance);
    win.removeEventListener('storage', storage);
    reveals.forEach(element => element.classList.remove('home-reveal-play'));
    stages.forEach(element => { delete element.dataset.motionInView; });
    delete doc.documentElement.dataset.homeMotion;
    control.hidden = true;
  };
}
