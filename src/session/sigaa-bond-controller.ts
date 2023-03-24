import URLParser from 'url-parse'

/**
 * Interface that abstracts the class that stores the current bond.
 * @category Internal
 */
export interface BondController {
  currentBond: URLParser<string> | null;
}

/**
 * Class to store current bond.
 * @category Internal
 */
export class SigaaBondController implements BondController {
  private _currentBond: URLParser<string> | null = null;

  set currentBond(value: URLParser<string> | null) {
    this._currentBond = value;
  }
  get currentBond(): URLParser<string> | null {
    return this._currentBond;
  }
}
