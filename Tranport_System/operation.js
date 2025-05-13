
document.addEventListener('DOMContentLoaded', () => {

  // 逐張 .carousel-card 處理
  document.querySelectorAll('.carousel-card').forEach(card => {

    /* === 1. 抓 DOM === */
    const carouselEl = card.querySelector('.carousel');
    const slides     = card.querySelectorAll('.carousel-item');
    const slideCount = slides.length;

    const aGroup = card.querySelector('.group-a');
    const bGroup = card.querySelector('.group-b');
    const aInput = aGroup.querySelector('input');
    const bInput = bGroup.querySelector('input');

    /* === 2. 初始化狀態 === */
    const state  = Array.from({length: slideCount}, () => ({a: 0, b: 0}));
    let current  = 0;          // 目前顯示哪張照片

    const render = () => {
      aInput.value = state[current].a;
      bInput.value = state[current].b;
    };
    render();                  // 初始顯示

    /* === 3. 綁定加減按鈕 === */
    aGroup.querySelector('.minus').onclick = () => { state[current].a--; render(); };
    aGroup.querySelector('.plus' ).onclick = () => { state[current].a++; render(); };
    bGroup.querySelector('.minus').onclick = () => { state[current].b--; render(); };
    bGroup.querySelector('.plus' ).onclick = () => { state[current].b++; render(); };

    /* === 4. 監聽 Bootstrap carousel「切換完成」事件 === */
    carouselEl.addEventListener('slid.bs.carousel',  e => {
      current = e.to;          // e.to = 新的 slide index
      render();
    });
  });

});

