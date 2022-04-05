chai.use((chai, utils) => {
  function assertClosest(selector) {
    const $el = utils.flag(this, 'object');
    new chai.Assertion($el.closest(selector)).to.be.exist;
  }

  // FIXME: not 체인이 올바르게 동작하지 않는 문제 e.g. `not.ancestors`
  utils.addMethod(chai.Assertion.prototype, 'ancestors', assertClosest);

  utils.addMethod(chai.Assertion.prototype, 'activated', function () {
    assertClosest.call(this, '.active');
  });
});
