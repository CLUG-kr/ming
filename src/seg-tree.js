const _ = require('lodash');
const bounds = require('binary-search-bounds');

const pow2 = (k) => Math.pow(2, k);
const internalSizes = _.range(31).map(pow2);

class SegmentTreeInternal {
  constructor(length, initialArray, reducer) {
    this.reducer = reducer;

    this.base = internalSizes[bounds.ge(internalSizes, length)];
    if (initialArray) {
      this.arr = _.concat(Array(this.base), initialArray);
      for (let k = this.base - 2; k > 0; k--) {
        this.arr[k] = this._reduce(this.arr[k*2], this.arr[k*2+1]);
      }
    } else {
      this.arr = Array(this.base * 2);
      this.arr = _.fill(this.arr, 0);
    }
  }

  update(index, value) {
    if (index === 0) return;
    if (index >= this.base) this.arr[index] = value;
    else                    this.arr[index] = this._reduce(this.arr[index*2], this.arr[index*2+1]);
    this.update(Math.floor(index / 2));
  }

  query(index, query_a, query_b) {
    const { index_a, index_b } = this._getBounds(index);
    // console.log(`index: ${index} qa: ${query_a} qb: ${query_b} ia: ${index_a} ib: ${index_b}`);
    if (query_a <= index_a && index_b <= query_b) {
      return this.arr[index];
    } else if (query_b < index_a || index_b < query_a) {
      return undefined;
    } else {
      return this._reduce(this.query(index*2, query_a, query_b),
                          this.query(index*2+1, query_a, query_b));
    }
  }

  _reduce(a, b) {
    if (a === undefined || b === undefined) {
      return a || b;
    } else {
      return this.reducer(a, b);
    }
  }

  _getBounds(index) {
    let index_a = index, index_b = index;
    while (index_a < this.base) index_a = index_a * 2;
    while (index_b < this.base) index_b = index_b * 2 + 1;
    return { index_a, index_b };
  }
}

class SegmentTree {
  constructor(obj, reducer) {
    const length = obj instanceof Array ? obj.length : obj;
    this._internal = new SegmentTreeInternal(length, obj instanceof Array ? obj : undefined, reducer);
  }
  update(index, value) {
    const { base } = this._internal;
    this._internal.update(base + index, value);
  }
  query(from, to) {
    const { base } = this._internal;
    return this._internal.query(1, base + from, base + to);
  }
  static get SumReducer() {
    return (a, b) => a + b;
  }
  static get MinReducer() {
    return (a, b) => _.min([a, b]);
  }
  static get MaxReducer() {
    return (a, b) => _.max([a, b]);
  }
}

module.exports = SegmentTree;

