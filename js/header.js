// Each page must set window.SITE_BASE before including this script:
//   root index.html      -> window.SITE_BASE = "";
//   about/index.html etc -> window.SITE_BASE = "../";
var base = (typeof window !== 'undefined' && window.SITE_BASE !== undefined) ? window.SITE_BASE : '';

document.write(`
  <header class="site-header">
    <nav class="nav-inner">
      <div class="nav-left">
        <a href="${base}about/" class="nav-link" data-page="about">About</a>
        <a href="${base}shows/" class="nav-link" data-page="shows">Shows</a>
      </div>
      <div class="nav-logo">
        <a href="${base}index.html" data-page="home">
          <img src="${base}assets/wpblogo.jpeg" alt="WPB Logo" class="logo-img" />
        </a>
      </div>
      <div class="nav-right">
        <a href="${base}press-kit/" class="nav-link" data-page="press-kit">EPK</a>
        <a href="${base}contact/" class="nav-link" data-page="contact">Contact</a>
      </div>
    </nav>
  </header>
`);
