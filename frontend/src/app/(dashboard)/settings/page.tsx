'use client';

import { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Shield,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Save,
  Smartphone,
  MessageSquare,
  Crown,
  Check,
  ArrowRight,
  Fingerprint,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface NotificationChannel {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
}

interface PlanFeature {
  text: string;
  included: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  // Profile state
  const [profileData, setProfileData] = useState({
    name: 'Maria Helena Silva',
    email: 'maria.silva@email.com',
    phone: '(11) 98765-4321',
    cpf: '123.456.789-00',
  });

  // Security state
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationChannel[]>([
    {
      id: 'email',
      label: 'E-mail',
      description: 'Receba notificacoes por e-mail',
      icon: Mail,
      enabled: true,
    },
    {
      id: 'sms',
      label: 'SMS',
      description: 'Receba notificacoes por SMS',
      icon: Smartphone,
      enabled: false,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      description: 'Receba notificacoes pelo WhatsApp',
      icon: MessageSquare,
      enabled: true,
    },
    {
      id: 'push',
      label: 'Push',
      description: 'Notificacoes no navegador',
      icon: Bell,
      enabled: true,
    },
  ]);

  // Subscription
  const currentPlan = 'pro';

  const plans = [
    {
      id: 'free',
      name: 'Gratis',
      price: 0,
      period: '/mes',
      description: 'Para uso pessoal e experimentacao',
      features: [
        { text: 'Ate 3 contratos por mes', included: true },
        { text: 'Revisao basica por IA', included: true },
        { text: 'Assinatura digital', included: true },
        { text: 'Suporte por e-mail', included: true },
        { text: 'Templates premium', included: false },
        { text: 'Registro blockchain', included: false },
        { text: 'Escrow de pagamentos', included: false },
        { text: 'Arbitragem', included: false },
      ] as PlanFeature[],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 49.9,
      period: '/mes',
      description: 'Para profissionais e pequenas empresas',
      highlighted: true,
      features: [
        { text: 'Contratos ilimitados', included: true },
        { text: 'Revisao avancada por IA', included: true },
        { text: 'Assinatura digital', included: true },
        { text: 'Suporte prioritario', included: true },
        { text: 'Templates premium', included: true },
        { text: 'Registro blockchain', included: true },
        { text: 'Escrow de pagamentos', included: false },
        { text: 'Arbitragem', included: false },
      ] as PlanFeature[],
    },
    {
      id: 'business',
      name: 'Business',
      price: 149.9,
      period: '/mes',
      description: 'Para empresas e escritorios de advocacia',
      features: [
        { text: 'Contratos ilimitados', included: true },
        { text: 'Revisao avancada por IA', included: true },
        { text: 'Assinatura digital', included: true },
        { text: 'Suporte dedicado 24/7', included: true },
        { text: 'Templates premium', included: true },
        { text: 'Registro blockchain', included: true },
        { text: 'Escrow de pagamentos', included: true },
        { text: 'Arbitragem completa', included: true },
      ] as PlanFeature[],
    },
  ];

  const toggleNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Configuracoes</h1>
        <p className="text-muted-foreground">
          Gerencie sua conta, seguranca e preferencias
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-xl grid-cols-4">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Seguranca
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Notificacoes
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5">
            <Crown className="h-3.5 w-3.5" />
            Plano
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informacoes Pessoais</CardTitle>
              <CardDescription>
                Atualize seus dados de perfil. Essas informacoes serao usadas nos contratos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  MH
                </div>
                <div>
                  <Button variant="outline" size="sm">
                    Alterar Foto
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG ou GIF. Max 2MB.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          email: e.target.value,
                        })
                      }
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Telefone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          phone: e.target.value,
                        })
                      }
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    CPF
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={profileData.cpf}
                      onChange={(e) =>
                        setProfileData({ ...profileData, cpf: e.target.value })
                      }
                      className="pl-9"
                      disabled
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    CPF verificado. Para alterar, entre em contato com o suporte.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button className="gap-2">
                <Save className="h-4 w-4" />
                Salvar Alteracoes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Sua senha deve ter pelo menos 8 caracteres, incluindo
                maiusculas, numeros e simbolos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Senha Atual
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        currentPassword: e.target.value,
                      })
                    }
                    className="pl-9 pr-10"
                    placeholder="Digite sua senha atual"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      className="pl-9 pr-10"
                      placeholder="Digite a nova senha"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="pl-9 pr-10"
                      placeholder="Confirme a nova senha"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button className="gap-2">
                <Save className="h-4 w-4" />
                Alterar Senha
              </Button>
            </CardFooter>
          </Card>

          {/* Two Factor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Fingerprint className="h-4 w-4" />
                Autenticacao de Dois Fatores (2FA)
              </CardTitle>
              <CardDescription>
                Adicione uma camada extra de seguranca a sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${
                      twoFactorEnabled
                        ? 'bg-green-100'
                        : 'bg-muted'
                    }`}
                  >
                    <Shield
                      className={`h-5 w-5 ${
                        twoFactorEnabled
                          ? 'text-green-600'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-medium">
                      Verificacao em duas etapas
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {twoFactorEnabled
                        ? 'Ativado - Sua conta esta protegida com 2FA'
                        : 'Desativado - Ative para maior seguranca'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    twoFactorEnabled ? 'bg-green-500' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {twoFactorEnabled && (
                <div className="mt-3 rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
                  <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    2FA ativado via aplicativo autenticador
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Canais de Notificacao
              </CardTitle>
              <CardDescription>
                Escolha como deseja receber notificacoes sobre contratos,
                pagamentos e disputas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.map((channel) => {
                const Icon = channel.icon;
                return (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          channel.enabled
                            ? 'bg-primary/10'
                            : 'bg-muted'
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            channel.enabled
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium">{channel.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {channel.description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleNotification(channel.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        channel.enabled ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                          channel.enabled
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button className="gap-2">
                <Save className="h-4 w-4" />
                Salvar Preferencias
              </Button>
            </CardFooter>
          </Card>

          {/* Notification Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Tipos de Notificacao
              </CardTitle>
              <CardDescription>
                Configure quais eventos geram notificacoes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  label: 'Novos contratos',
                  description: 'Quando um novo contrato e criado ou recebido',
                  enabled: true,
                },
                {
                  label: 'Assinaturas',
                  description:
                    'Quando uma parte assina ou solicita assinatura',
                  enabled: true,
                },
                {
                  label: 'Pagamentos',
                  description:
                    'Pagamentos recebidos, pendentes ou atrasados',
                  enabled: true,
                },
                {
                  label: 'Disputas',
                  description:
                    'Novas disputas, mensagens e decisoes',
                  enabled: true,
                },
                {
                  label: 'Vencimentos',
                  description:
                    'Lembrete de contratos proximos ao vencimento',
                  enabled: false,
                },
                {
                  label: 'Atualizacoes do sistema',
                  description: 'Novidades e melhorias da plataforma',
                  enabled: false,
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <button
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      item.enabled ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                        item.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Current Plan */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">Plano Pro</p>
                    <Badge className="bg-primary text-primary-foreground">
                      Ativo
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Proximo pagamento: 15 de Marco, 2025
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">R$ 49,90</p>
                <p className="text-xs text-muted-foreground">/mes</p>
              </div>
            </CardContent>
          </Card>

          {/* Plans Grid */}
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              return (
                <Card
                  key={plan.id}
                  className={`relative ${
                    plan.highlighted
                      ? 'border-primary shadow-md'
                      : ''
                  }`}
                >
                  {plan.highlighted && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Mais Popular
                    </Badge>
                  )}
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">
                        {plan.price === 0
                          ? 'Gratis'
                          : `R$ ${plan.price.toFixed(2).replace('.', ',')}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {plan.period}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2.5"
                      >
                        {feature.included ? (
                          <Check className="h-4 w-4 shrink-0 text-green-500" />
                        ) : (
                          <div className="h-4 w-4 shrink-0 rounded-full border border-muted" />
                        )}
                        <span
                          className={`text-sm ${
                            feature.included
                              ? ''
                              : 'text-muted-foreground line-through'
                          }`}
                        >
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="pt-4">
                    {isCurrent ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled
                      >
                        Plano Atual
                      </Button>
                    ) : (
                      <Button
                        variant={plan.highlighted ? 'default' : 'outline'}
                        className="w-full gap-2"
                      >
                        {plan.price > plans.find((p) => p.id === currentPlan)!.price
                          ? 'Fazer Upgrade'
                          : plan.price === 0
                          ? 'Downgrade'
                          : 'Alterar Plano'}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Usage Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Uso do Plano</CardTitle>
              <CardDescription>
                Acompanhe o consumo do seu plano atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Contratos</span>
                    <span className="font-medium">12 / Ilimitado</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: '30%' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Revisoes IA</span>
                    <span className="font-medium">28 / 50</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-secondary transition-all"
                      style={{ width: '56%' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Armazenamento
                    </span>
                    <span className="font-medium">1.2 GB / 5 GB</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: '24%' }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
