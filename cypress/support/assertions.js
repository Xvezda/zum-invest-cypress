chai.use((chai, utils) => {
  function assertClosest(selector) {
    const $el = utils.flag(this, 'object');
    new chai.Assertion($el.closest(selector)).to.be.exist;
  }

  utils.addMethod(chai.Assertion.prototype, 'ancestors', assertClosest);

  utils.addMethod(chai.Assertion.prototype, 'activated', function () {
    assertClosest.call(this, '.active');
  });
});
