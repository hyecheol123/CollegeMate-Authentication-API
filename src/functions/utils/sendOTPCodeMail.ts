/**
 * Utility to send OTP Code to given email address
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import {Client} from '@microsoft/microsoft-graph-client';
import * as ejs from 'ejs';

/**
 * Send security code to user's email
 *
 * @param {Client} msGraphClient Microsoft Graph API Client
 * @param {string} email email address to send the security code
 * @param {string} code security code to be sent
 */
export default async function sendOTPCodeMail(
  msGraphClient: Client,
  email: string,
  code: string
): Promise<void> {
  const sendMail = {
    message: {
      subject: 'CollegeMate - OTP Code',
      body: {
        contentType: 'HTML',
        content: ejs.renderFile('./sendOTPCodeMailTemplate.ejs', {
          email: email,
          securityCode: code,
        }),
      },
      toRecipients: [
        {
          emailAddress: {
            address: email,
          },
        },
      ],
    },
  };

  await msGraphClient.api('/me/sendMail').post(sendMail);
}
