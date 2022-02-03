const pt = require("promise-timeout");

class CriticalSectionError extends Error {
  // tslint:disable-next-line: variable-name
  public __meta__: any;

  constructor (metaData: any) {
    super();
    this.__meta__ = metaData;
  }

  get metaData () {
    return this.__meta__;
  }
}

export class CriticalSection {
  private _lock: any;
  private _options: any;
  private _queue: any;

  constructor (options = { Promise: Promise, timeout: 1000 }) {
    this._options = options;
    this._lock    = { };
    this._queue   = { };
  }

  isLocked (key: string): boolean {
    return !!this._lock[key]?.busy;
  }

  async enter (key: string, metaData?: any): Promise<any> {
    const id = Math.random() * (10000 - 1) + 1;

    try {
      return await pt.timeout(
        new (this._options.Promise)((resolve: any) => {
          if (!this._queue[key]) this._queue[key] = [];
          this._queue[key].push({ id, resolve, metaData });

          if (!this.isLocked(key)) {
            this._lock[key] = { busy: true, metaData };

            this._queue[key].shift()?.resolve();
          }
        })
      , this._options.timeout);
    } catch (e) {
      const idx = this._queue[key].findIndex((item: any) => item.id === id);
      this._queue[key].splice(idx, 1);

      throw new CriticalSectionError(this._lock[key]?.metaData);
    }
  }

  async leave (key: string): Promise<any> {
    // console.log(this.__lock);
    // console.log(this._queue);
    if (this._queue[key]?.length) {
      const nextQueue = this._queue[key].shift();
      if (nextQueue) {
        const { resolve, metaData } = nextQueue;

        this._lock[key] = { busy: true, metaData };
        resolve();
      }
      // this._lock[key]
      // this._queue[key].shift()?.resolve();
    } else {
      // this._lock[key] = false;
      delete this._lock[key];
      delete this._queue[key];
    }
    // console.log(this._lock);
    // console.log(this._queue);
  }
}
