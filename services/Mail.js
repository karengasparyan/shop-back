import _ from 'lodash';
import { createTransport } from 'nodemailer';

const {
  MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD, MAIL_FROM,
} = process.env;

const transporter = createTransport({
  host: MAIL_HOST,
  port: MAIL_PORT,
  secure: true,
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASSWORD,
  },
});

class Mail {
  static async send(email, subject, html) {
    try {
      const to = _.isArray(email) ? email.join(', ') : email;
      const res = await transporter.sendMail({
        from: MAIL_FROM,
        to,
        subject,
        html,
      });
      return res;
    } catch (e) {
      return e;
    }
  }
}

export default Mail;
