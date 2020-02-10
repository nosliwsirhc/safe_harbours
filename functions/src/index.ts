import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { contactEmail } from './email/contactEmail';
import { applicationEmail } from './email/applicationEmail';

admin.initializeApp(functions.config());

export {
    contactEmail,
    applicationEmail
};