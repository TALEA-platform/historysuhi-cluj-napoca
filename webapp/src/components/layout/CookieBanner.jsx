import { useEffect, useState } from "react";
import { getLanguageCopy } from "../../i18n/config.js";
import { useI18n } from "../../i18n/useI18n.js";

const STORAGE_KEY = "talea_historysuhi_cluj_napoca_cookie_consent";

export function CookieBanner() {
  const { language } = useI18n();
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    try {
      setAccepted(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      setAccepted(true);
    }
  }, []);

  if (accepted) return null;

  const copy = getLanguageCopy(language, {
    ro: {
      ariaLabel: "Informare privind cookie-urile și stocarea locală",
      message:
        "Acest site folosește stocarea locală a browserului doar pentru a reține limba aleasă și notificările deja văzute. Nu sunt folosite cookie-uri de urmărire sau instrumente de analiză terțe. Hărțile de bază sunt furnizate de OpenFreeMap și Esri World Imagery (services.arcgisonline.com), care pot înregistra datele standard ale solicitărilor.",
      accept: "Am înțeles",
    },
    it: {
      ariaLabel: "Informativa cookie e archiviazione locale",
      message:
        "Questo sito utilizza l'archiviazione locale del browser solo per ricordare la lingua scelta e quali avvisi hai già visto. Non vengono usati cookie di tracciamento né analisi di terze parti. Le mappe di base sono fornite da OpenFreeMap e da Esri World Imagery (services.arcgisonline.com), che possono registrare i dati standard delle richieste.",
      accept: "Ho capito",
    },
    en: {
      ariaLabel: "Cookie and storage notice",
      message:
        "This site uses local storage only to remember your chosen language and which notices you have already seen. No tracking cookies or third-party analytics are used. Map tiles are served by OpenFreeMap and Esri World Imagery (services.arcgisonline.com), which may log standard request data.",
      accept: "Got it",
    },
  });

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore storage failures
    }
    setAccepted(true);
  };

  return (
    <div className="cookie-banner" role="region" aria-label={copy.ariaLabel}>
      <div className="cookie-banner-content">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <circle cx="12" cy="16" r="0.5" fill="currentColor" />
        </svg>
        <p>{copy.message}</p>
        <button type="button" className="cookie-accept-btn" onClick={handleAccept}>
          {copy.accept}
        </button>
      </div>
    </div>
  );
}
