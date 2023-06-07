export interface Duration {
  startTime?: number
  endTime?: number
}

export interface TimedObject {
  text: string
  duration: Duration
}

export interface LyricElement {
  obj: TimedObject
  furi?: TimedObject[]
}

export class DragSelection {
  private _anchor: number;
  private _dragTo: number;

  constructor(anchor = -1, dragTo = -1) {
    this._anchor = anchor;
    this._dragTo = dragTo;
  }

  public set anchor(v: number) {
    this._anchor = v;
  }

  public get anchor(): number {
    return this._anchor;
  }

  public set dragTo(v: number) {
    this._dragTo = v;
  }

  public get dragTo(): number {
    return this._dragTo;
  }

  public isInDragSelection(idx: number): boolean {
    const smaller = this._anchor < this._dragTo ? this._anchor : this._dragTo;
    const bigger = this._anchor === smaller ? this._dragTo : this._anchor;
    return smaller <= idx && idx <= bigger;
  }

  public clone(): DragSelection {
    const d = new DragSelection();
    d._anchor = this._anchor;
    d._dragTo = this._dragTo;
    return d;
  }
}
