import { FormData } from 'formdata-node';
import { Page } from './sigaa-page';
import {
  FileResponse,
  HTTP,
  ProgressCallback,
  SigaaRequestOptions
} from './sigaa-http';
import { BondController } from './sigaa-bond-controller';
import { PageCacheWithBond } from './sigaa-page-cache-with-bond';
import URLParser from 'url-parse';
import { ResponseType } from 'axios';

/**
 * Implements sigaa bond in HTTP request class.
 *
 * @param http http instamce implementation
 * @param bondController A instance of BondController to read current bond
 * @param bondSwitchUrl url to switch bond
 *
 * @category Internal
 */
export class SigaaHTTPWithBond implements HTTP {
  constructor(
    private http: HTTP,
    private bondController: BondController,
    private pageCacheWithBond: PageCacheWithBond,
    private bondSwitchUrl: URLParser<string> | null
  ) {}

  /**
   * Verify if current bond is correct.
   * Otherwise, switch bond
   */
  private async verifyIfBondIsCorrect(): Promise<void> {
    if (this.bondSwitchUrl !== this.bondController.currentBond) {
      return this.switchBond();
    }
  }

  /**
   * Switch bond
   */
  private async switchBond(): Promise<void> {
    if (this.bondSwitchUrl) {
      const page = await this.http.get(this.bondSwitchUrl.href, {
        noCache: true
      });
      const finalPage = await this.http.followAllRedirect(page, {
        noCache: true
      });
      if (finalPage.statusCode !== 200)
        throw new Error('SIGAA: Could not switch bond.');
      this.bondController.currentBond = this.bondSwitchUrl;
      this.pageCacheWithBond.setCurrentBond(this.bondSwitchUrl);
    }
  }

  /**
   * @inheritdoc
   */
  async postMultipart(
    path: string,
    formData: FormData,
    options?: SigaaRequestOptions
  ): Promise<Page> {
    await this.verifyIfBondIsCorrect();
    return this.http.postMultipart(path, formData, options);
  }

  /**
   * @inheritdoc
   */
  async post(
    path: string,
    postValues: Record<string, string>,
    options?: SigaaRequestOptions
  ): Promise<Page> {
    await this.verifyIfBondIsCorrect();
    return this.http.post(path, postValues, options);
  }

  async get(path: string, options?: SigaaRequestOptions): Promise<Page> {
    await this.verifyIfBondIsCorrect();
    return this.http.get(path, options);
  }

  /**
   * @inheritdoc
   */
  async fileResponseByGet(
    urlPath: string,
    callback?: ProgressCallback,
    responseType?: ResponseType
  ): Promise<FileResponse> {
    await this.verifyIfBondIsCorrect();
    return this.http.fileResponseByGet(urlPath, callback, responseType);
  }

  /**
   * @inheritdoc
   */
  async fileResponseByPost(
    urlPath: string,
    postValues: Record<string, string>,
    callback?: ProgressCallback,
    responseType?: ResponseType
  ): Promise<FileResponse> {
    await this.verifyIfBondIsCorrect();
    return this.http.fileResponseByPost(
      urlPath,
      postValues,
      callback,
      responseType
    );
  }

  /**
   * @inheritdoc
   */
  async followAllRedirect(
    page: Page,
    options?: SigaaRequestOptions
  ): Promise<Page> {
    await this.verifyIfBondIsCorrect();
    return this.http.followAllRedirect(page, options);
  }

  /**
   * @inheritdoc
   */
  closeSession(): void {
    this.http.closeSession();
  }
}
