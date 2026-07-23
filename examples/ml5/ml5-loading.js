// Tiny loading overlay shown while an ml5 model downloads. No dependencies.
(function () {
  let el = null;
  window.showMl5LoadingOverlay = function (text) {
    if (el) { el.querySelector('.tpml5-text').textContent = text || 'Loading model…'; el.style.display = 'flex'; return; }
    el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:rgba(14,11,22,0.92);z-index:99999;color:#e8ddff;font-family:-apple-system,system-ui,sans-serif;';
    el.innerHTML =
      '<div style="width:52px;height:52px;border:5px solid #3a2d5c;border-top-color:#b98bff;border-radius:50%;animation:tpml5spin 0.9s linear infinite;"></div>' +
      '<div class="tpml5-text" style="font-size:16px;">' + (text || 'Loading model…') + '</div>';
    const style = document.createElement('style');
    style.textContent = '@keyframes tpml5spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
    document.body.appendChild(el);
  };
  window.hideMl5LoadingOverlay = function () { if (el) el.style.display = 'none'; };
})();
