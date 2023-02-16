import { ProgressCallback } from '@session/sigaa-http';
import { URL } from 'url';
import { BondType } from '@bonds/sigaa-bond-factory';

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
   * Get profile picture URL
   * @retuns Picture url or null if the user has no photo.
   */
  getProfilePictureURL(): Promise<URL | null>;

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
