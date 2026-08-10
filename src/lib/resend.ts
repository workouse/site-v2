// Workouse Audit Tool — Resend REST API Email Service with React Email Framework & Contact Management

import React from 'react';
import { render } from '@react-email/render';
import { VerificationEmail } from '../emails/VerificationEmail';
import { AuditResultEmail } from '../emails/AuditResultEmail';
import { LeadNotificationEmail } from '../emails/LeadNotificationEmail';

export const RESEND_TOPICS = [
  '02c8de86-4722-4111-8077-71f278d433ab',
  'c8585f70-7627-45a0-ad20-fa1135c20a01',
  '56c9ba65-db94-4fd3-85a2-b47f1208c696',
];

export const RESEND_AUDIT_SEGMENT_ID = 'b23a74d5-5e61-4aee-a686-284058366cce';
export const RESEND_SUBSCRIPTION_SEGMENT_ID = 'd08d3305-6f68-4bff-8802-0bd2d7b02eff';

export class ResendError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ResendError';
    this.statusCode = statusCode;
  }
}

interface ResendSendOptions {
  apiKey: string;
  from?: string;
  to: string;
  subject: string;
  html: string;
}

export interface UpsertResendContactOptions {
  apiKey: string;
  email: string;
  siteUrl: string;
  firstName?: string;
  lastName?: string;
  segmentId?: string;
  topics?: string[];
  unsubscribed?: boolean;
}

async function sendResendEmail(options: ResendSendOptions): Promise<void> {
  const from = options.from ?? 'Workouse Audit <audit@workouse.com>';
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown Resend API error');
    throw new ResendError(`Resend API failed (${response.status}): ${errorText}`, response.status);
  }
}

/**
 * Upsert contact to Resend Audiences/Contacts with default topics, segment, and site_url custom property.
 */
export async function upsertResendContact(options: UpsertResendContactOptions): Promise<void> {
  if (!options.apiKey || options.apiKey === 'mock_key_for_dev') {
    return;
  }

  const topicsToSubscribe = options.topics ?? RESEND_TOPICS;
  const segmentId = options.segmentId ?? RESEND_AUDIT_SEGMENT_ID;

  const payload = {
    email: options.email,
    first_name: options.firstName ?? '',
    last_name: options.lastName ?? '',
    unsubscribed: options.unsubscribed ?? false,
    audience_id: segmentId,
    segment_id: segmentId,
    topics: topicsToSubscribe.map((id) => ({
      id,
      subscription: 'opt_in',
    })),
    properties: {
      site_url: options.siteUrl,
    },
    custom_properties: {
      site_url: options.siteUrl,
    },
  };

  try {
    const response = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn(`Resend upsert contact API warning (${response.status}): ${errorText}`);
    }
  } catch (err: any) {
    console.warn(`Resend upsert contact network error: ${err.message}`);
  }
}

/**
 * Send email verification link to user to begin their website audit using React Email.
 */
export async function sendVerificationEmail(
  apiKey: string,
  email: string,
  verifyUrl: string,
  auditUrl: string
): Promise<void> {
  const html = await render(
    React.createElement(VerificationEmail, { verifyUrl, auditUrl })
  );

  await sendResendEmail({
    apiKey,
    to: email,
    subject: 'Confirm your email to start your Workouse audit',
    html,
  });
}

/**
 * Send notification email when audit report generation is complete using React Email.
 */
export async function sendReportReadyEmail(
  apiKey: string,
  email: string,
  reportUrl: string,
  auditedUrl: string
): Promise<void> {
  let domain = auditedUrl;
  try {
    domain = new URL(auditedUrl.startsWith('http') ? auditedUrl : `https://${auditedUrl}`).hostname;
  } catch {
    // fallback to auditedUrl
  }

  const html = await render(
    React.createElement(AuditResultEmail, { reportUrl, auditedUrl })
  );

  await sendResendEmail({
    apiKey,
    to: email,
    subject: `Your Workouse audit for ${domain} is ready`,
    html,
  });
}

/**
 * Send lead inquiry alert to team when user submits quote/consultation request using React Email.
 */
export async function sendLeadNotificationEmail(
  apiKey: string,
  teamEmail: string,
  leadData: {
    auditId: string;
    serviceType: string;
    name: string;
    email: string;
    budget?: string;
    notes?: string;
  }
): Promise<void> {
  const html = await render(
    React.createElement(LeadNotificationEmail, leadData)
  );

  await sendResendEmail({
    apiKey,
    to: teamEmail,
    subject: `New Lead: ${leadData.name} requested ${leadData.serviceType} (${leadData.auditId})`,
    html,
  });
}
