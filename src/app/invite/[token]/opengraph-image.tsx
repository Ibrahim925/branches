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
  const inviteeInitials = inviteeName
    ? inviteeName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
    : 'IN';
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
            alignItems: 'stretch',
            justifyContent: 'space-between',
            gap: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '36px',
              width: '100%',
              flex: 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '26px',
                maxWidth: '56%',
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
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'linear-gradient(140deg, #8b9d77, #a8c090)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 12px 20px rgba(139,157,119,0.24)',
                  }}
                >
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"
                      stroke="#ffffff"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 22v-3"
                      stroke="#ffffff"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                Branches Invite
              </div>

              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '66px',
                    lineHeight: 1.04,
                    fontWeight: 700,
                    color: '#343434',
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
                  }}
                >
                  {subtitle}
                </p>
              </div>

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
            </div>

            <div
              style={{
                width: '430px',
                height: '310px',
                borderRadius: '24px',
                border: '1px solid rgba(93, 78, 55, 0.2)',
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,243,235,0.96))',
                boxShadow: '0 18px 32px rgba(80, 67, 47, 0.15)',
                position: 'relative',
                display: 'flex',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '68px',
                  top: '84px',
                  width: '286px',
                  height: '2px',
                  background: '#7e7467',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '210px',
                  top: '86px',
                  width: '2px',
                  height: '68px',
                  background: '#7e7467',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '95px',
                  top: '152px',
                  width: '230px',
                  height: '2px',
                  background: '#7e7467',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '120px',
                  top: '150px',
                  width: '2px',
                  height: '52px',
                  background: '#7e7467',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '208px',
                  top: '150px',
                  width: '2px',
                  height: '52px',
                  background: '#7e7467',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '296px',
                  top: '150px',
                  width: '2px',
                  height: '52px',
                  background: '#7e7467',
                }}
              />

              {[
                { x: 52, y: 26, label: 'A' },
                { x: 284, y: 26, label: 'B' },
                { x: 70, y: 194, label: 'C' },
                { x: 158, y: 194, label: inviteeInitials || 'Y' },
                { x: 246, y: 194, label: 'D' },
              ].map((node) => (
                <div
                  key={`${node.label}-${node.x}-${node.y}`}
                  style={{
                    position: 'absolute',
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: '74px',
                    height: '88px',
                    borderRadius: '18px',
                    border: '1px solid rgba(93, 78, 55, 0.22)',
                    background:
                      node.label === inviteeInitials
                        ? 'linear-gradient(180deg, #f9f4ec 0%, #f0e4d2 100%)'
                        : 'linear-gradient(180deg, #ffffff 0%, #f5eee3 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '999px',
                      background:
                        node.label === inviteeInitials
                          ? 'linear-gradient(140deg, #86a06a, #b4cf95)'
                          : 'linear-gradient(140deg, #8b9d77, #a8c090)',
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {node.label}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#5b5245',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    Member
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '22px',
                color: '#5d4e37',
                opacity: 0.86,
              }}
            >
              branches-azure.vercel.app
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 15px',
                borderRadius: '999px',
                border: '1px solid rgba(139, 157, 119, 0.36)',
                background: 'rgba(168, 192, 144, 0.2)',
                fontSize: '20px',
                color: '#5d4e37',
              }}
            >
              Join now on Branches
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
