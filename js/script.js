
    // ===== Utilities
    const $ = (q, el=document) => el.querySelector(q);
    const $$ = (q, el=document) => Array.from(el.querySelectorAll(q));

    // ===== Year
    $('#year').textContent = new Date().getFullYear();

    // ===== Mobile drawer
    const drawer = $('#drawer');
    const openBtn = $('#openDrawer');
    const closeBtn = $('#closeDrawer');
    const toggleDrawer = (open) => {
      drawer.classList.toggle('open', open);
      drawer.hidden = !open;
      openBtn.setAttribute('aria-expanded', String(open));
      if(open){ drawer.querySelector('[data-close]')?.focus(); }
    };
    openBtn.addEventListener('click', () => toggleDrawer(true));
    closeBtn.addEventListener('click', () => toggleDrawer(false));
    drawer.addEventListener('click', (e) => { if(e.target === drawer) toggleDrawer(false); });
    $$('[data-close]').forEach(a => a.addEventListener('click', () => toggleDrawer(false)));

    // ===== Services → Gallery (placeholder data URIs)
    const galleryModal = $('#galleryModal');
    const galleryTitle = $('#galleryTitle');
    const galleryGrid  = $('#galleryGrid');
    const imageModal = $('#imageModal');
    const lightboxImage = $('#lightboxImage');
    const lightboxTitle = $('#lightboxTitle');
    const lightboxCaption = $('#lightboxCaption');
    const closeImageModal = $('#closeImageModal');
    const lightboxNavButtons = imageModal ? $$('.lightbox-nav', imageModal) : [];

    const form = $('#quoteForm');
    const nextField = $('#nextField');
    const toast = $('#toast');

    function showToast(msg, ok = true) {
      if(!toast) return;
      toast.textContent = msg;
      toast.className = 'toast ' + (ok ? 'ok' : 'err') + ' show';
      setTimeout(() => toast.classList.remove('show'), 4200);
    }

    const makeSVG = (label, i) =>
      `data:image/svg+xml;utf8,${encodeURIComponent(`<?xml version='1.0' encoding='UTF-8'?><svg xmlns='http://www.w3.org/2000/svg' width='1400' height='1050'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='%23ffd200'/><stop offset='1' stop-color='%23ffb800'/></linearGradient></defs><rect width='100%' height='100%' fill='%23111111'/><rect x='0' y='${900 - i*60}' width='1400' height='150' fill='%23ffd200' opacity='.12'/><text x='50%' y='52%' text-anchor='middle' fill='%23ffffff' font-size='64' font-family='Inter' opacity='.9'>${label}</text><text x='50%' y='62%' text-anchor='middle' fill='%23cfcfcf' font-size='26' font-family='Inter' opacity='.9'>Project Photo ${i+1}</text></svg>`)} `;

    const DEFAULT_PLACEHOLDER_COUNT = 9;
    let placeholderCount = DEFAULT_PLACEHOLDER_COUNT;
    let GALLERIES = {};
    let currentGallerySources = [];
    let currentGalleryLabel = 'Gallery';
    let currentImageIndex = 0;

// Load gallery data from JSON
async function loadGalleries() {
  try {
    const response = await fetch('./data/gallery.json');
    if (!response.ok) throw new Error('Gallery JSON not found.');
    GALLERIES = await response.json();
    const longestGallery = Object.values(GALLERIES)
      .reduce((max, items) => Array.isArray(items) ? Math.max(max, items.length) : max, 0);
    placeholderCount = Math.max(DEFAULT_PLACEHOLDER_COUNT, longestGallery);
  } catch (err) {
    console.error('Error loading gallery data:', err);
    showToast('Could not load gallery data.', false);
  }
}

function updateLightbox() {
  if(!imageModal || !lightboxImage) return;
  if(!currentGallerySources.length) return;
  const label = currentGalleryLabel || 'Gallery';
  const total = currentGallerySources.length;
  const src = currentGallerySources[currentImageIndex];
  lightboxImage.src = src;
  lightboxImage.alt = `${label} photo ${currentImageIndex + 1}`;
  if(lightboxTitle) lightboxTitle.textContent = label;
  if(lightboxCaption) lightboxCaption.textContent = `${label} - Photo ${currentImageIndex + 1} of ${total}`;
}

function openImageModal(index = 0) {
  if(!imageModal || !currentGallerySources.length) return;
  if(typeof galleryModal?.close === 'function') galleryModal.close();
  else galleryModal?.removeAttribute('open');
  currentImageIndex = index;
  updateLightbox();
  imageModal.removeAttribute('hidden');
  imageModal.setAttribute('aria-hidden', 'false');
  (closeImageModal || imageModal.querySelector('button, [tabindex]'))?.focus();
}

function closeImageViewer() {
  if(!imageModal) return;
  imageModal.setAttribute('hidden', 'true');
  imageModal.setAttribute('aria-hidden', 'true');
  lightboxImage?.removeAttribute('src');
}

function stepImage(delta) {
  if(!currentGallerySources.length) return;
  const total = currentGallerySources.length;
  currentImageIndex = (currentImageIndex + delta + total) % total;
  updateLightbox();
}

lightboxNavButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const dir = Number(btn.dataset.dir) || 1;
    stepImage(dir);
  });
});

closeImageModal?.addEventListener('click', closeImageViewer);

imageModal?.addEventListener('click', (evt) => {
  if(evt.target === imageModal) closeImageViewer();
});

