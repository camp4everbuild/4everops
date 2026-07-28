import { telUrl, smsUrl, whatsappUrl } from "@/lib/contact";
import { PhoneIcon, MessageIcon, WhatsAppLogo } from "@/components/icons";

const linkClass =
  "flex h-7 w-7 items-center justify-center rounded-full text-muted transition hover:bg-border/40 hover:text-foreground";

/** Quick call/text/WhatsApp links for whoever a task, job, or stop is assigned to — nothing renders if there's no phone on file. */
export function ContactIcons({ phone }: { phone: string | null | undefined }) {
  if (!phone) return null;

  return (
    <span className="inline-flex items-center gap-0.5">
      <a href={telUrl(phone)} aria-label="Call" className={linkClass}>
        <PhoneIcon className="h-3.5 w-3.5" />
      </a>
      <a href={smsUrl(phone)} aria-label="Text" className={linkClass}>
        <MessageIcon className="h-3.5 w-3.5" />
      </a>
      <a
        href={whatsappUrl(phone)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className={linkClass}
      >
        <WhatsAppLogo width={14} height={14} />
      </a>
    </span>
  );
}
