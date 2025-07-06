"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ThumbsUp } from "lucide-react";

export default function SigningSuccessPage() {
  const router = useRouter();

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-250px)]">
      <Card className="w-full max-w-lg text-center rounded-2xl shadow-xl border-accent/30 bg-accent/5">
        <CardHeader>
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-accent/10 mb-4">
            <ThumbsUp className="w-10 h-10 text-accent" />
          </div>
          <CardTitle className="text-3xl md:text-4xl font-extrabold text-accent">
            החוזה נחתם בהצלחה!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="mt-2 text-md md:text-lg text-gray-600">
            כל הצדדים חתמו על המסמך. עותק סופי של החוזה נשלח לאימייל של כל
            המעורבים.
          </CardDescription>
          <Button
            onClick={() => router.push("/dashboard")}
            className="mt-8 font-semibold px-8 py-3 text-lg"
            size="lg"
          >
            מעבר ללוח הבקרה
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
