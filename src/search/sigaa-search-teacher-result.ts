import { Parser } from '@helpers/sigaa-parser';
import { FileResponse, HTTP, ProgressCallback } from '@session/sigaa-http';
import { ResponseType } from 'axios';
import URLParser from 'url-parse';

/**
 * @category Internal
 */
export interface TeacherResultData {
  name: string;
  department: string;
  photoURL?: URLParser<string>;
  pageURL: URLParser<string>;
}

/**
 * @category Public
 */
export interface TeacherResult {
  readonly name: string;
  readonly department: string;
  readonly pageURL: URLParser<string>;
  readonly profilePictureURL?: URLParser<string>;
  /**
   * May return undefined if the teacher has no registered email
   */
  getEmail(): Promise<string | undefined>;
  /**
   * Download user profile picture
   * Returns the url response to save on local storage
   * Throws an exception if the teacher does not have a photo
   * @param responseType The type of response to expect.
   * @param callback
   */
  getProfilePictureResponse(
    responseType: ResponseType,
    callback: ProgressCallback
  ): Promise<FileResponse>;
}

/**
 * @category Internal
 */
export class SigaaSearchTeacherResult implements TeacherResult {
  private _name: string;
  private _department: string;
  private _pageURL: URLParser<string>;
  private _photoURL?: URLParser<string>;

  constructor(
    private http: HTTP,
    private parser: Parser,
    options: TeacherResultData
  ) {
    this._name = options.name;
    this._department = options.department;
    this._pageURL = options.pageURL;
    this._photoURL = options.photoURL;
  }

  async getEmail(): Promise<string | undefined> {
    const page = await this.http.get(this.pageURL.href);

    const contactElements = page.$('#contato').children().toArray();
    let email;
    for (const contactElement of contactElements) {
      const name = this.parser.removeTagsHtml(
        page.$(contactElement).find('dt').html()
      );
      if (name === 'Endereço eletrônico') {
        email = this.parser.removeTagsHtml(
          page.$(contactElement).find('dd').html()
        );
        break;
      }
    }
    if (email && email !== 'não informado') {
      return email;
    } else {
      return undefined;
    }
  }

  get name(): string {
    return this._name;
  }

  get profilePictureURL(): URLParser<string> | undefined {
    return this._photoURL;
  }

  getProfilePictureResponse(
    responseType: ResponseType,
    callback: ProgressCallback
  ): Promise<FileResponse> {
    if (!this.profilePictureURL)
      throw new Error("SIGAA: This teacher doesn't have profile picture");
    return this.http.fileResponseByGet(
      this.profilePictureURL.href,
      callback,
      responseType
    );
  }

  get department(): string {
    return this._department;
  }

  get pageURL(): URLParser<string> {
    return this._pageURL;
  }
}
