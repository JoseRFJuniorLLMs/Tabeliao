"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Criar conta</CardTitle>
        <CardDescription>
          Comece a gerenciar seus contratos de forma inteligente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RegisterForm />

        <p className="text-center text-sm text-muted-foreground">
          Ja tem uma conta?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Fazer login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
