
Object.size = function (obj) {
  let size = 0;

  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      size++;
    }
  }
  return size;
};

const inherit = (function (Parent, Child) {
  const F = function () { };
  return function (Parent, Child) {
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.super = Parent.prototype;
  };
})();