document.addEventListener('keydown', (evt) => {
  if(imageModal?.hasAttribute('hidden')) return;
  if(evt.key === 'Escape'){
    evt.preventDefault();
    closeImageViewer();
  } else if(evt.key === 'ArrowRight'){
    evt.preventDefault();
    stepImage(1);
  } else if(evt.key === 'ArrowLeft'){
    evt.preventDefault();
    stepImage(-1);
  }
});

// Attach service card click events after data loads
async function setupGallery() {
  await loadGalleries();

  $$('.service').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const label = card.getAttribute('data-gallery') || 'Gallery';
      const galleryPhotos = Array.isArray(GALLERIES[label]) ? GALLERIES[label] : [];
      const sources = galleryPhotos.length
        ? galleryPhotos.slice()
        : Array.from({ length: placeholderCount }, (_, i) => makeSVG(label, i));

      currentGallerySources = sources;
      currentGalleryLabel = label;
      galleryTitle.textContent = label;
      galleryGrid.innerHTML = '';

      sources.forEach((src, i) => {
        const img = new Image();
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = `${label} photo ${i + 1}`;
        img.src = src;
        img.tabIndex = 0;
        img.dataset.index = String(i);
        img.addEventListener('click', () => openImageModal(i));
        img.addEventListener('keydown', (evt) => {
          if(evt.key === 'Enter' || evt.key === ' '){
            evt.preventDefault();
            openImageModal(i);
          }
        });
        galleryGrid.appendChild(img);
      });

      if (typeof galleryModal?.showModal === 'function') galleryModal.showModal();
      else galleryModal?.setAttribute('open', 'true');
    });
  });
}

setupGallery();

    $('#closeGallery')?.addEventListener('click', () => {
      if(typeof galleryModal?.close === 'function') galleryModal.close();
      else galleryModal?.removeAttribute('open');
    });

    // ===== Contact form enhancements (client-side validation + success toast)
    if(nextField){
      const here = new URL(location.href);
      here.hash = '#thank-you';
      nextField.value = here.toString();
    }

    if(location.hash === '#thank-you'){
      showToast(`Thanks! Your request was sent. We'll get back to you shortly.`);
      history.replaceState({}, '', location.pathname + location.search);
    }

    const handleAjaxSubmit = async (e) => {
      // Basic validity first
      if(!form.checkValidity()){
        e.preventDefault();
        form.reportValidity();
        showToast('Please complete the required fields.', false);
        return;
      }

      // Use AJAX submission to avoid iframe/sandbox blocks (and keep user on page)
      e.preventDefault();
      const toEmail = 'moserpeter6@gmail.com';
      const ajaxUrl = `https://formsubmit.co/ajax/${toEmail}`;

      // Gather fields into JSON (FormSubmit accepts JSON at /ajax/*)
      const fd = new FormData(form);
      const data = {};
      fd.forEach((v, k) => { if(k !== '_honey') data[k] = v; }); // ignore honeypot in JSON

      try{
        const resp = await fetch(ajaxUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        });
        if(resp.ok){
          showToast(`Thanks! Your request was sent. We'll get back to you shortly.`);
          form.reset();
          // keep consent unchecked after reset
          const consent = document.getElementById('consent');
          if(consent) consent.checked = false;
          return;
        }
        // If FormSubmit returns non-200, fall back to classic POST
        form.removeEventListener('submit', handleAjaxSubmit);
        form.submit();
      }catch(err){
        // Network/CORS issue - fall back to classic POST
        form.removeEventListener('submit', handleAjaxSubmit);
        form.submit();
      }
    };

    form?.addEventListener('submit', handleAjaxSubmit);

    // Smooth-scroll for same-page links
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if(!a) return;
      const id = a.getAttribute('href');
      if(id.length > 1){
        const target = document.querySelector(id);
        if(target){
          e.preventDefault();
          target.scrollIntoView({behavior:'smooth', block:'start'});
        }
      }
    });
      // ===== Theme (light/dark)
    const root = document.documentElement;
    const themeMeta = document.getElementById('themeColorMeta');
    const headerLogo = document.querySelector('.site-logo');
    const LIGHT_LOGO = './assets/imgs/the_chester_county_handman_logo_1024x768.png';
    const DARK_LOGO = './assets/imgs/the_chester_county_handman_logo_light_1024x768.png';
    const getSystemPref = () => (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    const savedTheme = localStorage.getItem('cch_theme');
    const setTheme = (t) => {
      const theme = t || getSystemPref();
      root.setAttribute('data-theme', theme);
      // Update toggle labels
      const icon = theme === 'light' ? '\u2600' : '\u263D';
      const btn1 = document.getElementById('themeToggle');
      const btn2 = document.getElementById('themeToggleMobile');
      if(btn1) btn1.textContent = icon;
      if(btn2) btn2.textContent = icon;
      // Swap logo for contrast in dark mode
      if(headerLogo) headerLogo.src = theme === 'dark' ? DARK_LOGO : LIGHT_LOGO;
      // Update meta theme-color for mobile UI chrome
      if(themeMeta) themeMeta.setAttribute('content', theme === 'light' ? '#ffffff' : '#0a0a0a');
    };
    setTheme(savedTheme);

    const toggleTheme = () => {
      const current = root.getAttribute('data-theme') || getSystemPref();
      const next = current === 'light' ? 'dark' : 'light';
      localStorage.setItem('cch_theme', next);
      setTheme(next);
    };

    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('themeToggleMobile')?.addEventListener('click', toggleTheme);

    // React to OS changes if user hasn't explicitly set a preference
    if(!savedTheme && window.matchMedia){
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => setTheme());
    }







