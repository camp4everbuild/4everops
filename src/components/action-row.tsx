import { telUrl, smsUrl, whatsappUrl } from "@/lib/contact";
import { mapsUrl, wazeUrl } from "@/lib/maps";
import { PhoneIcon, MessageIcon, WhatsAppLogo, WazeLogo, GoogleMapsLogo } from "@/components/icons";

const btnClass =
  "flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-surface transition hover:bg-border/40";

/**
 * One row of quick actions for a card: call/text/WhatsApp whoever it's
 * assigned to, and/or Waze/Google Maps to wherever it's about — in that
 * order. Skips whichever half doesn't apply (tasks have no location; an
 * unassigned job has no one to contact).
 */
export function ActionRow({
  phone,
  mapsQuery,
}: {
  phone?: string | null;
  mapsQuery?: string | null;
}) {
  if (!phone && !mapsQuery) return null;

  return (
    <div className="mt-3 flex gap-2">
      {phone ? (
        <>
          <a href={telUrl(phone)} aria-label="Call" className={btnClass}>
            <PhoneIcon className="h-5 w-5" />
          </a>
          <a href={smsUrl(phone)} aria-label="Text" className={btnClass}>
            <MessageIcon className="h-5 w-5" />
          </a>
          <a
            href={whatsappUrl(phone)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className={btnClass}
          >
            <WhatsAppLogo width={20} height={20} />
          </a>
        </>
      ) : null}

      {mapsQuery ? (
        <>
          <a
            href={wazeUrl(mapsQuery)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Waze"
            className={btnClass}
          >
            <WazeLogo width={20} height={20} />
          </a>
          <a
            href={mapsUrl(mapsQuery)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Google Maps"
            className={btnClass}
          >
            <GoogleMapsLogo width={20} height={20} />
          </a>
        </>
      ) : null}
    </div>
  );
}
