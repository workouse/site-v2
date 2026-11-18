import * as React from 'react';
import { Heading, Text, Button, Link, Section } from '@react-email/components';
import { EmailLayout } from './components/EmailLayout';

export interface AuditResultEmailProps {
  reportUrl: string;
  auditedUrl: string;
}

export const AuditResultEmail: React.FC<AuditResultEmailProps> = ({
  reportUrl,
  auditedUrl,
}) => {
  const domain = React.useMemo(() => {
    try {
      return new URL(
        auditedUrl.startsWith('http') ? auditedUrl : `https://${auditedUrl}`
      ).hostname;
    } catch {
      return auditedUrl;
    }
  }, [auditedUrl]);

  return (
    <EmailLayout previewText={`Your Workouse audit report for ${domain} is ready`}>
      <Heading style={headingStyle}>
        Your audit report for {domain} is ready
      </Heading>
      <Text style={paragraphStyle}>
        We have completed scanning your website for performance bottlenecks,
        security vulnerabilities, and SEO opportunities. Your comprehensive report
        with itemized fix costs and actionable recommendations is ready to view.
      </Text>
      <Section style={ctaContainerStyle}>
        <Button style={buttonStyle} href={reportUrl} target="_blank">
          View Full Audit Report →
        </Button>
      </Section>
      <Section style={secondaryCardStyle}>
        <Text style={secondaryTitleStyle}>
          Want expert guidance on resolving these issues?
        </Text>
        <Link href="https://cal.emre.xyz" target="_blank" style={strategyLinkStyle}>
          Book a free 15-minute strategy call →
        </Link>
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

const secondaryCardStyle: React.CSSProperties = {
  borderTop: '1px solid #27272a',
  paddingTop: '20px',
};

const secondaryTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#a1a1aa',
  margin: '0 0 8px 0',
};

const strategyLinkStyle: React.CSSProperties = {
  color: '#FEC500',
  textDecoration: 'underline',
  fontWeight: 600,
  fontSize: '14px',
};

export default AuditResultEmail;
