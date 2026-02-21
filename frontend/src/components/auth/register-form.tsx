"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/hooks/use-auth";
import { maskCPF, maskCNPJ } from "@/lib/utils";

const registerSchema = z
  .object({
    name: z.string().min(3, "Minimo de 3 caracteres"),
    email: z.string().email("Email invalido"),
    cpf: z.string().min(14, "CPF invalido"),
    cnpj: z.string().optional(),
    password: z.string().min(8, "Minimo de 8 caracteres"),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "Voce deve aceitar os termos",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao coincidem",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ caracteres", valid: password.length >= 8 },
    { label: "Letra maiuscula", valid: /[A-Z]/.test(password) },
    { label: "Letra minuscula", valid: /[a-z]/.test(password) },
    { label: "Numero", valid: /[0-9]/.test(password) },
    { label: "Caractere especial", valid: /[^A-Za-z0-9]/.test(password) },
  ];

  const strength = checks.filter((c) => c.valid).length;
  const strengthLabel =
    strength <= 1
      ? "Fraca"
      : strength <= 3
      ? "Media"
      : strength <= 4
      ? "Forte"
      : "Muito Forte";
  const strengthColor =
    strength <= 1
      ? "bg-red-500"
      : strength <= 3
      ? "bg-yellow-500"
      : strength <= 4
      ? "bg-green-500"
      : "bg-emerald-500";

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= strength ? strengthColor : "bg-muted"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{strengthLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-center gap-1.5 text-xs"
          >
            {check.valid ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground" />
            )}
            <span
              className={
                check.valid ? "text-green-600" : "text-muted-foreground"
              }
            >
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const { registerUser, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      acceptTerms: false,
    },
  });

  const password = watch("password", "");

  const onSubmit = async (data: RegisterFormData) => {
    await registerUser({
      name: data.name,
      email: data.email,
      password: data.password,
      cpf: data.cpf.replace(/\D/g, ""),
      cnpj: data.cnpj ? data.cnpj.replace(/\D/g, "") : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Nome completo
        </label>
        <Input
          id="name"
          placeholder="Seu nome completo"
          {...register("name")}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          {...register("email")}
          className={errors.email ? "border-destructive" : ""}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="cpf" className="text-sm font-medium">
            CPF
          </label>
          <Input
            id="cpf"
            placeholder="000.000.000-00"
            {...register("cpf")}
            onChange={(e) => {
              setValue("cpf", maskCPF(e.target.value));
            }}
            className={errors.cpf ? "border-destructive" : ""}
          />
          {errors.cpf && (
            <p className="text-xs text-destructive">{errors.cpf.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="cnpj" className="text-sm font-medium">
            CNPJ{" "}
            <span className="text-muted-foreground font-normal">
              (opcional)
            </span>
          </label>
          <Input
            id="cnpj"
            placeholder="00.000.000/0001-00"
            {...register("cnpj")}
            onChange={(e) => {
              setValue("cnpj", maskCNPJ(e.target.value));
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="register-password" className="text-sm font-medium">
          Senha
        </label>
        <div className="relative">
          <Input
            id="register-password"
            type={showPassword ? "text" : "password"}
            placeholder="Crie uma senha forte"
            {...register("password")}
            className={errors.password ? "border-destructive pr-10" : "pr-10"}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
        <PasswordStrength password={password} />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirmar Senha
        </label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirme sua senha"
          {...register("confirmPassword")}
          className={errors.confirmPassword ? "border-destructive" : ""}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="terms"
          {...register("acceptTerms")}
          className="mt-1 h-4 w-4 rounded border-input"
        />
        <label htmlFor="terms" className="text-sm text-muted-foreground">
          Li e aceito os{" "}
          <a href="#" className="text-primary underline hover:no-underline">
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a href="#" className="text-primary underline hover:no-underline">
            Politica de Privacidade
          </a>
        </label>
      </div>
      {errors.acceptTerms && (
        <p className="text-xs text-destructive">
          {errors.acceptTerms.message}
        </p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Criando conta...
          </>
        ) : (
          "Criar Conta"
        )}
      </Button>
    </form>
  );
}
