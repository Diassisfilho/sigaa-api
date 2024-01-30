import { BondType } from '@bonds/sigaa-bond-factory';
import URLParser from 'url-parse';
import { SigaaAccountIFSC } from './sigaa-account-ifsc';
import { SigaaAccountUFPB } from './sigaa-account-ufpb';
import { SigaaAccountUNB } from './sigaa-account-unb';
import { SigaaAccountUNILAB } from './sigaa-account-unilab';
import { FileResponse, ProgressCallback } from '@session/sigaa-http';
import { ResponseType } from 'axios';

/**
 * Abstraction of account type.
 *
 * Responsible for representing the user account.
 * @category Public
 */
export interface Account {
  /**
   * get user's name.
   * @return a promise with user name.
   */
  getName(): Promise<string>;

  /**
   * get user's emails
   * @return a promise with user email.
   */
  getEmails(): Promise<string[]>;

  /**
   * Returns active bonds, in IFSC it is called "Vínculos ativos".
   *
   * A user can have more than one bond.
   * Eg. A user takes two programs.
   */
  getActiveBonds(): Promise<BondType[]>;

  /**
   * Returns inactive bonds, in IFSC it is called "Vínculos inativos".
   * An inactive bond is a bond that the user has completed, for example, courses completed by the user.
   */
  getInactiveBonds(): Promise<BondType[]>;

  /**
   * Download profile url and return the response in an selected format to save on local storage.
   * @param responseType The type of response to expect.
   * @param callback To know the progress of the download, each downloaded part will be called informing how much has already been downloaded.
   * @retuns Url response from picture to save on local storage, or null if the user has no photo.
   */
  getProfilePictureResponse(
    responseType: ResponseType,
    callback: ProgressCallback
  ): Promise<FileResponse | null>;

  /**
   * Get profile picture URL
   * @retuns Picture url or null if the user has no photo.
   */
  getProfilePictureURL(): Promise<URLParser<string> | null>;

  /**
   * Ends the session
   */
  logoff(): Promise<void>;

  /**
   * Change the password of account.
   * @param oldPassword current password.
   * @param newPassword new password.
   * @throws {errorInvalidCredentials} If current password is not correct.
   * @throws {errorInsufficientPasswordComplexity} If the new password does not have the complexity requirement.
   */
  changePassword(oldPassword: string, newPassword: string): Promise<void>;
}

export type SigaaAccountInstitution =
  | SigaaAccountIFSC
  | SigaaAccountUFPB
  | SigaaAccountUNB
  | SigaaAccountUNILAB;

export type CommonSigaaAccount = Account & SigaaAccountInstitution;
