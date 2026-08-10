import * as React from 'react';
import { Heading, Text, Link, Section } from '@react-email/components';
import { EmailLayout } from './components/EmailLayout';

export interface LeadNotificationEmailProps {
  auditId: string;
  serviceType: string;
  name: string;
  email: string;
  budget?: string;
  notes?: string;
}

export const LeadNotificationEmail: React.FC<LeadNotificationEmailProps> = ({
  auditId,
  serviceType,
  name,
  email,
  budget,
  notes,
}) => {
  return (
    <EmailLayout previewText={`New Audit Lead: ${name} (${serviceType.toUpperCase()})`}>
      <Heading style={headingStyle}>⚡ New Workouse Audit Lead</Heading>
      <Section style={leadBoxStyle}>
        <Text style={itemStyle}>
          <strong>Service Type:</strong>{' '}
          <span style={badgeStyle}>{serviceType.toUpperCase()}</span>
        </Text>
        <Text style={itemStyle}>
          <strong>Client Name:</strong> {name}
        </Text>
        <Text style={itemStyle}>
          <strong>Client Email:</strong>{' '}
          <Link href={`mailto:${email}`} style={emailLinkStyle}>
            {email}
          </Link>
        </Text>
        <Text style={itemStyle}>
          <strong>Audit ID:</strong> <code style={codeStyle}>{auditId}</code>
        </Text>
        <Text style={itemStyle}>
          <strong>Budget Range:</strong> {budget || 'Not specified'}
        </Text>
        <Text style={itemStyle}>
          <strong>Notes:</strong> {notes || 'None provided'}
        </Text>
      </Section>
    </EmailLayout>
  );
};

const headingStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#FEC500',
  lineHeight: '1.3',
  margin: '0 0 20px 0',
};

const leadBoxStyle: React.CSSProperties = {
  backgroundColor: '#09090b',
  border: '1px solid #27272a',
  borderRadius: '8px',
  padding: '20px',
};

const itemStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#e4e4e7',
  margin: '0 0 12px 0',
  lineHeight: '1.5',
};

const badgeStyle: React.CSSProperties = {
  backgroundColor: '#27272a',
  color: '#FEC500',
  fontSize: '12px',
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: '4px',
  letterSpacing: '0.05em',
};

const emailLinkStyle: React.CSSProperties = {
  color: '#FEC500',
  textDecoration: 'underline',
};

const codeStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  backgroundColor: '#27272a',
  color: '#a1a1aa',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '13px',
};

export default LeadNotificationEmail;
