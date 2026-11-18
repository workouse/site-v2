import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Preview,
} from '@react-email/components';

interface EmailLayoutProps {
  previewText: string;
  children: React.ReactNode;
}

export const EmailLayout: React.FC<EmailLayoutProps> = ({
  previewText,
  children,
}) => {
  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={mainBodyStyle}>
        <Container style={containerStyle}>
          <Section style={cardStyle}>
            {/* Header Brand */}
            <Section style={headerSectionStyle}>
              <Text style={logoTextStyle}>WORKOUSE</Text>
            </Section>

            {/* Main Content */}
            <Section style={contentSectionStyle}>{children}</Section>

            {/* Footer */}
            <Hr style={hrStyle} />
            <Section style={footerSectionStyle}>
              <Text style={footerTextStyle}>
                © Workouse. Engineered by Emre Yılmaz. Contact:{' '}
                <a href="mailto:z@emre.xyz" style={footerLinkStyle}>
                  z@emre.xyz
                </a>
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const mainBodyStyle: React.CSSProperties = {
  backgroundColor: '#09090b',
  color: '#fafafa',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: '0 auto',
  padding: '40px 20px',
  WebkitFontSmoothing: 'antialiased',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '12px',
  padding: '40px',
};

const headerSectionStyle: React.CSSProperties = {
  paddingBottom: '24px',
};

const logoTextStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  color: '#FEC500',
  textTransform: 'uppercase',
  margin: 0,
};

const contentSectionStyle: React.CSSProperties = {
  paddingBottom: '10px',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#27272a',
  margin: '24px 0 16px 0',
};

const footerSectionStyle: React.CSSProperties = {
  paddingTop: '0px',
};

const footerTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#71717a',
  lineHeight: '1.5',
  margin: 0,
};

const footerLinkStyle: React.CSSProperties = {
  color: '#a1a1aa',
  textDecoration: 'underline',
};
