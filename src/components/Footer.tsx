import { Heart, Globe } from "lucide-react";
import { SiMeetup, SiWhatsapp, SiInstagram, SiGithub } from "react-icons/si";
import { FaLinkedin } from "react-icons/fa6";

const CLUB_WEBSITE_URL = "https://awssbg-srmist.in";

const SOCIALS = [
  { href: "https://www.instagram.com/awssbg.at.srmist/", label: "Instagram", icon: SiInstagram },
  { href: "https://www.linkedin.com/company/awssbg-at-srmist", label: "LinkedIn", icon: FaLinkedin },
  { href: "https://www.meetup.com/awssbg-at-srmist/", label: "Meetup", icon: SiMeetup },
  { href: "https://github.com/AWSSBG-at-SRMIST", label: "GitHub", icon: SiGithub },
  { href: "https://chat.whatsapp.com/D9OKcELrR1E6Ch2fIqRwuZ", label: "WhatsApp Community", icon: SiWhatsapp },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t-2 border-on-surface/10 bg-surface-container-lowest">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-6 md:py-8">
        <div className="flex flex-col items-center gap-5 md:flex-row md:justify-between md:gap-6">
          <div className="flex flex-col items-center gap-1 md:items-start text-center md:text-left text-on-surface-variant text-sm font-medium">
            <span>&copy; {year} AWS Student Builder Group at SRMIST</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap text-xs md:text-sm">
              Made with <Heart size={12} className="text-primary fill-primary" /> by Tech Team @AWS SBG at SRMIST.
            </span>
            <a
              href={CLUB_WEBSITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold uppercase tracking-wide text-primary hover:underline"
            >
              Visit the Club Website →
            </a>
          </div>
          <div className="flex flex-wrap gap-2.5 justify-center md:justify-end">
            <a
              href={CLUB_WEBSITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Club Website"
              className="w-10 h-10 flex items-center justify-center border-2 border-on-surface/15 text-on-surface-variant hover:border-primary hover:text-primary transition-colors duration-200"
            >
              <Globe size={15} />
            </a>
            {SOCIALS.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-10 h-10 flex items-center justify-center border-2 border-on-surface/15 text-on-surface-variant hover:border-primary hover:text-primary transition-colors duration-200"
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
