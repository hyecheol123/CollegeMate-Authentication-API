/**
 * Utility to send OTP Code to given email address
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import {Client} from '@microsoft/microsoft-graph-client';
import * as path from 'path';
import * as ejs from 'ejs';

/**
 * Send security code to user's email
 *
 * @param {Client} msGraphClient Microsoft Graph API Client
 * @param {Client} azureUserObjId Microsoft Azure User Object ID
 *   (From Azure Active Directory)
 * @param {string} senderEmail email address used to send the security code
 * @param {string} replyEmail email address used to get reply from user
 * @param {string} email email address to send the security code
 * @param {string} code security code to be sent
 */
export default async function sendOTPCodeMail(
  msGraphClient: Client,
  azureUserObjId: string,
  senderEmail: string,
  replyEmail: string,
  email: string,
  code: string
): Promise<void> {
  const sendMail = {
    message: {
      subject: 'CollegeMate - OTP Code',
      body: {
        contentType: 'HTML',
        content: await ejs.renderFile(
          path.join(__dirname, './sendOTPCodeMailTemplate.ejs'),
          {email: email, securityCode: code}
        ),
      },
      bodyPreview: 'Security Code from CollegeMate',
      from: {emailAddress: {address: senderEmail}},
      replyTo: [{emailAddress: {address: replyEmail}}],
      toRecipients: [{emailAddress: {address: email}}],
    },
    saveToSentItems: false,
  };

  await msGraphClient
    .api(`https://graph.microsoft.com/v1.0/users/${azureUserObjId}/sendMail`)
    .post(sendMail);
}
