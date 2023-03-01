import axios, { AxiosResponse, AxiosResponseHeaders } from 'axios';
import { FormData } from 'formdata-node';
import { URL } from 'url';
import { stringify } from 'querystring';
import { HTTPMethod } from '../sigaa-types';
import { HTTPSession } from './sigaa-http-session';
import { Page, SigaaPage } from './sigaa-page';

/**
 * @category Public
 */
export type ProgressCallback = (
  totalSize: number,
  downloadedSize?: number
) => void;

/**
 * @category Internal
 */
export interface SigaaRequestOptions {
  mobile?: boolean;
  noCache?: boolean;
  shareSameRequest?: boolean;
}

/**
 * @category Internal
 */
export interface HTTPRequestOptions {
  hostname: string;
  path: string;
  method: HTTPMethod;
  headers: Record<string, string>;
}

/**
 * @category Internal
 * @instance
 */
export interface HTTP {
  /**
   * Make a POST multipart request
   * @param path The path of request or full URL
   * @param formData instance of FormData
   */
  postMultipart(
    path: string,
    formData: FormData,
    options?: SigaaRequestOptions
  ): Promise<Page>;

  /**
   * Make a POST request
   * @param path The path of request or full URL
   * @param postValues Post values in format, key as field name, and value as field value.
   * @param [options]
   * @param [options.mobile] Use mobile User-Agent
   * @param [options.noCache] If can retrieve from cache
   */
  post(
    path: string,
    postValues: Record<string, string>,
    options?: SigaaRequestOptions
  ): Promise<Page>;

  /**
   * Make a GET request
   * @param path The path of request or full URL
   * @param [options]
   * @param [options.noCache] If can retrieve from cache
   * @param [options.mobile] Use mobile User-Agent
   */
  get(path: string, options?: SigaaRequestOptions): Promise<Page>;

  /**
   * Follow the redirect while the page response redirects to another page
   * @param page
   * @returns The last page of redirects
   */
  followAllRedirect(page: Page, options?: SigaaRequestOptions): Promise<Page>;

  /**
   * Close http session
   */
  closeSession(): void;
}

/**
 * HTTP request class
 * @param sigaaSession A instance of SigaaSession
 *
 * @category Internal
 */
export class SigaaHTTP implements HTTP {
  constructor(private session: HTTPSession) {}

  /**
   * @inheritdoc
   */
  closeSession(): void {
    this.session.close();
  }
  /**
   * Create object Options for https.request
   * @param method HTTP method POST or GET
   * @param link URL of Request
   * @param options
   * @param [options.withoutCookies=true] Disable cookies in headers, default = true
   * @param [options.mobile=false] Use mobile User-Agent
   * @returns The basic options for request
   */
  private getRequestBasicOptions(
    method: HTTPMethod,
    link: URL,
    additionalHeaders?: Record<string, string>,
    options: SigaaRequestOptions = {
      mobile: false
    }
  ): HTTPRequestOptions {
    const basicOptions: HTTPRequestOptions = {
      hostname: link.hostname,
      path: link.pathname + link.search,
      method: method,
      headers: {
        'User-Agent': `SIGAA-Api/1.0 (${
          options.mobile ? 'Android 7.0; ' : ''
        }https://github.com/GeovaneSchmitz/sigaa-api)`,
        'Accept-Encoding': 'br, gzip, deflate',
        Accept: '*/*',
        'Cache-Control': 'max-age=0',
        DNT: '1',
        ...additionalHeaders
      }
    };

    return basicOptions;
  }

  /**
   * @inheritdoc
   */
  public async postMultipart(
    path: string,
    formData: FormData,
    options?: SigaaRequestOptions
  ): Promise<Page> {
    const url = this.session.getURL(path);
    const httpOptions = this.getRequestBasicOptions(
      'POST',
      url,
      formData.headers,
      options
    );

    const buffer = await this.convertReadebleToBuffer(formData.stream);
    return this.requestPage(url, httpOptions, buffer);
  }

