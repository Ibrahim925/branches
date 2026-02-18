import { ImageResponse } from 'next/og';

import { formatInviteeName, getInvitePreviewByToken } from '@/lib/invites';

export const runtime = 'nodejs';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

type InviteImageProps = {
  params: Promise<{ token: string }>;
};

export default async function OpenGraphImage({ params }: InviteImageProps) {
  const { token } = await params;
  const preview = await getInvitePreviewByToken(token);

  const treeName = preview?.graph_name ?? 'Family Tree';
  const inviteeName = formatInviteeName(preview);
  const title = inviteeName
    ? `${inviteeName}, you are invited`
    : 'You are invited';
  const subtitle = inviteeName
    ? `Claim your place in ${treeName}`
    : `Join ${treeName} on Branches`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          padding: '52px',
          fontFamily: 'Inter, ui-sans-serif',
          color: '#2f2f2f',
          background:
            'radial-gradient(circle at 12% 20%, rgba(168,192,144,0.45), rgba(168,192,144,0) 42%), radial-gradient(circle at 88% 86%, rgba(230,177,126,0.24), rgba(230,177,126,0) 46%), linear-gradient(125deg, #f4f0ea 0%, #fefefd 58%, #f2efe8 100%)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '28px',
            borderRadius: '28px',
            border: '1px solid rgba(93, 78, 55, 0.2)',
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: '24px',
            border: '1px solid rgba(93, 78, 55, 0.12)',
            background: 'rgba(255,255,255,0.72)',
            padding: '54px 56px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '24px',
              color: '#4f5d3f',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '18px',
                background: 'linear-gradient(140deg, #8b9d77, #a8c090)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 700,
              }}
            >
              B
            </div>
            Branches Invite
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p
              style={{
                margin: 0,
                fontSize: '66px',
                lineHeight: 1.04,
                fontWeight: 700,
                color: '#343434',
                maxWidth: '980px',
              }}
            >
              {title}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '34px',
                lineHeight: 1.25,
                color: '#5d4e37',
                opacity: 0.84,
                maxWidth: '980px',
              }}
            >
              {subtitle}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 18px',
                borderRadius: '999px',
                border: '1px solid rgba(93, 78, 55, 0.2)',
                background: 'rgba(255,255,255,0.82)',
                fontSize: '24px',
                color: '#5d4e37',
              }}
            >
              Family Tree
              <span style={{ color: '#2f2f2f', fontWeight: 700 }}>{treeName}</span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                color: '#5d4e37',
                opacity: 0.8,
              }}
            >
              branches.family
            </p>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
