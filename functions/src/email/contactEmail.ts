// Handle Contact Requests from Website
import * as functions from 'firebase-functions';
import * as request from 'request-promise';
import * as sgMail from '@sendgrid/mail';
import { grecaptchaResponse } from '../models/grecaptchaResponse.model';

const SENDGRID_API_KEY = functions.config().sendgrid.key;
sgMail.setApiKey(SENDGRID_API_KEY);

const RECAPTCHA_KEY = functions.config().recaptcha.key;

export const contactEmail = functions.https.onCall( async (data, context) => {
    const remoteAddress = context.rawRequest.ip;
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_KEY}&response=${data.token}&remoteip=${remoteAddress}`;

    
    try {
        const body: grecaptchaResponse = await request({
            method: 'POST',
            uri: verificationUrl,
            json: true
        });

        if (body === null && !body.success) {
            return { success: false };
        }

        const userMsg = {
            to: data.email,
            from: 'Safe Harbours Family Treatment Homes <chriswilson@safeharbours.ca>',
            subject: 'Message Received',
            templateId: 'd-1c441e9c4eb14ed2aa8d10804d32c93e',
            dynamicTemplateData: data
        };
    
        const safeharboursMessage = {
            to: 'chriswilson@safeharbours.ca',
            from: 'no-reply@safeharbours.ca',
            replyTo: data.email,
            subject: 'New Message from Website',
            templateId: 'd-5fb14b37a7624b0cb29d6d1bd3cf50ba',
            dynamicTemplateData: data
        };
    
        const sendToUser = sgMail.send(userMsg);
        const sendToSafeHarbours = sgMail.send(safeharboursMessage);
    
        const result = Promise.all([sendToUser, sendToSafeHarbours])
            .then(() => {
                return {message: "Message Sent"}
            })
            .catch((err) => {
                return {message: err}
            })

        return await result;

    } catch (e) {
        return {e}
    }

});