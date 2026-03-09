import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { AlertCircle, ArrowRight, ArrowLeft, Globe } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const { t, isRTL, toggleLanguage } = useLanguage();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/10">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleLanguage}
              className="border-primary/30 hover:border-primary/60"
              data-testid="button-toggle-language"
            >
              <Globe className="w-4 h-4" />
            </Button>
          </div>
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <AlertCircle className="h-8 w-8 text-primary" data-testid="icon-not-found" />
          </div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-404-title">
            {t("404 - الصفحة غير موجودة", "404 - Page Not Found")}
          </h1>
          <p className="text-sm text-muted-foreground mb-6" data-testid="text-404-message">
            {t(
              "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
              "The page you're looking for doesn't exist or has been moved."
            )}
          </p>
          <Button onClick={() => setLocation("/")} data-testid="button-go-home">
            <BackArrow className="w-4 h-4 me-2" />
            {t("العودة للرئيسية", "Back to Home")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
