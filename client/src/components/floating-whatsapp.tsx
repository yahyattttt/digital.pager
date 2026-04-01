import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SiWhatsapp } from "react-icons/si";

const VISIBLE_PATHS = ["/", "/login", "/register"];

export default function FloatingWhatsApp() {
  const [location] = useLocation();

  const { data: settings } = useQuery<{ supportWhatsapp?: string }>({
    queryKey: ["/api/admin/settings"],
    staleTime: 5 * 60 * 1000,
  });

  const phone = (settings?.supportWhatsapp || "").replace(/\D/g, "");

  if (!VISIBLE_PATHS.includes(location) || !phone) return null;

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent("أهلاً ديجيتال بيجر، أرغب في الاستفسار عن...")}`;

  return (
    <>
      <style>{`
        @keyframes dp-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(255, 107, 0, 0.55); }
          70%  { box-shadow: 0 0 0 14px rgba(255, 107, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 107, 0, 0); }
        }
        .dp-whatsapp-btn {
          animation: dp-pulse 2.2s ease-out infinite;
        }
        .dp-whatsapp-btn:hover {
          transform: scale(1.1);
          animation: none;
          box-shadow: 0 8px 30px rgba(255, 107, 0, 0.5);
        }
      `}</style>

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="تواصل معنا عبر واتساب"
        data-testid="floating-whatsapp-btn"
        className="dp-whatsapp-btn"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #FF6B00 0%, #e05a00 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          textDecoration: "none",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        <SiWhatsapp style={{ width: 26, height: 26, color: "#fff" }} />
      </a>
    </>
  );
}
