import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/10">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <AlertCircle className="h-8 w-8 text-primary" data-testid="icon-not-found" />
          </div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-404-title">
            404 - الصفحة غير موجودة
          </h1>
          <p className="text-sm text-muted-foreground mb-6" data-testid="text-404-message">
            الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
          </p>
          <Button
            onClick={() => setLocation("/")}
            data-testid="button-go-home"
          >
            <ArrowRight className="w-4 h-4 me-2" />
            العودة للرئيسية
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
