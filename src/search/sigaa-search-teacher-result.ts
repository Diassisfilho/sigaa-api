import { Parser } from '@helpers/sigaa-parser';
import { HTTP, ProgressCallback } from '@session/sigaa-http';
import URLParser from 'url-parse'

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
   * Download user profile picture, save in basepath
   * Returns the destination of the file on the file system
   * Throws an exception if the teacher does not have a photo
   * @param basepath path to save file
   * @param callback
   */
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

  get department(): string {
    return this._department;
  }

  get pageURL(): URLParser<string> {
    return this._pageURL;
  }
}
