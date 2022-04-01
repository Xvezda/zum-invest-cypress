beforeEach(() => {
  cy.intercept(/^https?:\/\/thumb\.zumst\.com\/.*/, req => {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/378x241')) {
      req.reply({fixture: '378x241.jpg'});
    } else if (url.pathname.startsWith('/182x77')) {
      req.reply({fixture: '182x77.jpg'});
    } else if (url.pathname.startsWith('/166x116')) {
      req.reply({fixture: '166x116.jpg'});
    } else if (url.pathname.startsWith('/76x48')) {
      req.reply({fixture: '76x48.jpg'});
    } else if (url.pathname.startsWith('/54x34')) {
      req.reply({fixture: '54x34.jpg'});
    } else {
      req.reply({fixture: 'fallback.jpg'});
    }
  });

  cy.intercept('https://pip-thumb.zumst.com/api/v1/**', req => {
    const url = new URL(req.url);
    const width = url.searchParams.get('w');
    const height = url.searchParams.get('h');
    if (width === '880' && height === '495') {
      req.reply({fixture: '880x495.jpg'});
    } else {
      req.reply({fixture: '640x360.jpg'});
    }
  });

  cy.intercept(/^https?:\/\/finance\.zumst\.com\/writing\/.+\.(png|jpe?g|gif)$/, {
    fixture: 'writer.png'
  });
  cy.intercept('https://static.news.zumst.com/images/**', {fixture: '640x360.jpg'});
});