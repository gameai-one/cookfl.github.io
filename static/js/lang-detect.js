// 自动语言检测和重定向
(function() {
  const currentPath = window.location.pathname || '/';
  const langPreference = getCookie('preferred_lang');

  document.addEventListener('click', function(event) {
    const link = event.target.closest('a[data-lang]');
    if (!link) return;
    const lang = link.getAttribute('data-lang');
    if (lang) {
      setCookie('preferred_lang', lang, 365);
    }
  });

  if (currentPath.startsWith('/zh/')) {
    if (!langPreference) {
      setCookie('preferred_lang', 'zh', 365);
    }
    return;
  }
  if (currentPath.startsWith('/en/')) {
    if (!langPreference) {
      setCookie('preferred_lang', 'en', 365);
    }
    return;
  }

  if (langPreference) {
    if ((currentPath === '/' || currentPath === '/index.html') && langPreference === 'zh') {
      window.location.href = '/zh/';
    }
    return;
  }

  if (currentPath !== '/' && currentPath !== '/index.html') {
    return;
  }

  const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  const browserLangs = navigator.languages || [];

  let timeZone = '';
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch (e) {}

  const zhZones = new Set([
    'Asia/Shanghai',
    'Asia/Chongqing',
    'Asia/Harbin',
    'Asia/Urumqi',
    'Asia/Hong_Kong',
    'Asia/Macau',
    'Asia/Taipei'
  ]);

  const isZhLang = browserLang.startsWith('zh') || browserLangs.some((lang) => {
    return String(lang || '').toLowerCase().startsWith('zh');
  });
  const isZhZone = zhZones.has(timeZone);

  if (isZhLang || isZhZone) {
    window.location.href = '/zh/';
  }

  function setCookie(name, value, days) {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value}; max-age=${maxAge}; path=/; samesite=lax`;
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }
})();
