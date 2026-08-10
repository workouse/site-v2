import * as React from 'react';
import { Heading, Text, Button, Link, Section } from '@react-email/components';
import { EmailLayout } from './components/EmailLayout';

export interface VerificationEmailProps {
  verifyUrl: string;
  auditUrl: string;
}

export const VerificationEmail: React.FC<VerificationEmailProps> = ({
  verifyUrl,
  auditUrl,
}) => {
  return (
    <EmailLayout previewText="Confirm your email to initiate your Workouse website audit">
      <Heading style={headingStyle}>
        Confirm your email to start your website audit
      </Heading>
      <Text style={paragraphStyle}>
        Click the button below to verify your email address and initiate your
        automated website performance, security, and SEO audit.
      </Text>
      <Section style={ctaContainerStyle}>
        <Button style={buttonStyle} href={verifyUrl} target="_blank">
          Verify &amp; Start Audit →
        </Button>
      </Section>
      <Section style={secondaryInfoStyle}>
        <Text style={noticeTextStyle}>
          This link is valid for 24 hours.
        </Text>
        <Text style={bookmarkTextStyle}>
          While you wait, you can bookmark your live audit progress page:
          <br />
          <Link href={auditUrl} style={linkStyle}>
            {auditUrl}
          </Link>
        </Text>
      </Section>
    </EmailLayout>
  );
};

const headingStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#ffffff',
  lineHeight: '1.3',
  margin: '0 0 16px 0',
};

const paragraphStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#a1a1aa',
  lineHeight: '1.6',
  margin: '0 0 28px 0',
};

const ctaContainerStyle: React.CSSProperties = {
  paddingBottom: '28px',
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#FEC500',
  color: '#09090b',
  fontWeight: 700,
  fontSize: '15px',
  textDecoration: 'none',
  padding: '14px 28px',
  borderRadius: '8px',
  display: 'inline-block',
  textAlign: 'center',
};

const secondaryInfoStyle: React.CSSProperties = {
  borderTop: '1px solid #27272a',
  paddingTop: '20px',
};

const noticeTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#71717a',
  margin: '0 0 8px 0',
};

const bookmarkTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#71717a',
  lineHeight: '1.5',
  margin: 0,
};

const linkStyle: React.CSSProperties = {
  color: '#FEC500',
  textDecoration: 'underline',
  wordBreak: 'break-all',
};

export default VerificationEmail;