  /**
   * Convert stream.Readable to buffer
   * @param stream readable stream
   */
  private convertReadebleToBuffer(
    stream: NodeJS.ReadableStream
  ): Promise<Buffer> {
    const buffers: Uint8Array[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (data: Uint8Array | string) => {
        if (typeof data === 'string') {
          buffers.push(Buffer.from(data));
        } else {
          buffers.push(data);
        }
      });

      stream.on('close', () => {
        const buffer = Buffer.concat(buffers);
        resolve(buffer);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * RFC 3986
   * Uses the UTF-8 code point to code, not the hexadecimal binary
   * @param str
   */
  private encodeWithRFC3986(str: string): string {
    let escapedString = '';
    const unreservedCharacters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~';
    for (let i = 0; i < str.length; i++) {
      if (unreservedCharacters.includes(str.charAt(i))) {
        escapedString += str.charAt(i);
      } else {
        const codePoint = str.codePointAt(i);
        if (codePoint === undefined)
          throw new Error('SIGAA: Invalid code point.');
        codePoint.toString(16).replace(/..?/g, '%$&');
        escapedString += codePoint.toString(16).replace(/..?/g, '%$&');
      }
    }
    return escapedString;
  }

  /**
   * @inheritdoc
   */
  public async post(
    path: string,
    postValues: Record<string, string>,
    options: SigaaRequestOptions = {}
  ): Promise<Page> {
    const url = this.session.getURL(path);

    const { httpOptions, body } = this.encodePostValue(
      url,
      postValues,
      options
    );
    return this.requestPage(url, httpOptions, body, options);
  }

  /**
   * Generate body and headers for post request
   * @param postValues
   * @param url
   * @param options
   */
  private encodePostValue(
    url: URL,
    postValues: Record<string, string>,
    options?: SigaaRequestOptions
  ) {
    const body = stringify(postValues, '&', '=', {
      encodeURIComponent: this.encodeWithRFC3986
    });

    const httpOptions = this.getRequestBasicOptions(
      'POST',
      url,
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body).toString(10)
      },
      options
    );
    return { httpOptions, body };
  }

  public async get(path: string, options?: SigaaRequestOptions): Promise<Page> {
    const url = this.session.getURL(path);
    const httpOptions = this.getRequestBasicOptions(
      'GET',
      url,
      undefined,
      options
    );
    return this.requestPage(url, httpOptions, undefined, options);
  }

  /**
   * Make a HTTP request for a page
   * @param url url of request
   * @param options http.request options
   * @param [requestBody] body of request
   */
  private async requestPage(
    url: URL,
    httpOptions: HTTPRequestOptions,
    requestBody?: string | Buffer,
    options?: SigaaRequestOptions
  ): Promise<Page> {
    try {
      const sessionHttpOptions = await this.session.afterHTTPOptions(
        url,
        httpOptions,
        requestBody,
        options
      );
      const pageBeforeRequest = await this.session.beforeRequest(
        url,
        sessionHttpOptions,
        requestBody,
        options
      );
      if (pageBeforeRequest) {
        return this.session.afterSuccessfulRequest(pageBeforeRequest, options);
      }

      const { data , headers, status, request } = await this.requestHTTP(
        httpOptions,
        requestBody
      );
      const redirectedURL = new URL(request.res.responseUrl);

      const page = new SigaaPage({
        requestOptions: httpOptions,
        body: data.toString(),
        url: (redirectedURL)? redirectedURL : url,
        headers: headers as AxiosResponseHeaders,
        statusCode : status,
        requestBody
      });
      return this.session.afterSuccessfulRequest(page, options);
    } catch (err) {
      return this.session.afterUnsuccessfulRequest(
        err as Error,
        httpOptions,
        requestBody
      );
    }
  }

  /**
   * Make a HTTP request
   * @param optionsHTTP http.request options
   * @param [body] body of request
   */
  protected async requestHTTP(
    optionsHTTP: HTTPRequestOptions,
    body?: string | Buffer
  ): Promise<AxiosResponse<any, any>> {
    return new Promise((resolve, reject) => {
      const {hostname, path, method, headers} = optionsHTTP;
      const baseURL = "https://"+hostname;
      const data = (body)? body : undefined;
      const url = path as string | undefined;

      axios({
        baseURL,
        url,
        data,
        method,
        headers
      }).then((response) => {
        resolve(response)
      }).catch((err) => {
        reject(err)
      })

      //if (body) req.write(body);
      //req.end();
    });
  }

  public async followAllRedirect(
    page: Page,
    options?: SigaaRequestOptions
  ): Promise<Page> {
    while (page.headers.location) {
      page = await this.get(page.headers.location as string, options);
    }
    return page;
  }
}
